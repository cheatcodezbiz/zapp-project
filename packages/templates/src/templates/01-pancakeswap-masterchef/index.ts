import type { TemplatePackage } from "../../types.js";
import { REWARD_TOKEN_SOL } from "./contracts/RewardToken.sol.js";
import { MASTER_CHEF_SOL } from "./contracts/MasterChef.sol.js";
import { APP_TSX } from "./frontend/App.tsx.js";

export const pancakeswapTemplate: TemplatePackage = {
  manifest: {
    id: 1,
    slug: "pancakeswap-masterchef",
    name: "PancakeSwap-Style MasterChef",
    description:
      "Classic yield farm with LP staking pools, per-block reward emissions, allocation-weighted pools, and deposit fees. The most forked DeFi contract architecture in history.",
    category: "defi",
    tier: "standard",
    price: 10000,
    contracts: [
      {
        filename: "RewardToken.sol",
        description: "ERC-20 reward token with MINTER_ROLE",
      },
      {
        filename: "MasterChef.sol",
        description: "Pool management, staking, reward distribution",
      },
    ],
    frontend: {
      filename: "App.tsx",
      description: "Farm dashboard with pool list, stake/unstake, harvest",
    },
    configurableParameters: [
      "tokenName",
      "tokenSymbol",
      "rewardPerBlock",
      "depositFeeBps",
      "devFeeBps",
      "chain",
    ],
    securityFeatures: [
      "No migrator function",
      "Anti-duplicate LP check",
      "SafeERC20 on all transfers",
      "nonReentrant on state-changing functions",
      "1-block flash loan protection",
      "1e18 precision accTokenPerShare",
      "emergencyWithdraw always available (no admin gate)",
      "Deposit fee capped at 400 bps",
    ],
  },
  files: [
    {
      filename: "RewardToken.sol",
      content: REWARD_TOKEN_SOL,
      type: "contract",
      language: "solidity",
    },
    {
      filename: "MasterChef.sol",
      content: MASTER_CHEF_SOL,
      type: "contract",
      language: "solidity",
    },
    {
      filename: "App.tsx",
      content: APP_TSX,
      type: "frontend",
      language: "tsx",
    },
  ],
  defaults: {
    tokenName: "REWARD",
    tokenSymbol: "RWD",
    rewardPerBlock: 40,
    depositFeeBps: 400,
    devFeeBps: 909,
    chain: "base",
  },
};
