// ---------------------------------------------------------------------------
// Stress test definitions and runner
// ---------------------------------------------------------------------------
// Defines 6 predefined stress scenarios that probe the staking model's
// resilience under adverse conditions. Each test injects specific shocks
// into a base configuration, runs the simulation, and evaluates pass/fail
// criteria against the output.
//
// These tests form the backbone of the risk engine — they determine whether
// a given tokenomics configuration can survive real-world stress events.
// ---------------------------------------------------------------------------

import type {
  FullSimConfig,
  ScheduledShock,
  SimOutput,
  SimState,
  StepSnapshot,
} from "./types";

// ---- Public interfaces ----

/** A predefined stress test with shock injection and pass/fail criteria. */
export interface StressTest {
  /** Unique identifier. */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Explains what the test does and why it matters. */
  description: string;
  /** Shock events to inject into the scenario. */
  shocks: ScheduledShock[];
  /**
   * Evaluated against the simulation output to determine pass/fail.
   * Returns true if the system survived the stress scenario.
   */
  passCriteria: (output: SimOutput) => boolean;
  /**
   * Detailed failure analysis — returns a human-readable explanation
   * of why the test failed, or null if it passed.
   */
  failureAnalysis: (output: SimOutput) => string | null;
}

/** Result of running a single stress test. */
export interface StressTestResult {
  /** The test that was run. */
  test: StressTest;
  /** Whether the system passed the stress scenario. */
  passed: boolean;
  /** Full simulation output for inspection. */
  output: SimOutput;
  /** Human-readable explanation of failure (undefined if passed). */
  failureReason?: string;
}

/** Summary of a complete stress test suite run. */
export interface StressTestSuiteResult {
  /** Individual test results. */
  results: StressTestResult[];
  /** Number of tests that passed. */
  passCount: number;
  /** Number of tests that failed. */
  failCount: number;
  /** Overall pass — true only if every test passed. */
  allPassed: boolean;
  /** Total wall-clock time for all tests. */
  totalDurationMs: number;
}

// ---- Helpers ----

/** Deep-clone a FullSimConfig so mutations don't affect the original. */
function cloneConfig(config: FullSimConfig): FullSimConfig {
  return JSON.parse(JSON.stringify(config)) as FullSimConfig;
}

/**
 * Find the snapshot at or closest to a given step.
 * Returns undefined only if snapshots is empty.
 */
function snapshotAtStep(
  snapshots: StepSnapshot[],
  step: number,
): Readonly<SimState> | undefined {
  // Snapshots are ordered by step; find the exact match or closest preceding.
  for (let i = snapshots.length - 1; i >= 0; i--) {
    if (snapshots[i]!.step <= step) {
      return snapshots[i]!.state;
    }
  }
  return snapshots[0]?.state;
}

/**
 * Find the minimum value of a SimState field within a step range [from, to] inclusive.
 */
function minInRange(
  snapshots: StepSnapshot[],
  field: keyof SimState,
  from: number,
  to: number,
): number {
  let min = Infinity;
  for (const s of snapshots) {
    if (s.step >= from && s.step <= to) {
      const val = s.state[field];
      if (typeof val === "number" && val < min) {
        min = val;
      }
    }
  }
  return min === Infinity ? 0 : min;
}

/**
 * Find the maximum value of a SimState field within a step range [from, to] inclusive.
 */
function maxInRange(
  snapshots: StepSnapshot[],
  field: keyof SimState,
  from: number,
  to: number,
): number {
  let max = -Infinity;
  for (const s of snapshots) {
    if (s.step >= from && s.step <= to) {
      const val = s.state[field];
      if (typeof val === "number" && val > max) {
        max = val;
      }
    }
  }
  return max === -Infinity ? 0 : max;
}

/**
 * Check if a SimState field is permanently below a threshold from a given step onward.
 * "Permanently" means every snapshot from `fromStep` to the end is below the threshold.
 */
