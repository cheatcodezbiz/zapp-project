import { z } from "zod";
import { router, publicProcedure } from "../trpc.js";
import { runAgent } from "@zapp/ai";
import type {
  GeneratedArtifact,
  ProjectContext,
  ChatMessage,
} from "@zapp/shared-types";

/**
 * Chat router — conversational AI interface for dApp building.
 *
 * When ANTHROPIC_API_KEY is set and @zapp/ai is available, routes messages
 * through the real AI agent. Otherwise falls back to a stub echo response.
 */
export const chatRouter = router({
  /**
   * Send a message to the AI and get a response.
   */
  send: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
        message: z.string().min(1).max(10000),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      ctx.log.info(
        {
          projectId: input.projectId,
          messageLength: input.message.length,
        },
        "Chat message received",
      );

      // ---------------------------------------------------------------
      // If ANTHROPIC_API_KEY is set and agent is available, use the
      // real AI agent. Otherwise fall back to the stub echo response.
      // ---------------------------------------------------------------
      if (process.env.ANTHROPIC_API_KEY) {
        const collectedTokens: string[] = [];
        const collectedArtifacts: GeneratedArtifact[] = [];

        const projectContext: ProjectContext = {
          id: input.projectId,
          name: "My Project",
          description: "",
          chain: "base",
          existingFiles: [],
        };

        const conversationHistory: ChatMessage[] = [
          {
            id: crypto.randomUUID(),
            role: "user",
            content: input.message,
            timestamp: new Date().toISOString(),
          },
        ];

        try {
          await runAgent({
            projectId: input.projectId,
            projectContext,
            conversationHistory,
            onToken: (token: string) => {
              collectedTokens.push(token);
            },
            onToolStart: (toolName: string, toolInput: Record<string, unknown>) => {
              ctx.log.info({ toolName, toolInput }, "Tool started");
            },
            onToolResult: (toolName: string, result: unknown) => {
              ctx.log.info({ toolName }, "Tool completed");
            },
            onArtifact: (artifact: GeneratedArtifact) => {
              collectedArtifacts.push(artifact);
            },
            onDone: () => {
              ctx.log.info("Agent completed");
            },
            onError: (error: Error) => {
              ctx.log.error({ error: error.message }, "Agent error");
            },
          });

          return {
            response: collectedTokens.join(""),
            artifacts: collectedArtifacts,
          };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unknown error";
          ctx.log.error({ error: message }, "Agent failed, falling back to stub");

          return {
            response: `I encountered an error while processing your request: ${message}. Please try again.`,
            artifacts: [],
          };
        }
      }

      // ---------------------------------------------------------------
      // Stub fallback — no API key or agent not available
      // ---------------------------------------------------------------
      const truncated =
        input.message.length > 100
          ? `${input.message.slice(0, 100)}...`
          : input.message;

      const response = [
        `I'm Zapp AI! I received your message: "${truncated}".`,
        "",
        "The AI agent is not configured yet. Set ANTHROPIC_API_KEY to enable it.",
        "",
        "Once configured, I'll be able to:",
        "- Generate Solidity smart contracts",
        "- Create frontend components",
        "- Run simulations and tests",
        "- Deploy to any EVM chain",
      ].join("\n");

      return {
        response,
        artifacts: [],
      };
    }),

  /**
   * Retrieve chat history for a project.
   */
  history: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
      }),
    )
    .query(async ({ input, ctx }) => {
      ctx.log.info(
        { projectId: input.projectId },
        "Fetching chat history",
      );

      // Stub: return empty history — will be backed by DB later
      return { messages: [] as never[] };
    }),

  /**
   * Clear chat history for a project.
   */
  clearHistory: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      ctx.log.info(
        { projectId: input.projectId },
        "Clearing chat history",
      );

      // Stub: nothing to clear yet
      return { success: true };
    }),
});
