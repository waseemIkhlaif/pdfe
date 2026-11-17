import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import type { PoolClient } from 'pg';
import { z } from 'zod';
import { configKeys, configRegistry, type ConfigKey } from '@pdfe/domain-types';
import { AppError, getContext, IdGenerator, type ClockService } from '@pdfe/platform-core';
import { activateVersion, lockConfigKey } from '@pdfe/platform-core/config';
import { withTx, type Pool } from '@pdfe/platform-core/db';
import { diff, type JsonValue } from '@pdfe/platform-core/json-patch';
import {
  ApprovalHandlerRegistry,
  type ApprovedRequest,
} from '../approvals/approval-handler.registry';
import { ApprovalsService, type ApprovalView } from '../approvals/approvals.service';
import { AuditService } from '../audit/audit.service';
import { parseInput } from '../common/validate';
import { CLOCK, PG_POOL } from '../core/tokens';
import type { Principal } from '../identity/principal';
import { OutboxWriter } from '../integration/outbox.writer';
import { DbConfigReader } from './db-config-reader';

type Tx = { client: PoolClient };

const CHANGE = 'config.change';
const ROLLBACK = 'config.rollback';

export const proposeSchema = z.object({
  value: z.unknown(),
  effective_from: z.iso.datetime({ offset: true }).optional(),
  reason: z.string().trim().min(1).max(500),
});
export const rollbackSchema = z.object({
  to_version: z.number().int().min(1),
  reason: z.string().trim().min(1).max(500),
});

interface VersionRow {
  version: number;
  value: unknown;
  status: string;
  effective_from: Date;
  rollback_of_version: number | null;
  reason: string | null;
  approval_request_id: string | null;
  created_by: string;
  created_at: Date;
}

/**
 * The columns of a version as callers see it. A version still waiting for approval whose request was rejected, cancelled
 * or has expired is shown as `rejected`: it will never be activated. (The approval table is row-level-secured, so this is
 * worked out when reading, from the request the caller can see.)
 */
const SHOWN = `v.version, v.value, v.effective_from, v.rollback_of_version, v.reason, v.approval_request_id,
  v.created_by, v.created_at,
  CASE WHEN v.status = 'pending_approval' AND a.status IN ('rejected','cancelled','expired')
       THEN 'rejected' ELSE v.status END AS status`;
const FROM = `config.config_versions v LEFT JOIN iam.approval_requests a ON a.id = v.approval_request_id`;

const toView = (r: VersionRow) => ({
  version: r.version,
  value: r.value,
  status: r.status,
  effective_from: r.effective_from.toISOString(),
  rollback_of_version: r.rollback_of_version,
  reason: r.reason,
  approval_request_id: r.approval_request_id,
  created_by: r.created_by,
  created_at: r.created_at.toISOString(),
});

/**
 * Safe, reversible configuration (FR-029, R-10). A change is never applied directly: it is a version that waits for an
 * independent approval, then becomes active at once or at its effective time. Safety-locked settings can never get a
 * version. Every step is audited.
 */