function isPermanentlyBelow(
  snapshots: StepSnapshot[],
  field: keyof SimState,
  threshold: number,
  fromStep: number,
): boolean {
  for (const s of snapshots) {
    if (s.step >= fromStep) {
      const val = s.state[field];
      if (typeof val === "number" && val >= threshold) {
        return false;
      }
    }
  }
  return true;
}

// ---- The 6 predefined stress tests ----

const massExit: StressTest = {
  id: "mass-exit",
  name: "Mass Exit",
  description:
    "30% of stakers exit in a single step (step 30). Tests whether the " +
    "treasury can absorb a sudden liquidity shock without depleting, and " +
    "whether the price impact is recoverable.",
  shocks: [
    {
      type: "mass-exit",
      step: 30,
      duration: 1,
      magnitude: 0.3, // 30% of stakers
    },
  ],
  passCriteria(output: SimOutput): boolean {
    return this.failureAnalysis(output) === null;
  },
  failureAnalysis(output: SimOutput): string | null {
    const { snapshots } = output;
    const preShock = snapshotAtStep(snapshots, 29);
    if (!preShock) return "No pre-shock snapshot available.";

    const prePrice = preShock.tokenPrice;
    const preUsers = preShock.activeUsers;

    // Check treasury depletion: treasury tokens should never hit zero
    const minTreasury = minInRange(
      snapshots,
      "treasuryBalanceTokens",
      30,
      snapshots.length > 0 ? snapshots[snapshots.length - 1]!.step : 30,
    );
    if (minTreasury <= 0) {
      return `Treasury depleted after mass exit (min balance: ${minTreasury.toFixed(2)} tokens).`;
    }

    // Check price doesn't drop more than 80%
    const minPrice = minInRange(
      snapshots,
      "tokenPrice",
      30,
      snapshots.length > 0 ? snapshots[snapshots.length - 1]!.step : 30,
    );
    const priceDropPct = 1 - minPrice / prePrice;
    if (priceDropPct > 0.8) {
      return (
        `Token price dropped ${(priceDropPct * 100).toFixed(1)}% after mass exit ` +
        `(from $${prePrice.toFixed(4)} to $${minPrice.toFixed(4)}). Threshold: 80%.`
      );
    }

    // Check active users remain above 20% of pre-shock level
    const lastSnap = snapshots[snapshots.length - 1];
    if (lastSnap && lastSnap.state.activeUsers < preUsers * 0.2) {
      return (
        `Active users fell to ${lastSnap.state.activeUsers} (${((lastSnap.state.activeUsers / preUsers) * 100).toFixed(1)}% of pre-shock). ` +
        `Threshold: 20% (${Math.ceil(preUsers * 0.2)}).`
      );
    }

    return null;
  },
};

const growthHalt: StressTest = {
  id: "growth-halt",
  name: "Growth Halt",
  description:
    "New user growth stops completely for 14 steps starting at step 20. " +
    "Tests whether the protocol can sustain itself without new inflows " +
    "and whether real APY remains viable.",
  shocks: [
    {
      type: "growth-halt",
      step: 20,
      duration: 14,
      magnitude: 1.0, // 100% reduction in new users
    },
  ],
  passCriteria(output: SimOutput): boolean {
    return this.failureAnalysis(output) === null;
  },
  failureAnalysis(output: SimOutput): string | null {
    const { snapshots, finalState } = output;

    // Check real APY doesn't go permanently negative after the halt
    // "Permanently" = stays negative from step 34 (end of halt) onward
    if (isPermanentlyBelow(snapshots, "realApy", 0, 34)) {
      return (
        "Real APY went permanently negative after growth halt and never recovered. " +
        "The protocol cannot sustain positive returns without new user inflows."
      );
    }

    // Check treasury runway > 30 steps at the end of simulation
    if (finalState.treasuryRunwaySteps < 30) {
      return (
        `Treasury runway at end of simulation is only ${finalState.treasuryRunwaySteps.toFixed(1)} steps. ` +
        `Threshold: 30 steps.`
      );
    }

    return null;
  },
};

