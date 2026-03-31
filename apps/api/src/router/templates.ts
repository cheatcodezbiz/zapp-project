import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc.js";

/** Zod schema for a template object. */
const templateSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  /** Category for filtering (e.g. "defi", "nft", "dao", "token"). */
  category: z.enum(["defi", "nft", "dao", "token", "general"]),
  /** Target chain(s) this template supports. */
  chains: z.array(z.string()),
  /** URL of the template preview image. */
  thumbnailUrl: z.string().url().nullable(),
  /** JSON blob of the default dApp configuration for this template. */
  defaultConfig: z.record(z.unknown()),
  /** Whether this template is currently available. */
  active: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * Templates router — browse available dApp templates.
 *
 * All template endpoints are public (no auth required) so users
 * can browse before connecting their wallet.
 */
export const templatesRouter = router({
  /**
   * List available templates, optionally filtered by category or chain.
   */
  list: publicProcedure
    .input(
      z
        .object({
          category: z
            .enum(["defi", "nft", "dao", "token", "general"])
            .optional(),
          chain: z.string().optional(),
          cursor: z.string().uuid().nullish(),
          limit: z.number().int().min(1).max(50).default(20),
        })
        .optional(),
    )
    .output(
      z.object({
        items: z.array(templateSchema),
        nextCursor: z.string().uuid().nullish(),
      }),
    )
    .query(async ({ input, ctx }) => {
      ctx.log.info(
        { category: input?.category, chain: input?.chain },
        "Listing templates",
      );

      // TODO: Query templates table with optional filters
      // const templates = await ctx.db.query.templates.findMany({
      //   where: and(
      //     eq(templates.active, true),
      //     input?.category ? eq(templates.category, input.category) : undefined,
      //     input?.chain ? arrayContains(templates.chains, [input.chain]) : undefined,
      //     input?.cursor ? lt(templates.id, input.cursor) : undefined,
      //   ),
      //   orderBy: asc(templates.name),
      //   limit: (input?.limit ?? 20) + 1,
      // });

      return {
        items: [],
        nextCursor: null,
      };
    }),

  /**
   * Get a single template by ID.
   */
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .output(templateSchema)
    .query(async ({ input, ctx }) => {
      ctx.log.info({ templateId: input.id }, "Fetching template");

      // TODO: Query template by ID
      // const template = await ctx.db.query.templates.findFirst({
      //   where: and(eq(templates.id, input.id), eq(templates.active, true)),
      // });
      // if (!template) throw new TRPCError({ code: "NOT_FOUND" });

      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Template ${input.id} not found`,
      });
    }),
});
