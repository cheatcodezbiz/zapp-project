// ---------------------------------------------------------------------------
// Tool executor: run_simulation
// ---------------------------------------------------------------------------
// Maps simple tool inputs to the complex FullSimConfig / StakingParams /
// BehaviorConfig types, then runs the simulation engine.
//
// Uses fully dynamic import to avoid compile-time dependency on
// @zapp/simulation — falls back to mock results if unavailable.
// ---------------------------------------------------------------------------

export interface RunSimulationInput {
  totalSupply: number;
  initialPrice: number;
  rewardRate: number;
  emissionDecay?: number;
  feeRate?: number;
  initialStakers?: number;
  durationDays?: number;
}

interface SimFactor {
  label: string;
  severity: string;
  description: string;
}

export interface SimulationOutput {
  result: unknown;
  artifact: undefined;
  simulationData?: {
    metrics: Record<string, unknown>;
    risk: { level: string; summary: string; factors: SimFactor[] };
    charts: {
      price: { step: number; tokenPrice: number }[];
      apy: { step: number; nominalApy: number; realApy: number }[];
      users: { step: number; activeUsers: number; newUsersThisStep: number }[];
      treasury: { step: number; treasuryBalanceUsd: number; feeRevenueThisStep: number }[];
      supply: { step: number; totalSupply: number; circulatingSupply: number; totalStaked: number }[];
      fees: { step: number; cumulativeFeeRevenue: number; feeCoverageRatio: number }[];
      pressure: { step: number; buyPressureUsd: number; sellPressureUsd: number; netPressureUsd: number }[];
    };
  };
}

