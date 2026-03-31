// ---------------------------------------------------------------------------
// Master tool executor — routes tool calls to individual handlers
// ---------------------------------------------------------------------------

import type { AgentConfig, GeneratedArtifact } from "@zapp/shared-types";
import {
  executeGenerateContract,
  type GenerateContractInput,
} from "./generate-contract";
import {
  executeGenerateFrontend,
  type GenerateFrontendInput,
} from "./generate-frontend";
import {
  executeGenerateTests,
  type GenerateTestsInput,
} from "./generate-tests";
import {
  executeRunSimulation,
  type RunSimulationInput,
} from "./run-simulation";
import { executeEditCode, type EditCodeInput } from "./edit-code";
import {
  executeSecurityAudit,
  type SecurityAuditInput,
} from "./security-audit";
import { executeLoadTemplateSpec, type LoadTemplateSpecInput } from "./load-template-spec";
import { extractMemoryEntry } from "../memory/project-memory";

export async function executeTool(
  toolName: string,
  input: Record<string, unknown>,
  config: AgentConfig,
): Promise<{ result: unknown; artifact?: GeneratedArtifact }> {
  try {
    let toolResult: { result: unknown; artifact?: GeneratedArtifact };

    switch (toolName) {
      case "generate_contract": {
        const { result, artifact } = await executeGenerateContract(
          input as unknown as GenerateContractInput,
        );
        if (artifact.code.trim()) {
          config.onArtifact(artifact);
        }
        toolResult = { result, artifact };
        break;
      }

      case "generate_frontend": {
        const { result, artifact } = await executeGenerateFrontend(
          input as unknown as GenerateFrontendInput,
        );
        if (artifact.code.trim()) {
          config.onArtifact(artifact);
        }
        toolResult = { result, artifact };
        break;
      }

      case "generate_tests": {
        const { result, artifact } = await executeGenerateTests(
          input as unknown as GenerateTestsInput,
        );
        if (artifact.code.trim()) {
          config.onArtifact(artifact);
        }
        toolResult = { result, artifact };
        break;
      }

      case "run_simulation": {
        const { result, simulationData } = await executeRunSimulation(
          input as unknown as RunSimulationInput,
        );
        if (simulationData && config.onSimulationData) {
          config.onSimulationData(simulationData);
        }
        toolResult = { result };
        break;
      }

      case "edit_code": {
        const { result, artifact } = await executeEditCode(
          input as unknown as EditCodeInput,
          config.projectContext.existingFiles,
        );
        if (artifact.code.trim()) {
          config.onArtifact(artifact);
        }
        toolResult = { result, artifact };
        break;
      }

      case "explain_concept": {
        // explain_concept is handled inline by the agent — it just returns
        // the concept and context for Claude to explain in its response.
        // No external tool execution needed.
        toolResult = {
          result: {
            concept: input.concept as string,
            context: (input.context as string) ?? "",
            message:
              "Explanation will be provided in the response text above.",
          },
        };
        break;
      }

      case "security_audit": {
        const { result } = await executeSecurityAudit(
          input as unknown as SecurityAuditInput,
        );
        toolResult = { result };
        break;
      }

      case "load_template_spec": {
        const { result } = await executeLoadTemplateSpec(
          input as unknown as LoadTemplateSpecInput,
        );
        toolResult = { result };
        break;
      }

      default:
        toolResult = {
          result: {
            error: `Unknown tool: ${toolName}. Available tools: generate_contract, generate_frontend, generate_tests, run_simulation, edit_code, explain_concept, security_audit, load_template_spec`,
          },
        };
    }

    // Extract memory entry from tool execution
    const memoryEntry = extractMemoryEntry(toolName, input, toolResult.result);
    if (memoryEntry && config.onMemoryEntry) {
      config.onMemoryEntry(memoryEntry);
    }

    return toolResult;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return {
      result: {
        error: `Tool "${toolName}" failed: ${message}`,
      },
    };
  }
}
