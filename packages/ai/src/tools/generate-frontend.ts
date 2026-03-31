// ---------------------------------------------------------------------------
// Tool executor: generate_frontend
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

export interface GenerateFrontendInput {
  contractName: string;
  contractABI?: string;
  features: string[];
  style?: "minimal" | "dashboard" | "defi-app";
}

export async function executeGenerateFrontend(
  input: GenerateFrontendInput,
): Promise<{ result: unknown; artifact: GeneratedArtifact }> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const style = input.style ?? "dashboard";

  const abiSection = input.contractABI
    ? `\n\nContract ABI:\n\`\`\`json\n${input.contractABI}\n\`\`\``
    : "";

  const userMessage = `Generate a React frontend for the "${input.contractName}" smart contract.

Style: ${style}
UI features to include:
${input.features.map((f) => `- ${f}`).join("\n")}${abiSection}

The component should be a complete, self-contained page component for Next.js App Router.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 16_384,
    system: SYSTEM_PROMPTS.frontendGeneration,
    messages: [{ role: "user", content: userMessage }],
  });

  const code = stripCodeFences(extractText(response));

  const artifact: GeneratedArtifact = {
    id: randomUUID(),
    type: "frontend",
    filename: `${input.contractName}UI.tsx`,
    code,
    language: "tsx",
    version: 1,
  };

  return {
    result: {
      success: true,
      filename: artifact.filename,
      message: `Generated ${style} frontend for "${input.contractName}" with ${input.features.length} features`,
    },
    artifact,
  };
}
