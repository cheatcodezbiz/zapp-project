import type { TemplatePackage } from "../../types.js";
import { GOOSE_TOKEN_SOL } from "./contracts/GooseToken.sol.js";
import { GOOSE_MASTER_CHEF_SOL } from "./contracts/MasterChef.sol.js";
import { APP_TSX } from "./frontend/App.tsx.js";

export const goosedefiTemplate: TemplatePackage = {
  manifest: {
    id: 2,
    slug: "goosedefi-transparent",
    name: "GooseDefi-Style Transparent Farm",
    description:
      "Transparent yield farm with timelocked emission changes, deposit fee buyback-and-burn mechanism, and CertiK audit compatibility. GooseDefi's innovation: 4% deposit fee on non-native pairs creates constant buy pressure via automated buyback.",
    category: "defi",
    tier: "standard",
    price: 10000,
    contracts: [
      {
        filename: "GooseToken.sol",
        description:
          "ERC-20 reward token with MINTER_ROLE and buyback burn address",
      },
      {
        filename: "MasterChef.sol",
        description:
          "Pool management, staking, reward distribution with timelocked emissions and buyback fees",
      },
    ],
    frontend: {
      filename: "App.tsx",
      description:
        "Farm dashboard with pool list, stake/unstake, harvest, burn stats, and transparency messaging",
    },
    configurableParameters: [
      "tokenName",
      "tokenSymbol",
      "rewardPerBlock",
      "depositFeeBps",
      "devFeeBps",
      "feeRecipient",
      "timelockDelay",
      "chain",
    ],
    securityFeatures: [
      "No migrator function",
      "Anti-duplicate LP check (nonDuplicated modifier)",
      "SafeERC20 on all transfers",
      "nonReentrant on state-changing functions",
      "1-block flash loan protection",
      "1e18 precision accTokenPerShare",
      "emergencyWithdraw always available (no admin gate)",
      "Deposit fee capped at 400 bps",
      "6-hour timelock on emission changes",
      "Deposit fee buyback-and-burn mechanism",
    ],
  },
  files: [
    {
      filename: "GooseToken.sol",
      content: GOOSE_TOKEN_SOL,
      type: "contract",
      language: "solidity",
    },
    {
      filename: "MasterChef.sol",
      content: GOOSE_MASTER_CHEF_SOL,
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
    tokenName: "GOOSE",
    tokenSymbol: "EGG",
    rewardPerBlock: 40,
    depositFeeBps: 400,
    devFeeBps: 909,
    feeRecipient: "0x0000000000000000000000000000000000000000",
    timelockDelay: 21600,
    chain: "base",
  },
};
