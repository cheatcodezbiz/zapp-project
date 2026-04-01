import type { TemplatePackage } from "../../types.js";
import { BONDING_CURVE_SOL } from "./contracts/BondingCurve.sol.js";
import { TOKEN_FACTORY_SOL } from "./contracts/TokenFactory.sol.js";
import { GRADUATION_MANAGER_SOL } from "./contracts/GraduationManager.sol.js";
import { APP_TSX } from "./frontend/App.tsx.js";

export const pumpfunTemplate: TemplatePackage = {
  manifest: {
    id: 45,
    slug: "pumpfun-bonding-curve",
    name: "Pump.fun-Style Bonding Curve Launchpad",
    description:
      "Memecoin launchpad with virtual AMM bonding curve. Tokens trade on a bonding curve until reaching graduation market cap, then automatically migrate to a real DEX with locked liquidity. 1% fee on all trades.",
    category: "launch",
    tier: "platform",
    price: 50000,
    contracts: [
      {
        filename: "BondingCurve.sol",
        description:
          "Virtual AMM bonding curve with buy/sell, pricing, and graduation trigger",
      },
      {
        filename: "TokenFactory.sol",
        description:
          "Permissionless token creation with fair launch (0% creator allocation)",
      },
      {
        filename: "GraduationManager.sol",
        description:
          "DEX migration on graduation — creates liquidity pool and locks LP tokens",
      },
    ],
    frontend: {
      filename: "App.tsx",
      description:
        "Launchpad dashboard with token creation, bonding curve chart, trade interface, and graduation progress",
    },
    configurableParameters: [
      "graduationThreshold",
      "platformFeeBps",
      "creationFee",
      "bondingCurveType",
      "chain",
    ],
    securityFeatures: [
      "No rug pull: LP locked on graduation",
      "Fair launch: 0% creator allocation",
      "Virtual AMM: no real liquidity manipulation before graduation",
      "Platform fee capped at 1%",
      "Permissionless: anyone can create tokens",
      "ReentrancyGuard on all trades",
    ],
  },
  files: [
    {
      filename: "BondingCurve.sol",
      content: BONDING_CURVE_SOL,
      type: "contract",
      language: "solidity",
    },
    {
      filename: "TokenFactory.sol",
      content: TOKEN_FACTORY_SOL,
      type: "contract",
      language: "solidity",
    },
    {
      filename: "GraduationManager.sol",
      content: GRADUATION_MANAGER_SOL,
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
    graduationThreshold: 69420,
    platformFeeBps: 100,
    creationFee: "0.02",
    bondingCurveType: "linear",
    chain: "base",
  },
};
