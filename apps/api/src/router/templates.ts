import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc.js";
import {
  loadTemplatePackage,
  listTemplates as listAllTemplates,
} from "@zapp/templates";
import type { TemplateManifest } from "@zapp/templates";
import crypto from "node:crypto";
import { getDb, projects, users, eq } from "@zapp/db";

const ANON_USER_ID = "00000000-0000-0000-0000-000000000000";

// ---------------------------------------------------------------------------
// Zod schemas for output shapes
// ---------------------------------------------------------------------------

const manifestSchema = z.object({
  id: z.number(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  tier: z.string(),
  price: z.number(),
  contracts: z.array(
    z.object({ filename: z.string(), description: z.string() }),
  ),
  frontend: z
    .object({ filename: z.string(), description: z.string() })
    .nullable(),
  configurableParameters: z.array(z.string()),
  securityFeatures: z.array(z.string()),
});

const artifactSchema = z.object({
  id: z.string(),
  type: z.enum(["contract", "frontend", "test"]),
  filename: z.string(),
  code: z.string(),
  language: z.enum(["solidity", "typescript", "tsx"]),
  version: z.number(),
});

// ---------------------------------------------------------------------------
// Templates router
// ---------------------------------------------------------------------------

/**
 * Templates router — browse, inspect, and unlock dApp templates.
 *
 * `list` and `getById` are public so users can browse before signing in.
 * `unlock` is protected — requires auth and sufficient credits.
 */
export const templatesRouter = router({
  /**
   * List available templates, optionally filtered by category.
   */
  list: publicProcedure
    .input(
      z
        .object({
          category: z.string().optional(),
        })
        .optional(),
    )
    .output(z.array(manifestSchema))
    .query(async ({ input, ctx }) => {
      ctx.log.info(
        { category: input?.category },
        "Listing templates",
      );

      let manifests: TemplateManifest[] = listAllTemplates();

      if (input?.category) {
        manifests = manifests.filter((m) => m.category === input.category);
      }

      return manifests;
    }),

  /**
   * Get a single template by its numeric ID.
   */
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .output(
      z.object({
        manifest: manifestSchema,
        configurableParameters: z.array(z.string()),
        securityFeatures: z.array(z.string()),
        defaults: z.record(z.unknown()),
      }),
    )
    .query(async ({ input, ctx }) => {
      ctx.log.info({ templateId: input.id }, "Fetching template");

      const pkg = loadTemplatePackage(input.id);

      if (!pkg) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Template ${input.id} not found`,
        });
      }

      return {
        manifest: pkg.manifest,
        configurableParameters: pkg.manifest.configurableParameters,
        securityFeatures: pkg.manifest.securityFeatures,
        defaults: pkg.defaults,
      };
    }),

  /**
   * Unlock a template — returns generated artifacts.
   * MVP: public procedure, credit deduction handled client-side.
   * TODO: Re-add protectedProcedure + DB credit deduction for production.
   */
  unlock: publicProcedure
    .input(
      z.object({
        templateId: z.number(),
        projectId: z.string().uuid(),
      }),
    )
    .output(
      z.object({
        success: z.boolean(),
        templateName: z.string(),
        artifacts: z.array(artifactSchema),
        configurableParameters: z.array(z.string()),
        securityFeatures: z.array(z.string()),
        newBalance: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      ctx.log.info(
        { templateId: input.templateId, projectId: input.projectId },
        "Unlocking template",
      );

      // Load the template package
      const pkg = loadTemplatePackage(input.templateId);
      if (!pkg) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Template ${input.templateId} not found`,
        });
      }

      // Convert template files to GeneratedArtifact format
      const artifacts = pkg.files.map((file) => ({
        id: crypto.randomUUID(),
        type: file.type as "contract" | "frontend" | "test",
        filename: file.filename,
        code: file.content,
        language: file.language as "solidity" | "typescript" | "tsx",
        version: 1,
      }));

      // Persist project + artifacts to database so they survive page reload
      const db = getDb();

      // Ensure anonymous user exists
      const existingUser = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, ANON_USER_ID))
        .limit(1);
      if (existingUser.length === 0) {
        await db.insert(users).values({
          id: ANON_USER_ID,
          walletAddress: "anonymous",
        });
      }

      // Upsert project with artifacts
      const existingProject = await db
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.id, input.projectId))
        .limit(1);

      if (existingProject.length === 0) {
        await db.insert(projects).values({
          id: input.projectId,
          userId: ANON_USER_ID,
          name: pkg.manifest.name,
          description: pkg.manifest.description,
          config: { chain: "base", artifacts },
        });
      } else {
        await db
          .update(projects)
          .set({
            name: pkg.manifest.name,
            description: pkg.manifest.description,
            config: { chain: "base", artifacts },
          })
          .where(eq(projects.id, input.projectId));
      }

      ctx.log.info(
        { projectId: input.projectId, artifactCount: artifacts.length },
        "Project saved with template artifacts",
      );

      return {
        success: true,
        templateName: pkg.manifest.name,
        artifacts,
        configurableParameters: pkg.manifest.configurableParameters,
        securityFeatures: pkg.manifest.securityFeatures,
        newBalance: "0",
      };
    }),
});
