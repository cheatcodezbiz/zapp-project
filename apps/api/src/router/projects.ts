import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, publicProcedure } from "../trpc.js";
import {
  getDb,
  projects,
  deployments,
  users,
  eq,
  and,
  desc,
  lt,
} from "@zapp/db";

// Well-known anonymous user for pre-auth MVP
const ANON_USER_ID = "00000000-0000-0000-0000-000000000000";

let anonEnsured = false;
async function ensureAnonUser(): Promise<void> {
  if (anonEnsured) return;
  const db = getDb();
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.id, ANON_USER_ID)).limit(1);
  if (existing.length === 0) {
    await db.insert(users).values({ id: ANON_USER_ID, walletAddress: "anonymous" });
  }
  anonEnsured = true;
}

/** Status values — aligned with DB project_status enum. */
const statusEnum = z.enum([
  "draft",
  "simulated",
  "generating",
  "compiled",
  "testing",
  "deploying",
  "deployed",
  "failed",
]);

/** Zod schema for a project object returned from the API. */
const projectSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  templateId: z.string().uuid().nullable(),
  status: statusEnum,
  chain: z.string(),
  config: z.record(z.unknown()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/** Map a DB project row to the API response shape. */
function mapProject(row: typeof projects.$inferSelect) {
  const config = (row.config ?? {}) as Record<string, unknown>;
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    templateId: row.templateId ?? null,
    status: row.status as z.infer<typeof statusEnum>,
    chain: (config.chain as string) ?? "base",
    config: Object.keys(config).length > 0 ? config : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Projects router — CRUD operations for user dApp projects.
 */
export const projectsRouter = router({
  /**
   * List all projects for the authenticated user.
   */
  list: publicProcedure
    .input(
      z.object({
        cursor: z.string().uuid().nullish(),
        limit: z.number().int().min(1).max(50).default(20),
        status: statusEnum.optional(),
      }),
    )
    .output(
      z.object({
        items: z.array(projectSchema),
        nextCursor: z.string().uuid().nullish(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const userId = ctx.user?.id ?? ANON_USER_ID;
      await ensureAnonUser();
      ctx.log.info(
        { userId, status: input.status },
        "Listing projects",
      );

      const db = getDb();
      const conditions = [eq(projects.userId, userId)];

      if (input.status) {
        conditions.push(eq(projects.status, input.status));
      }
      if (input.cursor) {
        conditions.push(lt(projects.createdAt,
          // Fetch the cursor project's createdAt for proper cursor pagination
          // Simplified: use ID ordering since UUIDs are random, fall back to createdAt desc
          new Date() // placeholder — we'll use ID-based cursor below
        ));
      }

      // ID-based cursor: fetch projects created before the cursor project
      let rows;
      if (input.cursor) {
        // Get cursor row's createdAt
        const [cursorRow] = await db
          .select({ createdAt: projects.createdAt })
          .from(projects)
          .where(eq(projects.id, input.cursor))
          .limit(1);

        if (cursorRow) {
          conditions.pop(); // remove placeholder
          conditions.push(lt(projects.createdAt, cursorRow.createdAt));
        }

        rows = await db
          .select()
          .from(projects)
          .where(and(...conditions))
          .orderBy(desc(projects.createdAt))
          .limit(input.limit + 1);
      } else {
        rows = await db
          .select()
          .from(projects)
          .where(and(...conditions))
          .orderBy(desc(projects.createdAt))
          .limit(input.limit + 1);
      }

      let nextCursor: string | null = null;
      if (rows.length > input.limit) {
        const last = rows.pop()!;
        nextCursor = last.id;
      }

      return {
        items: rows.map(mapProject),
        nextCursor,
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

      const db = getDb();
      const [row] = await db
        .select()
        .from(projects)
        .where(
          and(eq(projects.id, input.id), eq(projects.userId, ctx.user.id)),
        )
        .limit(1);

      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Project ${input.id} not found`,
        });
      }

      return mapProject(row);
    }),

  /**
   * Create a new project.
   */
  create: publicProcedure
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
      const userId = ctx.user?.id ?? ANON_USER_ID;
      await ensureAnonUser();
      ctx.log.info(
        { userId, name: input.name, chain: input.chain },
        "Creating project",
      );

      const db = getDb();

      const [row] = await db
        .insert(projects)
        .values({
          userId,
          name: input.name,
          description: input.description ?? null,
          templateId: input.templateId ?? null,
          status: "draft",
          config: { chain: input.chain, artifacts: [] },
        })
        .returning();

      return mapProject(row!);
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
        status: statusEnum.optional(),
        config: z.record(z.unknown()).optional(),
      }),
    )
    .output(projectSchema)
    .mutation(async ({ input, ctx }) => {
      ctx.log.info({ projectId: input.id }, "Updating project");

      const db = getDb();

      // Read existing project to merge config
      const [existing] = await db
        .select()
        .from(projects)
        .where(
          and(eq(projects.id, input.id), eq(projects.userId, ctx.user.id)),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Project ${input.id} not found`,
        });
      }

      // Build update payload
      const existingConfig = (existing.config ?? {}) as Record<string, unknown>;
      const updates: Record<string, unknown> = {};

      if (input.name !== undefined) updates.name = input.name;
      if (input.description !== undefined) updates.description = input.description;
      if (input.status !== undefined) updates.status = input.status;

      // Merge config: chain goes into config.chain, other config fields merged
      if (input.chain || input.config) {
        const newConfig = { ...existingConfig };
        if (input.chain) newConfig.chain = input.chain;
        if (input.config) Object.assign(newConfig, input.config);
        updates.config = newConfig;
      }

      const [row] = await db
        .update(projects)
        .set(updates)
        .where(
          and(eq(projects.id, input.id), eq(projects.userId, ctx.user.id)),
        )
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Project ${input.id} not found`,
        });
      }

      return mapProject(row);
    }),

  /**
   * Delete a project (hard delete — cascades to conversations, messages, deployments).
   */
  delete: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.id ?? ANON_USER_ID;
      ctx.log.info(
        { userId, projectId: input.id },
        "Deleting project",
      );

      const db = getDb();
      const result = await db
        .delete(projects)
        .where(
          and(eq(projects.id, input.id), eq(projects.userId, userId)),
        )
        .returning({ id: projects.id });

      if (result.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Project ${input.id} not found`,
        });
      }

      return { success: true };
    }),
});
