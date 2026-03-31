// ---------------------------------------------------------------------------
// Tool executor: generate_contract
// ---------------------------------------------------------------------------

import Anthropic from "@anthropic-ai/sdk";
import { randomUUID } from "node:crypto";
import type { GeneratedArtifact } from "@zapp/shared-types";
import { SYSTEM_PROMPTS } from "../prompts/system";
import {
  matchTemplatesByKeywords,
  getTemplateSpecs,
  getGlobalSecurityStandards,
} from "../prompts/template-specs";

// Reuse the helper from generator.ts (duplicated here to avoid circular deps)
function stripCodeFences(code: string): string {
  return code
    .replace(/^```[a-zA-Z]*\n?/gm, "")
    .replace(/^```\s*$/gm, "")
    .trim();
}

function extractText(response: {
  content: Array<{ type: string; text?: string }>;
}): string {
  const block = response.content.find((b) => b.type === "text");
  return block?.text ?? "";
}

export interface GenerateContractInput {
  contractType: string;
  name: string;
  description: string;
  templateId?: number;
  parameters?: Record<string, unknown>;
  features?: string[];
}

export async function executeGenerateContract(
  input: GenerateContractInput,
): Promise<{ result: unknown; artifact: GeneratedArtifact }> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const featuresText =
    input.features && input.features.length > 0
      ? `\n\nRequired features:\n${input.features.map((f) => `- ${f}`).join("\n")}`
      : "";

  const parametersText =
    input.parameters && Object.keys(input.parameters).length > 0
      ? `\n\nContract parameters:\n${JSON.stringify(input.parameters, null, 2)}`
      : "";

  // Resolve template spec: explicit templateId takes priority, then keyword matching
  let templateSpecSection = "";
  if (input.templateId) {
    const specs = getTemplateSpecs([input.templateId]);
    if (specs) {
      templateSpecSection = `\n\n## Template Architecture Blueprint (Template ${input.templateId})\n\nYou MUST follow this proven architecture specification as your structural blueprint. Use the exact contract structure, storage layouts, function signatures, and ALL security fixes:\n\n${specs}`;
    }
  } else {
    // Match template specs based on the contract description
    const matchText = `${input.contractType} ${input.name} ${input.description}`;
    const matches = matchTemplatesByKeywords(matchText);

    if (matches.length > 0) {
      const topIds = matches.slice(0, 2).map((m) => m.id);
      const specs = getTemplateSpecs(topIds);
      if (specs) {
        templateSpecSection = `\n\n## Template Architecture Blueprint\n\nUse the following proven architecture specification as your structural blueprint. Follow the contract structure, storage layouts, function signatures, and ALL security fixes exactly:\n\n${specs}`;
      }
    } else {
      // At minimum include global security standards
      const globals = getGlobalSecurityStandards();
      if (globals) {
        templateSpecSection = `\n\n## Security Standards\n\n${globals}`;
      }
    }
  }

  const systemPrompt = SYSTEM_PROMPTS.contractGeneration + templateSpecSection;

  const userMessage = `Generate a ${input.contractType} smart contract.

Contract name: ${input.name}
Description: ${input.description}${featuresText}${parametersText}`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 16_384,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const code = stripCodeFences(extractText(response));

  const artifact: GeneratedArtifact = {
    id: randomUUID(),
    type: "contract",
    filename: `${input.name}.sol`,
    code,
    language: "solidity",
    version: 1,
  };

  return {
    result: {
      success: true,
      filename: artifact.filename,
      message: `Generated ${input.contractType} contract "${input.name}" (${code.split("\n").length} lines)`,
    },
    artifact,
  };
}
