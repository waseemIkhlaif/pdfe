import { z } from 'zod';

/** Every external dependency of the platform is reached through one of these kinds (FR-005). */
export const ADAPTER_KINDS = [
  'bank',
  'psp',
  'chain',
  'kyc',
  'sanctions',
  'fx',
  'price',
  'notification',
] as const;
export type AdapterKind = (typeof ADAPTER_KINDS)[number];

export const isAdapterKind = (k: string): k is AdapterKind =>
  (ADAPTER_KINDS as readonly string[]).includes(k);

/** The only adapter type that exists for a kind in DEMO mode. */
export const mockTypeFor = (kind: AdapterKind): string => `mock:${kind}`;

/** Phase 2 ports only prove reachability. Domain operations arrive with their phases. */
export interface AdapterPing {
  kind: AdapterKind;
  status: 'ok';
  type: string;
}

/** Common surface of every adapter. Each phase adds its own operations to the specific port. */
export interface AdapterPort {
  readonly kind: AdapterKind;
  /** The adapter type, for example mock:bank. */
  readonly type: string;
  ping(): Promise<AdapterPing>;
}

export type BankPort = AdapterPort & { readonly kind: 'bank' };
export type PspPort = AdapterPort & { readonly kind: 'psp' };
export type ChainPort = AdapterPort & { readonly kind: 'chain' };
export type KycPort = AdapterPort & { readonly kind: 'kyc' };
export type SanctionsPort = AdapterPort & { readonly kind: 'sanctions' };
export type FxPort = AdapterPort & { readonly kind: 'fx' };
export type PricePort = AdapterPort & { readonly kind: 'price' };
export type NotificationPort = AdapterPort & { readonly kind: 'notification' };

/** Shape of the adapter configuration file: kind to adapter type. */
export const adapterConfigSchema = z.record(z.string(), z.string());
export type AdapterConfig = Record<AdapterKind, string>;
