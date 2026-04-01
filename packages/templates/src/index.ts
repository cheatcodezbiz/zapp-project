import type { TemplateManifest, TemplatePackage } from "./types.js";
export * from "./types.js";

// Import template registrations
import { pancakeswapTemplate } from "./templates/01-pancakeswap-masterchef/index.js";
import { goosedefiTemplate } from "./templates/02-goosedefi-transparent/index.js";
import { pumpfunTemplate } from "./templates/45-pumpfun-bonding-curve/index.js";

const REGISTRY = new Map<number, TemplatePackage>();

function register(pkg: TemplatePackage) {
  REGISTRY.set(pkg.manifest.id, pkg);
}

// Register all templates
register(pancakeswapTemplate);
register(goosedefiTemplate);
register(pumpfunTemplate);

export function loadTemplatePackage(
  templateId: number,
): TemplatePackage | null {
  return REGISTRY.get(templateId) ?? null;
}

export function listTemplates(): TemplateManifest[] {
  return Array.from(REGISTRY.values()).map((pkg) => pkg.manifest);
}
