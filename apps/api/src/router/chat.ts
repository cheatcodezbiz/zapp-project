import { z } from "zod";
import { router, publicProcedure } from "../trpc.js";
import { runAgent } from "@zapp/ai";
import type { GeneratedArtifact, ChatMessage } from "@zapp/shared-types";
import {
  addMessage,
  addArtifact,
  getConversation,
  getProjectContext,
  clearConversation,
} from "../lib/conversation-store.js";

/**
 * Chat router — conversational AI interface for dApp building.
 *
 * Uses Drizzle ORM to persist messages and artifacts to PostgreSQL.
 * When ANTHROPIC_API_KEY is set the real AI agent is invoked;
 * otherwise a stub echo response is returned.
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

      // ---- Persist the incoming user message ----
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: input.message,
        timestamp: new Date().toISOString(),
      };
      await addMessage(input.projectId, userMessage);

      // ---------------------------------------------------------------
      // If ANTHROPIC_API_KEY is set, use the real AI agent.
      // ---------------------------------------------------------------
      if (process.env.ANTHROPIC_API_KEY) {
        const collectedTokens: string[] = [];
        const collectedArtifacts: GeneratedArtifact[] = [];

        const projectContext = await getProjectContext(input.projectId);
        const conv = await getConversation(input.projectId);

        try {
          await runAgent({
            projectId: input.projectId,
            projectContext,
            conversationHistory: conv.messages,
            onToken: (token: string) => {
              collectedTokens.push(token);
            },
            onToolStart: (
              toolName: string,
              toolInput: Record<string, unknown>,
            ) => {
              ctx.log.info({ toolName, toolInput }, "Tool started");
            },
            onToolResult: (toolName: string, result: unknown) => {
              ctx.log.info({ toolName }, "Tool completed");
            },
            onArtifact: (artifact: GeneratedArtifact) => {
              addArtifact(input.projectId, artifact);
              collectedArtifacts.push(artifact);
            },
            onDone: () => {
              ctx.log.info("Agent completed");
            },
            onError: (error: Error) => {
              ctx.log.error({ error: error.message }, "Agent error");
            },
          });

          // ---- Persist the assistant response ----
          const assistantContent = collectedTokens.join("");
          if (assistantContent) {
            const assistantMessage: ChatMessage = {
              id: crypto.randomUUID(),
              role: "assistant",
              content: assistantContent,
              timestamp: new Date().toISOString(),
              artifacts:
                collectedArtifacts.length > 0
                  ? collectedArtifacts
                  : undefined,
            };
            await addMessage(input.projectId, assistantMessage);
          }

          return {
            response: assistantContent,
            artifacts: collectedArtifacts,
          };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unknown error";
          ctx.log.error(
            { error: message },
            "Agent failed, falling back to stub",
          );

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

      // Persist the stub assistant response so history is consistent
      await addMessage(input.projectId, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response,
        timestamp: new Date().toISOString(),
      });

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

      const conv = await getConversation(input.projectId);
      return { messages: conv.messages, artifacts: conv.artifacts };
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

      await clearConversation(input.projectId);
      return { success: true };
    }),
});
