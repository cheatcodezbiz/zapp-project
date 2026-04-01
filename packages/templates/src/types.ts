export interface TemplateManifest {
  id: number;
  slug: string;
  name: string;
  description: string;
  category: "defi" | "game" | "token" | "launch" | "governance" | "nft" | "marketplace" | "security" | "engagement" | "infrastructure";
  tier: "utility" | "standard" | "advanced" | "platform";
  /** Price in USD cents */
  price: number;
  contracts: { filename: string; description: string }[];
  frontend: { filename: string; description: string } | null;
  configurableParameters: string[];
  securityFeatures: string[];
}

export interface TemplateFile {
  filename: string;
  content: string;
  type: "contract" | "frontend" | "test";
  language: "solidity" | "typescript" | "tsx";
}

export interface TemplatePackage {
  manifest: TemplateManifest;
  files: TemplateFile[];
  defaults: Record<string, unknown>;
}

/** Pricing in USD cents */
export const PRICING_TIERS = {
  utility: 5000,      // $50
  standard: 10000,    // $100
  advanced: 20000,    // $200
  platform: 50000,    // $500
} as const;
