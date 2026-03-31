import type {
  EmissionModel,
  StakingParams,
  BehaviorConfig,
  ScenarioConfig,
} from "@zapp/simulation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TemplateCategory = "defi" | "nft" | "dao" | "token";
export type TemplateDifficulty = "beginner" | "intermediate" | "advanced";

/**
 * Partial simulation config that a template pre-fills.
 * Spread into `createDefaultConfig()` to get a complete FullSimConfig.
 */
export interface TemplateSimConfig {
  timeSteps?: number;
  stakingParams?: Partial<StakingParams>;
  behavior?: Partial<BehaviorConfig>;
  scenario?: Partial<ScenarioConfig>;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  difficulty: TemplateDifficulty;
  tags: string[];
  icon: string;
  /** Cost estimate in integer cents (e.g. 5000 = $50.00) */
  estimatedCredits: number;
  /** Pre-filled simulation config, or null if simulation is not applicable */
  defaultSimConfig: TemplateSimConfig | null;
}

// ---------------------------------------------------------------------------
// Template definitions
// ---------------------------------------------------------------------------

export const templates: Template[] = [
  // -------------------------------------------------------------------------
  // 1. Staking Protocol
  // -------------------------------------------------------------------------
  {
    id: "staking-protocol",
    name: "Staking Protocol",
    description:
      "Stake tokens and earn rewards with a fixed-rate emission model. " +
      "Ideal first project for teams launching a simple proof-of-stake economy.",
    category: "defi",
    difficulty: "beginner",
    tags: ["staking", "rewards", "fixed-rate", "erc20", "defi"],
    icon: "\u{1F4B0}",
    estimatedCredits: 5000,
    defaultSimConfig: {
      timeSteps: 90,
      stakingParams: {
        initialTotalSupply: 1_000_000,
        maxSupply: 1_000_000,
        initialCirculatingSupply: 400_000,
        emissionModel: "fixed-rate" as EmissionModel,
        fixedEmissionRate: 1_100,
        stakerEmissionShare: 0.8,
        lockPeriod: 14,
        earlyUnstakePenalty: 0.05,
        penaltyDestination: "treasury",
        compoundingRate: 0.5,
        initialTreasuryBalance: 100_000,
        feeRate: 0.002,
        estimatedVolumePerStep: 500_000,
        feeModel: "percentage-of-volume",
        initialTokenPrice: 1.0,
        priceElasticity: 8,
        externalBuyPressure: 10_000,
      },
      behavior: {
        initialUsers: 500,
        avgStakeAmount: 2_000,
        stakeStdDev: 800,
        entryModel: "linear-growth",
        baseEntryRate: 15,
        returnSensitivity: 1.0,
        maxExitRate: 0.1,
      },
      scenario: {
        name: "Staking Base Case",
        marketSentiment: 1.0,
        shocks: [],
      },
    },
  },

  // -------------------------------------------------------------------------
  // 2. Yield Farm
  // -------------------------------------------------------------------------
  {
    id: "yield-farm",
    name: "Yield Farm",
    description:
      "LP token staking with decay emissions that taper over time. " +
      "Designed for projects that want high initial yields to bootstrap liquidity, " +
      "with a sustainable long-tail reward schedule.",
    category: "defi",
    difficulty: "intermediate",
    tags: ["yield-farming", "lp-tokens", "decay", "liquidity", "defi"],
    icon: "\u{1F33E}",
    estimatedCredits: 7500,
    defaultSimConfig: {
      timeSteps: 180,
      stakingParams: {
        initialTotalSupply: 5_000_000,
        maxSupply: 5_000_000,
        initialCirculatingSupply: 2_000_000,
        emissionModel: "decay" as EmissionModel,
        decayInitialRate: 10_000,
        decayConstant: 0.01,
        stakerEmissionShare: 0.75,
        lockPeriod: 30,
        earlyUnstakePenalty: 0.1,
        penaltyDestination: "redistribute",
        compoundingRate: 0.6,
        initialTreasuryBalance: 500_000,
        feeRate: 0.003,
        estimatedVolumePerStep: 2_000_000,
        feeModel: "percentage-of-volume",
        initialTokenPrice: 1.0,
        priceElasticity: 12,
        externalBuyPressure: 25_000,
      },
      behavior: {
        initialUsers: 800,
        avgStakeAmount: 5_000,
        stakeStdDev: 2_500,
        entryModel: "exponential-decay",
        baseEntryRate: 30,
        returnSensitivity: 1.5,
        maxExitRate: 0.2,
      },
      scenario: {
        name: "Yield Farm Base Case",
        marketSentiment: 1.0,
        shocks: [],
      },
    },
  },

  // -------------------------------------------------------------------------
  // 3. Governance Token
  // -------------------------------------------------------------------------
  {
    id: "governance-token",
    name: "Governance Token",
    description:
      "ERC-20 token with on-chain voting and a timelock governor. " +
      "Uses a halving emission schedule for long-term sustainability. " +
      "Perfect for DAOs that need decentralized decision-making from day one.",
    category: "dao",
    difficulty: "beginner",
    tags: ["governance", "voting", "timelock", "dao", "erc20"],
    icon: "\u{1F3DB}\u{FE0F}",
    estimatedCredits: 6000,
    defaultSimConfig: {
      timeSteps: 365,
      stakingParams: {
        initialTotalSupply: 10_000_000,
        maxSupply: 10_000_000,
        initialCirculatingSupply: 3_000_000,
        emissionModel: "halving" as EmissionModel,
        halvingInitialRate: 15_000,
        halvingInterval: 180,
        stakerEmissionShare: 0.6,
        lockPeriod: 60,
        earlyUnstakePenalty: 0.15,
        penaltyDestination: "treasury",
        compoundingRate: 0.3,
        initialTreasuryBalance: 2_000_000,
        feeRate: 0.001,
        estimatedVolumePerStep: 1_000_000,
        feeModel: "percentage-of-volume",
        initialTokenPrice: 1.0,
        priceElasticity: 6,
        externalBuyPressure: 15_000,
      },
      behavior: {
        initialUsers: 1_000,
        avgStakeAmount: 3_000,
        stakeStdDev: 1_500,
        entryModel: "s-curve",
        baseEntryRate: 10,
        returnSensitivity: 0.7,
        maxExitRate: 0.08,
      },
      scenario: {
        name: "Governance Base Case",
        marketSentiment: 1.0,
        shocks: [],
      },
    },
  },

  // -------------------------------------------------------------------------
  // 4. NFT Marketplace
  // -------------------------------------------------------------------------
  {
    id: "nft-marketplace",
    name: "NFT Marketplace",
    description:
      "Mint, list, and trade NFTs with configurable royalty splits. " +
      "Includes ERC-721 contracts, marketplace logic, and creator royalty enforcement.",
    category: "nft",
    difficulty: "intermediate",
    tags: ["nft", "marketplace", "erc721", "royalties", "mint"],
    icon: "\u{1F5BC}\u{FE0F}",
    estimatedCredits: 8500,
    defaultSimConfig: null,
  },

  // -------------------------------------------------------------------------
  // 5. Token Launch
  // -------------------------------------------------------------------------
  {
    id: "token-launch",
    name: "Token Launch",
    description:
      "ERC-20 token with vesting schedules and airdrop distribution. " +
      "Custom emission schedule lets you plan exactly how tokens unlock over time. " +
      "Best for teams preparing a TGE with investor and team vesting.",
    category: "token",
    difficulty: "beginner",
    tags: ["token-launch", "vesting", "airdrop", "erc20", "tge"],
    icon: "\u{1F680}",
    estimatedCredits: 4500,
    defaultSimConfig: {
      timeSteps: 30,
      stakingParams: {
        initialTotalSupply: 100_000_000,
        maxSupply: 100_000_000,
        initialCirculatingSupply: 10_000_000,
        emissionModel: "custom-schedule" as EmissionModel,
        customSchedule: Array.from({ length: 30 }, () => 0),
        stakerEmissionShare: 0,
        lockPeriod: 0,
        earlyUnstakePenalty: 0,
        penaltyDestination: "treasury",
        compoundingRate: 0,
        initialTreasuryBalance: 20_000_000,
        feeRate: 0.001,
        estimatedVolumePerStep: 10_000_000,
        feeModel: "percentage-of-volume",
        initialTokenPrice: 0.1,
        priceElasticity: 15,
        externalBuyPressure: 100_000,
      },
      behavior: {
        initialUsers: 0,
        avgStakeAmount: 0,
        stakeStdDev: 0,
        entryModel: "constant",
        baseEntryRate: 0,
        returnSensitivity: 0,
        maxExitRate: 0,
      },
      scenario: {
        name: "Token Launch Base Case",
        marketSentiment: 1.0,
        shocks: [],
      },
    },
  },
];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

/**
 * Find a template by its unique ID.
 */
export function getTemplateById(id: string): Template | undefined {
  return templates.find((t) => t.id === id);
}

/**
 * Return all templates in a given category.
 */
export function getTemplatesByCategory(category: string): Template[] {
  return templates.filter((t) => t.category === category);
}
