import { z } from 'zod';
import { AppModule } from '../app.module';
import { REGISTRY } from './registry';
import { collectControllers, routesOf, type RouteInfo } from './routes';
import { NAMED } from './schemas';

type Json = Record<string, unknown>;

const ERROR_TEXT: Record<number, string> = {
  400: 'Missing or malformed Idempotency-Key (IDEMPOTENCY_KEY_REQUIRED).',
  401: 'No valid token, or a second factor is required (UNAUTHENTICATED, MFA_REQUIRED).',
  403: 'The caller lacks the permission (FORBIDDEN).',
  404: 'The record does not exist for this caller (NOT_FOUND). Records of other tenants do not exist.',
  409: 'A rule refuses the action (for example SOD_CONFLICT, SELF_APPROVAL, NOT_PENDING, ELEVATION_ACTIVE, ELEVATION_READ_ONLY).',
  422: 'The input is invalid (VALIDATION_FAILED) or an idempotency key was reused with other content (IDEMPOTENCY_KEY_REUSED).',
  429: 'Too many requests (RATE_LIMITED). See Retry-After.',
  500: 'An unexpected failure (INTERNAL). The envelope carries the correlation ID to quote.',
};

/** Nest `:id` to OpenAPI `{id}`. */
const openApiPath = (p: string) => p.replace(/:([A-Za-z_]+)/g, '{$1}');

function componentSchemas(): Record<string, Json> {
  const reg = z.registry<{ id: string }>();
  for (const [id, schema] of Object.entries(NAMED)) reg.add(schema, { id });
  const out = z.toJSONSchema(reg, {
    target: 'draft-2020-12',
    uri: (id) => `#/components/schemas/${id}`,
  }) as { schemas: Record<string, Json> };
  const schemas: Record<string, Json> = {};
  for (const [id, s] of Object.entries(out.schemas)) {
    const { $schema: _s, $id: _i, ...rest } = s as Json;
    void _s;
    void _i;
    schemas[id] = rest;
  }
  return schemas;
}

const ref = (name: string): Json => ({ $ref: `#/components/schemas/${name}` });

function describe(route: RouteInfo, summary: string): string {
  const who = route.public
    ? 'Public: no token needed.'
    : route.permission
      ? `Needs the permission \`${route.permission}\`.`
      : 'Any signed-in caller; the service decides from the request.';
  const mfa = route.public ? '' : ' A privileged role also needs a second factor.';
  const elev =
    route.method !== 'GET' && !route.public && !route.elevationControl
      ? ' Refused while the caller has an active elevation.'
      : '';
  return `${summary} ${who}${mfa}${elev}`;
}

