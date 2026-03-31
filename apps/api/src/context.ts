import type { IncomingMessage } from "node:http";
import { logger } from "./lib/logger.js";

// ---- Placeholder types until @zapp/db and better-auth are wired up ----

/** Represents an authenticated user record from the DB. */
export interface User {
  id: string;
  walletAddress: string;
  createdAt: Date;
}

/** Represents a session object from better-auth. */
export interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
}

/** Placeholder for the Drizzle DB client from @zapp/db. */
export type Db = Record<string, unknown>;

// -----------------------------------------------------------------------

export interface Context {
  /** Authenticated user, or null for public procedures. */
  user: User | null;
  /** Session data, or null if unauthenticated. */
  session: Session | null;
  /** Drizzle database client. */
  db: Db;
  /** Structured logger instance. */
  log: typeof logger;
}

/**
 * Creates the tRPC context for every incoming request.
 *
 * This function:
 * 1. Extracts the Bearer token from the Authorization header.
 * 2. Validates the session via better-auth.
 * 3. Loads the user record from the DB.
 */
export async function createContext(opts: {
  req: IncomingMessage;
}): Promise<Context> {
  const { req } = opts;

  // TODO: Initialize the real Drizzle client (import from @zapp/db)
  const db: Db = {};

  // Extract Bearer token
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  let user: User | null = null;
  let session: Session | null = null;

  if (token) {
    // TODO: Validate the token via better-auth and load the user from DB
    // const authResult = await auth.validateSession(token);
    // if (authResult) {
    //   session = authResult.session;
    //   user = await db.query.users.findFirst({ where: eq(users.id, authResult.session.userId) });
    // }
    logger.debug({ hasToken: true }, "Auth token present but validation not yet implemented");
  }

  return {
    user,
    session,
    db,
    log: logger,
  };
}
