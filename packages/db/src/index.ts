// ---------------------------------------------------------------------------
// @zapp/db — public API
// ---------------------------------------------------------------------------

// Re-export all schema tables, enums, and relations
export * from "./schema";

// Re-export the singleton database client
export { getDb } from "./client";
export type { Database } from "./client";

// Re-export Drizzle utilities consumers frequently need
export { eq, and, or, desc, asc, sql, inArray, isNull, lt, gt, gte } from "drizzle-orm";

// Re-export InferSelectModel / InferInsertModel for type derivation
export type { InferSelectModel, InferInsertModel } from "drizzle-orm";
