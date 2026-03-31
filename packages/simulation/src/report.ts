// ---------------------------------------------------------------------------
// Template-based Risk Report Generator
// ---------------------------------------------------------------------------
// Deterministic, non-AI report generation. No LLM calls — pure templates.
// This is the "conscience" of the platform: honest, clear, and readable
// by non-technical users.
// ---------------------------------------------------------------------------

import type { RiskFactor, RiskLevel } from "@zapp/shared-types";
import type { StepSnapshot } from "./types";
import type { RiskScores } from "./risk";

// ---- Public types ----

export interface RiskReport {
  /** One-line verdict shown at the top of the report. */
  headline: string;
  /** 2-3 sentence plain-English summary combining headline + key finding. */
  summary: string;
  /** Ordered list of specific findings with severity and explanation. */
  findings: RiskFinding[];
  /** Plain-English description of who wins and who loses. */
  winnersLosers: string;
}

export interface RiskFinding {
  severity: "info" | "warning" | "critical";
  category:
    | "sustainability"
    | "fairness"
    | "treasury"
    | "price-risk"
    | "structural";
  title: string;
  explanation: string;
}

// ---- Headlines by rating ----

const HEADLINES: Record<RiskLevel, string> = {
  sustainable:
    "This protocol generates real yield from fees.",
  caution:
    "This protocol partially relies on new deposits. Early users benefit more.",
  unsustainable:
    "This protocol cannot sustain rewards without continuous new deposits.",
};

// ---- Main entry point ----

/**
 * Generate a complete, human-readable risk report from simulation data.
 * No LLM calls — everything is template-driven and deterministic.
 */
export function generateReport(
  scores: RiskScores,
  level: RiskLevel,
  snapshots: StepSnapshot[],
): RiskReport {
  const headline = HEADLINES[level];
  const findings = generateFindings(scores, snapshots);
  const winnersLosers = generateWinnersLosers(level, scores, snapshots);
  const summary = generateSummary(headline, findings, scores);

  return { headline, summary, findings, winnersLosers };
}

// ---- Findings generator ----

