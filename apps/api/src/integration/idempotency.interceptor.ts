import {
  HttpException,
  Inject,
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { from, lastValueFrom, type Observable } from 'rxjs';
import type { ConfigReader } from '@pdfe/domain-types';
import { AppError, canonicalJson, sha256Hex, type ClockService } from '@pdfe/platform-core';
import { withTx, type Pool } from '@pdfe/platform-core/db';
import { CLOCK, CONFIG_READER, PG_POOL } from '../core/tokens';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
/** 8 to 128 visible ASCII characters. */
const KEY = /^[\x21-\x7e]{8,128}$/;

/** Carries a stored response back to the client. The exception filter sends it as is. */
export class IdempotentReplay extends HttpException {
  constructor(
    readonly replayStatus: number,
    readonly replayBody: unknown,
  ) {
    super('replay', replayStatus);
  }
}

interface KeyRow {
  request_hash: string;
  status: 'in_progress' | 'completed' | 'failed';
  response: unknown;
  response_status: number | null;
  expires_at: Date;
}

/**
 * POST, PUT, PATCH and DELETE under /v1 need an `Idempotency-Key`. The key is claimed in its own committed
 * transaction (so a concurrent duplicate sees `in_progress`), the handler runs in the request transaction,
 * and the outcome is stored in a third. A failed run releases the key so the client can retry.
 * It runs after the guards, so the tenant is known and unauthenticated calls are refused first.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(CLOCK) private readonly clock: ClockService,
    @Inject(CONFIG_READER) private readonly config: ConfigReader,
  ) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const p = req.principal;
    if (!p || !MUTATING.has(req.method) || !req.originalUrl.startsWith('/v1')) return next.handle();
    const key = req.header('idempotency-key');
    if (!key || !KEY.test(key)) throw new AppError('IDEMPOTENCY_KEY_REQUIRED', 400);

    const scope = `${req.method} ${String(req.route?.path ?? req.path)}`;
    const hash = sha256Hex(
      canonicalJson({ method: req.method, url: req.originalUrl, body: req.body ?? null }),
    );
    const successStatus: number =
      (Reflect.getMetadata('__httpCode__', ctx.getHandler()) as number | undefined) ??
      (req.method === 'POST' ? 201 : 200);

    return from(this.run(p.tenantId, scope, key, hash, successStatus, next));
  }

  private async run(
    tenantId: string,
    scope: string,
    key: string,
    hash: string,
    successStatus: number,
    next: CallHandler,
  ): Promise<unknown> {
    const ttlHours = await this.config.get('idempotency.ttl_hours');
    const now = this.clock.now();
    const expires = new Date(now.getTime() + ttlHours * 3_600_000);

    const claim = await withTx(this.pool, { tenantId }, async ({ client }) => {
      const ins = await client.query(
        `INSERT INTO integration.idempotency_keys
           (tenant_id, scope, key, request_hash, status, created_at, expires_at)
         VALUES ($1,$2,$3,$4,'in_progress',$5,$6) ON CONFLICT DO NOTHING`,
        [tenantId, scope, key, hash, now.toISOString(), expires.toISOString()],
      );
      if (ins.rowCount) return { replay: null };
      const r = await client.query<KeyRow>(
        `SELECT request_hash, status, response, response_status, expires_at
           FROM integration.idempotency_keys WHERE tenant_id = $1 AND scope = $2 AND key = $3 FOR UPDATE`,
        [tenantId, scope, key],
      );
      const row = r.rows[0]!;
      const reuse = async (): Promise<{ replay: null }> => {
        await client.query(
          `UPDATE integration.idempotency_keys
              SET request_hash = $4, status = 'in_progress', response = NULL, response_status = NULL,
                  created_at = $5, expires_at = $6
            WHERE tenant_id = $1 AND scope = $2 AND key = $3`,
          [tenantId, scope, key, hash, now.toISOString(), expires.toISOString()],
        );
        return { replay: null };
      };
      if (row.expires_at.getTime() <= now.getTime()) return reuse();
      if (row.request_hash !== hash) throw new AppError('IDEMPOTENCY_KEY_REUSED', 422);
      if (row.status === 'in_progress') throw new AppError('IDEMPOTENCY_IN_PROGRESS', 409);
      if (row.status === 'failed') return reuse();
      return { replay: { status: row.response_status ?? 200, body: row.response } };
    });
    if (claim.replay) throw new IdempotentReplay(claim.replay.status, claim.replay.body);

    try {
      const result = await lastValueFrom(next.handle(), { defaultValue: undefined });
      await this.finish(tenantId, scope, key, 'completed', successStatus, result ?? null);
      return result;
    } catch (err) {
      await this.finish(tenantId, scope, key, 'failed', null, null).catch(() => undefined);
      throw err;
    }
  }

  private finish(
    tenantId: string,
    scope: string,
    key: string,
    status: 'completed' | 'failed',
    responseStatus: number | null,
    response: unknown,
  ): Promise<unknown> {
    return withTx(this.pool, { tenantId }, ({ client }) =>
      client.query(
        `UPDATE integration.idempotency_keys SET status = $4, response = $5, response_status = $6
          WHERE tenant_id = $1 AND scope = $2 AND key = $3`,
        [tenantId, scope, key, status, JSON.stringify(response), responseStatus],
      ),
    );
  }
}
