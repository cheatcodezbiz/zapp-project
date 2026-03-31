import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, creditProcedure } from "../trpc.js";

/** Zod schema for a simulation result. */
const simulationResultSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  status: z.enum(["pending", "running", "completed", "failed"]),
  /** Chain that was simulated against. */
  chain: z.string(),
  /** Simulation output — gas estimates, state changes, etc. */
  results: z
    .object({
      gasEstimate: z.string().nullable(),
      stateChanges: z.array(
        z.object({
          contract: z.string(),
          slot: z.string(),
          before: z.string(),
          after: z.string(),
        }),
      ),
      logs: z.array(z.string()),
      success: z.boolean(),
      errorMessage: z.string().nullable(),
    })
    .nullable(),
  createdAt: z.date(),
  completedAt: z.date().nullable(),
});

/**
 * Simulation router — run server-side dApp simulations.
 *
 * Simulations use a forked chain environment (e.g. Tenderly, Foundry Anvil)
 * to test contract interactions without spending real gas.
 */
export const simulationRouter = router({
  /**
   * Run a simulation for a project's current config.
   * Deducts credits for the simulation compute cost.
   */
  run: creditProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        /** Override the chain to simulate against (defaults to project chain). */
        chain: z.string().optional(),
        /** Credit amount to reserve for this simulation (in cents). */
        amount: z.string().default("10"),
        /** Optional parameters to pass to the simulation. */
        params: z.record(z.unknown()).optional(),
      }),
    )
    .output(
      z.object({
        simulationId: z.string().uuid(),
        status: z.enum(["pending", "running"]),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      ctx.log.info(
        { projectId: input.projectId, chain: input.chain },
        "Starting simulation",
      );

      // TODO: Verify the project exists and belongs to user
      // TODO: Deduct credits for simulation
      // TODO: Enqueue simulation job via BullMQ
      // const job = await simulationQueue.add("simulate", {
      //   projectId: input.projectId,
      //   userId: ctx.user.id,
      //   chain: input.chain ?? project.chain,
      //   params: input.params,
      // });

      return {
        simulationId: "00000000-0000-0000-0000-000000000000",
        status: "pending" as const,
      };
    }),

  /**
   * Get the results of a simulation by ID.
   */
  getResults: protectedProcedure
    .input(z.object({ simulationId: z.string().uuid() }))
    .output(simulationResultSchema)
    .query(async ({ input, ctx }) => {
      ctx.log.info(
        { simulationId: input.simulationId },
        "Fetching simulation results",
      );

      // TODO: Query simulation_results table
      // TODO: Verify ownership (simulation belongs to user's project)
      // const result = await ctx.db.query.simulationResults.findFirst({
      //   where: eq(simulationResults.id, input.simulationId),
      // });
      // if (!result) throw new TRPCError({ code: "NOT_FOUND" });

      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Simulation ${input.simulationId} not found`,
      });
    }),
});
