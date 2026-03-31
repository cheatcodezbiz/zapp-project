import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc.js";
import {
  getDb,
  deployments,
  projects,
  eq,
  and,
  desc,
} from "@zapp/db";

const deploymentStatusEnum = z.enum([
  "pending",
  "deploying",
  "deployed",
  "failed",
  "verified",
]);

const deploymentSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  versionId: z.string().uuid(),
  chainId: z.number(),
  proxyAddress: z.string().nullable(),
  implementationAddress: z.string().nullable(),
  transactionHash: z.string().nullable(),
  deployerAddress: z.string().nullable(),
  status: deploymentStatusEnum,
  frontendUrl: z.string().nullable(),
  explorerUrl: z.string().nullable(),
  createdAt: z.date(),
});

/**
 * Deployments router — tracks on-chain contract deployments.
 */
export const deploymentsRouter = router({
  /**
   * List deployments for a project.
   */
  listByProject: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
      }),
    )
    .output(z.array(deploymentSchema))
    .query(async ({ input, ctx }) => {
      ctx.log.info({ projectId: input.projectId }, "Listing deployments");

      const db = getDb();

      // Verify project ownership
      const [project] = await db
        .select({ id: projects.id })
        .from(projects)
        .where(
          and(
            eq(projects.id, input.projectId),
            eq(projects.userId, ctx.user.id),
          ),
        )
        .limit(1);

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      const rows = await db
        .select()
        .from(deployments)
        .where(eq(deployments.projectId, input.projectId))
        .orderBy(desc(deployments.createdAt));

      return rows.map((r) => ({
        id: r.id,
        projectId: r.projectId,
        versionId: r.versionId,
        chainId: r.chainId,
        proxyAddress: r.proxyAddress,
        implementationAddress: r.implementationAddress,
        transactionHash: r.transactionHash,
        deployerAddress: r.deployerAddress,
        status: r.status as z.infer<typeof deploymentStatusEnum>,
        frontendUrl: r.frontendUrl,
        explorerUrl: r.explorerUrl,
        createdAt: r.createdAt,
      }));
    }),

  /**
   * Get a single deployment by ID.
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .output(deploymentSchema)
    .query(async ({ input, ctx }) => {
      ctx.log.info({ deploymentId: input.id }, "Fetching deployment");

      const db = getDb();
      const [row] = await db
        .select()
        .from(deployments)
        .where(eq(deployments.id, input.id))
        .limit(1);

      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Deployment ${input.id} not found`,
        });
      }

      // Verify project ownership
      const [project] = await db
        .select({ id: projects.id })
        .from(projects)
        .where(
          and(
            eq(projects.id, row.projectId),
            eq(projects.userId, ctx.user.id),
          ),
        )
        .limit(1);

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Deployment ${input.id} not found`,
        });
      }

      return {
        id: row.id,
        projectId: row.projectId,
        versionId: row.versionId,
        chainId: row.chainId,
        proxyAddress: row.proxyAddress,
        implementationAddress: row.implementationAddress,
        transactionHash: row.transactionHash,
        deployerAddress: row.deployerAddress,
        status: row.status as z.infer<typeof deploymentStatusEnum>,
        frontendUrl: row.frontendUrl,
        explorerUrl: row.explorerUrl,
        createdAt: row.createdAt,
      };
    }),

  /**
   * Record a new deployment (called after contract is deployed on-chain).
   */
  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        versionId: z.string().uuid(),
        chainId: z.number().int(),
        proxyAddress: z.string().optional(),
        implementationAddress: z.string().optional(),
        transactionHash: z.string().optional(),
        deployerAddress: z.string().optional(),
        frontendUrl: z.string().optional(),
        explorerUrl: z.string().optional(),
      }),
    )
    .output(deploymentSchema)
    .mutation(async ({ input, ctx }) => {
      ctx.log.info(
        { projectId: input.projectId, chainId: input.chainId },
        "Recording deployment",
      );

      const db = getDb();

      // Verify project ownership
      const [project] = await db
        .select({ id: projects.id })
        .from(projects)
        .where(
          and(
            eq(projects.id, input.projectId),
            eq(projects.userId, ctx.user.id),
          ),
        )
        .limit(1);

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      const [row] = await db
        .insert(deployments)
        .values({
          projectId: input.projectId,
          versionId: input.versionId,
          chainId: input.chainId,
          proxyAddress: input.proxyAddress ?? null,
          implementationAddress: input.implementationAddress ?? null,
          transactionHash: input.transactionHash ?? null,
          deployerAddress: input.deployerAddress ?? null,
          status: "pending",
          frontendUrl: input.frontendUrl ?? null,
          explorerUrl: input.explorerUrl ?? null,
        })
        .returning();

      return {
        id: row!.id,
        projectId: row!.projectId,
        versionId: row!.versionId,
        chainId: row!.chainId,
        proxyAddress: row!.proxyAddress,
        implementationAddress: row!.implementationAddress,
        transactionHash: row!.transactionHash,
        deployerAddress: row!.deployerAddress,
        status: row!.status as z.infer<typeof deploymentStatusEnum>,
        frontendUrl: row!.frontendUrl,
        explorerUrl: row!.explorerUrl,
        createdAt: row!.createdAt,
      };
    }),

  /**
   * Update deployment status (e.g. pending → deploying → deployed).
   */
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: deploymentStatusEnum,
        proxyAddress: z.string().optional(),
        implementationAddress: z.string().optional(),
        transactionHash: z.string().optional(),
        frontendUrl: z.string().optional(),
        explorerUrl: z.string().optional(),
      }),
    )
    .output(deploymentSchema)
    .mutation(async ({ input, ctx }) => {
      ctx.log.info(
        { deploymentId: input.id, status: input.status },
        "Updating deployment status",
      );

      const db = getDb();

      const updates: Record<string, unknown> = { status: input.status };
      if (input.proxyAddress) updates.proxyAddress = input.proxyAddress;
      if (input.implementationAddress) updates.implementationAddress = input.implementationAddress;
      if (input.transactionHash) updates.transactionHash = input.transactionHash;
      if (input.frontendUrl) updates.frontendUrl = input.frontendUrl;
      if (input.explorerUrl) updates.explorerUrl = input.explorerUrl;

      const [row] = await db
        .update(deployments)
        .set(updates)
        .where(eq(deployments.id, input.id))
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Deployment ${input.id} not found`,
        });
      }

      return {
        id: row.id,
        projectId: row.projectId,
        versionId: row.versionId,
        chainId: row.chainId,
        proxyAddress: row.proxyAddress,
        implementationAddress: row.implementationAddress,
        transactionHash: row.transactionHash,
        deployerAddress: row.deployerAddress,
        status: row.status as z.infer<typeof deploymentStatusEnum>,
        frontendUrl: row.frontendUrl,
        explorerUrl: row.explorerUrl,
        createdAt: row.createdAt,
      };
    }),
});
