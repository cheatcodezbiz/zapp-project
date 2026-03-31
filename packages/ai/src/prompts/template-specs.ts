// ---------------------------------------------------------------------------
// Template Architecture Specs — loaded into the AI agent context
// ---------------------------------------------------------------------------
// These specs come from docs/ and define the exact contract architectures,
// security fixes, storage layouts, and function signatures for each template.
// The AI uses them as blueprints when generating contracts.
// ---------------------------------------------------------------------------

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Template index — short descriptions for the agent to match against
// ---------------------------------------------------------------------------

export interface TemplateEntry {
  id: number;
  name: string;
  category: string;
  keywords: string[];
  specFile: string;
  /** Section heading in the spec file to extract */
  sectionPattern: string;
}

export const TEMPLATE_INDEX: TemplateEntry[] = [
  // --- DeFi Part 1 (1-8) ---
  { id: 1, name: "PancakeSwap-Style MasterChef", category: "defi", keywords: ["masterchef", "yield farm", "farming", "pancakeswap", "pancake", "lp staking", "liquidity mining", "farm fork", "cake fork", "pancake fork"], specFile: "yield-farm-templates-v1.md", sectionPattern: "Template 1:" },
  { id: 2, name: "GooseDefi-Style Transparent Farm", category: "defi", keywords: ["goosedefi", "goose", "transparent farm", "deposit fee", "certik", "goose fork", "goose farm"], specFile: "yield-farm-templates-v1.md", sectionPattern: "Template 2:" },
  { id: 3, name: "PantherSwap-Style Anti-Dump Farm", category: "defi", keywords: ["pantherswap", "panther", "anti-dump", "transfer tax", "anti-whale", "harvest lockup", "referral", "panther fork"], specFile: "yield-farm-templates-v1.md", sectionPattern: "Template 3:" },
  { id: 4, name: "BSC Runner-Style Gamified Farm", category: "defi", keywords: ["gamified farm", "nft boost", "lootbox", "permanent staking", "dual token", "runner", "bsc runner"], specFile: "yield-farm-templates-v1.md", sectionPattern: "Template 4:" },
  { id: 5, name: "PancakeBunny-Style Auto-Compounding Vault", category: "defi", keywords: ["auto-compound", "vault", "pancakebunny", "bunny", "yield optimizer", "compounding", "bunny fork", "auto compound vault"], specFile: "yield-farm-templates-v1.md", sectionPattern: "Template 5:" },
  { id: 6, name: "JetFuel-Style Deflationary Dual-Token", category: "defi", keywords: ["deflationary", "burn on transfer", "dual token", "jetfuel", "governance staking", "jetfuel fork", "burn token"], specFile: "yield-farm-templates-v1.md", sectionPattern: "Template 6:" },
  { id: 7, name: "SushiSwap-Style Revenue-Sharing DEX", category: "defi", keywords: ["sushiswap", "sushi", "xtoken", "staking bar", "revenue sharing", "fee distribution", "dex", "sushi fork"], specFile: "yield-farm-templates-v1.md", sectionPattern: "Template 7:" },
  { id: 8, name: "Uniswap V2-Style AMM DEX", category: "defi", keywords: ["uniswap", "uni", "amm", "dex", "swap", "liquidity pool", "constant product", "automated market maker", "uniswap fork", "uni fork"], specFile: "yield-farm-templates-v1.md", sectionPattern: "Template 8:" },

  // --- DeFi Part 2 (9-14) ---
  { id: 9, name: "Curve-Style StableSwap AMM", category: "defi", keywords: ["curve", "stableswap", "stable", "stablecoin", "vetoken", "gauge", "vote escrow", "curve fork", "stable swap"], specFile: "advanced-templates-v1.md", sectionPattern: "Template 9:" },
  { id: 10, name: "Convex-Style Boost Aggregator", category: "defi", keywords: ["convex", "boost", "aggregator", "yield boost", "crv", "convex fork", "boost aggregator"], specFile: "advanced-templates-v1.md", sectionPattern: "Template 10:" },
  { id: 11, name: "Yearn-Style Multi-Strategy Vault", category: "defi", keywords: ["yearn", "vault", "multi-strategy", "erc4626", "strategy", "yield aggregator", "yearn fork", "strategy vault"], specFile: "advanced-templates-v1.md", sectionPattern: "Template 11:" },
  { id: 12, name: "Pendle-Style Yield Tokenisation", category: "defi", keywords: ["pendle", "yield tokenization", "principal token", "yield token", "fixed rate", "pt", "yt", "pendle fork", "yield split"], specFile: "advanced-templates-v1.md", sectionPattern: "Template 12:" },
  { id: 13, name: "EigenLayer-Style Restaking Vault", category: "defi", keywords: ["eigenlayer", "eigen", "restaking", "lst", "liquid staking", "avs", "operator", "slashing", "eigen fork"], specFile: "advanced-templates-v1.md", sectionPattern: "Template 13:" },
  { id: 14, name: "OlympusDAO-Style Bonding + POL", category: "defi", keywords: ["olympus", "ohm", "bonding", "protocol owned liquidity", "pol", "rebase", "treasury", "ohm fork", "olympus fork", "(3,3)"], specFile: "advanced-templates-v1.md", sectionPattern: "Template 14:" },

  // --- Games (15-19) ---
  { id: 15, name: "CryptoBlades-Style RPG Battle Game", category: "game", keywords: ["cryptoblades", "rpg", "battle", "hero", "weapon", "stamina", "pve", "pvp", "crypto rpg", "battle game", "cryptoblades fork"], specFile: "game-templates-v1.md", sectionPattern: "Template 15:" },
  { id: 16, name: "Axie-Style Creature Breeding & Battle", category: "game", keywords: ["axie", "breeding", "creature", "genetics", "pet", "scholarship", "play to earn", "axie fork", "p2e", "breed"], specFile: "game-templates-v1.md", sectionPattern: "Template 16:" },
  { id: 17, name: "CryptoZoon-Style Monster Collection", category: "game", keywords: ["cryptozoon", "monster", "egg", "hatch", "evolution", "pokemon", "collection", "zoon", "monster game"], specFile: "game-templates-v1.md", sectionPattern: "Template 17:" },
  { id: 18, name: "Plant vs Undead-Style Farming Game", category: "game", keywords: ["plant vs undead", "farming game", "garden", "tower defense", "seeds", "plants", "pvu", "plant game"], specFile: "game-templates-v1.md", sectionPattern: "Template 18:" },
  { id: 19, name: "Idle Staking RPG", category: "game", keywords: ["idle", "idle game", "auto battle", "afk", "passive", "idle staking", "rpg lite", "idle rpg"], specFile: "game-templates-v1.md", sectionPattern: "Template 19:" },

  // --- Utility (20-44) ---
  { id: 20, name: "Token Factory", category: "token", keywords: ["token factory", "erc20", "create token", "deploy token", "custom token", "token creator"], specFile: "utility-templates-v1.md", sectionPattern: "Template 20:" },
  { id: 21, name: "Token Vesting", category: "token", keywords: ["vesting", "cliff", "linear release", "token lock", "investor vesting", "team vesting"], specFile: "utility-templates-v1.md", sectionPattern: "Template 21:" },
  { id: 22, name: "Airdrop Distributor", category: "token", keywords: ["airdrop", "merkle", "batch send", "token distribution", "claim", "merkle proof"], specFile: "utility-templates-v1.md", sectionPattern: "Template 22:" },
  { id: 23, name: "Liquidity Locker", category: "token", keywords: ["liquidity lock", "lp lock", "rug proof", "time lock lp", "liquidity locker"], specFile: "utility-templates-v1.md", sectionPattern: "Template 23:" },
  { id: 24, name: "Presale / Launchpad", category: "launch", keywords: ["presale", "launchpad", "ico", "ido", "token sale", "hardcap", "softcap", "whitelist sale"], specFile: "utility-templates-v1.md", sectionPattern: "Template 24:" },
  { id: 25, name: "Fair Launch", category: "launch", keywords: ["fair launch", "no presale", "no team allocation", "100% distributed", "fair distribution"], specFile: "utility-templates-v1.md", sectionPattern: "Template 25:" },
  { id: 26, name: "Liquidity Bootstrapping Pool (LBP)", category: "launch", keywords: ["lbp", "liquidity bootstrapping", "dutch auction", "balancer", "fair price discovery"], specFile: "utility-templates-v1.md", sectionPattern: "Template 26:" },
  { id: 27, name: "Multisig Wallet", category: "governance", keywords: ["multisig", "multi-signature", "gnosis", "safe", "m-of-n"], specFile: "utility-templates-v1.md", sectionPattern: "Template 27:" },
  { id: 28, name: "DAO Governance", category: "governance", keywords: ["dao", "governance", "proposal", "voting", "timelock", "governor", "on-chain voting"], specFile: "utility-templates-v1.md", sectionPattern: "Template 28:" },
  { id: 29, name: "Treasury Manager", category: "governance", keywords: ["treasury", "treasury management", "diversified", "rebalance", "allocation"], specFile: "utility-templates-v1.md", sectionPattern: "Template 29:" },
  { id: 30, name: "Streaming Payments", category: "governance", keywords: ["streaming", "payroll", "per-second", "salary", "continuous payment", "stream"], specFile: "utility-templates-v1.md", sectionPattern: "Template 30:" },
  { id: 31, name: "NFT Marketplace", category: "nft", keywords: ["nft marketplace", "buy sell nft", "auction", "royalty", "erc721", "erc1155", "marketplace"], specFile: "utility-templates-v1.md", sectionPattern: "Template 31:" },
  { id: 32, name: "NFT Launchpad", category: "nft", keywords: ["nft launchpad", "nft mint", "mint phases", "allowlist", "reveal", "nft collection"], specFile: "utility-templates-v1.md", sectionPattern: "Template 32:" },
  { id: 33, name: "OTC Escrow", category: "marketplace", keywords: ["otc", "escrow", "p2p trade", "trustless swap", "atomic swap", "peer to peer"], specFile: "utility-templates-v1.md", sectionPattern: "Template 33:" },
  { id: 34, name: "Timelock Controller", category: "security", keywords: ["timelock", "delay", "admin delay", "governance timelock"], specFile: "utility-templates-v1.md", sectionPattern: "Template 34:" },
  { id: 35, name: "Token Blacklist / Whitelist", category: "security", keywords: ["blacklist", "whitelist", "transfer restriction", "kyc", "compliance"], specFile: "utility-templates-v1.md", sectionPattern: "Template 35:" },
  { id: 36, name: "Emergency Pause System", category: "security", keywords: ["emergency pause", "circuit breaker", "auto unpause", "guardian"], specFile: "utility-templates-v1.md", sectionPattern: "Template 36:" },
  { id: 37, name: "Referral System", category: "engagement", keywords: ["referral", "affiliate", "commission", "referral chain", "tiered referral"], specFile: "utility-templates-v1.md", sectionPattern: "Template 37:" },
  { id: 38, name: "Staking Rewards", category: "engagement", keywords: ["simple staking", "staking rewards", "apy", "stake and earn", "single asset staking"], specFile: "utility-templates-v1.md", sectionPattern: "Template 38:" },
  { id: 39, name: "Lottery / Raffle", category: "engagement", keywords: ["lottery", "raffle", "random draw", "jackpot", "vrf lottery", "prize pool"], specFile: "utility-templates-v1.md", sectionPattern: "Template 39:" },
  { id: 40, name: "Prediction Market", category: "engagement", keywords: ["prediction", "betting", "binary outcome", "bull bear", "price prediction"], specFile: "utility-templates-v1.md", sectionPattern: "Template 40:" },
  { id: 41, name: "Token Bridge", category: "infrastructure", keywords: ["bridge", "cross-chain", "lock and mint", "wrapped token", "relayer"], specFile: "utility-templates-v1.md", sectionPattern: "Template 41:" },
  { id: 42, name: "Payment Splitter", category: "infrastructure", keywords: ["payment split", "revenue split", "royalty split", "payee", "shares"], specFile: "utility-templates-v1.md", sectionPattern: "Template 42:" },
  { id: 43, name: "NFT Staking Vault", category: "infrastructure", keywords: ["nft staking", "stake nft", "nft rewards", "rarity staking"], specFile: "utility-templates-v1.md", sectionPattern: "Template 43:" },
  { id: 44, name: "Wrapped Token", category: "infrastructure", keywords: ["wrapped", "weth", "wrap native", "erc20 wrapper"], specFile: "utility-templates-v1.md", sectionPattern: "Template 44:" },
  { id: 45, name: "Pump.fun Bonding Curve Launchpad", category: "launch", keywords: ["pump.fun", "pump", "bonding curve", "memecoin", "launch", "virtual amm", "graduated liquidity", "pump fork", "pumpfun"], specFile: "pumpfun-template-v1.md", sectionPattern: "Template 45:" },
];