const priceCrash: StressTest = {
  id: "price-crash",
  name: "Price Crash",
  description:
    "Token loses 50% of its value at step 25. Tests whether the price " +
    "can recover to a meaningful fraction of pre-crash levels and whether " +
    "the crash triggers a cascading user exodus.",
  shocks: [
    {
      type: "price-crash",
      step: 25,
      duration: 1,
      magnitude: 0.5, // 50% price drop
    },
  ],
  passCriteria(output: SimOutput): boolean {
    return this.failureAnalysis(output) === null;
  },
  failureAnalysis(output: SimOutput): string | null {
    const { snapshots } = output;
    const preShock = snapshotAtStep(snapshots, 24);
    if (!preShock) return "No pre-crash snapshot available.";

    const preCrashPrice = preShock.tokenPrice;
    const preCrashUsers = preShock.activeUsers;
    const recoveryTarget = preCrashPrice * 0.3; // 30% of pre-crash
    const lastStep = snapshots.length > 0 ? snapshots[snapshots.length - 1]!.step : 55;
    const recoveryDeadline = Math.min(55, lastStep); // 25 + 30 = 55

    // Check price recovers to at least 30% of pre-crash within 30 steps
    let recovered = false;
    for (const s of snapshots) {
      if (s.step >= 25 && s.step <= recoveryDeadline) {
        if (s.state.tokenPrice >= recoveryTarget) {
          recovered = true;
          break;
        }
      }
    }

    if (!recovered) {
      const maxPriceAfter = maxInRange(snapshots, "tokenPrice", 25, recoveryDeadline);
      return (
        `Token price did not recover to 30% of pre-crash level ($${recoveryTarget.toFixed(4)}) ` +
        `within 30 steps. Best price in window: $${maxPriceAfter.toFixed(4)} ` +
        `(${((maxPriceAfter / preCrashPrice) * 100).toFixed(1)}% of pre-crash $${preCrashPrice.toFixed(4)}).`
      );
    }

    // Check no cascading exit > 50% of users
    const minUsers = minInRange(snapshots, "activeUsers", 25, recoveryDeadline);
    const exitPct = 1 - minUsers / preCrashUsers;
    if (exitPct > 0.5) {
      return (
        `Cascading exit detected: ${(exitPct * 100).toFixed(1)}% of users exited after price crash ` +
        `(from ${preCrashUsers} to ${minUsers}). Threshold: 50%.`
      );
    }

    return null;
  },
};

const feeCollapse: StressTest = {
  id: "fee-collapse",
  name: "Fee Collapse",
  description:
    "Fee revenue drops 90% for 30 steps starting at step 15. Tests " +
    "whether the treasury can survive an extended period with minimal " +
    "fee income — simulating a severe bear market or usage drop.",
  shocks: [
    {
      type: "fee-collapse",
      step: 15,
      duration: 30,
      magnitude: 0.9, // 90% fee reduction
    },
  ],
  passCriteria(output: SimOutput): boolean {
    return this.failureAnalysis(output) === null;
  },
  failureAnalysis(output: SimOutput): string | null {
    const { snapshots } = output;

    // Check treasury doesn't fully deplete during the fee collapse period (steps 15-45)
    const collapseEnd = 45; // 15 + 30
    const minTreasury = minInRange(
      snapshots,
      "treasuryBalanceTokens",
      15,
      collapseEnd,
    );

    if (minTreasury <= 0) {
      // Find the exact step where depletion occurred
      let depletionStep: number | undefined;
      for (const s of snapshots) {
        if (s.step >= 15 && s.step <= collapseEnd && s.state.treasuryBalanceTokens <= 0) {
          depletionStep = s.step;
          break;
        }
      }

      return (
        `Treasury fully depleted during fee collapse ` +
        `${depletionStep !== undefined ? `at step ${depletionStep}` : "between steps 15-45"}. ` +
        `The protocol cannot survive 30 steps of 90% fee reduction.`
      );
    }

    return null;
  },
};

