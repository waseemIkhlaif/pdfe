import { canonicalJson } from '../canonical-json';
import { sha256Hex } from '../hash';

export const GENESIS_HASH = '0'.repeat(64);

/** The fields that go into the hash: every column of an audit row except `seq` and `hash`. */
export interface AuditHashRow {
  id: string;
  tenant_id: string | null;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  reason: string | null;
  approval_request_id: string | null;
  elevation_id: string | null;
  correlation_id: string;
  /** ISO-8601 UTC with milliseconds, so a value read back from the database hashes the same. */
  occurred_at: string;
  data: Record<string, unknown>;
  prev_hash: string;
}

/** Canonical JSON (RFC 8785) of the row without `seq` and `hash`. */
export const serializeForHash = (row: AuditHashRow): string => canonicalJson(row);

/** hash = sha256(prev_hash ‖ canonical_json(row)). Shared by the writer and the verifier. */
export const chainHash = (prevHash: string, row: AuditHashRow): string =>
  sha256Hex(prevHash + serializeForHash(row));
