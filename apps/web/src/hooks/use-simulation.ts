"use client";

import { useState, useCallback, useRef } from "react";
import type {
  FullSimConfig,
  SimOutput,
  ChartDataSet,
  RiskReport,
  RiskScores,
} from "@zapp/simulation";
import type { RiskClassification } from "@zapp/shared-types";
import {
  createPRNG,
  seedFromString,
  runStakingSimulation,
  classifyRisk,
  computeRiskScores,
  generateReport,
  getPrimaryCharts,
} from "@zapp/simulation";

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

export interface SimulationState {
  output: SimOutput | null;
  risk: RiskClassification | null;
  scores: RiskScores | null;
  report: RiskReport | null;
  charts: ChartDataSet[];
  running: boolean;
  durationMs: number | null;
  error: string | null;
}

const INITIAL_STATE: SimulationState = {
  output: null,
  risk: null,
  scores: null,
  report: null,
  charts: [],
  running: false,
  durationMs: null,
  error: null,
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSimulation() {
  const [state, setState] = useState<SimulationState>(INITIAL_STATE);
  const runIdRef = useRef(0);

  const run = useCallback((config: FullSimConfig) => {
    const thisRun = ++runIdRef.current;

    setState((prev) => ({
      ...prev,
      running: true,
      error: null,
    }));

    // Run synchronously — the engine finishes in < 50ms for 360 steps.
    // Wrapped in a microtask so the "running" state renders first.
    queueMicrotask(() => {
      try {
        // 1. Create a seeded PRNG
        const seed =
          config.seed ?? seedFromString(config.id);
        const prng = createPRNG(seed);

        // 2. Run the simulation engine
        const output = runStakingSimulation(config, prng);

        // 3. Risk classification
        const risk = classifyRisk(output.snapshots);

        // 4. Compute detailed scores for the report
        const scores = computeRiskScores(output.snapshots);

        // 5. Generate the human-readable report
        const report = generateReport(scores, risk.level, output.snapshots);

        // 6. Transform to chart-ready datasets (primary 2x2 grid)
        const charts = getPrimaryCharts(output);

        // Only update if this is still the latest run
        if (thisRun === runIdRef.current) {
          setState({
            output,
            risk,
            scores,
            report,
            charts,
            running: false,
            durationMs: output.durationMs,
            error: null,
          });
        }
      } catch (err) {
        if (thisRun === runIdRef.current) {
          setState((prev) => ({
            ...prev,
            running: false,
            error:
              err instanceof Error
                ? err.message
                : "Simulation failed unexpectedly.",
          }));
        }
      }
    });
  }, []);

  const reset = useCallback(() => {
    runIdRef.current++;
    setState(INITIAL_STATE);
  }, []);

  return {
    ...state,
    run,
    reset,
  };
}

// ---------------------------------------------------------------------------
// Default config factory
// ---------------------------------------------------------------------------

export function createDefaultConfig(): FullSimConfig {
  return {
    id: "sim-" + Date.now(),
    timeSteps: 90,
    stakingParams: {
      // Supply
      initialTotalSupply: 1_000_000_000,
      maxSupply: 2_000_000_000,
      initialCirculatingSupply: 400_000_000,

      // Emissions — halving model (Bitcoin-inspired)
      emissionModel: "halving",
      halvingInitialRate: 500_000,
      halvingInterval: 365,

      // Staking mechanics
      stakerEmissionShare: 0.7,
      lockPeriod: 30,
      earlyUnstakePenalty: 0.1,
      penaltyDestination: "treasury",
      compoundingRate: 0.5,

      // Treasury & fees
      initialTreasuryBalance: 100_000_000,
      feeRate: 0.003,
      estimatedVolumePerStep: 5_000_000,
      feeModel: "percentage-of-volume",

      // Price
      initialTokenPrice: 1.0,
      priceElasticity: 10,
      externalBuyPressure: 50_000,
    },
    behavior: {
      initialUsers: 1000,
      avgStakeAmount: 5000,
      stakeStdDev: 2000,
      entryModel: "s-curve",
      baseEntryRate: 20,
      returnSensitivity: 1.0,
      maxExitRate: 0.15,
    },
    scenario: {
      name: "Base Case",
      marketSentiment: 1.0,
      shocks: [],
    },
    seed: Math.floor(Math.random() * 100_000),
  };
}
