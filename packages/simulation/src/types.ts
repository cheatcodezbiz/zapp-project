/**
 * Internal simulation types for the staking simulation engine.
 *
 * These are the engine's own types — separate from the API-level types
 * in @zapp/shared-types. The engine consumes FullSimConfig, mutates
 * SimState each step, and produces SimOutput when done.
 */

// ===========================================================================
// Emission models
// ===========================================================================

/** How new tokens enter circulating supply each step */
export type EmissionModel =
  | "fixed-rate"
  | "halving"
  | "decay"
  | "custom-schedule";

// ===========================================================================
// Staking parameters
// ===========================================================================

/** Full configuration for the MVP staking model */
export interface StakingParams {
  // --- Supply ---
  /** Total token supply at genesis (includes locked, treasury, etc.) */
  initialTotalSupply: number;
  /** Hard cap — emissions stop when totalSupply reaches this */
  maxSupply: number;
  /** Tokens freely tradeable at genesis */
  initialCirculatingSupply: number;

  // --- Emissions ---
  /** Which emission curve to use */
  emissionModel: EmissionModel;
  /** Tokens emitted per step (fixed-rate model) */
  fixedEmissionRate?: number;
  /** Initial emission rate before first halving (halving model) */
  halvingInitialRate?: number;
  /** Number of steps between halvings (halving model) */
  halvingInterval?: number;
  /** Initial emission rate (decay model) */
  decayInitialRate?: number;
  /** Lambda constant for exponential decay: rate = initial * e^(-lambda * step) */
  decayConstant?: number;
  /** Explicit per-step emission amounts (custom-schedule model) */
  customSchedule?: number[];

  // --- Staking mechanics ---
  /** Fraction of emissions routed to stakers (0-1) */
  stakerEmissionShare: number;
  /** Steps a stake must remain locked before unstake is allowed */
  lockPeriod: number;
  /** Fraction of staked amount lost on early unstake (0-1) */
  earlyUnstakePenalty: number;
  /** Where early-unstake penalty tokens go */
  penaltyDestination: "treasury" | "burn" | "redistribute";
  /** Fraction of rewards auto-restaked each step (0-1) */
  compoundingRate: number;

  // --- Treasury & fees ---
  /** Treasury token balance at genesis */
  initialTreasuryBalance: number;
  /** Fee rate — interpretation depends on feeModel */
  feeRate: number;
  /** Estimated USD trading volume per step (used with percentage-of-volume) */
  estimatedVolumePerStep: number;
  /** How fees are calculated */
  feeModel: "flat-per-tx" | "percentage-of-volume";
  /** USD amount per transaction (flat-per-tx model) */
  flatFeeAmount?: number;
  /** Estimated transactions per step (flat-per-tx model) */
  estimatedTxPerStep?: number;

  // --- Price ---
  /** Token price in USD at genesis */
  initialTokenPrice: number;
  /** How sensitive price is to net buy/sell pressure (higher = more volatile) */
  priceElasticity: number;
  /** Constant external buy demand in USD per step */
  externalBuyPressure: number;
}

// ===========================================================================
// Behavior configuration
// ===========================================================================

/** How simulated users behave — entry, exit, and staking patterns */
export interface BehaviorConfig {
  /** Number of active staking users at step 0 */
  initialUsers: number;
  /** Mean tokens staked per new user (drawn from normal distribution) */
  avgStakeAmount: number;
  /** Standard deviation of stake amount */
  stakeStdDev: number;
  /** User growth model over time */
  entryModel: "constant" | "linear-growth" | "exponential-decay" | "s-curve";
  /** Base new users per step (before sentiment/APY modifiers) */
  baseEntryRate: number;
  /**
   * How much APY and price movement affect user behavior.
   * 0 = users ignore returns entirely.
   * 1 = moderate sensitivity (default).
   * 2 = highly speculative, chase yields aggressively.
   */
  returnSensitivity: number;
  /**
   * Maximum fraction of active users that can exit in a single step.
   * Prevents unrealistic instant mass-exodus (e.g. 0.5 = at most 50% leave per step).
   */
  maxExitRate: number;
}

