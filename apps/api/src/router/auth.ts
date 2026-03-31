import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc.js";

/**
 * Auth router — handles wallet-based SIWE authentication.
 *
 * Flow:
 * 1. Client calls `getNonce` to get a one-time nonce.
 * 2. Client signs the SIWE message in the browser wallet.
 * 3. Client calls `verify` with the message + signature.
 * 4. Server validates, creates/finds user, returns session token.
 */
export const authRouter = router({
  /**
   * Get a one-time nonce for SIWE message signing.
   * Public — no auth required.
   */
  getNonce: publicProcedure
    .input(
      z.object({
        walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid EVM address"),
      }),
    )
    .output(
      z.object({
        nonce: z.string(),
        expiresAt: z.date(),
      }),
    )
    .query(async ({ input, ctx }) => {
      ctx.log.info({ wallet: input.walletAddress }, "Generating SIWE nonce");

      // TODO: Generate a cryptographically random nonce
      // TODO: Store nonce in DB/cache with TTL (e.g. 5 minutes)
      const nonce = "stub-nonce-" + Date.now().toString(36);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      return { nonce, expiresAt };
    }),

  /**
   * Verify a signed SIWE message and create a session.
   * Public — no auth required (this IS the auth step).
   */
  verify: publicProcedure
    .input(
      z.object({
        message: z.string().min(1, "SIWE message is required"),
        signature: z.string().min(1, "Signature is required"),
      }),
    )
    .output(
      z.object({
        token: z.string(),
        user: z.object({
          id: z.string(),
          walletAddress: z.string(),
        }),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      ctx.log.info("Verifying SIWE signature");

      // TODO: Parse the SIWE message to extract wallet address, nonce, etc.
      // TODO: Verify the nonce hasn't expired and hasn't been used
      // TODO: Verify the signature matches the message using viem or ethers
      // TODO: Find or create user in DB based on wallet address
      // TODO: Create a session via better-auth
      // TODO: Invalidate the used nonce

      return {
        token: "stub-session-token",
        user: {
          id: "stub-user-id",
          walletAddress: "0x0000000000000000000000000000000000000000",
        },
      };
    }),

  /**
   * Get the current session and user info.
   * Protected — requires a valid session.
   */
  getSession: protectedProcedure
    .output(
      z.object({
        user: z.object({
          id: z.string(),
          walletAddress: z.string(),
          createdAt: z.date(),
        }),
        session: z.object({
          id: z.string(),
          expiresAt: z.date(),
        }),
      }),
    )
    .query(async ({ ctx }) => {
      // Auth is already enforced by protectedProcedure middleware
      return {
        user: {
          id: ctx.user.id,
          walletAddress: ctx.user.walletAddress,
          createdAt: ctx.user.createdAt,
        },
        session: {
          id: ctx.session.id,
          expiresAt: ctx.session.expiresAt,
        },
      };
    }),

  /**
   * Log out — invalidate the current session.
   * Protected — requires a valid session to destroy it.
   */
  logout: protectedProcedure.mutation(async ({ ctx }) => {
    ctx.log.info({ userId: ctx.user.id }, "User logging out");

    // TODO: Invalidate the session in better-auth / DB
    // await auth.invalidateSession(ctx.session.id);

    return { success: true };
  }),
});
