import "dotenv/config";
import { createHTTPServer } from "@trpc/server/adapters/standalone";
import { appRouter } from "./router/index.js";
import { createContext } from "./context.js";
import { logger } from "./lib/logger.js";

const PORT = Number(process.env["PORT"] ?? 3001);
const ALLOWED_ORIGINS = (process.env["CORS_ORIGINS"] ?? "http://localhost:3000")
  .split(",")
  .map((s) => s.trim());

/**
 * Standalone tRPC HTTP server using Node's built-in http module.
 *
 * - tRPC handler served at /trpc/*
 * - Health check at GET /health
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

    // Pass everything else to tRPC
    next();
  },
});

server.listen(PORT);
logger.info({ port: PORT, origins: ALLOWED_ORIGINS }, "Zapp API server started");
