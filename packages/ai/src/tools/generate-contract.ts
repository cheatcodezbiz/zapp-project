// ---------------------------------------------------------------------------
// Tool executor: generate_contract
// ---------------------------------------------------------------------------

import Anthropic from "@anthropic-ai/sdk";
import { randomUUID } from "node:crypto";
import type { GeneratedArtifact } from "@zapp/shared-types";
import { SYSTEM_PROMPTS } from "../prompts/system";

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

  const userMessage = `Generate a ${input.contractType} smart contract.

Contract name: ${input.name}
Description: ${input.description}${featuresText}${parametersText}`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 16_384,
    system: SYSTEM_PROMPTS.contractGeneration,
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
