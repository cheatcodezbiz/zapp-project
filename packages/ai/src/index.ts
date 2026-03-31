export { createAIRouter } from "./router";
export type { AIModel, AIRouter } from "./router";

export { runPipeline } from "./orchestrator";
export type {
  PipelineProgress,
  PipelineResult,
  PipelineRequest,
  PipelineStage,
} from "./orchestrator";

export { jobStore } from "./job-store";
export type { Job } from "./job-store";

export { generateDApp } from "./generator";
export type {
  GenerationRequest,
  GenerationResult,
  GenerationProgress,
} from "./generator";

export { SYSTEM_PROMPTS } from "./prompts/system";
export type { SystemPromptKey } from "./prompts/system";

export {
  buildStakingContractPrompt,
  buildStakingFrontendPrompt,
  buildStakingTestPrompt,
} from "./prompts/templates";
export type { StakingGenerationParams } from "./prompts/templates";

// Agent
export { runAgent, runAgentStreaming } from "./agent";
export { tools } from "./tools/index";
export { executeTool } from "./tools/executor";
export { buildAgentSystemPrompt } from "./prompts/agent-system";

// Template specs
export {
  TEMPLATE_INDEX,
  getTemplateSpecById,
  getTemplateSpecs,
  matchTemplatesByKeywords,
  buildTemplateIndexPrompt,
} from "./prompts/template-specs";
export type { TemplateEntry } from "./prompts/template-specs";