function generateFindings(
  scores: RiskScores,
  snapshots: StepSnapshot[],
): RiskFinding[] {
  const findings: RiskFinding[] = [];

  // -- Fee coverage --
  // Check critical threshold first, then warning
  if (scores.feeCoverageRatio < 0.3) {
    const excessPercent = Math.round((1 - scores.feeCoverageRatio) * 100);
    findings.push({
      severity: "critical",
      category: "sustainability",
      title: `Rewards exceed fee revenue by ${excessPercent}%`,
      explanation:
        `The protocol's fee income covers less than 30% of its reward payouts. ` +
        `The difference — ${excessPercent}% of total rewards — must come from ` +
        `new deposits or existing reserves. This is the defining characteristic ` +
        `of an unsustainable reward structure.`,
    });
  } else if (scores.feeCoverageRatio < 0.8) {
    const coveragePercent = Math.round(scores.feeCoverageRatio * 100);
    findings.push({
      severity: "warning",
      category: "sustainability",
      title: `Fee revenue covers only ${coveragePercent}% of reward outflows`,
      explanation:
        `The protocol generates meaningful fee income, but not enough to fully ` +
        `cover its reward promises. The ${100 - coveragePercent}% gap means the ` +
        `protocol still depends partly on new money entering the system.`,
    });
  } else {
    const coveragePercent = Math.round(scores.feeCoverageRatio * 100);
    findings.push({
      severity: "info",
      category: "sustainability",
      title: `Fee revenue covers ${coveragePercent}% of reward outflows`,
      explanation:
        `The protocol generates enough fee income to sustain its reward payouts ` +
        `without relying on new deposits. This is the hallmark of real yield.`,
    });
  }

  // -- Treasury runway --
  // Check critical first (< 30 days), then warning (< 90 days)
  if (isFinite(scores.treasuryRunway) && scores.treasuryRunway < 30) {
    findings.push({
      severity: "critical",
      category: "treasury",
      title: `Treasury depletes in ~${Math.round(scores.treasuryRunway)} days`,
      explanation:
        `At the current rate of reward emissions minus fee income, the treasury ` +
        `will be empty in approximately ${Math.round(scores.treasuryRunway)} days. ` +
        `When the treasury runs out, the protocol can no longer honor reward ` +
        `commitments. Users who haven't withdrawn by then may lose funds.`,
    });
  } else if (isFinite(scores.treasuryRunway) && scores.treasuryRunway < 90) {
    findings.push({
      severity: "warning",
      category: "treasury",
      title: `Treasury depletes in ~${Math.round(scores.treasuryRunway)} days`,
      explanation:
        `The treasury has limited runway. At the current burn rate, reserves ` +
        `will be exhausted in approximately ${Math.round(scores.treasuryRunway)} days. ` +
        `The protocol needs to increase fee revenue or reduce reward emissions ` +
        `to remain solvent.`,
    });
  }

  // -- Early vs. late return ratio --
  // Check critical first (> 10x), then warning (> 3x)
  if (scores.earlyVsLateReturnRatio > 10) {
    findings.push({
      severity: "critical",
      category: "fairness",
      title: `Early users earn ${scores.earlyVsLateReturnRatio.toFixed(1)}x more than late users`,
      explanation:
        `The first 20% of participants earn over ten times as much as the last ` +
        `20%. This extreme disparity means the protocol structurally transfers ` +
        `wealth from late entrants to early ones — a defining feature of ` +
        `pyramid-like structures.`,
    });
  } else if (scores.earlyVsLateReturnRatio > 3) {
    findings.push({
      severity: "warning",
      category: "fairness",
      title: `Early users earn ${scores.earlyVsLateReturnRatio.toFixed(1)}x more than late users`,
      explanation:
        `Returns decline significantly over time. Users who enter early capture ` +
        `a disproportionate share of rewards compared to those who join later. ` +
        `This pattern is common in protocols with fixed reward pools or ` +
        `declining emission schedules.`,
    });
  }

  // -- Price drawdown --
  // Check critical first (> 80%), then warning (> 50%)
  if (scores.maxPriceDrawdown > 0.8) {
    const dropPercent = Math.round(scores.maxPriceDrawdown * 100);
    findings.push({
      severity: "critical",
      category: "price-risk",
      title: `Token price drops ${dropPercent}% from peak`,
      explanation:
        `The simulation shows the token losing ${dropPercent}% of its peak value. ` +
        `A decline this severe typically triggers a death spiral: falling prices ` +
        `cause withdrawals, which cause further price drops. Users holding the ` +
        `token through this decline face catastrophic losses.`,
    });
  } else if (scores.maxPriceDrawdown > 0.5) {
    const dropPercent = Math.round(scores.maxPriceDrawdown * 100);
    findings.push({
      severity: "warning",
      category: "price-risk",
      title: `Token price drops ${dropPercent}% from peak`,
      explanation:
        `The token experiences a major decline of ${dropPercent}% from its highest ` +
        `point. While some volatility is normal, a drop of this magnitude ` +
        `suggests the token's value is not well-supported by the protocol's ` +
        `fundamentals. Late entrants are most exposed.`,
    });
  }

  // -- Real APY negative --
  if (scores.realApyNegativeStep !== null) {
    findings.push({
      severity: "warning",
      category: "sustainability",
      title: `Real yield turns negative by day ${scores.realApyNegativeStep}`,
      explanation:
        `Starting at step ${scores.realApyNegativeStep}, participants are losing ` +
        `purchasing power even after accounting for rewards. The nominal APY ` +
        `may still look positive, but the real return (after token price changes ` +
        `and inflation) is negative. Users entering after this point are ` +
        `effectively subsidizing earlier participants.`,
    });
  }

  // -- Return inequality (Gini) --
  // Check critical first (> 0.8), then warning (> 0.6)
  if (scores.returnGini > 0.8) {
    findings.push({
      severity: "critical",
      category: "structural",
      title: "Winner-take-all structure detected",
      explanation:
        `The return distribution has a Gini coefficient of ${scores.returnGini.toFixed(2)}, ` +
        `indicating extreme concentration. A small fraction of participants ` +
        `capture the vast majority of value. This level of inequality suggests ` +
        `the protocol's design inherently benefits a few at the expense of many.`,
    });
  } else if (scores.returnGini > 0.6) {
    findings.push({
      severity: "warning",
      category: "structural",
      title: `Returns are significantly unequal (Gini: ${scores.returnGini.toFixed(2)})`,
      explanation:
        `The distribution of returns across participants is notably uneven. ` +
        `A Gini coefficient of ${scores.returnGini.toFixed(2)} means some users ` +
        `benefit substantially more than others. This could stem from timing ` +
        `advantages, whale concentration, or structural design choices.`,
    });
  }

  // Sort findings: critical first, then warning, then info
  const severityOrder: Record<RiskFinding["severity"], number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };
  findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return findings;
}

