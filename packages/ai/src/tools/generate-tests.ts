// ---------------------------------------------------------------------------
// Tool executor: generate_tests
// ---------------------------------------------------------------------------

import Anthropic from "@anthropic-ai/sdk";
import { randomUUID } from "node:crypto";
import type { GeneratedArtifact } from "@zapp/shared-types";
import { SYSTEM_PROMPTS } from "../prompts/system";

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

export interface GenerateTestsInput {
  contractName: string;
  contractCode: string;
}

export async function executeGenerateTests(
  input: GenerateTestsInput,
): Promise<{ result: unknown; artifact: GeneratedArtifact }> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const userMessage = `Generate a comprehensive Hardhat test suite for the following contract.

Contract name: ${input.contractName}

Contract source code:
\`\`\`solidity
${input.contractCode}
\`\`\`

Cover initialization, core functionality, access control, edge cases, and event emissions.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 16_384,
    system: SYSTEM_PROMPTS.testGeneration,
    messages: [{ role: "user", content: userMessage }],
  });

  const code = stripCodeFences(extractText(response));

  const artifact: GeneratedArtifact = {
    id: randomUUID(),
    type: "test",
    filename: `${input.contractName}.test.ts`,
    code,
    language: "typescript",
    version: 1,
  };

  return {
    result: {
      success: true,
      filename: artifact.filename,
      message: `Generated test suite for "${input.contractName}" (${code.split("\n").length} lines)`,
    },
    artifact,
  };
}
