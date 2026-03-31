import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Context } from "./context.js";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
});

export const router = t.router;
export const middleware = t.middleware;
export const createCallerFactory = t.createCallerFactory;

/**
 * Public (unauthenticated) procedure.
 * No auth check — anyone can call these.
 */
export const publicProcedure = t.procedure;

/**
 * Auth middleware — ensures a valid user session exists on the context.
 */
const enforceAuth = middleware(async ({ ctx, next }) => {
  if (!ctx.user || !ctx.session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to perform this action.",
    });
  }

  return next({
    ctx: {
      // Narrow the types so downstream resolvers get non-nullable user/session
      user: ctx.user,
      session: ctx.session,
    },
  });
});

/**
 * Protected procedure — requires a valid authenticated session.
 */
export const protectedProcedure = publicProcedure.use(enforceAuth);

/**
 * Credit procedure — requires auth AND checks that the user has sufficient
 * credit balance before the mutation proceeds.
 *
 * Consumers pass the required amount via `ctx.meta.requiredCredits` or
 * through input validation — the middleware reads `input.amount` by default.
 */
const enforceCredits = middleware(async ({ ctx, next, getRawInput }) => {
  // TODO: Look up the user's current credit balance from DB
  // const balance = await ctx.db.credits.getBalance(ctx.user.id);
  const balance = BigInt(0); // stub

  // Attempt to read the required amount from the raw input
  const rawInput = await getRawInput();
  let requiredCredits = BigInt(0);
  if (
    rawInput &&
    typeof rawInput === "object" &&
    "amount" in rawInput &&
    (rawInput as Record<string, unknown>).amount != null
  ) {
    requiredCredits = BigInt((rawInput as Record<string, unknown>).amount as string | number);
  }

  if (balance < requiredCredits) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `Insufficient credits. Required: ${requiredCredits}, available: ${balance}.`,
    });
  }

  return next({
    ctx: {
      creditBalance: balance,
    },
  });
});

/**
 * Credit-gated procedure — requires auth + sufficient credit balance.
 */
export const creditProcedure = protectedProcedure.use(enforceCredits);