// ===========================================================================
// Scenario & shocks
// ===========================================================================

/** Scenario config — external conditions and scheduled disruptions */
export interface ScenarioConfig {
  /** Human-readable scenario name (e.g. "Bear Market", "Whale Exit") */
  name: string;
  /**
   * Global market sentiment multiplier.
   * 1.0 = neutral. >1 = bullish (more entry, less exit). <1 = bearish.
   */
  marketSentiment: number;
  /** Scheduled external shocks applied during the simulation */
  shocks: ScheduledShock[];
}

/** A discrete external shock injected at a specific step */
export interface ScheduledShock {
  /** Step at which the shock begins */
  step: number;
  /** Type of shock — determines which engine subsystems are affected */
  type:
    | "mass-exit"
    | "growth-halt"
    | "price-crash"
    | "fee-collapse"
    | "whale-exit";
  /**
   * Severity from 0 to 1.
   * 0 = negligible, 1 = maximum severity.
   * Interpretation varies by shock type.
   */
  magnitude: number;
  /** How many steps the shock lasts (1 = single-step impulse) */
  duration: number;
}

// ===========================================================================
// Full simulation configuration
// ===========================================================================

/** Complete simulation config — everything the engine needs to run */
export interface FullSimConfig {
  /** Unique simulation ID (used for deterministic seed derivation if seed is omitted) */
  id: string;
  /** Total number of steps to simulate */
  timeSteps: number;
  /** Token economics and staking parameters */
  stakingParams: StakingParams;
  /** User behavior model */
  behavior: BehaviorConfig;
  /** Market scenario and shocks */
  scenario: ScenarioConfig;
  /** Optional explicit PRNG seed (if omitted, derived from id via seedFromString) */
  seed?: number;
}

// ===========================================================================
// Simulation state (mutable, internal)
// ===========================================================================

/** Internal mutable state mutated by the engine each step */
export interface SimState {
  /** Current simulation step (0 = initial state before first step) */
  step: number;

  // --- Token supply ---
  /** Total tokens in existence (minted so far, may approach maxSupply) */
  totalSupply: number;
  /** Tokens in free circulation (totalSupply - staked - treasury - burned) */
  circulatingSupply: number;
  /** Tokens currently locked in staking */
  totalStaked: number;
  /** totalStaked / circulatingSupply — the core health metric */
  stakingRatio: number;

  // --- Price ---
  /** Current token price in USD */
  tokenPrice: number;
  /** totalSupply * tokenPrice */
  marketCap: number;

  // --- Emissions & rewards ---
  /** Tokens emitted this step (before distribution split) */
  emissionsThisStep: number;
  /** Running total of all emissions */
  cumulativeEmissions: number;
  /** Tokens distributed to stakers this step */
  rewardsDistributedThisStep: number;
  /** Running total of all staker rewards */
  cumulativeRewards: number;
  /** Headline APY = (annualized rewards) / totalStaked */
  nominalApy: number;
  /** Real APY accounting for token price change (can be negative) */
  realApy: number;

  // --- Treasury ---
  /** Treasury balance in tokens */
  treasuryBalanceTokens: number;
  /** Treasury balance in USD (tokens * price) */
  treasuryBalanceUsd: number;
  /** Fee revenue collected this step (in tokens) */
  feeRevenueThisStep: number;
  /** Running total of all fee revenue */
  cumulativeFeeRevenue: number;
  /**
   * Steps of runway remaining at current burn rate.
   * Infinity if treasury is not being drawn down.
   */
  treasuryRunwaySteps: number;

  // --- Users ---
  /** Currently active staking users */
  activeUsers: number;
  /** Users who entered this step */
  newUsersThisStep: number;
  /** Users who exited this step */
  exitedUsersThisStep: number;
  /** Running total of unique users who have ever staked */
  cumulativeUsers: number;

