// ---------------------------------------------------------------------------
// Risk Classification Engine
// ---------------------------------------------------------------------------
// Implements the 6-metric scoring system with fee coverage ratio as primary
// signal. This is the analytical core that decides whether a protocol is
// sustainable, needs caution, or is structurally unsustainable (Ponzi-like).
// ---------------------------------------------------------------------------

import type {
  RiskClassification,
  RiskLevel,
  RiskFactor,
} from "@zapp/shared-types";
import type { StepSnapshot } from "./types";

// ---- Public types ----

export interface RiskScores {
  /** Fees / rewards (rolling 30-step average). Primary sustainability signal. */
  feeCoverageRatio: number;
  /** Estimated steps until treasury (TVL) depletes at current burn rate. */
  treasuryRunway: number;
  /** (rewards - fees) / rewards. How much rewards depend on new money. */
  newDepositDependency: number;
  /** Gini coefficient of per-step returns: 0 = equal, 1 = winner-take-all. */
  returnGini: number;
  /** Peak-to-trough price decline as a fraction 0–1. */
  maxPriceDrawdown: number;
  /** First step where real APY turns negative, or null if it never does. */
  realApyNegativeStep: number | null;
  /** Average return for first 20% of steps / average return for last 20%. */
  earlyVsLateReturnRatio: number;
  /** Fraction of stress scenarios that pass (0–1). Reserved for future use. */
  stressTestPassRate: number;
}

// ---- Gini coefficient ----

/**
 * Standard Gini coefficient.
 * 0 = perfect equality (everyone earns the same).
 * 1 = maximum inequality (one step captures all returns).
 *
 * Uses the sorted-values formula:
 *   G = (2 * sum(i * y_i)) / (n * sum(y_i)) - (n + 1) / n
 * where y_i are the sorted values and i is 1-indexed rank.
 */
export function computeGini(values: number[]): number {
  if (values.length === 0) return 0;

  // Filter to non-negative values (negative returns are losses, not "share")
  const sorted = values.filter((v) => v >= 0).sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 0) return 0;

  const totalSum = sorted.reduce((acc, v) => acc + v, 0);
  if (totalSum === 0) return 0;

  let weightedSum = 0;
  for (let i = 0; i < n; i++) {
    // 1-indexed rank
    weightedSum += (i + 1) * sorted[i]!;
  }

  return (2 * weightedSum) / (n * totalSum) - (n + 1) / n;
}

// ---- Max drawdown ----

/**
 * Peak-to-trough maximum decline in a price series.
 * Returns a value between 0 (no decline) and 1 (price went to zero).
 */
