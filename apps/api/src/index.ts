import "dotenv/config";
import { createHTTPServer } from "@trpc/server/adapters/standalone";
import { appRouter } from "./router/index.js";
import { createContext } from "./context.js";
import { logger } from "./lib/logger.js";
import { runAgentStreaming } from "@zapp/ai";
import type { GeneratedArtifact, ChatMessage } from "@zapp/shared-types";
import {
  addMessage,
  addArtifact,
  getConversation,
  getProjectContext,
} from "./lib/conversation-store.js";

const PORT = Number(process.env["PORT"] ?? 3001);
const ALLOWED_ORIGINS = (process.env["CORS_ORIGINS"] ?? "http://localhost:3000")
  .split(",")
  .map((s) => s.trim());

/**
 * Standalone tRPC HTTP server using Node's built-in http module.
 *
 * - tRPC handler served at /trpc/*
 * - Health check at GET /health
 * - SSE streaming chat at POST /api/chat/stream
 * - CORS headers applied for configured origins
 */
const server = createHTTPServer({
  router: appRouter,
  createContext: ({ req }) => createContext({ req }),

  /**
   * Handle CORS and non-tRPC routes (health check).
   */
  responseMeta({ type, errors }) {
    // Return appropriate cache headers for queries vs mutations
    if (type === "query" && errors.length === 0) {
      return {
        headers: {
          "cache-control": "no-cache, no-store, must-revalidate",
        },
      };
    }
    return {};
  },

  middleware(req, res, next) {
    // CORS headers
    const origin = req.headers.origin ?? "";
    if (ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes("*")) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, OPTIONS",
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization",
    );
    res.setHeader("Access-Control-Allow-Credentials", "true");

    // Handle preflight
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    // Health check endpoint
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "ok",
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
        }),
      );
      return;
    }

    // ------------------------------------------------------------------
    // SSE streaming endpoint for chat
    // ------------------------------------------------------------------
    if (req.url === "/api/chat/stream" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk: Buffer) => {
        body += chunk.toString();
      });
      req.on("end", () => {
        handleChatStream(body, res).catch((error) => {
          const msg =
            error instanceof Error ? error.message : "Unknown error";
          logger.error({ error: msg }, "SSE handler crashed");
          if (!res.writableEnded) {
            res.write(
              `data: ${JSON.stringify({ type: "error", error: msg })}\n\n`,
            );
            res.end();
          }
        });
      });
      return;
    }

    // Pass everything else to tRPC
    next();
  },
});

// ---------------------------------------------------------------------------
// SSE chat stream handler
// ---------------------------------------------------------------------------

async function handleChatStream(
  rawBody: string,
  res: import("node:http").ServerResponse,
): Promise<void> {
  // ---- Parse and validate the request body ----
  let projectId: string;
  let message: string;

  try {
    const parsed = JSON.parse(rawBody);
    projectId = parsed.projectId;
    message = parsed.message;

    if (
      typeof projectId !== "string" ||
      !projectId ||
      typeof message !== "string" ||
      !message
    ) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: "projectId (string) and message (string) are required.",
        }),
      );
      return;
    }
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid JSON body." }));
    return;
  }

  // ---- Set SSE headers (CORS headers already applied above) ----
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  // ---- Persist the incoming user message ----
  const userMsg: ChatMessage = {
    id: crypto.randomUUID(),
    role: "user",
    content: message,
    timestamp: new Date().toISOString(),
  };
  await addMessage(projectId, userMsg);

  // ---- Stub fallback when no API key is configured ----
  if (!process.env.ANTHROPIC_API_KEY) {
    const truncated =
      message.length > 100 ? `${message.slice(0, 100)}...` : message;

    const stubResponse = [
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

    // Stream the stub as a single token event
    res.write(
      `data: ${JSON.stringify({ type: "token", content: stubResponse })}\n\n`,
    );

    // Persist the stub assistant response
    await addMessage(projectId, {
      id: crypto.randomUUID(),
      role: "assistant",
      content: stubResponse,
      timestamp: new Date().toISOString(),
    });

    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();
    return;
  }

  // ---- Run the real AI agent with streaming ----
  const projectContext = await getProjectContext(projectId);
  const conv = await getConversation(projectId);
  let accumulatedResponse = "";

  await runAgentStreaming({
    projectId,
    projectContext,
    conversationHistory: conv.messages,
    onToken: (token: string) => {
      accumulatedResponse += token;
      res.write(
        `data: ${JSON.stringify({ type: "token", content: token })}\n\n`,
      );
    },
    onToolStart: (
      toolName: string,
      toolInput: Record<string, unknown>,
    ) => {
      res.write(
        `data: ${JSON.stringify({ type: "tool_start", toolName, toolInput })}\n\n`,
      );
    },
    onToolResult: (toolName: string, toolResult: unknown) => {
      res.write(
        `data: ${JSON.stringify({ type: "tool_result", toolName, toolResult })}\n\n`,
      );
    },
    onArtifact: (artifact: GeneratedArtifact) => {
      addArtifact(projectId, artifact);
      res.write(
        `data: ${JSON.stringify({ type: "artifact", artifact })}\n\n`,
      );
    },
    onDone: () => {
      // Persist the complete assistant response
      if (accumulatedResponse) {
        addMessage(projectId, {
          id: crypto.randomUUID(),
          role: "assistant",
          content: accumulatedResponse,
          timestamp: new Date().toISOString(),
        });
      }
      res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
      res.end();
    },
    onError: (error: Error) => {
      logger.error({ error: error.message }, "Agent streaming error");
      res.write(
        `data: ${JSON.stringify({ type: "error", error: error.message })}\n\n`,
      );
      res.end();
    },
  });
}

server.listen(PORT);
logger.info({ port: PORT, origins: ALLOWED_ORIGINS }, "Zapp API server started");