const whaleExit: StressTest = {
  id: "whale-exit",
  name: "Whale Exit",
  description:
    "One entity removes 10% of total value locked at step 20. Tests " +
    "whether the protocol can absorb concentrated position exits without " +
    "severe price impact.",
  shocks: [
    {
      // Whale exit is modeled as a mass-exit with lower magnitude but
      // representing a single large holder rather than many small ones.
      type: "whale-exit",
      step: 20,
      duration: 1,
      magnitude: 0.1, // 10% of TVL
    },
  ],
  passCriteria(output: SimOutput): boolean {
    return this.failureAnalysis(output) === null;
  },
  failureAnalysis(output: SimOutput): string | null {
    const { snapshots } = output;
    const preShock = snapshotAtStep(snapshots, 19);
    if (!preShock) return "No pre-shock snapshot available.";

    const prePrice = preShock.tokenPrice;

    // Check price impact < 30%
    const minPrice = minInRange(snapshots, "tokenPrice", 20, 30);
    const priceImpact = 1 - minPrice / prePrice;
    if (priceImpact > 0.3) {
      return (
        `Price impact from whale exit was ${(priceImpact * 100).toFixed(1)}% ` +
        `(from $${prePrice.toFixed(4)} to $${minPrice.toFixed(4)}). Threshold: 30%.`
      );
    }

    // Check recovery within 10 steps — price returns to at least 90% of pre-shock
    const recoveryTarget = prePrice * 0.9;
    let recoveredByStep: number | undefined;
    for (const s of snapshots) {
      if (s.step > 20 && s.step <= 30 && s.state.tokenPrice >= recoveryTarget) {
        recoveredByStep = s.step;
        break;
      }
    }

    if (recoveredByStep === undefined) {
      const maxPriceAfter = maxInRange(snapshots, "tokenPrice", 21, 30);
      return (
        `Price did not recover to 90% of pre-whale level ($${recoveryTarget.toFixed(4)}) ` +
        `within 10 steps. Best price in recovery window: $${maxPriceAfter.toFixed(4)} ` +
        `(${((maxPriceAfter / prePrice) * 100).toFixed(1)}% of pre-shock).`
      );
    }

    return null;
  },
};

const combinedShock: StressTest = {
  id: "combined-shock",
  name: "Combined Shock",
  description:
    "Simultaneous growth halt, price crash, and fee collapse at step 30. " +
    "The worst-case scenario — tests whether the protocol can survive " +
    "multiple simultaneous adverse events without total collapse.",
  shocks: [
    {
      type: "growth-halt",
      step: 30,
      duration: 15,
      magnitude: 1.0, // 100% growth halt
    },
    {
      type: "price-crash",
      step: 30,
      duration: 1,
      magnitude: 0.5, // 50% price drop
    },
    {
      type: "fee-collapse",
      step: 30,
      duration: 15,
      magnitude: 0.9, // 90% fee reduction
    },
  ],
  passCriteria(output: SimOutput): boolean {
    return this.failureAnalysis(output) === null;
  },
  failureAnalysis(output: SimOutput): string | null {
    const { snapshots } = output;
    const preShock = snapshotAtStep(snapshots, 29);
    if (!preShock) return "No pre-shock snapshot available.";

    const preUsers = preShock.activeUsers;
    const threshold = preUsers * 0.1; // 10% of initial active users
    const evaluationStep = 45; // 30 + 15

    // Check protocol still has >10% of pre-shock active users after 15 steps
    const stateAtEval = snapshotAtStep(snapshots, evaluationStep);
    if (!stateAtEval) {
      return "Simulation did not run long enough to evaluate combined shock outcome.";
    }

    if (stateAtEval.activeUsers < threshold) {
      return (
        `Active users fell to ${stateAtEval.activeUsers} at step ${stateAtEval.step} ` +
        `(${((stateAtEval.activeUsers / preUsers) * 100).toFixed(1)}% of pre-shock ${preUsers}). ` +
        `Threshold: 10% (${Math.ceil(threshold)} users). ` +
        `The protocol cannot survive simultaneous growth halt, price crash, and fee collapse.`
      );
    }

    return null;
  },
};

