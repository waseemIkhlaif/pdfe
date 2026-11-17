import { z } from 'zod';
import { ADAPTER_KINDS } from './adapters';
import { configKeys, configRegistry, type ConfigKey } from './config-registry';
import { roles as rbacRoles, sodViolations } from './rbac';

/**
 * A scenario manifest (contracts/scenario-manifest.md): the tenants, organizations, users, settings and mock-hub behaviour
 * a demo run creates. The schema checks the file on its own (shapes, references between entries, separation of duties,
 * setting values); nothing is written to a database until the whole manifest passes.
 */
const uuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
const code = z.string().regex(/^[a-z][a-z0-9-]*$/);
const roleNames = rbacRoles.map((r) => r.name) as [string, ...string[]];

export const scenarioManifestSchema = z
  .object({
    code,
    version: z.string().regex(/^v[0-9]+$/),
    title: z.object({ en: z.string().min(1), ar: z.string().min(1) }),
    clock: z.object({
      base: z.iso.datetime(),
      step_ms: z.number().int().min(1).max(3_600_000),
    }),
    tenants: z
      .array(
        z.object({
          id: uuid,
          code,
          kind: z.enum(['platform', 'consumer_pool', 'merchant']),
          name: z.string().min(1),
        }),
      )
      .min(1),
    organizations: z
      .array(
        z.object({
          tenant: code,
          type: z.enum(['merchant', 'business']),
          display_name: z.string().min(1),
        }),
      )
      .default([]),
    users: z
      .array(
        z.object({
          subject: uuid,
          tenant: code,
          display_name: z.string().min(1),
          roles: z.array(z.enum(roleNames)).min(1),
        }),
      )
      .min(1),
    config: z.array(z.object({ key: z.string(), value: z.unknown() })).default([]),
    mock_hub: z
      .array(
        z.object({
          kind: z.enum(ADAPTER_KINDS),
          latency_ms: z.number().int().min(0).max(10_000),
          failure_rate: z.number().min(0).max(1),
          script: z.array(z.enum(['ok', 'fail'])).optional(),
        }),
      )
      .default([]),
  })
  .superRefine((m, ctx) => {
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: 'custom', path, message });

    const tenants = new Set<string>();
    m.tenants.forEach((t, i) => {
      if (tenants.has(t.code)) issue(['tenants', i, 'code'], `duplicate tenant code ${t.code}`);
      tenants.add(t.code);
    });
    const ids = new Set<string>();
    m.tenants.forEach((t, i) => {
      if (ids.has(t.id)) issue(['tenants', i, 'id'], `duplicate tenant id ${t.id}`);
      ids.add(t.id);
    });
    m.organizations.forEach((o, i) => {
      if (!tenants.has(o.tenant))
        issue(['organizations', i, 'tenant'], `unknown tenant ${o.tenant}`);
    });

    const subjects = new Set<string>();
    m.users.forEach((u, i) => {
      if (!tenants.has(u.tenant)) issue(['users', i, 'tenant'], `unknown tenant ${u.tenant}`);
      if (subjects.has(u.subject)) issue(['users', i, 'subject'], `duplicate subject ${u.subject}`);
      subjects.add(u.subject);
      // Separation of duties (R-6): checked as the roles are added one by one, as a real grant would be.
      const held: string[] = [];
      u.roles.forEach((role, r) => {
        const v = sodViolations(held, role);
        if (v.conflicts.length > 0) {
          issue(
            ['users', i, 'roles', r],
            `${u.display_name} cannot hold ${role}: it conflicts with ${v.conflicts.join(', ')}`,
          );
        } else if (v.triple) {
          issue(['users', i, 'roles', r], `${u.display_name} cannot hold ${role}: the triple rule`);
        }
        held.push(role);
      });
    });

    const keys = new Set<string>();
    m.config.forEach((c, i) => {
      if (!(configKeys as string[]).includes(c.key)) {
        issue(['config', i, 'key'], `unknown setting ${c.key}`);
        return;
      }
      if (keys.has(c.key)) issue(['config', i, 'key'], `setting ${c.key} listed twice`);
      keys.add(c.key);
      const item = configRegistry[c.key as ConfigKey];
      if (item.safetyLocked) {
        issue(['config', i, 'key'], `${c.key} is safety-locked and cannot be set by a scenario`);
        return;
      }
      const parsed = item.schema.safeParse(c.value);
      if (!parsed.success) {
        issue(
          ['config', i, 'value'],
          `${c.key}: ${parsed.error.issues[0]?.message ?? 'invalid value'}`,
        );
      }
    });

    const kinds = new Set<string>();
    m.mock_hub.forEach((h, i) => {
      if (kinds.has(h.kind)) issue(['mock_hub', i, 'kind'], `mock hub kind ${h.kind} listed twice`);
      kinds.add(h.kind);
    });
  });

export type ScenarioManifest = z.infer<typeof scenarioManifestSchema>;

/** Turns a parsed manifest into a typed one, or throws an Error whose message lists every problem. */
export function parseScenarioManifest(raw: unknown): ScenarioManifest {
  const r = scenarioManifestSchema.safeParse(raw);
  if (r.success) return r.data;
  throw new Error(
    `invalid scenario manifest: ${r.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ')}`,
  );
}
