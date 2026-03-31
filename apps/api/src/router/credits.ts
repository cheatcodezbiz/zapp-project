import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, creditProcedure } from "../trpc.js";
import {
  getDb,
  creditBalances,
  creditTransactions,
  eq,
  desc,
  lt,
  sql,
} from "@zapp/db";

/**
 * Ensure a credit_balances row exists for the user.
 * Returns the current balance in cents.
 */
async function ensureCreditBalance(userId: string): Promise<number> {
  const db = getDb();
  const [existing] = await db
    .select({ balance: creditBalances.balance })
    .from(creditBalances)
    .where(eq(creditBalances.userId, userId))
    .limit(1);

  if (existing) return existing.balance;

  // Create with 0 balance
  const [row] = await db
    .insert(creditBalances)
    .values({ userId, balance: 0 })
    .returning({ balance: creditBalances.balance });

  return row!.balance;
}

/**
 * Credits router — manages USD-cent credit balances.
 *
 * Credits are stored as integer cents (1 USD = 100 credits).
 * Users deposit any supported crypto which is converted to USD credits.
 * No native platform token — credits are the universal unit.
 */
export const creditsRouter = router({
  /**
   * Get the current user's credit balance.
   */
  getBalance: protectedProcedure
    .output(
      z.object({
        balance: z.string(),
        currency: z.literal("USD"),
      }),
    )
    .query(async ({ ctx }) => {
      ctx.log.info({ userId: ctx.user.id }, "Fetching credit balance");

      const balance = await ensureCreditBalance(ctx.user.id);

      return {
        balance: String(balance),
        currency: "USD" as const,
      };
    }),

  /**
   * Get paginated transaction history for the current user.
   */
  getTransactions: protectedProcedure
    .input(
      z.object({
        cursor: z.string().nullish(),
        limit: z.number().int().min(1).max(100).default(20),
      }),
    )
    .output(
      z.object({
        items: z.array(
          z.object({
            id: z.string(),
            type: z.enum(["deposit", "spend", "refund", "adjustment"]),
            amount: z.string(),
            description: z.string(),
            createdAt: z.date(),
          }),
        ),
        nextCursor: z.string().nullish(),
      }),
    )
    .query(async ({ input, ctx }) => {
      ctx.log.info(
        { userId: ctx.user.id, cursor: input.cursor, limit: input.limit },
        "Fetching credit transactions",
      );

      const db = getDb();
      const conditions = [eq(creditTransactions.userId, ctx.user.id)];

      if (input.cursor) {
        // Cursor-based pagination using createdAt of cursor row
        const [cursorRow] = await db
          .select({ createdAt: creditTransactions.createdAt })
          .from(creditTransactions)
          .where(eq(creditTransactions.id, input.cursor))
          .limit(1);

        if (cursorRow) {
          conditions.push(lt(creditTransactions.createdAt, cursorRow.createdAt));
        }
      }

      const rows = await db
        .select()
        .from(creditTransactions)
        .where(conditions.length > 1 ? sql`${conditions[0]} AND ${conditions[1]}` : conditions[0]!)
        .orderBy(desc(creditTransactions.createdAt))
        .limit(input.limit + 1);

      let nextCursor: string | null = null;
      if (rows.length > input.limit) {
        const last = rows.pop()!;
        nextCursor = last.id;
      }

      return {
        items: rows.map((r) => ({
          id: r.id,
          type: r.type as "deposit" | "spend" | "refund" | "adjustment",
          amount: String(r.amount),
          description: r.description ?? "",
          createdAt: r.createdAt,
        })),
        nextCursor,
      };
    }),

  /**
   * Record a crypto deposit that has been confirmed on-chain.
   */
  recordDeposit: protectedProcedure
    .input(
      z.object({
        amount: z.string().refine(
          (v) => {
            try {
              return BigInt(v) > 0n;
            } catch {
              return false;
            }
          },
          { message: "Amount must be a positive integer string (cents)" },
        ),
        sourceChain: z.string().min(1),
        txHash: z.string().min(1),
        tokenSymbol: z.string().min(1),
      }),
    )
    .output(
      z.object({
        transactionId: z.string(),
        newBalance: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      ctx.log.info(
        {
          userId: ctx.user.id,
          amount: input.amount,
          chain: input.sourceChain,
          txHash: input.txHash,
        },
        "Recording credit deposit",
      );

      const db = getDb();
      const amountCents = Number(input.amount);

      // Idempotency check: don't re-record same txHash
      const [existing] = await db
        .select({ id: creditTransactions.id })
        .from(creditTransactions)
        .where(eq(creditTransactions.referenceId, input.txHash))
        .limit(1);

      if (existing) {
        // Already recorded — fetch current balance and return
        const bal = await ensureCreditBalance(ctx.user.id);
        return { transactionId: existing.id, newBalance: String(bal) };
      }

      // Ensure balance row exists then atomic increment
      await ensureCreditBalance(ctx.user.id);

      const [updated] = await db
        .update(creditBalances)
        .set({
          balance: sql`${creditBalances.balance} + ${amountCents}`,
        })
        .where(eq(creditBalances.userId, ctx.user.id))
        .returning({ balance: creditBalances.balance });

      const newBalance = updated!.balance;

      // Insert transaction record
      const [tx] = await db
        .insert(creditTransactions)
        .values({
          userId: ctx.user.id,
          type: "deposit",
          amount: amountCents,
          balanceAfter: newBalance,
          description: `${input.tokenSymbol} deposit from ${input.sourceChain}`,
          referenceId: input.txHash,
          referenceType: "tx_hash",
        })
        .returning({ id: creditTransactions.id });

      return {
        transactionId: tx!.id,
        newBalance: String(newBalance),
      };
    }),

  /**
   * Deduct credits for a paid action.
   */
  deductCredits: creditProcedure
    .input(
      z.object({
        amount: z.string().refine(
          (v) => {
            try {
              return BigInt(v) > 0n;
            } catch {
              return false;
            }
          },
          { message: "Amount must be a positive integer string (cents)" },
        ),
        description: z.string().min(1),
      }),
    )
    .output(
      z.object({
        transactionId: z.string(),
        newBalance: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      ctx.log.info(
        { userId: ctx.user.id, amount: input.amount, desc: input.description },
        "Deducting credits",
      );

      const db = getDb();
      const amountCents = Number(input.amount);

      // Atomic decrement with non-negative check
      const [updated] = await db
        .update(creditBalances)
        .set({
          balance: sql`${creditBalances.balance} - ${amountCents}`,
        })
        .where(eq(creditBalances.userId, ctx.user.id))
        .returning({ balance: creditBalances.balance });

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update credit balance",
        });
      }

      // Insert transaction record
      const [tx] = await db
        .insert(creditTransactions)
        .values({
          userId: ctx.user.id,
          type: "spend",
          amount: -amountCents,
          balanceAfter: updated.balance,
          description: input.description,
        })
        .returning({ id: creditTransactions.id });

      return {
        transactionId: tx!.id,
        newBalance: String(updated.balance),
      };
    }),
});
