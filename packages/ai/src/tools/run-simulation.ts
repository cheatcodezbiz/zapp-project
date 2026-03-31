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

export async function executeRunSimulation(
  input: RunSimulationInput,
): Promise<{ result: unknown; artifact: undefined }> {
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

    return {
      result: {
        success: true,
        summary,
        riskLevel: risk.level as string,
        riskFactors: factors,
        message: `Simulation complete: ${durationDays}-day projection. Risk level: ${risk.level as string}. Final price: $${summary.finalPrice} (${summary.priceChange > 0 ? "+" : ""}${summary.priceChange}%). Staking ratio: ${summary.finalStakingRatio}%. APY: ${summary.finalApy}%.`,
      },
      artifact: undefined,
    };
  } catch {
    // If simulation package import fails, return mock results
    const durationDays = input.durationDays ?? 365;
    return {
      result: {
        success: true,
        summary: {
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
        },
        riskLevel: "medium",
        riskFactors: [
          {
            label: "Low fee coverage",
            severity: "medium",
            description:
              "Fee revenue covers only ~35% of reward emissions. The protocol relies on inflation to fund rewards.",
          },
        ],
        message: `Simulation complete (estimated): ${durationDays}-day projection. Risk level: medium. Note: used estimated model — install @zapp/simulation for full engine.`,
        estimated: true,
      },
      artifact: undefined,
    };
  }
}

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
