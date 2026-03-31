// ---------------------------------------------------------------------------
// Parallel tool executor — runs independent tool calls concurrently
// ---------------------------------------------------------------------------
// Partitions tool calls into parallel-safe and sequential groups, then
// executes parallel tools via Promise.all and sequential tools one at a time.
// ---------------------------------------------------------------------------

import type { AgentConfig, GeneratedArtifact } from "@zapp/shared-types";
import { executeTool } from "./executor";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParallelToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ParallelToolResult {
  toolUseId: string;
  toolName: string;
  result: unknown;
  artifact?: GeneratedArtifact;
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Tool classification
// ---------------------------------------------------------------------------

/** Tools that have no side-effect dependencies and can safely run concurrently */
const PARALLEL_SAFE_TOOLS = new Set([
  "generate_contract",
  "run_simulation",
  "security_audit",
  "explain_concept",
  "load_template_spec",
]);

/**
 * Partition an array of tool calls into parallel-safe and sequential groups.
 * If there is only one tool call, it goes into the parallel group (no benefit
 * from partitioning a single call).
 */
export function partitionTools(tools: ParallelToolCall[]): {
  parallel: ParallelToolCall[];
  sequential: ParallelToolCall[];
} {
  if (tools.length <= 1) {
    return { parallel: tools, sequential: [] };
  }

  const parallel: ParallelToolCall[] = [];
  const sequential: ParallelToolCall[] = [];

  for (const tool of tools) {
    if (PARALLEL_SAFE_TOOLS.has(tool.name)) {
      parallel.push(tool);
    } else {
      sequential.push(tool);
    }
  }

  return { parallel, sequential };
}

// ---------------------------------------------------------------------------
// Parallel execution
// ---------------------------------------------------------------------------

/**
 * Execute an array of tool calls with maximal concurrency where safe.
 *
 * 1. Partition into parallel-safe and sequential groups.
 * 2. For the parallel batch: emit all onToolStart events up front, then run
 *    all calls via Promise.all (errors are caught per-tool so one failure
 *    does not abort the rest). Emit onToolResult for each as they resolve.
 * 3. For the sequential batch: run one at a time in order with
 *    onToolStart -> executeTool -> onToolResult for each.
 * 4. Return all results combined (parallel first, then sequential).
 */
export async function executeToolsParallel(
  toolCalls: ParallelToolCall[],
  config: AgentConfig,
): Promise<ParallelToolResult[]> {
  const { parallel, sequential } = partitionTools(toolCalls);

  // ---- Parallel batch ----
  const parallelResults: ParallelToolResult[] = [];

  if (parallel.length > 0) {
    // Emit all onToolStart events before kicking off execution
    for (const tool of parallel) {
      config.onToolStart(tool.name, tool.input);
    }

    // Execute all in parallel, catching errors individually
    const settled = await Promise.all(
      parallel.map(async (tool): Promise<ParallelToolResult> => {
        const start = Date.now();
        try {
          const { result, artifact } = await executeTool(
            tool.name,
            tool.input,
            config,
          );
          const durationMs = Date.now() - start;
          const toolResult: ParallelToolResult = {
            toolUseId: tool.id,
            toolName: tool.name,
            result,
            artifact,
            durationMs,
          };
          config.onToolResult(tool.name, result);
          return toolResult;
        } catch (error) {
          const durationMs = Date.now() - start;
          const message =
            error instanceof Error ? error.message : "Unknown error occurred";
          const errorResult = { error: `Tool "${tool.name}" failed: ${message}` };
          config.onToolResult(tool.name, errorResult);
          return {
            toolUseId: tool.id,
            toolName: tool.name,
            result: errorResult,
            durationMs,
          };
        }
      }),
    );

    parallelResults.push(...settled);
  }

  // ---- Sequential batch ----
  const sequentialResults: ParallelToolResult[] = [];

  for (const tool of sequential) {
    config.onToolStart(tool.name, tool.input);

    const start = Date.now();
    try {
      const { result, artifact } = await executeTool(
        tool.name,
        tool.input,
        config,
      );
      const durationMs = Date.now() - start;
      config.onToolResult(tool.name, result);
      sequentialResults.push({
        toolUseId: tool.id,
        toolName: tool.name,
        result,
        artifact,
        durationMs,
      });
    } catch (error) {
      const durationMs = Date.now() - start;
      const message =
        error instanceof Error ? error.message : "Unknown error occurred";
      const errorResult = { error: `Tool "${tool.name}" failed: ${message}` };
      config.onToolResult(tool.name, errorResult);
      sequentialResults.push({
        toolUseId: tool.id,
        toolName: tool.name,
        result: errorResult,
        durationMs,
      });
    }
  }

  return [...parallelResults, ...sequentialResults];
}