// ---------------------------------------------------------------------------
// Spec file cache — loaded lazily from docs/
// ---------------------------------------------------------------------------

const specCache = new Map<string, string>();

function getDocsDir(): string {
  // Navigate from packages/ai/src/prompts/ up to project root, then into docs/
  try {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    return join(currentDir, "..", "..", "..", "..", "docs");
  } catch {
    // Fallback for CJS or test environments
    return join(process.cwd(), "docs");
  }
}

function loadSpecFile(filename: string): string {
  if (specCache.has(filename)) return specCache.get(filename)!;

  try {
    const content = readFileSync(join(getDocsDir(), filename), "utf-8");
    specCache.set(filename, content);
    return content;
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// Extract a template section from a spec file
// ---------------------------------------------------------------------------

function extractSection(fileContent: string, sectionPattern: string): string {
  if (!fileContent) return "";

  // Find the section start (## Template N:)
  const sectionRegex = new RegExp(
    `(## ${sectionPattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?)(?=\\n## Template \\d|\\n## (?:Template Parameter|Vulnerability|Complete Template|Composability|AI Agent)|$)`,
  );
  const match = fileContent.match(sectionRegex);
  return match?.[1]?.trim() ?? "";
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get the full architecture spec for a template by its numeric ID.
 */
export function getTemplateSpecById(templateId: number): string {
  const entry = TEMPLATE_INDEX.find((t) => t.id === templateId);
  if (!entry) return "";

  const fileContent = loadSpecFile(entry.specFile);
  return extractSection(fileContent, entry.sectionPattern);
}

/**
 * Get the global security standards that apply to all templates.
 */
export function getGlobalSecurityStandards(): string {
  const part1 = loadSpecFile("yield-farm-templates-v1.md");
  if (!part1) return "";

  // Extract everything from "## Base Requirements" to the first template
  const match = part1.match(
    /(## Base Requirements[\s\S]*?)(?=\n## Template 1:)/,
  );
  return match?.[1]?.trim() ?? "";
}

/**
 * Match user intent (from a description or message) to the best template(s).
 * Returns templates sorted by relevance (keyword match count).
 *
 * Handles patterns like "goose fork", "fork of pancakeswap", "like sushi but..."
 */
export function matchTemplatesByKeywords(text: string): TemplateEntry[] {
  const lower = text.toLowerCase();

  // Detect "fork" context — boost matches when user mentions forking
  const isForkRequest = /\bfork\b|\bclone\b|\blike\b|\bbased on\b|\binspired by\b/.test(lower);

  const scored = TEMPLATE_INDEX.map((entry) => {
    let score = 0;
    for (const kw of entry.keywords) {
      if (lower.includes(kw)) score += kw.split(" ").length; // multi-word keywords score higher
    }
    // Also check template name
    if (lower.includes(entry.name.toLowerCase())) score += 5;

    // Boost score if this is a fork request and we matched
    if (isForkRequest && score > 0) score += 3;

    return { entry, score };
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.map((s) => s.entry);
}

/**
 * Get template specs for multiple template IDs.
 * Includes the global security standards as preamble.
 */
export function getTemplateSpecs(templateIds: number[]): string {
  const sections: string[] = [];

  // Add global security standards
  const globals = getGlobalSecurityStandards();
  if (globals) sections.push(globals);

  // Add each template's spec
  for (const id of templateIds) {
    const spec = getTemplateSpecById(id);
    if (spec) sections.push(spec);
  }

  return sections.join("\n\n---\n\n");
}

/**
 * Build a concise template index string for the agent's system prompt.
 * Lists all 45 templates so the agent can suggest or identify the right one.
 */
export function buildTemplateIndexPrompt(): string {
  const lines = TEMPLATE_INDEX.map(
    (t) => `  ${t.id}. ${t.name} [${t.category}] — keywords: ${t.keywords.slice(0, 4).join(", ")}`,
  );

  return `## Available Template Architectures

You have access to 45 proven contract architecture blueprints. When the user describes what they want to build, identify the closest matching template(s) and use the architecture spec as your blueprint. These specs define exact contract structures, storage layouts, function signatures, security patterns, and vulnerability fixes from real protocols.

${lines.join("\n")}

When you identify a matching template, tell the user which architecture you're using and why. If their project combines multiple templates, mention the composability. Always follow the security fixes specified in the template — they prevent real exploits that cost millions.`;
}