@Injectable()
export class ConfigService implements OnModuleInit {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(CLOCK) private readonly clock: ClockService,
    private readonly ids: IdGenerator,
    private readonly audit: AuditService,
    private readonly approvals: ApprovalsService,
    private readonly registry: ApprovalHandlerRegistry,
    private readonly outbox: OutboxWriter,
    private readonly reader: DbConfigReader,
  ) {}

  onModuleInit(): void {
    const handler = {
      validate: (tx: Tx, r: ApprovedRequest) => this.validateApproved(tx, r),
      apply: (tx: Tx, r: ApprovedRequest) => this.applyApproved(tx, r),
    };
    this.registry.register(CHANGE, handler);
    this.registry.register(ROLLBACK, handler);
  }

  // --- reading ----------------------------------------------------------------------------------------

  async list(tx: Tx) {
    const items = await tx.client.query<{
      key: string;
      schema: unknown;
      safety_locked: boolean;
      description: string;
    }>('SELECT key, schema, safety_locked, description FROM config.config_items ORDER BY key');
    const versions = await tx.client.query<VersionRow & { key: string }>(
      `SELECT v.key, ${SHOWN} FROM ${FROM} WHERE v.status IN ('active', 'pending_approval')`,
    );
    return {
      items: items.rows.map((i) => {
        const mine = versions.rows.filter((v) => v.key === i.key);
        const active = mine.find((v) => v.status === 'active');
        return {
          key: i.key,
          description: i.description,
          schema: i.schema,
          safety_locked: i.safety_locked,
          editable: !i.safety_locked,
          active: active ? toView(active) : null,
          pending_versions: mine.filter((v) => v.status === 'pending_approval').length,
        };
      }),
    };
  }

  async versions(tx: Tx, key: string) {
    this.assertKey(key);
    const r = await tx.client.query<VersionRow>(
      `SELECT ${SHOWN} FROM ${FROM} WHERE v.key = $1 ORDER BY v.version DESC`,
      [key],
    );
    return { key, items: r.rows.map(toView) };
  }

  async diff(tx: Tx, key: string, from: unknown, to: unknown) {
    this.assertKey(key);
    const f = this.versionNumber(from, 'from');
    const t = this.versionNumber(to, 'to');
    const r = await tx.client.query<{ version: number; value: JsonValue }>(
      'SELECT version, value FROM config.config_versions WHERE key = $1 AND version = ANY($2)',
      [key, [f, t]],
    );
    const a = r.rows.find((x) => x.version === f);
    const b = r.rows.find((x) => x.version === t);
    if (!a || !b) throw new AppError('NOT_FOUND', 404);
    return { key, from: f, to: t, patch: diff(a.value, b.value) };
  }

  // --- proposing --------------------------------------------------------------------------------------

  async propose(tx: Tx, p: Principal, key: string, body: unknown): Promise<ApprovalView> {
    this.assertKey(key);
    const input = parseInput(proposeSchema, body);
    await this.refuseIfLocked(p, key, input.reason);
    const value = this.validValue(key as ConfigKey, input.value);
    const effectiveFrom = input.effective_from ? new Date(input.effective_from) : this.clock.now();
    return this.createVersion(tx, p, {
      key,
      value,
      effectiveFrom,
      reason: input.reason,
      rollbackOf: null,
    });
  }

  async rollback(tx: Tx, p: Principal, key: string, body: unknown): Promise<ApprovalView> {
    this.assertKey(key);
    const input = parseInput(rollbackSchema, body);
    await this.refuseIfLocked(p, key, input.reason);
    const target = await tx.client.query<{ value: unknown; status: string }>(
      'SELECT value, status FROM config.config_versions WHERE key = $1 AND version = $2',
      [key, input.to_version],
    );
    const row = target.rows[0];
    if (!row) throw new AppError('NOT_FOUND', 404);
    if (row.status !== 'active' && row.status !== 'superseded') {
      throw new AppError('VALIDATION_FAILED', 422, [
        { path: 'to_version', message_key: 'validation.config.version_never_active' },
      ]);
    }
    // The old value must still be valid under today's schema (R-10).
    const value = this.validValue(key as ConfigKey, row.value, 'to_version');
    return this.createVersion(tx, p, {
      key,
      value,
      effectiveFrom: this.clock.now(),
      reason: input.reason,
      rollbackOf: input.to_version,
    });
  }

  private async createVersion(
    tx: Tx,
    p: Principal,
    v: {
      key: string;
      value: unknown;
      effectiveFrom: Date;
      reason: string;
      rollbackOf: number | null;
    },
  ): Promise<ApprovalView> {
    await lockConfigKey(tx.client, v.key);
    const max = await tx.client.query<{ n: number | null }>(
      'SELECT max(version) AS n FROM config.config_versions WHERE key = $1',
      [v.key],
    );
    const version = (max.rows[0]?.n ?? 0) + 1;
    const id = this.ids.next();
    const approval = await this.approvals.create(tx, p, {
      actionType: v.rollbackOf === null ? CHANGE : ROLLBACK,
      targetType: 'config_item',
      targetId: v.key,
      payload: {
        version_id: id,
        key: v.key,
        version,
        value: v.value,
        effective_from: v.effectiveFrom.toISOString(),
        rollback_of_version: v.rollbackOf,
      },
      reason: v.reason,
    });
    await tx.client.query(
      `INSERT INTO config.config_versions
         (id, key, version, value, effective_from, status, approval_request_id, rollback_of_version, reason,
          tenant_id, created_by, created_at)
       VALUES ($1,$2,$3,$4,$5,'pending_approval',$6,$7,$8,$9,$10,$11)`,
      [
        id,
        v.key,
        version,
        JSON.stringify(v.value),
        v.effectiveFrom.toISOString(),
        approval.id,
        v.rollbackOf,
        v.reason,
        p.tenantId,
        p.userId,
        this.clock.now().toISOString(),
      ],
    );
    await this.audit.record(tx, {
      tenantId: p.tenantId,
      actorId: p.userId,
      actorRole: p.roles[0] ?? null,
      action: 'config.proposed',
      targetType: 'config_item',
      targetId: v.key,
      reason: v.reason,
      approvalRequestId: approval.id,
      correlationId: getContext()?.correlationId ?? 'unknown',
      data: {
        key: v.key,
        version,
        effective_from: v.effectiveFrom.toISOString(),
        rollback_of_version: v.rollbackOf,
      },
    });
    return approval;
  }

  // --- approval handlers ------------------------------------------------------------------------------

  /** A version that is no longer waiting (another one was approved first) cannot be approved. */
  private async validateApproved(tx: Tx, r: ApprovedRequest): Promise<void> {
    const { version_id } = r.payload as { version_id: string };
    const cur = await tx.client.query<{ status: string }>(
      'SELECT status FROM config.config_versions WHERE id = $1 FOR UPDATE',
      [version_id],
    );
    if (cur.rows[0]?.status !== 'pending_approval') throw new AppError('CONFIG_STALE', 409);
  }

  private async applyApproved(tx: Tx, r: ApprovedRequest): Promise<void> {
    const p = r.payload as {
      version_id: string;
      key: string;
      version: number;
      effective_from: string;
      rollback_of_version: number | null;
    };
    const effective = new Date(p.effective_from);
    const rollback = p.rollback_of_version !== null;
    const base = {
      tenantId: r.tenantId,
      actorId: r.approvedBy,
      actorRole: r.approverRole,
      targetType: 'config_item',
      targetId: p.key,
      reason: r.reason,
      approvalRequestId: r.id,
      correlationId: r.correlationId,
    };
    if (effective.getTime() > this.clock.now().getTime()) {
      // Later: the worker activates it at its effective time. Other pending proposals are stale from now on.
      await lockConfigKey(tx.client, p.key);
      await tx.client.query(
        "UPDATE config.config_versions SET status = 'scheduled' WHERE id = $1",
        [p.version_id],
      );
      await tx.client.query(
        `UPDATE config.config_versions SET status = 'stale'
          WHERE key = $1 AND status = 'pending_approval' AND id <> $2`,
        [p.key, p.version_id],
      );
      await this.audit.record(tx, {
        ...base,
        action: 'config.scheduled',
        data: {
          key: p.key,
          version: p.version,
          effective_from: p.effective_from,
          requested_by: r.requestedBy,
        },
      });
      return;
    }
    const res = await activateVersion(tx.client, p.version_id);
    this.reader.invalidate(p.key);
    await this.audit.record(tx, {
      ...base,
      action: rollback ? 'config.rolled_back' : 'config.activated',
      data: {
        key: p.key,
        version: p.version,
        previous_version: res.previousVersion,
        rollback_of_version: p.rollback_of_version,
        effective_from: p.effective_from,
        requested_by: r.requestedBy,
        marked_stale: res.staled,
      },
    });
    await this.outbox.write(tx, {
      topic: 'config.activated',
      tenantId: r.tenantId,
      correlationId: r.correlationId,
      payload: { key: p.key, version: p.version, effective_from: p.effective_from },
    });
  }

  // --- helpers ----------------------------------------------------------------------------------------

  private assertKey(key: string): void {
    if (!(configKeys as string[]).includes(key)) throw new AppError('NOT_FOUND', 404);
  }

  private versionNumber(v: unknown, name: string): number {
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1) {
      throw new AppError('VALIDATION_FAILED', 422, [
        { path: name, message_key: 'validation.config.bad_version' },
      ]);
    }
    return n;
  }

  /** Checks a value against the setting's schema. 422 CONFIG_INVALID names each problem. */
  private validValue(key: ConfigKey, value: unknown, path = 'value'): unknown {
    const parsed = configRegistry[key].schema.safeParse(value);
    if (parsed.success) return parsed.data;
    throw new AppError(
      'CONFIG_INVALID',
      422,
      parsed.error.issues.map((i) => ({
        path: [path, ...i.path.map(String)].join('.'),
        message_key: `validation.config.${i.code}`,
      })),
    );
  }

  /** 409 CONFIG_SAFETY_LOCKED, audited in its own transaction so the event survives the failing request. */
  private async refuseIfLocked(p: Principal, key: string, reason: string): Promise<void> {
    if (!configRegistry[key as ConfigKey].safetyLocked) return;
    const correlationId = getContext()?.correlationId ?? 'unknown';
    await withTx(this.pool, { tenantId: p.tenantId, correlationId }, (tx) =>
      this.audit.record(tx, {
        tenantId: p.tenantId,
        actorId: p.userId,
        actorRole: p.roles[0] ?? null,
        action: 'config.refused_locked',
        targetType: 'config_item',
        targetId: key,
        reason,
        correlationId,
        data: { key },
      }),
    );
    throw new AppError('CONFIG_SAFETY_LOCKED', 409);
  }
}
