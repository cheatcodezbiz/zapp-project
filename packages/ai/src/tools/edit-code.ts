// ---------------------------------------------------------------------------
// Tool executor: edit_code
// ---------------------------------------------------------------------------

import Anthropic from "@anthropic-ai/sdk";
import { randomUUID } from "node:crypto";
import type { GeneratedArtifact } from "@zapp/shared-types";
import { EDIT_SYSTEM_PROMPT } from "../prompts/edit-system";

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

export interface EditCodeInput {
  filename: string;
  currentCode: string;
  editInstructions: string;
}

function getArtifactType(
  filename: string,
): GeneratedArtifact["type"] {
  if (filename.endsWith(".sol")) return "contract";
  if (filename.endsWith(".test.ts") || filename.endsWith(".test.tsx"))
    return "test";
  return "frontend";
}

function getLanguage(
  filename: string,
): GeneratedArtifact["language"] {
  if (filename.endsWith(".sol")) return "solidity";
  if (filename.endsWith(".tsx")) return "tsx";
  return "typescript";
}

export async function executeEditCode(
  input: EditCodeInput,
  existingArtifacts: GeneratedArtifact[],
): Promise<{ result: unknown; artifact: GeneratedArtifact }> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const userMessage = `File: ${input.filename}

Current code:
\`\`\`
${input.currentCode}
\`\`\`

Edit instructions:
${input.editInstructions}

Return the COMPLETE updated file with the requested changes applied.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 16_384,
    system: EDIT_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const code = stripCodeFences(extractText(response));

  // Find existing artifact to increment version
  const existing = existingArtifacts.find(
    (a) => a.filename === input.filename,
  );
  const version = existing ? existing.version + 1 : 1;

  const artifact: GeneratedArtifact = {
    id: randomUUID(),
    type: getArtifactType(input.filename),
    filename: input.filename,
    code,
    language: getLanguage(input.filename),
    version,
  };

  return {
    result: {
      success: true,
      filename: input.filename,
      version,
      message: `Updated "${input.filename}" (v${version}). Changes: ${input.editInstructions.slice(0, 100)}${input.editInstructions.length > 100 ? "..." : ""}`,
    },
    artifact,
  };
}
