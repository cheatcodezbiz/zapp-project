// Core simulation engine
export { runStakingSimulation, stepStakingSimulation, createInitialContext, cloneContext } from "./staking";
export type { EngineContext } from "./staking";

// Types
export { createInitialSimState, extractTimeSeries } from "./types";
export type {
  EmissionModel,
  StakingParams,
  BehaviorConfig,
  ScenarioConfig,
  ScheduledShock,
  FullSimConfig,
  SimState,
  StepSnapshot,
  SimOutput,
  NumericStateKey,
  TimeSeries,
} from "./types";

// PRNG
export { createPRNG, seedFromString } from "./prng";
export type { PRNG } from "./prng";

// Risk classification
export { classifyRisk, computeRiskScores, computeGini, computeMaxDrawdown } from "./risk";
export type { RiskScores } from "./risk";

// Risk report
export { generateReport, findingsToFactors } from "./report";
export type { RiskReport, RiskFinding } from "./report";

// Charts
export { transformToChartData, getPrimaryCharts, getSecondaryCharts } from "./charts";
export type { ChartPoint, ChartSeries, ChartDataSet } from "./charts";

// Stress tests
export { STRESS_TESTS, runStressTests, runSelectedStressTests, createCustomStressTest } from "./stress";
export type { StressTest, StressTestResult, StressTestSuiteResult } from "./stress";
