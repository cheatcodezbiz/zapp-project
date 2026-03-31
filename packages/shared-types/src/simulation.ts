// ---------------------------------------------------------------------------
// Simulation config, result, and risk classification types
// ---------------------------------------------------------------------------

import type {
  ISOTimestamp,
  ProjectId,
  SimulationId,
  Timestamped,
  UserId,
} from "./common";

// ---- Risk classification ----

export type RiskLevel = "sustainable" | "caution" | "unsustainable";

export interface RiskClassification {
  level: RiskLevel;
  /**
   * Percentage of ongoing protocol fees that cover operational costs.
   * - sustainable:   > 80%
   * - caution:       30–80%
   * - unsustainable: < 30%
   */
  feeCoveragePercent: number;
  /** One-sentence plain-English summary shown to the user. */
  summary: string;
  /** Detailed risk factors. */
  factors: RiskFactor[];
}

export interface RiskFactor {
  label: string;
  description: string;
  severity: "low" | "medium" | "high";
}

// ---- Simulation config ----

export interface SimulationConfig {
  /** Number of discrete time steps to simulate. */
  timeSteps: number;
  /** Duration each time step represents (e.g. "1d", "1w"). */
  timeStepUnit: "1h" | "6h" | "1d" | "1w";
  /** Number of independent Monte Carlo runs for confidence intervals. */
  monteCarloRuns: number;
  /** Starting TVL in USD cents. */
  initialTvlCents: bigint;
  /** Range of simulated unique wallets interacting per time step. */
  activeWalletsRange: [min: number, max: number];
  /** Optional random seed for reproducibility. */
  seed?: number;
}

// ---- 7-phase step loop ----

/**
 * Each time step runs through 7 sequential phases. The simulation engine
 * emits phase-level telemetry so the dashboard can show granular progress.
 */
export type SimulationPhase =
  | "deposit_flow"
  | "reward_accrual"
  | "withdrawal_pressure"
  | "fee_collection"
  | "external_shock"
  | "rebalance"
  | "snapshot";

export interface SimulationPhaseResult {
  phase: SimulationPhase;
  /** TVL at the end of this phase, in USD cents. */
  tvlCents: bigint;
  /** Net change in TVL during this phase, in USD cents (can be negative). */
  deltaCents: bigint;
  /** Phase-specific metrics (schema varies by phase). */
  metrics: Record<string, number>;
}

// ---- Time-step snapshot ----

export interface SimulationStepSnapshot {
  step: number;
  phases: SimulationPhaseResult[];
  /** TVL at the end of all 7 phases for this step. */
  endTvlCents: bigint;
  /** Cumulative fees collected through this step, in USD cents. */
  cumulativeFeesCents: bigint;
  /** Cumulative rewards emitted through this step, in USD cents. */
  cumulativeRewardsCents: bigint;
  activeWallets: number;
}

// ---- Overall simulation result ----

export type SimulationStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface SimulationResult extends Timestamped {
  simulationId: SimulationId;
  projectId: ProjectId;
  userId: UserId;
  config: SimulationConfig;
  status: SimulationStatus;
  /** Available when status is "completed". */
  risk?: RiskClassification;
  /** Step-level time series (may be sampled for large runs). */
  snapshots: SimulationStepSnapshot[];
  /** Total wall-clock duration of the simulation in milliseconds. */
  durationMs?: number;
  /** Set when status is "failed". */
  failureReason?: string;
  completedAt?: ISOTimestamp;
}

// ---- Simulation progress (pushed over WebSocket) ----

export interface SimulationProgress {
  simulationId: SimulationId;
  currentStep: number;
  totalSteps: number;
  currentPhase: SimulationPhase;
  /** 0–100 overall completion percentage. */
  percentComplete: number;
}
