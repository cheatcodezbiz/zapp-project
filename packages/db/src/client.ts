// ---------------------------------------------------------------------------
// Drizzle client singleton — shared database connection
// ---------------------------------------------------------------------------

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

let _db: ReturnType<typeof drizzle> | null = null;

/**
 * Returns a singleton Drizzle client backed by postgres.js.
 * Reads DATABASE_URL from environment. Throws if not set.
 */
export function getDb() {
  if (_db) return _db;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL environment variable is required for database access",
    );
  }

  const queryClient = postgres(url, {
    // Supabase direct connection defaults
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  _db = drizzle(queryClient);
  return _db;
}

export type Database = ReturnType<typeof getDb>;
