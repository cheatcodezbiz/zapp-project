import { router } from "../trpc.js";
import { authRouter } from "./auth.js";
import { creditsRouter } from "./credits.js";
import { projectsRouter } from "./projects.js";
import { templatesRouter } from "./templates.js";
import { simulationRouter } from "./simulation.js";
import { generationRouter } from "./generation.js";
import { chatRouter } from "./chat.js";

/**
 * Root application router — merges all sub-routers.
 *
 * Each sub-router is namespaced under its own key, so the client
 * calls e.g. `trpc.auth.getNonce.query(...)` or `trpc.projects.list.query(...)`.
 */
export const appRouter = router({
  auth: authRouter,
  credits: creditsRouter,
  projects: projectsRouter,
  templates: templatesRouter,
  simulation: simulationRouter,
  generation: generationRouter,
  chat: chatRouter,
});

/** Export the router type for the tRPC client to consume. */
export type AppRouter = typeof appRouter;
