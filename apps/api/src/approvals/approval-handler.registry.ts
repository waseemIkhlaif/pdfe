import { Injectable } from '@nestjs/common';
import type { PoolClient } from 'pg';

/** What a handler receives: the approved request, and the caller's transaction. */
export interface ApprovedRequest {
  id: string;
  tenantId: string;
  actionType: string;
  targetType: string;
  targetId: string | null;
  payload: Record<string, unknown>;
  requestedBy: string;
  /** The user whose decision completed the approval. */
  approvedBy: string;
  /** The role the approver acted in, for the audit event. */
  approverRole: string | null;
  reason: string;
  /** Correlation ID of the request that completes the approval (the one being served now). */
  correlationId: string;
  /** Correlation ID of the request that created the approval request. */
  requestCorrelationId: string;
}

export interface ApprovalHandler {
  /**
   * Runs before the decision is audited, only when this decision would complete the approval. It may refuse
   * (throw) and may write its own refusal audit in a separate transaction, because no audit lock is held yet.
   */
  validate?(tx: { client: PoolClient }, request: ApprovedRequest): Promise<void>;
  /** Applies the action, in the approval's transaction. Runs once per approval ID. */
  apply(tx: { client: PoolClient }, request: ApprovedRequest): Promise<void>;
}

/**
 * Owning modules register one handler per `action_type`. When a request is approved, its handler runs once per
 * approval ID, in the same transaction as the approval, so the decision and the action succeed or fail together.
 */
@Injectable()
export class ApprovalHandlerRegistry {
  private readonly handlers = new Map<string, ApprovalHandler>();

  register(actionType: string, handler: ApprovalHandler): void {
    if (this.handlers.has(actionType)) {
      throw new Error(`approval handler for ${actionType} is already registered`);
    }
    this.handlers.set(actionType, handler);
  }

  get(actionType: string): ApprovalHandler | undefined {
    return this.handlers.get(actionType);
  }
}
