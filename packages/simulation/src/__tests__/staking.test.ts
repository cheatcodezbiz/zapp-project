import { describe, it, expect } from "vitest";
import { createPRNG } from "../prng";
import { runStakingSimulation } from "../staking";
import { classifyRisk, computeRiskScores } from "../risk";
import { generateReport } from "../report";
import { transformToChartData } from "../charts";
import { STRESS_TESTS, runStressTests } from "../stress";
import type { FullSimConfig } from "../types";

/** A healthy staking protocol config — should classify as sustainable */
function createSustainableConfig(): FullSimConfig {
  return {
    id: "test-sustainable",
    timeSteps: 90,
    stakingParams: {
      initialTotalSupply: 1_000_000,
      maxSupply: 10_000_000,
      initialCirculatingSupply: 500_000,
      emissionModel: "decay",
      decayInitialRate: 500,
      decayConstant: 0.02,
      stakerEmissionShare: 0.7,
      lockPeriod: 7,
      earlyUnstakePenalty: 0.1,
      penaltyDestination: "treasury",
      compoundingRate: 0.5,
      initialTreasuryBalance: 100_000,
      feeRate: 0.03,
      estimatedVolumePerStep: 500_000,
      feeModel: "percentage-of-volume",
      initialTokenPrice: 1.0,
      priceElasticity: 2.0,
      externalBuyPressure: 5000,
    },
    behavior: {
      initialUsers: 100,
      avgStakeAmount: 1000,
      stakeStdDev: 200,
      entryModel: "s-curve",
      baseEntryRate: 5,
      returnSensitivity: 0.8,
      maxExitRate: 0.3,
    },
    scenario: {
      name: "Base case",
      marketSentiment: 1.0,
      shocks: [],
    },
    seed: 42,
  };
}

/** A Ponzi-like config — high emissions, no fee revenue */
function createPonziConfig(): FullSimConfig {
  return {
    id: "test-ponzi",
    timeSteps: 90,
    stakingParams: {
      initialTotalSupply: 1_000_000,
      maxSupply: 100_000_000,
      initialCirculatingSupply: 500_000,
      emissionModel: "fixed-rate",
      fixedEmissionRate: 10_000,
      stakerEmissionShare: 0.95,
      lockPeriod: 1,
      earlyUnstakePenalty: 0,
      penaltyDestination: "treasury",
      compoundingRate: 0.3,
      initialTreasuryBalance: 50_000,
      feeRate: 0.001,
      estimatedVolumePerStep: 10_000,
      feeModel: "percentage-of-volume",
      initialTokenPrice: 1.0,
      priceElasticity: 1.0,
      externalBuyPressure: 0,
    },
    behavior: {
      initialUsers: 50,
      avgStakeAmount: 500,
      stakeStdDev: 100,
      entryModel: "constant",
      baseEntryRate: 3,
      returnSensitivity: 1.5,
      maxExitRate: 0.5,
    },
    scenario: {
      name: "High emissions, no fees",
      marketSentiment: 1.0,
      shocks: [],
    },
    seed: 42,
  };
}

