// ---------------------------------------------------------------------------
// Common utility types shared across the Zapp platform
// ---------------------------------------------------------------------------

/** Branded-type helper — prevents accidental mixing of structurally identical IDs. */
declare const __brand: unique symbol;
export type Brand<T, B extends string> = T & { readonly [__brand]: B };

// ---- Branded IDs ----
export type UserId = Brand<string, "UserId">;
export type ProjectId = Brand<string, "ProjectId">;
export type TemplateId = Brand<string, "TemplateId">;
export type DeploymentId = Brand<string, "DeploymentId">;
export type SimulationId = Brand<string, "SimulationId">;
export type TransactionId = Brand<string, "TransactionId">;
export type SessionId = Brand<string, "SessionId">;

// ---- Ethereum primitives ----
/** 0x-prefixed Ethereum address (42 hex chars). */
export type EthAddress = Brand<`0x${string}`, "EthAddress">;

/** 0x-prefixed transaction hash (66 hex chars). */
export type TxHash = Brand<`0x${string}`, "TxHash">;

// ---- Supported chains ----
export const SUPPORTED_CHAIN_IDS = [1, 8453, 42161, 137] as const;
export type ChainId = (typeof SUPPORTED_CHAIN_IDS)[number];

export interface ChainMeta {
  chainId: ChainId;
  name: string;
  /** Short lowercase slug used in URLs and config keys (e.g. "base", "arbitrum"). */
  slug: string;
  explorerUrl: string;
  rpcUrl: string;
}

// ---- Pagination ----
export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ---- Timestamps ----
/** ISO-8601 date-time string. */
export type ISOTimestamp = Brand<string, "ISOTimestamp">;

export interface Timestamped {
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}

// ---- Result wrapper ----
export type Result<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E };

// ---- Misc ----
/** Makes selected keys required while keeping the rest unchanged. */
export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

/** Deep-readonly version of T. */
export type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};
