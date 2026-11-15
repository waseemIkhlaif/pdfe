import { readFileSync } from 'node:fs';
import {
  ADAPTER_KINDS,
  adapterConfigSchema,
  isAdapterKind,
  mockTypeFor,
  type AdapterConfig,
} from '@pdfe/domain-types';
import { StartupRefusedError } from '@pdfe/platform-core';

/** Safe built-in configuration, used only when no file is configured (every kind is its own mock). */
export const defaultAdapterConfig = (): AdapterConfig =>
  Object.fromEntries(ADAPTER_KINDS.map((k) => [k, mockTypeFor(k)])) as AdapterConfig;

/**
 * Reads the adapter configuration and refuses (StartupRefusedError) when anything is off: an unreadable file,
 * an unknown or missing kind, a type outside the mock allowlist, or a mock type with no implementation.
 * Every problem is listed, naming the key, so the operator can fix them in one go (FR-006).
 */
export function loadAdapterConfig(path?: string): AdapterConfig {
  if (path === undefined || path === '') return defaultAdapterConfig();

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    throw new StartupRefusedError(
      `adapter configuration ${path} cannot be read: ${(err as Error).message}`,
    );
  }
  const parsed = adapterConfigSchema.safeParse(raw);
  if (!parsed.success)
    throw new StartupRefusedError(
      `adapter configuration ${path} must map each kind to a type name.`,
    );

  const problems: string[] = [];
  const entries = parsed.data;
  for (const key of Object.keys(entries)) {
    if (!isAdapterKind(key)) problems.push(`unknown adapter kind: ${key}`);
  }
  for (const kind of ADAPTER_KINDS) {
    const type = entries[kind];
    if (type === undefined) {
      problems.push(`missing adapter kind: ${kind}`);
    } else if (!type.startsWith('mock:')) {
      problems.push(`${kind}: ${type} is not a mock adapter (only mock adapters are allowed)`);
    } else if (type !== mockTypeFor(kind)) {
      problems.push(
        `${kind}: ${type} has no registered implementation (expected ${mockTypeFor(kind)})`,
      );
    }
  }
  if (problems.length > 0)
    throw new StartupRefusedError(`adapter configuration refused. ${problems.join('; ')}`);
  return entries as AdapterConfig;
}
