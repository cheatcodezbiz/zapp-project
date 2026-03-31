import type { IncomingMessage } from "node:http";
import { logger } from "./lib/logger.js";
import {
  getDb,
  users,
  sessions,
  creditBalances,
  eq,
  and,
} from "@zapp/db";

// Well-known anonymous user for pre-auth MVP (matches conversation-store)
const ANON_USER_ID = "00000000-0000-0000-0000-000000000000";
const ANON_SESSION_ID = "00000000-0000-0000-0000-000000000001";

let anonBootstrapped = false;

/** Represents an authenticated user record from the DB. */
export interface User {
  id: string;
  walletAddress: string;
  createdAt: Date;
}

/** Represents a session object. */
export interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
}

export interface Context {
  /** Authenticated user, or null for public procedures. */
  user: User | null;
  /** Session data, or null if unauthenticated. */
  session: Session | null;
  /** Structured logger instance. */
  log: typeof logger;
}

/**
 * Ensure the anonymous user + credit balance exist in the DB.
 * Called once per process lifetime.
 */
async function ensureAnonUser(): Promise<void> {
  if (anonBootstrapped) return;
  const db = getDb();

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, ANON_USER_ID))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(users).values({
      id: ANON_USER_ID,
      walletAddress: "anonymous",
    });
  }

  // Ensure credit balance row exists
  const bal = await db
    .select({ id: creditBalances.id })
    .from(creditBalances)
    .where(eq(creditBalances.userId, ANON_USER_ID))
    .limit(1);

  if (bal.length === 0) {
    await db.insert(creditBalances).values({
      userId: ANON_USER_ID,
      balance: 10_000, // $100 starter credits for MVP
    });
  }

  anonBootstrapped = true;
}

/**
 * Creates the tRPC context for every incoming request.
 *
 * For MVP (wallet gate disabled): always provides the anonymous user
 * so protectedProcedure works without real auth.
 *
 * When real auth is re-enabled: validates Bearer token against sessions table.
 */
export async function createContext(opts: {
  req: IncomingMessage;
}): Promise<Context> {
  const { req } = opts;

  // Extract Bearer token
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  let user: User | null = null;
  let session: Session | null = null;

  if (token) {
    // Try to validate against sessions table
    try {
      const db = getDb();
      const [sess] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.token, token))
        .limit(1);

      if (sess && sess.expiresAt > new Date()) {
        const [u] = await db
          .select()
          .from(users)
          .where(eq(users.id, sess.userId))
          .limit(1);

        if (u) {
          user = {
            id: u.id,
            walletAddress: u.walletAddress,
            createdAt: u.createdAt,
          };
          session = {
            id: sess.id,
            userId: sess.userId,
            expiresAt: sess.expiresAt,
          };
        }
      }
    } catch (err) {
      logger.warn({ err }, "Session validation failed, falling back to anon");
    }
  }

  // MVP fallback: if no valid session, use anonymous user
  if (!user) {
    try {
      await ensureAnonUser();
      user = {
        id: ANON_USER_ID,
        walletAddress: "anonymous",
        createdAt: new Date(),
      };
      session = {
        id: ANON_SESSION_ID,
        userId: ANON_USER_ID,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      };
    } catch (err) {
      logger.error({ err }, "Failed to bootstrap anonymous user");
    }
  }

  return {
    user,
    session,
    log: logger,
  };
}
