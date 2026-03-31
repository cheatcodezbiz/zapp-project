import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc.js";

/** Zod schema for a project object returned from the API. */
const projectSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  /** Which template this project was created from, if any. */
  templateId: z.string().uuid().nullable(),
  /** Current deployment status. */
  status: z.enum(["draft", "generating", "preview", "deployed", "failed"]),
  /** The chain this dApp targets (e.g. "ethereum", "polygon", "solana"). */
  chain: z.string(),
  /** JSON blob of the dApp configuration / component tree. */
  config: z.record(z.unknown()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * Projects router — CRUD operations for user dApp projects.
 */
export const projectsRouter = router({
  /**
   * List all projects for the authenticated user.
   */
  list: protectedProcedure
    .input(
      z.object({
        cursor: z.string().uuid().nullish(),
        limit: z.number().int().min(1).max(50).default(20),
        status: z
          .enum(["draft", "generating", "preview", "deployed", "failed"])
          .optional(),
      }),
    )
    .output(
      z.object({
        items: z.array(projectSchema),
        nextCursor: z.string().uuid().nullish(),
      }),
    )
    .query(async ({ input, ctx }) => {
      ctx.log.info(
        { userId: ctx.user.id, status: input.status },
        "Listing projects",
      );

      // TODO: Query projects table filtered by userId, optional status, cursor pagination
      // const projects = await ctx.db.query.projects.findMany({
      //   where: and(
      //     eq(projects.userId, ctx.user.id),
      //     input.status ? eq(projects.status, input.status) : undefined,
      //     input.cursor ? lt(projects.id, input.cursor) : undefined,
      //   ),
      //   orderBy: desc(projects.createdAt),
      //   limit: input.limit + 1,
      // });

      return {
        items: [],
        nextCursor: null,
      };
    }),

  /**
   * Get a single project by ID. Returns 404 if not found or not owned by user.
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .output(projectSchema)
    .query(async ({ input, ctx }) => {
      ctx.log.info({ projectId: input.id }, "Fetching project");

      // TODO: Query project by ID, verify ownership
      // const project = await ctx.db.query.projects.findFirst({
      //   where: and(eq(projects.id, input.id), eq(projects.userId, ctx.user.id)),
      // });
      // if (!project) throw new TRPCError({ code: "NOT_FOUND" });

      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Project ${input.id} not found`,
      });
    }),

  /**
   * Create a new project.
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        templateId: z.string().uuid().optional(),
        chain: z.string().min(1).default("ethereum"),
      }),
    )
    .output(projectSchema)
    .mutation(async ({ input, ctx }) => {
      ctx.log.info(
        { userId: ctx.user.id, name: input.name, chain: input.chain },
        "Creating project",
      );

      // TODO: If templateId provided, verify it exists
      // TODO: Insert into projects table
      // const [project] = await ctx.db.insert(projects).values({
      //   name: input.name,
      //   description: input.description ?? null,
      //   templateId: input.templateId ?? null,
      //   chain: input.chain,
      //   userId: ctx.user.id,
      //   status: "draft",
      //   config: null,
      // }).returning();

      // Stub return
      const now = new Date();
      return {
        id: "00000000-0000-0000-0000-000000000000",
        name: input.name,
        description: input.description ?? null,
        templateId: input.templateId ?? null,
        status: "draft" as const,
        chain: input.chain,
        config: null,
        createdAt: now,
        updatedAt: now,
      };
    }),

  /**
   * Update an existing project's metadata or config.
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional(),
        chain: z.string().min(1).optional(),
        config: z.record(z.unknown()).optional(),
      }),
    )
    .output(projectSchema)
    .mutation(async ({ input, ctx }) => {
      ctx.log.info({ projectId: input.id }, "Updating project");

      // TODO: Verify project exists and is owned by user
      // TODO: Update the project record
      // const [updated] = await ctx.db
      //   .update(projects)
      //   .set({ ...input, updatedAt: new Date() })
      //   .where(and(eq(projects.id, input.id), eq(projects.userId, ctx.user.id)))
      //   .returning();
      // if (!updated) throw new TRPCError({ code: "NOT_FOUND" });

      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Project ${input.id} not found`,
      });
    }),

  /**
   * Soft-delete a project.
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      ctx.log.info(
        { userId: ctx.user.id, projectId: input.id },
        "Deleting project",
      );

      // TODO: Soft-delete (set deletedAt) or hard-delete the project
      // TODO: Verify ownership before deletion
      // const result = await ctx.db
      //   .delete(projects)
      //   .where(and(eq(projects.id, input.id), eq(projects.userId, ctx.user.id)));
      // if (result.rowCount === 0) throw new TRPCError({ code: "NOT_FOUND" });

      return { success: true };
    }),
});
