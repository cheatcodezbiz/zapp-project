// ---------------------------------------------------------------------------
// Staking Emissions Simulation Plugin
// ---------------------------------------------------------------------------
// The intellectual core of the Zapp simulation engine. Each time step
// processes 7 phases in strict order:
//
//   PHASE 1: EMIT        - Mint new tokens per emission schedule
//   PHASE 2: COLLECT     - Collect fee revenue from estimated activity
//   PHASE 3: BEHAVE      - Process user entries and exits
//   PHASE 4: DISTRIBUTE  - Distribute rewards to stakers
//   PHASE 5: PRICE       - Recalculate token price via supply-demand model
//   PHASE 6: MEASURE     - Compute derived metrics (APY, runway, coverage)
//   PHASE 7: SNAPSHOT    - Record immutable state snapshot
//
// Every formula is sourced from the simulation design spec. Edge cases
// (division by zero, negative values, empty pools) are guarded explicitly.
// ---------------------------------------------------------------------------

import type { PRNG } from "./prng";
import type {
  BehaviorConfig,
  FullSimConfig,
  ScenarioConfig,
  ScheduledShock,
  SimOutput,
  SimState,
  StakingParams,
  StepSnapshot,
} from "./types";
import { createInitialSimState } from "./types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum token price floor to prevent zero/negative prices. */
const MIN_TOKEN_PRICE = 0.0001;

/** Maximum single-step price change magnitude (20% in either direction). */
const MAX_PRICE_CHANGE = 0.20;

/** Rolling window size for fee coverage ratio calculation. */
const FEE_COVERAGE_WINDOW = 30;

/** Rolling window size for price trend detection (exit trigger). */
const PRICE_TREND_WINDOW = 7;

/** APY reference point: 50% APY = 1.0x attractiveness multiplier. */
const APY_ATTRACTIVENESS_BASELINE = 50;

/** Price-drop threshold that triggers increased exits (-5%). */
const PRICE_DROP_EXIT_THRESHOLD = -0.05;

// ---------------------------------------------------------------------------
// Internal engine context (rolling windows and per-step intermediates
// that are NOT part of the public SimState)
// ---------------------------------------------------------------------------

/**
 * Internal bookkeeping the engine carries between steps. This holds
 * rolling windows and intermediate values that don't belong in the
 * externally-visible SimState but are needed for correct computation.
 */
export interface EngineContext {
  /** Rolling window of fee revenue in USD (last N steps). */
  rollingFeesUsd: number[];
  /** Rolling window of reward distributions in USD (last N steps). */
  rollingRewardsUsd: number[];
  /** Rolling window of token prices (last N steps, for exit trigger). */
  rollingPrices: number[];

  // --- Per-step intermediates (set during phases, consumed by later phases) ---

  /** Staker share of emissions this step (set in EMIT, consumed in DISTRIBUTE). */
  stakerEmissionsThisStep: number;
  /** Treasury share of emissions this step (set in EMIT). */
  treasuryEmissionsThisStep: number;
  /** Fee revenue in USD this step before shock adjustment (set in COLLECT). */
  feeRevenueUsdThisStep: number;
  /** New stake tokens entering this step (set in BEHAVE, consumed in PRICE). */
  newStakeThisStep: number;
  /** Exiting stake tokens this step (set in BEHAVE, consumed in PRICE). */
  exitStakeThisStep: number;
  /** Claimed (non-compounded) rewards this step (set in DISTRIBUTE, consumed in PRICE). */
  claimedRewardsThisStep: number;
  /** Compounded rewards this step (set in DISTRIBUTE). */
  compoundedRewardsThisStep: number;
  /** Supply inflation ratio this step (set in MEASURE). */
  supplyInflationThisStep: number;
}

function createInitialContext(config: FullSimConfig): EngineContext {
  return {
    rollingFeesUsd: [],
    rollingRewardsUsd: [],
    rollingPrices: [config.stakingParams.initialTokenPrice],
    stakerEmissionsThisStep: 0,
    treasuryEmissionsThisStep: 0,
    feeRevenueUsdThisStep: 0,
    newStakeThisStep: 0,
    exitStakeThisStep: 0,
    claimedRewardsThisStep: 0,
    compoundedRewardsThisStep: 0,
    supplyInflationThisStep: 0,
  };
}

