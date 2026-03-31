import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { observable } from "@trpc/server/observable";
import { router, protectedProcedure, creditProcedure } from "../trpc.js";

/**
 * Job progress event emitted via SSE subscription.
 */
const jobProgressEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("progress"),
    /** 0-100 percentage. */
    percent: z.number().int().min(0).max(100),
    stage: z.string(),
    message: z.string(),
  }),
  z.object({
    type: z.literal("completed"),
    projectId: z.string().uuid(),
    previewUrl: z.string().url(),
  }),
  z.object({
    type: z.literal("failed"),
    error: z.string(),
  }),
]);

/** Zod schema for a generation job status. */
const jobStatusSchema = z.object({
  id: z.string(),
  projectId: z.string().uuid(),
  status: z.enum(["queued", "processing", "completed", "failed"]),
  progress: z.number().int().min(0).max(100),
  currentStage: z.string().nullable(),
  result: z
    .object({
      previewUrl: z.string().url(),
      contractAddresses: z.record(z.string()),
      generatedFiles: z.array(z.string()),
    })
    .nullable(),
  error: z.string().nullable(),
  createdAt: z.date(),
  completedAt: z.date().nullable(),
});

/**
 * Generation router — AI-powered dApp code generation.
 *
 * Flow:
 * 1. Client calls `start` to kick off a generation job.
 * 2. Job is enqueued in BullMQ for async processing.
 * 3. Client subscribes to `onJobProgress` SSE for real-time updates.
 * 4. Client can also poll `getJobStatus` for current state.
 */
export const generationRouter = router({
  /**
   * Start a new dApp generation job.
   * Deducts credits based on the template/complexity.
   */
  start: creditProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        /** Natural-language prompt describing what to build/change. */
        prompt: z.string().min(1).max(5000),
        /** Credit amount to reserve for this generation (in cents). */
        amount: z.string().default("50"),
        /** Additional context or constraints. */
        context: z
          .object({
            templateId: z.string().uuid().optional(),
            existingConfig: z.record(z.unknown()).optional(),
          })
          .optional(),
      }),
    )
    .output(
      z.object({
        jobId: z.string(),
        estimatedDurationMs: z.number(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      ctx.log.info(
        {
          projectId: input.projectId,
          promptLength: input.prompt.length,
        },
        "Starting generation job",
      );

      // TODO: Verify project exists and belongs to user
      // TODO: Deduct credits
      // TODO: Enqueue generation job in BullMQ
      // const job = await generationQueue.add("generate", {
      //   projectId: input.projectId,
      //   userId: ctx.user.id,
      //   prompt: input.prompt,
      //   context: input.context,
      // });

      return {
        jobId: "stub-job-id",
        estimatedDurationMs: 30_000,
      };
    }),

  /**
   * Get the current status of a generation job.
   */
  getJobStatus: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .output(jobStatusSchema)
    .query(async ({ input, ctx }) => {
      ctx.log.info({ jobId: input.jobId }, "Fetching generation job status");

      // TODO: Look up the BullMQ job by ID
      // TODO: Verify the job belongs to the authenticated user
      // const job = await generationQueue.getJob(input.jobId);
      // if (!job) throw new TRPCError({ code: "NOT_FOUND" });
      // if (job.data.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Job ${input.jobId} not found`,
      });
    }),

  /**
   * SSE subscription for real-time generation job progress.
   *
   * tRPC v11 supports server-sent events natively via `subscription`.
   * The client receives a stream of progress events until the job
   * completes or fails.
   */
  onJobProgress: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .subscription(({ input, ctx }) => {
      ctx.log.info(
        { jobId: input.jobId },
        "Client subscribed to job progress",
      );

      return observable<z.infer<typeof jobProgressEventSchema>>((emit) => {
        // TODO: Subscribe to BullMQ job events via Redis pub/sub
        // const listener = (progress: JobProgress) => {
        //   emit.next({
        //     type: "progress",
        //     percent: progress.percent,
        //     stage: progress.stage,
        //     message: progress.message,
        //   });
        // };
        //
        // const completedListener = (result: JobResult) => {
        //   emit.next({
        //     type: "completed",
        //     projectId: result.projectId,
        //     previewUrl: result.previewUrl,
        //   });
        //   emit.complete();
        // };
        //
        // const failedListener = (error: Error) => {
        //   emit.next({
        //     type: "failed",
        //     error: error.message,
        //   });
        //   emit.complete();
        // };

        // Stub: emit a fake progress event and complete
        const timer = setTimeout(() => {
          emit.next({
            type: "progress",
            percent: 0,
            stage: "queued",
            message: "Job queued — generation not yet implemented",
          });
        }, 100);

        // Cleanup function called when client disconnects
        return () => {
          clearTimeout(timer);
          ctx.log.info(
            { jobId: input.jobId },
            "Client unsubscribed from job progress",
          );
          // TODO: Unsubscribe from Redis pub/sub
        };
      });
    }),
});