function operation(route: RouteInfo): Json {
  const doc = REGISTRY[route.key];
  if (!doc) throw new Error(`no registry entry for ${route.key}`);
  const mutating = route.method !== 'GET';
  const parameters: Json[] = [];
  for (const name of [...route.path.matchAll(/:([A-Za-z_]+)/g)].map((m) => m[1]!)) {
    parameters.push({
      name,
      in: 'path',
      required: true,
      schema: { type: 'string', format: 'uuid' },
    });
  }
  for (const q of doc.query ?? []) {
    parameters.push({
      name: q.name,
      in: 'query',
      required: q.required === true,
      description: q.description,
      schema: { type: 'string' },
    });
  }
  parameters.push({ $ref: '#/components/parameters/CorrelationId' });
  if (mutating && !route.public)
    parameters.push({ $ref: '#/components/parameters/IdempotencyKey' });

  const success = doc.status ?? route.httpCode ?? (route.method === 'POST' ? 201 : 200);
  const responses: Record<string, Json> = {};
  if (!doc.fails) {
    responses[String(success)] = doc.file
      ? {
          description: 'A file.',
          content: Object.fromEntries(
            Object.entries(doc.file).map(([type, d]) => [
              type,
              { schema: { type: 'string', description: d } },
            ]),
          ),
        }
      : doc.response
        ? {
            description: 'Success.',
            content: { 'application/json': { schema: ref(doc.response) } },
          }
        : { description: 'Success. No body.' };
    for (const s of doc.alsoStatus ?? []) {
      responses[String(s)] =
        s === 204
          ? { description: 'No content.' }
          : {
              description: 'Reported with the same body.',
              content: { 'application/json': { schema: ref(doc.response ?? 'ErrorEnvelope') } },
            };
    }
  }
  const errors = new Set<number>(doc.errors ?? []);
  if (!route.public) [401, 429].forEach((s) => errors.add(s));
  if (route.permission) errors.add(403);
  if (mutating && !route.public) errors.add(400);
  for (const s of [...errors].sort()) {
    responses[String(s)] = {
      description: ERROR_TEXT[s] ?? 'Error.',
      content: { 'application/json': { schema: ref('ErrorEnvelope') } },
    };
  }

  return {
    operationId: `${route.controller.replace(/Controller$/, '').toLowerCase()}_${route.handler}`,
    summary: doc.summary,
    description: describe(route, doc.summary),
    tags: [doc.tag],
    ...(route.public ? { security: [] } : { security: [{ bearerAuth: [] }] }),
    ...(route.permission ? { 'x-permission': route.permission } : {}),
    ...(route.authenticatedOnly ? { 'x-permission': 'service-checked' } : {}),
    parameters,
    ...(doc.request
      ? {
          requestBody: {
            required: true,
            content: { 'application/json': { schema: ref(doc.request) } },
          },
        }
      : {}),
    responses,
  };
}

/** The OpenAPI 3.1 document for the routes the API has right now. Deterministic: same code, same bytes. */
export function buildOpenApiDocument(version: string): Json {
  const routes = collectControllers(AppModule)
    .flatMap(routesOf)
    .sort((a, b) =>
      a.path === b.path ? a.method.localeCompare(b.method) : a.path.localeCompare(b.path),
    );
  const paths: Record<string, Json> = {};
  for (const r of routes) {
    const p = openApiPath(r.path);
    (paths[p] ??= {})[r.method.toLowerCase()] = operation(r);
  }
  return {
    openapi: '3.1.0',
    info: {
      title: 'PDFE API',
      version,
      description:
        'SIMULATION — NOT REAL MONEY. The HTTP contract of the PDFE platform foundation (Phase 2). All data is synthetic.',
      license: { name: 'Proprietary (simulation)', identifier: 'LicenseRef-PDFE-Simulation' },
    },
    servers: [{ url: 'http://localhost:4000', description: 'Local demo stack' }],
    tags: [
      { name: 'platform', description: 'Health and version' },
      { name: 'identity', description: 'The caller, users and roles' },
      { name: 'approvals', description: 'Maker-checker' },
      { name: 'tenancy', description: 'Read-only tenant elevation' },
      { name: 'audit', description: 'The tamper-evident audit trail' },
      { name: 'config', description: 'Versioned, approved, reversible settings' },
      { name: 'demo', description: 'Demonstrations for the DEMO mode only' },
    ],
    paths,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Access token of realm pdfe-demo.',
        },
      },
      parameters: {
        CorrelationId: {
          name: 'X-Correlation-Id',
          in: 'header',
          required: false,
          description:
            'Optional; 8 to 64 of A-Z a-z 0-9 . _ -. Echoed in the response, or generated.',
          schema: { type: 'string', pattern: '^[A-Za-z0-9._-]{8,64}$' },
        },
        IdempotencyKey: {
          name: 'Idempotency-Key',
          in: 'header',
          required: true,
          description:
            '8 to 128 visible characters. A repeat with the same content replays the stored response.',
          schema: { type: 'string', minLength: 8, maxLength: 128 },
        },
      },
      schemas: componentSchemas(),
    },
  };
}
