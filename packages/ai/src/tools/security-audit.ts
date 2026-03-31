// ---------------------------------------------------------------------------
// Tool executor: security_audit
// ---------------------------------------------------------------------------

import Anthropic from "@anthropic-ai/sdk";
import { AUDIT_SYSTEM_PROMPT } from "../prompts/audit-system";

function extractText(response: {
  content: Array<{ type: string; text?: string }>;
}): string {
  const block = response.content.find((b) => b.type === "text");
  return block?.text ?? "";
}

export interface SecurityAuditInput {
  contractCode: string;
  contractName: string;
}

export interface AuditFinding {
  severity: "critical" | "high" | "medium" | "low" | "info";
  issue: string;
  location: string;
  recommendation: string;
}

export async function executeSecurityAudit(
  input: SecurityAuditInput,
): Promise<{ result: unknown; artifact: undefined }> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const userMessage = `Audit the following Solidity smart contract.

Contract name: ${input.contractName}

\`\`\`solidity
${input.contractCode}
\`\`\`

Return your findings as JSON.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8_192,
    system: AUDIT_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const rawText = extractText(response);

  // Extract JSON from the response — it may be wrapped in code fences
  let findings: AuditFinding[] = [];
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as { findings: AuditFinding[] };
      findings = parsed.findings ?? [];
    }
  } catch {
    // If JSON parsing fails, create a single finding from the raw text
    findings = [
      {
        severity: "info",
        issue: "Audit completed but structured output could not be parsed",
        location: "N/A",
        recommendation: rawText.slice(0, 500),
      },
    ];
  }

  const criticalCount = findings.filter(
    (f) => f.severity === "critical",
  ).length;
  const highCount = findings.filter((f) => f.severity === "high").length;
  const mediumCount = findings.filter((f) => f.severity === "medium").length;
  const lowCount = findings.filter((f) => f.severity === "low").length;
  const infoCount = findings.filter((f) => f.severity === "info").length;

  const summary = [
    criticalCount > 0 ? `${criticalCount} critical` : null,
    highCount > 0 ? `${highCount} high` : null,
    mediumCount > 0 ? `${mediumCount} medium` : null,
    lowCount > 0 ? `${lowCount} low` : null,
    infoCount > 0 ? `${infoCount} info` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    result: {
      success: true,
      contractName: input.contractName,
      findings,
      summary: `Security audit of "${input.contractName}": ${findings.length} findings (${summary || "none"})`,
      message:
        criticalCount > 0
          ? `CRITICAL ISSUES FOUND in "${input.contractName}". ${criticalCount} critical finding(s) require immediate attention.`
          : highCount > 0
            ? `Security audit of "${input.contractName}" found ${highCount} high-severity issue(s) that should be addressed before deployment.`
            : `Security audit of "${input.contractName}" completed with ${findings.length} finding(s). No critical issues detected.`,
    },
    artifact: undefined,
  };
}
