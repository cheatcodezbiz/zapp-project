// ---------------------------------------------------------------------------
// Project Memory — compressed representation of a project's state
// ---------------------------------------------------------------------------

export interface ProjectMemoryEntry {
  timestamp: string;
  type: "decision" | "artifact" | "config" | "issue" | "user_pref";
  content: string; // Max 200 chars — compressed summary
}

export interface ProjectMemory {
  projectId: string;
  projectName: string;
  chain: string;
  templateId?: number;
  entries: ProjectMemoryEntry[];
}

// ── Icons for each entry type ──────────────────────────────────────────────
const ENTRY_ICONS: Record<ProjectMemoryEntry["type"], string> = {
  decision: "\u2192",   // →
  artifact: "\uD83D\uDCC4", // 📄
  config: "\u2699",    // ⚙
  issue: "\u26A0",     // ⚠
  user_pref: "\uD83D\uDC64", // 👤
};

// ── buildMemoryPrompt ──────────────────────────────────────────────────────

/**
 * Builds a compact prompt string for injection into the system prompt.
 * Target: under 2,000 tokens total.
 */
export function buildMemoryPrompt(memory: ProjectMemory): string {
  const header = [
    `## Project Memory: ${memory.projectName}`,
    `Chain: ${memory.chain}`,
    memory.templateId != null ? `Template: #${memory.templateId}` : null,
    `ID: ${memory.projectId}`,
    "",
  ]
    .filter((line) => line !== null)
    .join("\n");

  const entryLines = memory.entries.map((e) => {
    const icon = ENTRY_ICONS[e.type];
    return `${icon} [${e.type}] ${e.content}`;
  });

  const footer =
    "\n*This is a compressed summary. Use edit_code tool to read full artifact source when needed.*";

  return header + entryLines.join("\n") + footer;
}

// ── extractMemoryEntry ─────────────────────────────────────────────────────

/**
 * Extracts a memory entry from a completed tool result.
 * Returns null for unrecognised tools.
 */
export function extractMemoryEntry(
  toolName: string,
  toolInput: Record<string, unknown>,
  _toolResult: unknown,
): ProjectMemoryEntry | null {
  const now = new Date().toISOString();

  switch (toolName) {
    case "generate_contract": {
      const name = String(toolInput["contractName"] ?? toolInput["name"] ?? "unknown");
      const type = String(toolInput["type"] ?? toolInput["contractType"] ?? "contract");
      const templateId = toolInput["templateId"] ?? "";
      const features = Array.isArray(toolInput["features"])
        ? (toolInput["features"] as string[]).join(", ")
        : String(toolInput["features"] ?? "");
      const summary = truncate(
        `Generated contract "${name}" type=${type}${templateId ? ` template=#${templateId}` : ""}${features ? ` features=[${features}]` : ""}`,
        200,
      );
      return { timestamp: now, type: "artifact", content: summary };
    }

    case "generate_frontend": {
      const name = String(toolInput["contractName"] ?? toolInput["name"] ?? "unknown");
      const style = String(toolInput["style"] ?? toolInput["framework"] ?? "default");
      const features = Array.isArray(toolInput["features"])
        ? (toolInput["features"] as string[]).join(", ")
        : String(toolInput["features"] ?? "");
      const summary = truncate(
        `Generated frontend for "${name}" style=${style}${features ? ` features=[${features}]` : ""}`,
        200,
      );
      return { timestamp: now, type: "artifact", content: summary };
    }

    case "run_simulation": {
      const result = _toolResult as Record<string, unknown> | null;
      const duration = result?.["duration"] ?? toolInput["duration"] ?? "?";
      const risk = result?.["riskLevel"] ?? result?.["risk"] ?? "?";
      const finalPrice = result?.["finalPrice"] ?? "?";
      const priceChange = result?.["priceChangePercent"] ?? result?.["priceChange"] ?? "?";
      const apy = result?.["apy"] ?? result?.["APY"] ?? "?";
      const summary = truncate(
        `Simulation: duration=${duration} risk=${risk} finalPrice=${finalPrice} priceChange=${priceChange}% APY=${apy}`,
        200,
      );
      return { timestamp: now, type: "config", content: summary };
    }

    case "edit_code": {
      const filename = String(toolInput["filename"] ?? toolInput["file"] ?? "unknown");
      const instructions = String(toolInput["editInstructions"] ?? toolInput["instructions"] ?? "");
      const summary = truncate(
        `Edited ${filename}: ${instructions.slice(0, 100)}`,
        200,
      );
      return { timestamp: now, type: "artifact", content: summary };
    }

    case "security_audit": {
      const result = _toolResult as Record<string, unknown> | null;
      const auditSummary = String(
        result?.["summary"] ?? result?.["result"] ?? JSON.stringify(result ?? {}),
      );
      const summary = truncate(`Security audit: ${auditSummary}`, 200);
      return { timestamp: now, type: "issue", content: summary };
    }

    default:
      return null;
  }
}

// ── extractUserMemoryEntry ─────────────────────────────────────────────────

/**
 * Configuration-decision patterns we watch for in user messages.
 */
const CONFIG_PATTERNS: RegExp[] = [
  // Emission / reward rate
  /(?:emission|reward)\s*(?:rate|speed|per\s*block|per\s*second)/i,
  // Token naming
  /(?:token\s*name|call\s*(?:it|the\s*token)|name\s*(?:it|the\s*token)|ticker|symbol)\s/i,
  // Chain / deployment target
  /(?:deploy\s*(?:on|to)|chain|network|mainnet|testnet)\s/i,
  // Fee percentage
  /(?:fee|commission|tax|royalty)\s*(?:of|at|to|=|:)?\s*\d+/i,
];

/**
 * Detects configuration decisions in user messages.
 * Returns a user_pref entry with the first 150 chars, or null if nothing matched.
 */
export function extractUserMemoryEntry(
  message: string,
): ProjectMemoryEntry | null {
  const matched = CONFIG_PATTERNS.some((p) => p.test(message));
  if (!matched) return null;

  return {
    timestamp: new Date().toISOString(),
    type: "user_pref",
    content: truncate(message, 150),
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + "\u2026";
}
