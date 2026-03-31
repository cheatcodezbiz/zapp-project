// ---------------------------------------------------------------------------
// Conversation Compressor — reduces token costs by tiered message compression
// ---------------------------------------------------------------------------

import type { ChatMessage } from "@zapp/shared-types";

export interface CompressedHistory {
  summary: string;
  recentMessages: ChatMessage[];
  estimatedTokens: number;
}

// ── Constants ──────────────────────────────────────────────────────────────

const RECENT_FULL_COUNT = 4; // keep last 4 messages fully intact
const MEDIUM_STRIP_COUNT = 6; // messages 5-10: stripped & truncated
const MAX_SUMMARY_LENGTH = 1500;

// ── Main function ──────────────────────────────────────────────────────────

/**
 * Compresses a conversation into three tiers:
 *  - Old messages  → single-line summaries
 *  - Medium messages → text-only, truncated to 500 chars
 *  - Recent messages → kept fully intact
 */
export function compressConversation(
  messages: ChatMessage[],
): CompressedHistory {
  // Short conversations: nothing to compress
  if (messages.length <= RECENT_FULL_COUNT) {
    const raw = messages.map((m) => m.content).join(" ");
    return {
      summary: "",
      recentMessages: messages,
      estimatedTokens: estimateTokens(raw),
    };
  }

  const recentStart = Math.max(0, messages.length - RECENT_FULL_COUNT);
  const mediumStart = Math.max(0, recentStart - MEDIUM_STRIP_COUNT);

  const oldMessages = messages.slice(0, mediumStart);
  const mediumMessages = messages.slice(mediumStart, recentStart);
  const recentMessages = messages.slice(recentStart);

  // ── Old tier → one-line summaries ──
  const oldLines = oldMessages.map((m) => {
    const tag = m.role === "user" ? "[User]" : "[AI]";
    return `${tag} ${m.content.slice(0, 100).replace(/\n/g, " ")}`;
  });

  // ── Medium tier → stripped & truncated ──
  const mediumProcessed: ChatMessage[] = mediumMessages.map((m) => {
    let content = stripArtifactBlocks(m.content);
    content = content.slice(0, 500);
    return {
      ...m,
      content,
      toolCalls: undefined,
      artifacts: undefined,
    };
  });

  // ── Build summary ──
  let summary = "";
  if (oldLines.length > 0) {
    summary = "## Earlier conversation (compressed)\n" + oldLines.join("\n");
    if (summary.length > MAX_SUMMARY_LENGTH) {
      summary = summary.slice(0, MAX_SUMMARY_LENGTH - 1) + "\u2026";
    }
  }

  // Combine medium + recent for the message array
  const outputMessages = [...mediumProcessed, ...recentMessages];

  const allText =
    summary + " " + outputMessages.map((m) => m.content).join(" ");

  return {
    summary,
    recentMessages: outputMessages,
    estimatedTokens: estimateTokens(allText),
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Strip code blocks, long lines, and collapse excessive newlines.
 */
export function stripArtifactBlocks(content: string): string {
  // Replace fenced code blocks with placeholder
  let result = content.replace(/```[\s\S]*?```/g, "[code block]");
  // Replace lines longer than 300 chars
  result = result
    .split("\n")
    .map((line) => (line.length > 300 ? "[long content stripped]" : line))
    .join("\n");
  // Collapse 3+ consecutive newlines to 2
  result = result.replace(/\n{3,}/g, "\n\n");
  return result;
}

/**
 * Rough token estimate: ~4 chars per token.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