export function computeMaxDrawdown(prices: number[]): number {
  if (prices.length < 2) return 0;

  let peak = prices[0]!;
  let maxDrawdown = 0;

  for (let i = 1; i < prices.length; i++) {
    const price = prices[i]!;
    if (price > peak) {
      peak = price;
    } else if (peak > 0) {
      const drawdown = (peak - price) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
  }

  return maxDrawdown;
}

// ---- Compute all risk scores from snapshots ----

export function computeRiskScores(snapshots: StepSnapshot[]): RiskScores {
  if (snapshots.length === 0) {
    return {
      feeCoverageRatio: 0,
      treasuryRunway: 0,
      newDepositDependency: 1,
      returnGini: 0,
      maxPriceDrawdown: 0,
      realApyNegativeStep: null,
      earlyVsLateReturnRatio: 1,
      stressTestPassRate: 1,
    };
  }

  // ---- Fee coverage ratio (rolling 30-step average) ----
  const windowSize = Math.min(30, snapshots.length);
  const recentSnapshots = snapshots.slice(-windowSize);
  const totalFees = recentSnapshots.reduce((s, snap) => s + snap.state.feeRevenueThisStep, 0);
  const totalRewards = recentSnapshots.reduce((s, snap) => s + snap.state.rewardsDistributedThisStep, 0);
  const feeCoverageRatio = totalRewards > 0 ? totalFees / totalRewards : 1;

  // ---- Treasury runway ----
  // Estimate: how many steps can the current TVL sustain the current
  // net outflow rate (rewards - fees per step)?
  const netBurnPerStep =
    recentSnapshots.length > 0
      ? (totalRewards - totalFees) / recentSnapshots.length
      : 0;
  const lastSnapshot = snapshots[snapshots.length - 1]!;
  const currentTvl = lastSnapshot.state.treasuryBalanceUsd;
  const treasuryRunway =
    netBurnPerStep > 0 && currentTvl > 0
      ? currentTvl / netBurnPerStep
      : netBurnPerStep <= 0
        ? Infinity // self-sustaining or growing
        : 0;

  // ---- New deposit dependency ----
  const allFees = snapshots.reduce((s, snap) => s + snap.state.feeRevenueThisStep, 0);
  const allRewards = snapshots.reduce((s, snap) => s + snap.state.rewardsDistributedThisStep, 0);
  const newDepositDependency =
    allRewards > 0 ? Math.max(0, (allRewards - allFees) / allRewards) : 0;

  // ---- Return Gini ----
  // Per-step net returns (fees collected serves as proxy for user returns
  // in fee-generating protocols; rewards emitted represent what users receive)
  const perStepReturns = snapshots.map((snap) => snap.state.rewardsDistributedThisStep);
  const returnGini = computeGini(perStepReturns);

  // ---- Max price drawdown ----
  const prices = snapshots.map((snap) => snap.state.tokenPrice);
  const maxPriceDrawdown = computeMaxDrawdown(prices);

  // ---- Real APY negative step ----
  // Real APY turns negative when rewards emitted < fees collected in that step
  // (i.e., the protocol is taking more than it gives), OR when APY itself is < 0.
  let realApyNegativeStep: number | null = null;
  for (const snap of snapshots) {
    if (snap.state.realApy < 0) {
      realApyNegativeStep = snap.step;
      break;
    }
  }

  // ---- Early vs. late return ratio ----
  const earlyCount = Math.max(1, Math.floor(snapshots.length * 0.2));
  const lateCount = Math.max(1, Math.floor(snapshots.length * 0.2));
  const earlySlice = snapshots.slice(0, earlyCount);
  const lateSlice = snapshots.slice(-lateCount);

  const earlyAvgReturn =
    earlySlice.reduce((s, snap) => s + snap.state.rewardsDistributedThisStep, 0) / earlySlice.length;
  const lateAvgReturn =
    lateSlice.reduce((s, snap) => s + snap.state.rewardsDistributedThisStep, 0) / lateSlice.length;

  const earlyVsLateReturnRatio =
    lateAvgReturn > 0 ? earlyAvgReturn / lateAvgReturn : earlyAvgReturn > 0 ? Infinity : 1;

  // ---- Stress test pass rate ----
  // Reserved for future Monte Carlo stress testing; default to 1.0
  const stressTestPassRate = 1.0;

  return {
    feeCoverageRatio,
    treasuryRunway,
    newDepositDependency,
    returnGini,
    maxPriceDrawdown,
    realApyNegativeStep,
    earlyVsLateReturnRatio,
    stressTestPassRate,
  };
}

// ---- Primary classification logic ----

/**
 * Classify a simulation's risk based on its step-by-step snapshots.
 *
 * The algorithm:
 * 1. Compute all RiskScores from snapshots.
 * 2. Apply primary classification based on fee coverage ratio.
 * 3. Apply override rules for edge cases (treasury depletion, extreme
 *    drawdown, winner-take-all distribution).
 * 4. Generate human-readable risk factors.
 */
export function classifyRisk(snapshots: StepSnapshot[]): RiskClassification {
  const scores = computeRiskScores(snapshots);
  const avgFeeCoverage = scores.feeCoverageRatio;

  // ---- Step 2: Primary classification ----
  let level: RiskLevel;
  let confidence: number;

  if (avgFeeCoverage >= 0.8) {
    level = "sustainable";
    confidence = Math.min(avgFeeCoverage / 1.0, 1.0);
  } else if (avgFeeCoverage >= 0.3) {
    level = "caution";
    confidence = 1.0 - Math.abs(avgFeeCoverage - 0.55) / 0.25;
  } else {
    level = "unsustainable";
    confidence = Math.min((0.3 - avgFeeCoverage) / 0.3, 1.0);
  }

  // Clamp confidence to [0, 1]
  confidence = Math.max(0, Math.min(1, confidence));

  // ---- Step 3: Override rules ----
  const treasuryDepleted = isFinite(scores.treasuryRunway) && scores.treasuryRunway <= 0;
  const treasuryDepletedEarly =
    isFinite(scores.treasuryRunway) && scores.treasuryRunway < snapshots.length * 0.5;

  if (level === "sustainable") {
    if (treasuryDepleted || scores.maxPriceDrawdown > 0.7 || scores.returnGini > 0.8) {
      level = "caution";
      // Reduce confidence since we overrode the primary signal
      confidence = Math.min(confidence, 0.6);
    }
  }

  if (level === "caution") {
    if (treasuryDepletedEarly && scores.maxPriceDrawdown > 0.5) {
      level = "unsustainable";
      confidence = Math.min(confidence, 0.7);
    }
  }

  // ---- Step 4: Build risk factors ----
  const factors = buildRiskFactors(scores, snapshots);

  // ---- Build summary ----
  const feeCoveragePercent = Math.round(avgFeeCoverage * 100);
  const summary = buildSummary(level, scores);

  return {
    level,
    feeCoveragePercent,
    summary,
    factors,
  };
}

// ---- Risk factor generation ----

function buildRiskFactors(scores: RiskScores, _snapshots: StepSnapshot[]): RiskFactor[] {
  const factors: RiskFactor[] = [];

  // Fee coverage
  if (scores.feeCoverageRatio < 0.3) {
    const gap = Math.round((1 - scores.feeCoverageRatio) * 100);
    factors.push({
      label: "Fee Revenue Shortfall",
      description: `Rewards exceed fee revenue by ${gap}%. The protocol relies almost entirely on new deposits to pay existing users.`,
      severity: "high",
    });
  } else if (scores.feeCoverageRatio < 0.8) {
    const coverage = Math.round(scores.feeCoverageRatio * 100);
    factors.push({
      label: "Partial Fee Coverage",
      description: `Fee revenue covers only ${coverage}% of reward outflows. The remaining ${100 - coverage}% must come from new deposits or treasury reserves.`,
      severity: "medium",
    });
  } else {
    const coverage = Math.round(scores.feeCoverageRatio * 100);
    factors.push({
      label: "Strong Fee Coverage",
      description: `Fee revenue covers ${coverage}% of reward outflows, indicating sustainable yield generation.`,
      severity: "low",
    });
  }

  // Treasury runway
  if (isFinite(scores.treasuryRunway)) {
    if (scores.treasuryRunway < 30) {
      factors.push({
        label: "Imminent Treasury Depletion",
        description: `At the current burn rate, the treasury depletes in approximately ${Math.round(scores.treasuryRunway)} days. Users may be unable to withdraw.`,
        severity: "high",
      });
    } else if (scores.treasuryRunway < 90) {
      factors.push({
        label: "Limited Treasury Runway",
        description: `The treasury has an estimated ${Math.round(scores.treasuryRunway)} days of runway at the current rate of reward emissions.`,
        severity: "medium",
      });
    }
  }

  // Early vs. late return ratio
  if (scores.earlyVsLateReturnRatio > 10) {
    factors.push({
      label: "Extreme Early-Mover Advantage",
      description: `Early users earn ${scores.earlyVsLateReturnRatio.toFixed(1)}x more than late users. This is a hallmark of unsustainable reward structures.`,
      severity: "high",
    });
  } else if (scores.earlyVsLateReturnRatio > 3) {
    factors.push({
      label: "Significant Early-Mover Advantage",
      description: `Early users earn ${scores.earlyVsLateReturnRatio.toFixed(1)}x more than late users. Returns diminish significantly over time.`,
      severity: "medium",
    });
  }

  // Price drawdown
  if (scores.maxPriceDrawdown > 0.8) {
    const drop = Math.round(scores.maxPriceDrawdown * 100);
    factors.push({
      label: "Severe Token Price Collapse",
      description: `The token price drops ${drop}% from its peak. Participants holding the token face catastrophic losses.`,
      severity: "high",
    });
  } else if (scores.maxPriceDrawdown > 0.5) {
    const drop = Math.round(scores.maxPriceDrawdown * 100);
    factors.push({
      label: "Major Token Price Decline",
      description: `The token price drops ${drop}% from its peak. Late entrants are especially exposed to these losses.`,
      severity: "medium",
    });
  }

  // Real APY negative
  if (scores.realApyNegativeStep !== null) {
    factors.push({
      label: "Negative Real Yield",
      description: `Real yield turns negative by step ${scores.realApyNegativeStep}. After this point, participants are losing purchasing power.`,
      severity: "medium",
    });
  }

  // Return inequality (Gini)
  if (scores.returnGini > 0.8) {
    factors.push({
      label: "Winner-Take-All Structure",
      description: `Return distribution is extremely unequal (Gini: ${scores.returnGini.toFixed(2)}). A small number of participants capture most of the value.`,
      severity: "high",
    });
  } else if (scores.returnGini > 0.6) {
    factors.push({
      label: "Unequal Return Distribution",
      description: `Returns are significantly unequal across participants (Gini: ${scores.returnGini.toFixed(2)}). Some users benefit much more than others.`,
      severity: "medium",
    });
  }

  // New deposit dependency (supplementary signal)
  if (scores.newDepositDependency > 0.7) {
    factors.push({
      label: "High New Deposit Dependency",
      description: `${Math.round(scores.newDepositDependency * 100)}% of rewards are funded by new deposits rather than protocol revenue. This pattern is not sustainable long-term.`,
      severity: "high",
    });
  }

  return factors;
}

// ---- Summary builder ----

function buildSummary(level: RiskLevel, scores: RiskScores): string {
  const coveragePercent = Math.round(scores.feeCoverageRatio * 100);

  switch (level) {
    case "sustainable":
      return (
        `This protocol generates real yield from fees, with ${coveragePercent}% fee coverage. ` +
        `The reward structure appears sustainable under simulated conditions.`
      );
    case "caution":
      return (
        `This protocol partially relies on new deposits to fund rewards, ` +
        `with only ${coveragePercent}% of outflows covered by fees. ` +
        `Early participants benefit more than later ones.`
      );
    case "unsustainable":
      return (
        `This protocol cannot sustain its reward payouts without continuous new deposits. ` +
        `Fee revenue covers only ${coveragePercent}% of rewards. ` +
        `Late participants are likely to lose money.`
      );
  }
}