// ---- Exported test collection ----

/** The 6 predefined stress tests. */
export const STRESS_TESTS: StressTest[] = [
  massExit,
  growthHalt,
  priceCrash,
  feeCollapse,
  whaleExit,
  combinedShock,
];

// ---- Runner ----

/**
 * Run all predefined stress tests against a base configuration.
 *
 * @param baseConfig - The tokenomics configuration to stress-test.
 * @param runner - A function that takes a FullSimConfig and returns a SimOutput.
 *                 This is typically the simulation engine's `run` method.
 * @returns Results for all 6 stress tests.
 */
export function runStressTests(
  baseConfig: FullSimConfig,
  runner: (config: FullSimConfig) => SimOutput,
): StressTestSuiteResult {
  return runSelectedStressTests(STRESS_TESTS, baseConfig, runner);
}

/**
 * Run a specific subset of stress tests.
 * Useful for running only the tests that previously failed, or for
 * custom stress test suites.
 *
 * @param tests - The stress tests to run.
 * @param baseConfig - The tokenomics configuration to stress-test.
 * @param runner - A function that takes a FullSimConfig and returns a SimOutput.
 * @returns Results for the selected stress tests.
 */
export function runSelectedStressTests(
  tests: StressTest[],
  baseConfig: FullSimConfig,
  runner: (config: FullSimConfig) => SimOutput,
): StressTestSuiteResult {
  const startTime = performance.now();
  const results: StressTestResult[] = [];

  for (const test of tests) {
    const result = runSingleStressTest(test, baseConfig, runner);
    results.push(result);
  }

  const totalDurationMs = performance.now() - startTime;
  const passCount = results.filter((r) => r.passed).length;

  return {
    results,
    passCount,
    failCount: results.length - passCount,
    allPassed: passCount === results.length,
    totalDurationMs,
  };
}

/**
 * Run a single stress test against a base configuration.
 *
 * Steps:
 * 1. Deep-clone the base config to avoid mutation.
 * 2. Inject the stress test's shocks into the scenario.
 * 3. Ensure the simulation runs long enough to evaluate the criteria
 *    (extends timeSteps if necessary).
 * 4. Run the simulation.
 * 5. Evaluate pass criteria and failure analysis.
 * 6. Return the result.
 */
export function runSingleStressTest(
  test: StressTest,
  baseConfig: FullSimConfig,
  runner: (config: FullSimConfig) => SimOutput,
): StressTestResult {
  // 1. Clone
  const config = cloneConfig(baseConfig);

  // 2. Inject shocks — append to any existing shocks
  config.scenario.shocks = [
    ...config.scenario.shocks,
    ...test.shocks,
  ];

  // 3. Ensure simulation runs long enough.
  // The simulation must run at least until the latest shock ends + a buffer
  // for recovery evaluation.
  const recoveryBuffer = 20; // extra steps after last shock ends
  const latestShockEnd = Math.max(
    ...test.shocks.map((s) => s.step + s.duration),
  );
  const requiredSteps = latestShockEnd + recoveryBuffer;
  if (config.timeSteps < requiredSteps) {
    config.timeSteps = requiredSteps;
  }

  // 4. Run
  const output = runner(config);

  // 5. Evaluate
  const failureReason = test.failureAnalysis(output) ?? undefined;
  const passed = failureReason === undefined;

  // 6. Return
  return {
    test,
    passed,
    output,
    failureReason,
  };
}

/**
 * Create a custom stress test with the same shape as the predefined ones.
 * Useful for user-defined scenarios in the dashboard.
 */
export function createCustomStressTest(
  id: string,
  name: string,
  description: string,
  shocks: ScheduledShock[],
  passCriteria: (output: SimOutput) => boolean,
  failureAnalysis?: (output: SimOutput) => string | null,
): StressTest {
  return {
    id,
    name,
    description,
    shocks,
    passCriteria,
    failureAnalysis: failureAnalysis ?? (() => null),
  };
}
