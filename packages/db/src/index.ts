// ---------------------------------------------------------------------------
// @zapp/db — public API
// ---------------------------------------------------------------------------

// Re-export all schema tables, enums, and relations
export * from "./schema";

// Re-export Drizzle utilities consumers frequently need
export { eq, and, or, desc, asc, sql, inArray, isNull } from "drizzle-orm";

// Re-export InferSelectModel / InferInsertModel for type derivation
export type { InferSelectModel, InferInsertModel } from "drizzle-orm";
