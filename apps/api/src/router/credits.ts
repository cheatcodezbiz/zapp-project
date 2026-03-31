import { z } from "zod";
import { router, protectedProcedure, creditProcedure } from "../trpc.js";

/**
 * Credits router — manages USD-cent credit balances.
 *
 * Credits are stored as BIGINT cents (1 USD = 100 credits).
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
        /** Balance in cents as a bigint-compatible string. */
        balance: z.string(),
        /** ISO currency code — always USD. */
        currency: z.literal("USD"),
      }),
    )
    .query(async ({ ctx }) => {
      ctx.log.info({ userId: ctx.user.id }, "Fetching credit balance");

      // TODO: Query the credits table for this user's current balance
      // const row = await ctx.db.query.credits.findFirst({
      //   where: eq(credits.userId, ctx.user.id),
      // });

      return {
        balance: "0", // BigInt serialized as string via superjson
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
            type: z.enum(["deposit", "charge", "refund"]),
            /** Amount in cents — positive for deposits/refunds, negative for charges. */
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

      // TODO: Query credit_transactions table with cursor-based pagination
      // const transactions = await ctx.db.query.creditTransactions.findMany({
      //   where: and(
      //     eq(creditTransactions.userId, ctx.user.id),
      //     input.cursor ? lt(creditTransactions.id, input.cursor) : undefined,
      //   ),
      //   orderBy: desc(creditTransactions.createdAt),
      //   limit: input.limit + 1, // fetch one extra to determine nextCursor
      // });

      return {
        items: [],
        nextCursor: null,
      };
    }),

  /**
   * Record a crypto deposit that has been confirmed on-chain.
   *
   * In production this would be called by the payment webhook handler
   * after verifying the on-chain transaction. For now, it's a protected
   * endpoint for development/testing.
   */
  recordDeposit: protectedProcedure
    .input(
      z.object({
        /** Amount in USD cents. */
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
        /** The source chain (e.g. "ethereum", "polygon", "solana"). */
        sourceChain: z.string().min(1),
        /** The on-chain transaction hash. */
        txHash: z.string().min(1),
        /** The token symbol that was deposited (e.g. "USDC", "ETH"). */
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

      // TODO: Verify the tx hash hasn't already been recorded (idempotency)
      // TODO: Insert a credit_transaction record with type "deposit"
      // TODO: Update the user's credit balance (atomic increment)
      // TODO: Return the new balance

      return {
        transactionId: "stub-tx-id",
        newBalance: input.amount,
      };
    }),

  /**
   * Example of a credit-gated procedure — deducts credits for a paid action.
   * Used internally by other routers (e.g. generation) via procedure composition.
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

      // TODO: Atomic decrement of user's balance
      // TODO: Insert credit_transaction with type "charge"
      // TODO: Return new balance

      return {
        transactionId: "stub-deduct-id",
        newBalance: "0",
      };
    }),
});