function cloneContext(ctx: EngineContext): EngineContext {
  return {
    ...ctx,
    rollingFeesUsd: [...ctx.rollingFeesUsd],
    rollingRewardsUsd: [...ctx.rollingRewardsUsd],
    rollingPrices: [...ctx.rollingPrices],
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Clamp a value to [min, max]. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Safe division: returns fallback when divisor is zero or non-finite. */
function safeDivide(numerator: number, denominator: number, fallback = 0): number {
  if (denominator === 0 || !Number.isFinite(denominator)) return fallback;
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : fallback;
}

/** Deep-clone a SimState (all fields are primitives, so spread suffices). */
function cloneState(state: SimState): SimState {
  return { ...state };
}

/** Append to a rolling window, keeping at most `maxLen` entries. */
function pushRolling(window: number[], value: number, maxLen: number): void {
  window.push(value);
  if (window.length > maxLen) {
    window.shift();
  }
}

/** Sum all values in an array. */
function sum(arr: number[]): number {
  let total = 0;
  for (let i = 0; i < arr.length; i++) {
    total += arr[i]!;
  }
  return total;
}

// ---------------------------------------------------------------------------
// Emission calculation
// ---------------------------------------------------------------------------

function calculateEmissions(params: StakingParams, step: number): number {
  switch (params.emissionModel) {
    case "fixed-rate":
      return params.fixedEmissionRate ?? 0;

    case "halving": {
      const initialRate = params.halvingInitialRate ?? 0;
      const interval = params.halvingInterval ?? 1;
      const halvingCount = Math.floor(step / Math.max(interval, 1));
      return initialRate / Math.pow(2, halvingCount);
    }

    case "decay": {
      const initialRate = params.decayInitialRate ?? 0;
      const lambda = params.decayConstant ?? 0;
      return initialRate * Math.exp(-lambda * step);
    }

    case "custom-schedule": {
      const schedule = params.customSchedule ?? [];
      return schedule[step] ?? 0;
    }

    default:
      return 0;
  }
}

// ---------------------------------------------------------------------------
// Fee calculation
// ---------------------------------------------------------------------------

function calculateBaseFees(params: StakingParams): number {
  switch (params.feeModel) {
    case "percentage-of-volume":
      return params.estimatedVolumePerStep * params.feeRate;

    case "flat-per-tx":
      return (params.estimatedTxPerStep ?? 0) * (params.flatFeeAmount ?? 0);

    default:
      return 0;
  }
}

// ---------------------------------------------------------------------------
// Entry rate model
// ---------------------------------------------------------------------------

function calculateBaseEntryRate(
  model: BehaviorConfig["entryModel"],
  baseRate: number,
  step: number,
): number {
  switch (model) {
    case "constant":
      return baseRate;

    case "linear-growth":
      // Grows linearly: baseRate + 10% of baseRate per step
      return Math.max(baseRate + baseRate * 0.1 * step, 0);

    case "exponential-decay":
      // Decays: baseRate * e^(-0.01 * step)
      return baseRate * Math.exp(-0.01 * step);

    case "s-curve": {
      // Logistic: peaks at 2x baseRate, midpoint at step 180, steepness 0.05
      const maxRate = baseRate * 2;
      const midpoint = 180;
      const steepness = 0.05;
      const exponent = -steepness * (step - midpoint);
      if (exponent > 500) return 0;
      if (exponent < -500) return maxRate;
      return maxRate / (1 + Math.exp(exponent));
    }

    default:
      return baseRate;
  }
}

// ---------------------------------------------------------------------------
// Shock detection
// ---------------------------------------------------------------------------

function getActiveShocks(
  shocks: ScheduledShock[],
  step: number,
): ScheduledShock[] {
  return shocks.filter(
    (shock) => step >= shock.step && step < shock.step + shock.duration,
  );
}

// ---------------------------------------------------------------------------
// PHASE 1: EMIT
// ---------------------------------------------------------------------------

function phaseEmit(
  state: SimState,
  ctx: EngineContext,
  params: StakingParams,
): void {
  const rawEmissions = calculateEmissions(params, state.step);

  // Cap so totalSupply never exceeds maxSupply
  const headroom = Math.max(params.maxSupply - state.totalSupply, 0);
  const emissions = Math.min(rawEmissions, headroom);

  // Split between staker rewards and treasury
  const stakerShare = emissions * params.stakerEmissionShare;
  const treasuryShare = emissions - stakerShare;

  // Store intermediates for later phases
  ctx.stakerEmissionsThisStep = stakerShare;
  ctx.treasuryEmissionsThisStep = treasuryShare;

  // Update state
  state.emissionsThisStep = emissions;
  state.totalSupply += emissions;
  state.circulatingSupply += emissions;
  state.treasuryBalanceTokens += treasuryShare;
  state.cumulativeEmissions += emissions;
}

// ---------------------------------------------------------------------------
// PHASE 2: COLLECT
// ---------------------------------------------------------------------------

function phaseCollect(
  state: SimState,
  ctx: EngineContext,
  params: StakingParams,
  behavior: BehaviorConfig,
): void {
  const baseFees = calculateBaseFees(params);

  // Scale by user activity: more users relative to initial = more volume
  const activityScale = safeDivide(state.activeUsers, behavior.initialUsers, 0);
  let feesUsd = baseFees * activityScale;

  // Guard against negative fees
  feesUsd = Math.max(feesUsd, 0);

  // Store pre-shock USD fees for potential shock adjustment in BEHAVE
  ctx.feeRevenueUsdThisStep = feesUsd;

  // Convert USD fees to tokens at current price and credit treasury
  const feesTokens = safeDivide(feesUsd, state.tokenPrice, 0);

  state.feeRevenueThisStep = feesTokens;
  state.treasuryBalanceTokens += feesTokens;
  state.cumulativeFeeRevenue += feesTokens;
}

// ---------------------------------------------------------------------------
// PHASE 3: BEHAVE
// ---------------------------------------------------------------------------

function phaseBehave(
  state: SimState,
  ctx: EngineContext,
  config: FullSimConfig,
  prng: PRNG,
): void {
  const { stakingParams, behavior, scenario } = config;
  const activeShocks = getActiveShocks(scenario.shocks, state.step);

  // --- Apply fee-collapse shock retroactively to PHASE 2 output ---
  for (const shock of activeShocks) {
    if (shock.type === "fee-collapse") {
      const reduction = 1 - shock.magnitude;
      const originalFeesTokens = state.feeRevenueThisStep;

      const adjustedFeesTokens = originalFeesTokens * reduction;
      const difference = originalFeesTokens - adjustedFeesTokens;

      state.feeRevenueThisStep = adjustedFeesTokens;
      state.treasuryBalanceTokens -= difference;
      state.cumulativeFeeRevenue -= difference;

      // Also adjust the USD tracking
      ctx.feeRevenueUsdThisStep *= reduction;
    }
  }

  // --- Calculate new entries ---
  let entryRate = calculateBaseEntryRate(
    behavior.entryModel,
    behavior.baseEntryRate,
    state.step,
  );

  // APY attractiveness multiplier: 50% APY = 1.0x, clamped [0.2, 3.0]
  const attractiveness = clamp(
    safeDivide(state.nominalApy, APY_ATTRACTIVENESS_BASELINE, 0.2),
    0.2,
    3.0,
  );
  entryRate *= attractiveness;

  // Market sentiment multiplier
  entryRate *= scenario.marketSentiment;

  // --- Apply shocks to entry rate ---
  for (const shock of activeShocks) {
    if (shock.type === "growth-halt") {
      entryRate = 0;
    }
  }

  // Round to whole users, minimum 0
  const newUsers = Math.max(Math.round(entryRate), 0);

  // Each new user stakes avgStakeAmount +/- stakeStdDev (Gaussian)
  let newStakeTotal = 0;
  for (let i = 0; i < newUsers; i++) {
    const stakeAmount = Math.max(
      prng.nextGaussian(behavior.avgStakeAmount, behavior.stakeStdDev),
      0, // no negative stakes
    );
    newStakeTotal += stakeAmount;
  }

  // --- Calculate exits ---
  // Base exit probability per step: inverse of double the lock period
  let baseExitProb = safeDivide(1, stakingParams.lockPeriod * 2, 0.01);

  // Penalty for negative real APY: users flee when real returns go negative
  if (state.realApy < 0) {
    baseExitProb += Math.abs(state.realApy) * behavior.returnSensitivity;
  }

  // Penalty for sustained price drops (7-step rolling window)
  if (ctx.rollingPrices.length >= 2) {
    const oldestPrice = ctx.rollingPrices[0]!;
    const currentPrice = state.tokenPrice;
    const priceChange = safeDivide(currentPrice - oldestPrice, oldestPrice, 0);

    if (priceChange < PRICE_DROP_EXIT_THRESHOLD) {
      baseExitProb += Math.abs(priceChange) * behavior.returnSensitivity * 0.5;
    }
  }

  // --- Apply shocks to exit rate ---
  for (const shock of activeShocks) {
    if (shock.type === "mass-exit") {
      baseExitProb *= 1 + shock.magnitude * 5;
    }
  }

  // Cap exit rate at configured maximum
  const exitRate = clamp(baseExitProb, 0, behavior.maxExitRate);

  // Number of users exiting
  let exitedUsers = Math.round(state.activeUsers * exitRate);
  exitedUsers = clamp(exitedUsers, 0, state.activeUsers);

  // Each exiting user unstakes their average share of the pool
  const avgStakePerUser = safeDivide(state.totalStaked, state.activeUsers, 0);
  let exitStakeTotal = exitedUsers * avgStakePerUser;

  // --- Handle whale-exit shock: a single large holder dumps ---
  for (const shock of activeShocks) {
    if (shock.type === "whale-exit") {
      const whaleExit = shock.magnitude * state.totalStaked * 0.1;
      exitStakeTotal += whaleExit;
    }
  }

  // Never unstake more than what's staked
  exitStakeTotal = Math.min(exitStakeTotal, state.totalStaked);

  // --- Store intermediates for PRICE phase ---
  ctx.newStakeThisStep = newStakeTotal;
  ctx.exitStakeThisStep = exitStakeTotal;

  // --- Update state ---
  state.newUsersThisStep = newUsers;
  state.exitedUsersThisStep = exitedUsers;
  state.cumulativeUsers += newUsers;

  state.activeUsers = Math.max(state.activeUsers + newUsers - exitedUsers, 0);
  state.totalStaked = Math.max(state.totalStaked + newStakeTotal - exitStakeTotal, 0);
}

// ---------------------------------------------------------------------------
// PHASE 4: DISTRIBUTE
// ---------------------------------------------------------------------------

function phaseDistribute(
  state: SimState,
  ctx: EngineContext,
  params: StakingParams,
): void {
  const rewardPool = ctx.stakerEmissionsThisStep;

  if (state.totalStaked <= 0 || state.activeUsers <= 0 || rewardPool <= 0) {
    state.rewardsDistributedThisStep = 0;
    ctx.compoundedRewardsThisStep = 0;
    ctx.claimedRewardsThisStep = 0;
    return;
  }

  state.rewardsDistributedThisStep = rewardPool;
  state.cumulativeRewards += rewardPool;

  // Compounding fraction auto-restakes (increases totalStaked)
  const compounded = rewardPool * params.compoundingRate;
  const claimed = rewardPool - compounded;

  ctx.compoundedRewardsThisStep = compounded;
  ctx.claimedRewardsThisStep = claimed;

  // Compounded rewards increase the staking pool
  state.totalStaked += compounded;

  // Claimed rewards enter free circulation. 50% of claimed rewards are
  // assumed sold immediately — that sell pressure is handled in PHASE 5.
}

// ---------------------------------------------------------------------------
// PHASE 5: PRICE
// ---------------------------------------------------------------------------

function phasePrice(
  state: SimState,
  ctx: EngineContext,
  config: FullSimConfig,
): void {
  const { stakingParams, scenario } = config;

  // --- Buy / sell pressure ---
  const buyPressure =
    ctx.newStakeThisStep * state.tokenPrice +
    stakingParams.externalBuyPressure;

  // 50% of claimed rewards assumed sold on the open market
  const sellPressure =
    ctx.exitStakeThisStep * state.tokenPrice +
    ctx.claimedRewardsThisStep * state.tokenPrice * 0.5;

  // Record pressure decomposition on state for dashboards
  state.buyPressureUsd = buyPressure;
  state.sellPressureUsd = sellPressure;
  state.netPressureUsd = buyPressure - sellPressure;

  // --- Price impact from net flow ---
  const liquidity = state.circulatingSupply * state.tokenPrice;
  const priceImpact = safeDivide(
    state.netPressureUsd,
    stakingParams.priceElasticity * liquidity + 1,
    0,
  );

  // --- Supply inflation dilution pressure ---
  const supplyInflation = safeDivide(
    state.emissionsThisStep,
    state.totalSupply,
    0,
  );
  ctx.supplyInflationThisStep = supplyInflation;
  const dilutionPressure = -supplyInflation * 0.3;

  // --- External market sentiment ---
  const externalPressure = (scenario.marketSentiment - 1.0) * 0.01;

  // --- Shock pressure ---
  let shockPressure = 0;
  const activeShocks = getActiveShocks(scenario.shocks, state.step);
  for (const shock of activeShocks) {
    if (shock.type === "price-crash") {
      shockPressure -= shock.magnitude * 0.5;
    }
  }

  // --- Total price change (clamped) ---
  const totalChange = clamp(
    priceImpact + dilutionPressure + externalPressure + shockPressure,
    -MAX_PRICE_CHANGE,
    MAX_PRICE_CHANGE,
  );

  state.tokenPrice = Math.max(
    state.tokenPrice * (1 + totalChange),
    MIN_TOKEN_PRICE,
  );
}

// ---------------------------------------------------------------------------
// PHASE 6: MEASURE
// ---------------------------------------------------------------------------

function phaseMeasure(
  state: SimState,
  ctx: EngineContext,
): void {
  // --- Staking ratio ---
  state.stakingRatio = safeDivide(state.totalStaked, state.circulatingSupply, 0);

  // --- Market cap ---
  state.marketCap = state.totalSupply * state.tokenPrice;

  // --- Treasury USD value ---
  state.treasuryBalanceUsd = state.treasuryBalanceTokens * state.tokenPrice;

  // --- Nominal APY ---
  // Annualized: (rewards per step / total staked) * 365
  // Assumes 1 step = 1 day. Callers adjust for other step durations.
  state.nominalApy = safeDivide(
    state.rewardsDistributedThisStep,
    state.totalStaked,
    0,
  ) * 365;

  // --- Real APY (nominal minus annualized inflation) ---
  state.realApy = state.nominalApy - ctx.supplyInflationThisStep * 365;

  // --- Rolling fee coverage ratio (30-step window) ---
  const feeRevenueUsd = ctx.feeRevenueUsdThisStep;
  const rewardCostUsd = state.rewardsDistributedThisStep * state.tokenPrice;

  pushRolling(ctx.rollingFeesUsd, feeRevenueUsd, FEE_COVERAGE_WINDOW);
  pushRolling(ctx.rollingRewardsUsd, rewardCostUsd, FEE_COVERAGE_WINDOW);

  const cumFees30 = sum(ctx.rollingFeesUsd);
  const cumRewards30 = sum(ctx.rollingRewardsUsd);
  state.feeCoverageRatio = cumRewards30 > 0
    ? safeDivide(cumFees30, cumRewards30, 1.0)
    : 1.0;

  // --- Treasury runway ---
  // Net burn = treasury emissions out minus fee revenue in (in tokens).
  // If fees exceed emissions outflow, runway is infinite.
  const netBurnTokens = ctx.treasuryEmissionsThisStep - state.feeRevenueThisStep;
  if (netBurnTokens <= 0) {
    state.treasuryRunwaySteps = Infinity;
  } else {
    state.treasuryRunwaySteps = safeDivide(
      state.treasuryBalanceTokens,
      netBurnTokens,
      Infinity,
    );
  }

  // --- Exit pressure ---
  state.exitPressure = safeDivide(
    state.exitedUsersThisStep,
    Math.max(state.activeUsers, 1),
    0,
  );

  // --- Update rolling price window ---
  pushRolling(ctx.rollingPrices, state.tokenPrice, PRICE_TREND_WINDOW);
}

// ---------------------------------------------------------------------------
// Reset per-step fields on state
// ---------------------------------------------------------------------------

function resetPerStepFields(state: SimState): void {
  state.emissionsThisStep = 0;
  state.rewardsDistributedThisStep = 0;
  state.feeRevenueThisStep = 0;
  state.newUsersThisStep = 0;
  state.exitedUsersThisStep = 0;
  state.buyPressureUsd = 0;
  state.sellPressureUsd = 0;
  state.netPressureUsd = 0;
}

function resetPerStepContext(ctx: EngineContext): void {
  ctx.stakerEmissionsThisStep = 0;
  ctx.treasuryEmissionsThisStep = 0;
  ctx.feeRevenueUsdThisStep = 0;
  ctx.newStakeThisStep = 0;
  ctx.exitStakeThisStep = 0;
  ctx.claimedRewardsThisStep = 0;
  ctx.compoundedRewardsThisStep = 0;
  ctx.supplyInflationThisStep = 0;
}

// ---------------------------------------------------------------------------
// Single step — public API
// ---------------------------------------------------------------------------

/**
 * Execute one simulation step (7 phases) and return the new state.
 *
 * This is the fast-path entry point for interactive slider updates in the
 * dashboard. The caller provides the current state and engine context,
 * and gets back new copies with all phases applied.
 *
 * Neither the input state nor context are mutated; deep clones are made.
 */
export function stepStakingSimulation(
  state: SimState,
  ctx: EngineContext,
  config: FullSimConfig,
  prng: PRNG,
): { state: SimState; ctx: EngineContext } {
  const next = cloneState(state);
  const nextCtx = cloneContext(ctx);

  next.step = state.step + 1;
  resetPerStepFields(next);
  resetPerStepContext(nextCtx);

  // PHASE 1: EMIT — mint new tokens according to emission schedule
  phaseEmit(next, nextCtx, config.stakingParams);

  // PHASE 2: COLLECT — collect fee revenue from estimated activity
  phaseCollect(next, nextCtx, config.stakingParams, config.behavior);

  // PHASE 3: BEHAVE — process user entries, exits, and shock effects
  phaseBehave(next, nextCtx, config, prng);

  // PHASE 4: DISTRIBUTE — distribute rewards to stakers
  phaseDistribute(next, nextCtx, config.stakingParams);

  // PHASE 5: PRICE — recalculate token price via supply-demand model
  phasePrice(next, nextCtx, config);

  // PHASE 6: MEASURE — compute derived metrics (APY, runway, coverage)
  phaseMeasure(next, nextCtx);

  // PHASE 7: SNAPSHOT — the returned state IS the immutable snapshot
  return { state: next, ctx: nextCtx };
}

// ---------------------------------------------------------------------------
// Full simulation run — public API
// ---------------------------------------------------------------------------

/**
 * Run the complete staking emissions simulation for the configured
 * number of time steps. Returns all snapshots and the final state.
 *
 * @param config - Full simulation configuration (FullSimConfig).
 * @param prng - Seeded PRNG instance for deterministic, reproducible results.
 * @returns SimOutput with per-step snapshots and the final state.
 */
export function runStakingSimulation(
  config: FullSimConfig,
  prng: PRNG,
): SimOutput {
  const startTime = performance.now();

  const snapshots: StepSnapshot[] = [];
  let state = createInitialSimState(config);
  let ctx = createInitialContext(config);

  // Record step 0 as the initial snapshot (pre-simulation baseline)
  snapshots.push({
    step: 0,
    state: Object.freeze(cloneState(state)),
  });

  for (let step = 0; step < config.timeSteps; step++) {
    const result = stepStakingSimulation(state, ctx, config, prng);
    state = result.state;
    ctx = result.ctx;

    snapshots.push({
      step: state.step,
      state: Object.freeze(cloneState(state)),
    });
  }

  const durationMs = performance.now() - startTime;

  return {
    config,
    snapshots,
    finalState: cloneState(state),
    durationMs,
  };
}

// ---------------------------------------------------------------------------
// Convenience exports for tests, the slider API, and engine composition
// ---------------------------------------------------------------------------

export { createInitialContext, cloneContext };