// ---- Winners and losers section ----

function generateWinnersLosers(
  level: RiskLevel,
  scores: RiskScores,
  snapshots: StepSnapshot[],
): string {
  switch (level) {
    case "sustainable":
      return (
        "All participants earn real yield proportional to their stake. " +
        "The protocol's fee revenue is sufficient to sustain rewards without " +
        "depending on a growing user base."
      );

    case "caution": {
      const ratio = scores.earlyVsLateReturnRatio;
      // Estimate the inflection point: roughly where returns start declining
      const inflectionStep = estimateInflectionStep(snapshots);
      const inflectionDay =
        inflectionStep !== null ? inflectionStep : Math.round(snapshots.length * 0.5);

      return (
        `Early users earn ~${ratio.toFixed(1)}x more than late users. ` +
        `Users entering after day ${inflectionDay} see diminishing returns. ` +
        `While the protocol is not purely extractive, the reward structure ` +
        `favors those who get in first.`
      );
    }

    case "unsustainable": {
      // Estimate what fraction of participants lose money
      const loserFraction = estimateLoserFraction(scores);
      const loserPercent = Math.round(loserFraction * 100);

      return (
        `Last ${loserPercent}% of participants are projected to lose money. ` +
        `This protocol structurally transfers value from late entrants to early ` +
        `ones. The math requires a continuously growing user base to sustain ` +
        `payouts — when growth slows, the system collapses.`
      );
    }
  }
}

// ---- Summary generator ----

function generateSummary(
  headline: string,
  findings: RiskFinding[],
  scores: RiskScores,
): string {
  const coveragePercent = Math.round(scores.feeCoverageRatio * 100);

  // Find the most important finding (first critical, or first warning)
  const topFinding =
    findings.find((f) => f.severity === "critical") ??
    findings.find((f) => f.severity === "warning");

  if (topFinding) {
    return (
      `${headline} Fee revenue covers ${coveragePercent}% of reward outflows. ` +
      `${topFinding.title}.`
    );
  }

  return (
    `${headline} Fee revenue covers ${coveragePercent}% of reward outflows, ` +
    `suggesting the yield is generated from real protocol activity.`
  );
}

// ---- Convert RiskFinding[] to RiskFactor[] (shared-types format) ----

/**
 * Convert the report's detailed findings into the RiskFactor[] format
 * expected by the shared-types RiskClassification interface.
 *
 * Severity mapping:
 *   critical → high
 *   warning  → medium
 *   info     → low
 */
export function findingsToFactors(findings: RiskFinding[]): RiskFactor[] {
  const severityMap: Record<RiskFinding["severity"], RiskFactor["severity"]> = {
    critical: "high",
    warning: "medium",
    info: "low",
  };

  return findings.map((finding) => ({
    label: finding.title,
    description: finding.explanation,
    severity: severityMap[finding.severity],
  }));
}

// ---- Helper: estimate the step where returns start declining ----

function estimateInflectionStep(snapshots: StepSnapshot[]): number | null {
  if (snapshots.length < 4) return null;

  // Find the step where per-step rewards peak and begin declining
  let peakReward = 0;
  let peakStep: number | null = null;

  // Use a rolling average to smooth noise
  const windowSize = Math.max(1, Math.floor(snapshots.length / 10));

  for (let i = windowSize; i < snapshots.length; i++) {
    let windowSum = 0;
    for (let j = i - windowSize; j < i; j++) {
      windowSum += snapshots[j]!.state.rewardsDistributedThisStep;
    }
    const avgReward = windowSum / windowSize;

    if (avgReward > peakReward) {
      peakReward = avgReward;
      peakStep = snapshots[i]!.step;
    }
  }

  return peakStep;
}

// ---- Helper: estimate fraction of participants who lose money ----

function estimateLoserFraction(scores: RiskScores): number {
  // Heuristic: the loser fraction correlates with deposit dependency and
  // early/late disparity. In a pure Ponzi, the last ~60-70% lose money.
  // We scale based on how extractive the metrics look.

  const depositFactor = Math.min(1, scores.newDepositDependency);
  const ratioFactor = Math.min(1, scores.earlyVsLateReturnRatio / 20);
  const giniFactor = Math.min(1, scores.returnGini);

  // Weighted estimate, clamped to [20%, 80%]
  const raw = depositFactor * 0.4 + ratioFactor * 0.3 + giniFactor * 0.3;
  return Math.max(0.2, Math.min(0.8, raw));
}