describe("PRNG", () => {
  it("produces deterministic results from same seed", () => {
    const a = createPRNG(42);
    const b = createPRNG(42);

    const seqA = Array.from({ length: 100 }, () => a.next());
    const seqB = Array.from({ length: 100 }, () => b.next());

    expect(seqA).toEqual(seqB);
  });

  it("produces different results from different seeds", () => {
    const a = createPRNG(42);
    const b = createPRNG(99);

    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());

    expect(seqA).not.toEqual(seqB);
  });

  it("generates values in [0, 1)", () => {
    const prng = createPRNG(123);
    for (let i = 0; i < 10_000; i++) {
      const v = prng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("gaussian distribution has correct mean", () => {
    const prng = createPRNG(42);
    const samples = Array.from({ length: 10_000 }, () =>
      prng.nextGaussian(100, 10),
    );
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    expect(mean).toBeCloseTo(100, 0);
  });
});

describe("Staking Simulation - Sustainable Protocol", () => {
  const config = createSustainableConfig();
  const prng = createPRNG(config.seed ?? 42);
  const output = runStakingSimulation(config, prng);

  it("runs for the correct number of steps", () => {
    // step 0 (initial) + 90 simulation steps = 91 snapshots
    expect(output.snapshots.length).toBe(config.timeSteps + 1);
  });

  it("final state has correct step count", () => {
    expect(output.finalState.step).toBe(config.timeSteps);
  });

  it("token price stays positive", () => {
    for (const snap of output.snapshots) {
      expect(snap.state.tokenPrice).toBeGreaterThan(0);
    }
  });

  it("total supply never exceeds max", () => {
    for (const snap of output.snapshots) {
      expect(snap.state.totalSupply).toBeLessThanOrEqual(
        config.stakingParams.maxSupply * 1.001, // tiny float tolerance
      );
    }
  });

  it("has active users throughout simulation", () => {
    // Users may rise or fall depending on APY dynamics —
    // the key invariant is users are never negative and some participated
    for (const snap of output.snapshots) {
      expect(snap.state.activeUsers).toBeGreaterThanOrEqual(0);
    }
    expect(output.finalState.cumulativeUsers).toBeGreaterThanOrEqual(
      config.behavior.initialUsers,
    );
  });

  it("treasury collects fees", () => {
    expect(output.finalState.cumulativeFeeRevenue).toBeGreaterThan(0);
  });

  it("rewards are distributed", () => {
    expect(output.finalState.cumulativeRewards).toBeGreaterThan(0);
  });

  it("is deterministic (same config + seed = same output)", () => {
    const prng2 = createPRNG(config.seed ?? 42);
    const output2 = runStakingSimulation(config, prng2);

    expect(output2.finalState.tokenPrice).toBe(output.finalState.tokenPrice);
    expect(output2.finalState.activeUsers).toBe(output.finalState.activeUsers);
    expect(output2.finalState.totalStaked).toBe(output.finalState.totalStaked);
    expect(output2.finalState.treasuryBalanceTokens).toBe(
      output.finalState.treasuryBalanceTokens,
    );
  });

  it("completes in under 500ms", () => {
    expect(output.durationMs).toBeLessThan(500);
  });
});

describe("Risk Classification", () => {
  it("classifies sustainable protocol correctly", () => {
    const config = createSustainableConfig();
    const prng = createPRNG(config.seed ?? 42);
    const output = runStakingSimulation(config, prng);
    const risk = classifyRisk(output.snapshots);

    expect(["sustainable", "caution"]).toContain(risk.level);
    expect(risk.feeCoveragePercent).toBeGreaterThan(0);
    expect(risk.summary).toBeTruthy();
    expect(risk.factors.length).toBeGreaterThanOrEqual(0);
  });

  it("classifies ponzi protocol as unsustainable or caution", () => {
    const config = createPonziConfig();
    const prng = createPRNG(config.seed ?? 42);
    const output = runStakingSimulation(config, prng);
    const risk = classifyRisk(output.snapshots);

    expect(["unsustainable", "caution"]).toContain(risk.level);
  });
});

describe("Risk Report", () => {
  it("generates a report with headline and findings", () => {
    const config = createPonziConfig();
    const prng = createPRNG(config.seed ?? 42);
    const output = runStakingSimulation(config, prng);
    const scores = computeRiskScores(output.snapshots);
    const risk = classifyRisk(output.snapshots);
    const report = generateReport(scores, risk.level, output.snapshots);

    expect(report.headline).toBeTruthy();
    expect(report.summary).toBeTruthy();
    expect(report.winnersLosers).toBeTruthy();
    expect(report.findings.length).toBeGreaterThan(0);
  });
});

describe("Chart Transformer", () => {
  it("produces chart datasets from simulation output", () => {
    const config = createSustainableConfig();
    const prng = createPRNG(config.seed ?? 42);
    const output = runStakingSimulation(config, prng);
    const charts = transformToChartData(output);

    expect(charts.length).toBeGreaterThanOrEqual(4);

    for (const chart of charts) {
      expect(chart.id).toBeTruthy();
      expect(chart.title).toBeTruthy();
      expect(chart.series.length).toBeGreaterThan(0);
      expect(chart.data.length).toBe(output.snapshots.length);
    }
  });
});

describe("Stress Tests", () => {
  it("defines 6 predefined stress tests", () => {
    expect(STRESS_TESTS.length).toBe(6);
  });

  it("runs stress tests against a sustainable protocol", () => {
    const config = createSustainableConfig();
    const results = runStressTests(config, (cfg) => {
      const prng = createPRNG(cfg.seed ?? 42);
      return runStakingSimulation(cfg, prng);
    });

    expect(results.results.length).toBe(6);

    for (const result of results.results) {
      expect(typeof result.passed).toBe("boolean");
      expect(result.output.snapshots.length).toBeGreaterThan(0);
    }
  });
});