  // --- Risk metrics (rolling) ---
  /**
   * feeRevenue / emissionsCost — how much of emissions are "backed" by real revenue.
   * >1 = sustainable, <1 = inflationary subsidy.
   */
  feeCoverageRatio: number;
  /**
   * Net exit pressure this step.
   * Positive = more users leaving than entering.
   * Used to detect death spirals.
   */
  exitPressure: number;

  // --- Price decomposition ---
  /** Total buy-side pressure in USD this step */
  buyPressureUsd: number;
  /** Total sell-side pressure in USD this step */
  sellPressureUsd: number;
  /** Net = buy - sell. Positive = price goes up. */
  netPressureUsd: number;
}

// ===========================================================================
// Snapshots & output
// ===========================================================================

/** Immutable snapshot recorded at the end of each simulation step */
export interface StepSnapshot {
  /** The step number this snapshot was recorded at */
  step: number;
  /** Deep-frozen copy of the state at end of this step */
  state: Readonly<SimState>;
}

/** Complete simulation output — returned when a simulation finishes */
export interface SimOutput {
  /** The config that produced this run (for reproducibility) */
  config: FullSimConfig;
  /** One snapshot per step, in order */
  snapshots: StepSnapshot[];
  /** The final state after the last step (convenience alias for snapshots[last].state) */
  finalState: SimState;
  /** Wall-clock duration of the simulation in milliseconds */
  durationMs: number;
}

// ===========================================================================
// Utility types
// ===========================================================================

/** Keys of SimState that are numeric — useful for charting, CSV export, etc. */
export type NumericStateKey = {
  [K in keyof SimState]: SimState[K] extends number ? K : never;
}[keyof SimState];

/** A time series extracted from snapshots: array of [step, value] pairs */
export type TimeSeries = Array<[step: number, value: number]>;

/** Extract a single metric's time series from an array of snapshots */
export function extractTimeSeries(
  snapshots: StepSnapshot[],
  key: NumericStateKey,
): TimeSeries {
  return snapshots.map((snap) => [snap.step, snap.state[key] as number]);
}

/**
 * Create the initial SimState from a FullSimConfig.
 * This is the state at step 0 before the first simulation step runs.
 */
export function createInitialSimState(config: FullSimConfig): SimState {
  const { stakingParams, behavior } = config;
  const initialStaked = behavior.initialUsers * behavior.avgStakeAmount;

  return {
    step: 0,

    // Supply
    totalSupply: stakingParams.initialTotalSupply,
    circulatingSupply: stakingParams.initialCirculatingSupply,
    totalStaked: initialStaked,
    stakingRatio:
      stakingParams.initialCirculatingSupply > 0
        ? initialStaked / stakingParams.initialCirculatingSupply
        : 0,

    // Price
    tokenPrice: stakingParams.initialTokenPrice,
    marketCap:
      stakingParams.initialTotalSupply * stakingParams.initialTokenPrice,

    // Emissions & rewards
    emissionsThisStep: 0,
    cumulativeEmissions: 0,
    rewardsDistributedThisStep: 0,
    cumulativeRewards: 0,
    nominalApy: 0,
    realApy: 0,

    // Treasury
    treasuryBalanceTokens: stakingParams.initialTreasuryBalance,
    treasuryBalanceUsd:
      stakingParams.initialTreasuryBalance * stakingParams.initialTokenPrice,
    feeRevenueThisStep: 0,
    cumulativeFeeRevenue: 0,
    treasuryRunwaySteps: Infinity,

    // Users
    activeUsers: behavior.initialUsers,
    newUsersThisStep: 0,
    exitedUsersThisStep: 0,
    cumulativeUsers: behavior.initialUsers,

    // Risk
    feeCoverageRatio: 0,
    exitPressure: 0,

    // Price decomposition
    buyPressureUsd: 0,
    sellPressureUsd: 0,
    netPressureUsd: 0,
  };
}