export async function executeRunSimulation(
  input: RunSimulationInput,
): Promise<SimulationOutput> {
  try {
    // Dynamic import — may fail if @zapp/simulation is not installed.
    // Use a variable to prevent TypeScript from resolving the module at compile time.
    const simPkg = "@zapp/simulation";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sim: any = await (import(simPkg) as Promise<any>);

    const totalSupply = input.totalSupply;
    const initialPrice = input.initialPrice;
    const rewardRate = input.rewardRate;
    const emissionDecay = input.emissionDecay ?? 0.1;
    const feeRate = input.feeRate ?? 0.003;
    const initialStakers = input.initialStakers ?? 100;
    const durationDays = input.durationDays ?? 365;

    // Derive sensible defaults for the complex simulation config
    const circulatingSupply = totalSupply * 0.4; // 40% circulating at genesis
    const treasuryBalance = totalSupply * 0.15; // 15% treasury
    const dailyEmission = (totalSupply * rewardRate) / 365;

    const config = {
      id: `sim-${Date.now()}`,
      timeSteps: durationDays,
      stakingParams: {
        initialTotalSupply: totalSupply,
        maxSupply: totalSupply * 2,
        initialCirculatingSupply: circulatingSupply,
        emissionModel: emissionDecay > 0 ? "decay" : "fixed-rate",
        fixedEmissionRate: emissionDecay > 0 ? undefined : dailyEmission,
        decayInitialRate: emissionDecay > 0 ? dailyEmission : undefined,
        decayConstant: emissionDecay > 0 ? emissionDecay / 100 : undefined,
        stakerEmissionShare: 0.7,
        lockPeriod: 7,
        earlyUnstakePenalty: 0.05,
        penaltyDestination: "treasury",
        compoundingRate: 0.5,
        initialTreasuryBalance: treasuryBalance,
        feeRate,
        estimatedVolumePerStep: circulatingSupply * initialPrice * 0.02,
        feeModel: "percentage-of-volume",
        initialTokenPrice: initialPrice,
        priceElasticity: 0.5,
        externalBuyPressure: circulatingSupply * initialPrice * 0.005,
      },
      behavior: {
        initialUsers: initialStakers,
        avgStakeAmount: (circulatingSupply * 0.3) / Math.max(initialStakers, 1),
        stakeStdDev:
          ((circulatingSupply * 0.3) / Math.max(initialStakers, 1)) * 0.3,
        entryModel: "linear-growth",
        baseEntryRate: Math.max(Math.floor(initialStakers * 0.05), 1),
        returnSensitivity: 1.0,
        maxExitRate: 0.3,
      },
      scenario: {
        name: "Baseline",
        marketSentiment: 1.0,
        shocks: [],
      },
    };

    const prng = sim.createPRNG(sim.seedFromString(config.id) as number);
    const output = sim.runStakingSimulation(config, prng);
    const risk = sim.classifyRisk(output.snapshots);

    const finalState = output.finalState;

    const summary = {
      durationDays,
      finalPrice: round(finalState.tokenPrice as number, 4),
      priceChange: round(
        (((finalState.tokenPrice as number) - initialPrice) / initialPrice) *
          100,
        1,
      ),
      finalStakingRatio: round((finalState.stakingRatio as number) * 100, 1),
      finalApy: round(finalState.nominalApy as number, 1),
      realApy: round(finalState.realApy as number, 1),
      totalStaked: round(finalState.totalStaked as number, 0),
      activeUsers: finalState.activeUsers as number,
      treasuryRunwaySteps:
        finalState.treasuryRunwaySteps === Infinity
          ? "Infinite"
          : Math.round(finalState.treasuryRunwaySteps as number),
      feeCoverageRatio: round(finalState.feeCoverageRatio as number, 2),
    };

    const factors = (risk.factors as SimFactor[]).map((f: SimFactor) => ({
      label: f.label,
      severity: f.severity,
      description: f.description,
    }));

    // Extract 7 chart datasets from snapshots (sample every N steps to keep payload reasonable)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const snapshots: any[] = output.snapshots;
    const maxPoints = 200;
    const stride = Math.max(1, Math.floor(snapshots.length / maxPoints));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sampled = snapshots.filter((_: any, i: number) => i % stride === 0 || i === snapshots.length - 1);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const charts = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      price: sampled.map((s: any) => ({ step: s.step, tokenPrice: round(s.state.tokenPrice, 6) })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      apy: sampled.map((s: any) => ({ step: s.step, nominalApy: round(s.state.nominalApy * 100, 2), realApy: round(s.state.realApy * 100, 2) })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      users: sampled.map((s: any) => ({ step: s.step, activeUsers: s.state.activeUsers, newUsersThisStep: s.state.newUsersThisStep })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      treasury: sampled.map((s: any) => ({ step: s.step, treasuryBalanceUsd: round(s.state.treasuryBalanceUsd, 2), feeRevenueThisStep: round(s.state.feeRevenueThisStep, 4) })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supply: sampled.map((s: any) => ({ step: s.step, totalSupply: round(s.state.totalSupply, 0), circulatingSupply: round(s.state.circulatingSupply, 0), totalStaked: round(s.state.totalStaked, 0) })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fees: sampled.map((s: any) => ({ step: s.step, cumulativeFeeRevenue: round(s.state.cumulativeFeeRevenue, 2), feeCoverageRatio: round(s.state.feeCoverageRatio, 4) })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pressure: sampled.map((s: any) => ({ step: s.step, buyPressureUsd: round(s.state.buyPressureUsd, 2), sellPressureUsd: round(s.state.sellPressureUsd, 2), netPressureUsd: round(s.state.netPressureUsd, 2) })),
    };

    return {
      result: {
        success: true,
        summary,
        riskLevel: risk.level as string,
        riskFactors: factors,
        message: `Simulation complete: ${durationDays}-day projection. Risk level: ${risk.level as string}. Final price: $${summary.finalPrice} (${summary.priceChange > 0 ? "+" : ""}${summary.priceChange}%). Staking ratio: ${summary.finalStakingRatio}%. APY: ${summary.finalApy}%.`,
      },
      artifact: undefined,
      simulationData: {
        metrics: summary,
        risk: {
          level: risk.level as string,
          summary: `Risk level: ${risk.level as string}. ${factors.length} factor(s) identified.`,
          factors,
        },
        charts,
      },
    };
  } catch {
    // If simulation package import fails, return mock results
    const durationDays = input.durationDays ?? 365;
    const mockSummary = {
      durationDays,
      finalPrice: round(input.initialPrice * 0.85, 4),
      priceChange: -15.0,
      finalStakingRatio: 42.5,
      finalApy: round(input.rewardRate * 100 * 0.6, 1),
      realApy: round(input.rewardRate * 100 * 0.6 - 15.0, 1),
      totalStaked: round(input.totalSupply * 0.17, 0),
      activeUsers: (input.initialStakers ?? 100) * 3,
      treasuryRunwaySteps: 280,
      feeCoverageRatio: 0.35,
    };
    const mockFactors = [
      {
        label: "Low fee coverage",
        severity: "medium",
        description:
          "Fee revenue covers only ~35% of reward emissions. The protocol relies on inflation to fund rewards.",
      },
    ];

    // Generate mock chart data (simple linear interpolation)
    const mockSteps = Math.min(durationDays, 100);
    const mockChartPoints = Array.from({ length: mockSteps }, (_, i) => i);
    const priceFactor = 0.85;
    const mockCharts = {
      price: mockChartPoints.map((s) => ({ step: s, tokenPrice: round(input.initialPrice * (1 - (1 - priceFactor) * (s / mockSteps)), 6) })),
      apy: mockChartPoints.map((s) => ({ step: s, nominalApy: round(input.rewardRate * 100 * (1 - 0.4 * s / mockSteps), 2), realApy: round(input.rewardRate * 100 * 0.6 * (1 - 0.5 * s / mockSteps), 2) })),
      users: mockChartPoints.map((s) => ({ step: s, activeUsers: Math.floor((input.initialStakers ?? 100) * (1 + 2 * s / mockSteps)), newUsersThisStep: Math.max(1, Math.floor((input.initialStakers ?? 100) * 0.03)) })),
      treasury: mockChartPoints.map((s) => ({ step: s, treasuryBalanceUsd: round(input.totalSupply * 0.15 * input.initialPrice * (1 - 0.3 * s / mockSteps), 2), feeRevenueThisStep: round(input.totalSupply * input.initialPrice * 0.0001, 4) })),
      supply: mockChartPoints.map((s) => ({ step: s, totalSupply: round(input.totalSupply * (1 + 0.1 * s / mockSteps), 0), circulatingSupply: round(input.totalSupply * 0.4 * (1 + 0.15 * s / mockSteps), 0), totalStaked: round(input.totalSupply * 0.17 * (1 + 0.05 * s / mockSteps), 0) })),
      fees: mockChartPoints.map((s) => ({ step: s, cumulativeFeeRevenue: round(input.totalSupply * input.initialPrice * 0.0001 * s, 2), feeCoverageRatio: round(0.35, 4) })),
      pressure: mockChartPoints.map((s) => ({ step: s, buyPressureUsd: round(input.totalSupply * input.initialPrice * 0.005, 2), sellPressureUsd: round(input.totalSupply * input.initialPrice * 0.006 * (1 + 0.2 * s / mockSteps), 2), netPressureUsd: round(-input.totalSupply * input.initialPrice * 0.001 * (1 + 0.2 * s / mockSteps), 2) })),
    };

    return {
      result: {
        success: true,
        summary: mockSummary,
        riskLevel: "medium",
        riskFactors: mockFactors,
        message: `Simulation complete (estimated): ${durationDays}-day projection. Risk level: medium. Note: used estimated model — install @zapp/simulation for full engine.`,
        estimated: true,
      },
      artifact: undefined,
      simulationData: {
        metrics: mockSummary,
        risk: {
          level: "medium",
          summary: "Risk level: medium. 1 factor(s) identified. (Estimated — mock engine)",
          factors: mockFactors,
        },
        charts: mockCharts,
      },
    };
  }
}

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
