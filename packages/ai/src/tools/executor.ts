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

export async function executeTool(
  toolName: string,
  input: Record<string, unknown>,
  config: AgentConfig,
): Promise<{ result: unknown; artifact?: GeneratedArtifact }> {
  try {
    switch (toolName) {
      case "generate_contract": {
        const { result, artifact } = await executeGenerateContract(
          input as unknown as GenerateContractInput,
        );
        config.onArtifact(artifact);
        return { result, artifact };
      }

      case "generate_frontend": {
        const { result, artifact } = await executeGenerateFrontend(
          input as unknown as GenerateFrontendInput,
        );
        config.onArtifact(artifact);
        return { result, artifact };
      }

      case "generate_tests": {
        const { result, artifact } = await executeGenerateTests(
          input as unknown as GenerateTestsInput,
        );
        config.onArtifact(artifact);
        return { result, artifact };
      }

      case "run_simulation": {
        const { result } = await executeRunSimulation(
          input as unknown as RunSimulationInput,
        );
        return { result };
      }

      case "edit_code": {
        const { result, artifact } = await executeEditCode(
          input as unknown as EditCodeInput,
          config.projectContext.existingFiles,
        );
        config.onArtifact(artifact);
        return { result, artifact };
      }

      case "explain_concept": {
        // explain_concept is handled inline by the agent — it just returns
        // the concept and context for Claude to explain in its response.
        // No external tool execution needed.
        return {
          result: {
            concept: input.concept as string,
            context: (input.context as string) ?? "",
            message:
              "Explanation will be provided in the response text above.",
          },
        };
      }

      case "security_audit": {
        const { result } = await executeSecurityAudit(
          input as unknown as SecurityAuditInput,
        );
        return { result };
      }

      default:
        return {
          result: {
            error: `Unknown tool: ${toolName}. Available tools: generate_contract, generate_frontend, generate_tests, run_simulation, edit_code, explain_concept, security_audit`,
          },
        };
    }
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
