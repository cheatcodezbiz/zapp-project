import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "../trpc.js";
import {
  loadTemplatePackage,
  listTemplates as listAllTemplates,
} from "@zapp/templates";
import type { TemplateManifest } from "@zapp/templates";
import {
  getDb,
  creditBalances,
  creditTransactions,
  eq,
  sql,
} from "@zapp/db";
import crypto from "node:crypto";

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
   * Unlock a template — deducts credits and returns generated artifacts.
   */
  unlock: protectedProcedure
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

      // 1. Load the template package
      const pkg = loadTemplatePackage(input.templateId);
      if (!pkg) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Template ${input.templateId} not found`,
        });
      }

      const price = pkg.manifest.price;
      const userId = ctx.user.id;
      const db = getDb();

      // 2. Check user's credit balance
      const [balanceRow] = await db
        .select({ balance: creditBalances.balance })
        .from(creditBalances)
        .where(eq(creditBalances.userId, userId))
        .limit(1);

      const currentBalance = balanceRow?.balance ?? 0;

      if (currentBalance < price) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Insufficient credits. Required: ${price} ($${(price / 100).toFixed(2)}), available: ${currentBalance} ($${(currentBalance / 100).toFixed(2)}).`,
        });
      }

      // 3. Deduct credits atomically
      const [updated] = await db
        .update(creditBalances)
        .set({
          balance: sql`${creditBalances.balance} - ${price}`,
        })
        .where(eq(creditBalances.userId, userId))
        .returning({ balance: creditBalances.balance });

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update credit balance",
        });
      }

      // 4. Record the transaction
      await db.insert(creditTransactions).values({
        userId,
        type: "spend",
        amount: -price,
        balanceAfter: updated.balance,
        description: `Unlocked template: ${pkg.manifest.name}`,
        referenceId: input.projectId,
        referenceType: "template_unlock",
      });

      // 5. Convert template files to GeneratedArtifact format
      const artifacts = pkg.files.map((file) => ({
        id: crypto.randomUUID(),
        type: file.type as "contract" | "frontend" | "test",
        filename: file.filename,
        code: file.content,
        language: file.language as "solidity" | "typescript" | "tsx",
        version: 1,
      }));

      return {
        success: true,
        templateName: pkg.manifest.name,
        artifacts,
        configurableParameters: pkg.manifest.configurableParameters,
        securityFeatures: pkg.manifest.securityFeatures,
        newBalance: String(updated.balance),
      };
    }),
});
