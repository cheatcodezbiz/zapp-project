// ---------------------------------------------------------------------------
// AI code generator — produces Solidity, frontend, and test files
// ---------------------------------------------------------------------------
// Falls back to hardcoded templates when ANTHROPIC_API_KEY is not set.

import type { AIModel } from "./router";
import { generateStakingContract, type StakingContractParams } from "./templates/staking";
import { generateStakingFrontend, type StakingFrontendParams } from "./templates/staking-frontend";
import { generateStakingTest, type StakingTestParams } from "./templates/staking-test";

// ---- Public types -----------------------------------------------------------

export interface GenerationRequest {
  projectId?: string;
  projectName: string;
  templateId: string;
  params: Record<string, unknown>;
  model?: AIModel;
}

export interface GeneratedFile {
  path: string;
  content: string;
  language: "solidity" | "typescript" | "json";
}

export interface GenerationResult {
  files: GeneratedFile[];
  solidityFiles: Record<string, string>;
  frontendFiles: Record<string, string>;
  testFiles: Record<string, string>;
}

export interface GenerationProgress {
  stage: "contracts" | "frontend" | "tests";
  progress: number; // 0-100 within this stage
  message: string;
}

// ---- Main entry point -------------------------------------------------------

export async function generateDApp(
  request: GenerationRequest,
  onProgress?: (progress: GenerationProgress) => void,
): Promise<GenerationResult> {
  const hasApiKey = !!process.env.ANTHROPIC_API_KEY;

  if (hasApiKey) {
    return generateWithAI(request, onProgress);
  }

  return generateFromTemplates(request, onProgress);
}

// ---- AI-powered generation (when API key is set) ----------------------------

async function generateWithAI(
  request: GenerationRequest,
  onProgress?: (progress: GenerationProgress) => void,
): Promise<GenerationResult> {
  // Dynamic import to avoid loading the SDK when not needed
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const { SYSTEM_PROMPTS } = await import("./prompts/system");
  const { buildStakingContractPrompt, buildStakingFrontendPrompt, buildStakingTestPrompt } =
    await import("./prompts/templates");

  const client = new Anthropic();
  const contractName = toContractName(request.projectName);
  const result: GenerationResult = {
    files: [],
    solidityFiles: {},
    frontendFiles: {},
    testFiles: {},
  };

  // --- 1. Generate contract ---
  onProgress?.({ stage: "contracts", progress: 0, message: "Generating smart contract..." });

  const contractPrompt = buildStakingContractPrompt({
    name: contractName,
    stakeTokenAddress: (request.params.stakeToken as string) || "new",
    rewardRateBps: (request.params.rewardRateBps as number) || 500,
    lockDurationSec: (request.params.lockDurationSec as number) || 0,
    maxTotalStaked: request.params.maxTotalStaked as string | undefined,
    hasEmergencyWithdraw: (request.params.hasEmergencyWithdraw as boolean) ?? true,
    hasCompounding: (request.params.hasCompounding as boolean) ?? true,
  });

  const contractResponse = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 16_384,
    system: SYSTEM_PROMPTS.contractGeneration,
    messages: [{ role: "user", content: contractPrompt }],
  });

  const contractCode = stripCodeFences(extractText(contractResponse));
  const contractPath = `contracts/${contractName}.sol`;
  result.solidityFiles[contractPath] = contractCode;
  result.files.push({ path: contractPath, content: contractCode, language: "solidity" });

  onProgress?.({ stage: "contracts", progress: 100, message: "Contract generated" });

  // --- 2. Generate frontend ---
  onProgress?.({ stage: "frontend", progress: 0, message: "Generating frontend..." });

  const frontendPrompt = buildStakingFrontendPrompt(contractName);

  const frontendResponse = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 16_384,
    system: SYSTEM_PROMPTS.frontendGeneration,
    messages: [{ role: "user", content: frontendPrompt }],
  });

  const frontendCode = stripCodeFences(extractText(frontendResponse));
  const frontendPath = `app/page.tsx`;
  result.frontendFiles[frontendPath] = frontendCode;
  result.files.push({ path: frontendPath, content: frontendCode, language: "typescript" });

  onProgress?.({ stage: "frontend", progress: 100, message: "Frontend generated" });

  // --- 3. Generate tests ---
  onProgress?.({ stage: "tests", progress: 0, message: "Generating tests..." });

  const testPrompt = buildStakingTestPrompt(contractName);

  const testResponse = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 16_384,
    system: SYSTEM_PROMPTS.testGeneration,
    messages: [{ role: "user", content: testPrompt }],
  });

  const testCode = stripCodeFences(extractText(testResponse));
  const testPath = `test/${contractName}.test.ts`;
  result.testFiles[testPath] = testCode;
  result.files.push({ path: testPath, content: testCode, language: "typescript" });

  onProgress?.({ stage: "tests", progress: 100, message: "Tests generated" });

  return result;
}

// ---- Template-based fallback (no API key) -----------------------------------

async function generateFromTemplates(
  request: GenerationRequest,
  onProgress?: (progress: GenerationProgress) => void,
): Promise<GenerationResult> {
  const contractName = toContractName(request.projectName);
  const result: GenerationResult = {
    files: [],
    solidityFiles: {},
    frontendFiles: {},
    testFiles: {},
  };

  // --- 1. Generate contract from template ---
  onProgress?.({ stage: "contracts", progress: 0, message: "Generating smart contract from template..." });

  // Small delay to make progress feel real
  await delay(400);
  onProgress?.({ stage: "contracts", progress: 30, message: "Building UUPS upgradeable contract..." });

  const contractParams: StakingContractParams = {
    name: contractName,
    rewardRateBps: (request.params.rewardRateBps as number) || 500,
    lockDurationSec: (request.params.lockDurationSec as number) || 0,
    maxTotalStaked: request.params.maxTotalStaked as string | undefined,
    hasEmergencyWithdraw: (request.params.hasEmergencyWithdraw as boolean) ?? true,
    hasCompounding: (request.params.hasCompounding as boolean) ?? true,
  };

  const contractCode = generateStakingContract(contractParams);
  const contractPath = `contracts/${contractName}.sol`;
  result.solidityFiles[contractPath] = contractCode;
  result.files.push({ path: contractPath, content: contractCode, language: "solidity" });

  await delay(300);
  onProgress?.({ stage: "contracts", progress: 100, message: "Contract generated" });

  // --- 2. Generate frontend from template ---
  onProgress?.({ stage: "frontend", progress: 0, message: "Generating frontend components..." });

  await delay(400);
  onProgress?.({ stage: "frontend", progress: 40, message: "Building stake/unstake UI..." });

  const frontendParams: StakingFrontendParams = {
    contractName,
    hasCompounding: contractParams.hasCompounding,
    hasEmergencyWithdraw: contractParams.hasEmergencyWithdraw,
  };
  const frontendCode = generateStakingFrontend(frontendParams);
  const frontendPath = `app/page.tsx`;
  result.frontendFiles[frontendPath] = frontendCode;
  result.files.push({ path: frontendPath, content: frontendCode, language: "typescript" });

  const layoutCode = generateStakingLayout(contractName);
  const layoutPath = `app/layout.tsx`;
  result.frontendFiles[layoutPath] = layoutCode;
  result.files.push({ path: layoutPath, content: layoutCode, language: "typescript" });

  await delay(300);
  onProgress?.({ stage: "frontend", progress: 100, message: "Frontend generated" });

  // --- 3. Generate tests from template ---
  onProgress?.({ stage: "tests", progress: 0, message: "Generating test suite..." });

  await delay(300);
  onProgress?.({ stage: "tests", progress: 50, message: "Writing test cases..." });

  const testParams: StakingTestParams = {
    contractName,
    rewardRateBps: contractParams.rewardRateBps,
    lockDurationSec: contractParams.lockDurationSec,
    hasEmergencyWithdraw: contractParams.hasEmergencyWithdraw,
    hasCompounding: contractParams.hasCompounding,
    hasMaxStaked: !!contractParams.maxTotalStaked,
  };
  const testCode = generateStakingTest(testParams);
  const testPath = `test/${contractName}.test.ts`;
  result.testFiles[testPath] = testCode;
  result.files.push({ path: testPath, content: testCode, language: "typescript" });

  await delay(200);
  onProgress?.({ stage: "tests", progress: 100, message: "Tests generated" });

  return result;
}

// ---- Helpers ----------------------------------------------------------------

function toContractName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("");
}

function extractText(response: { content: Array<{ type: string; text?: string }> }): string {
  const block = response.content.find((b) => b.type === "text");
  return block?.text ?? "";
}

/**
 * Strip markdown fences from AI output if present.
 * The system prompt says not to include them, but models sometimes do.
 */
function stripCodeFences(code: string): string {
  return code
    .replace(/^```[a-zA-Z]*\n?/gm, "")
    .replace(/^```\s*$/gm, "")
    .trim();
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function generateStakingLayout(contractName: string): string {
  return `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "${contractName} — Staking dApp",
  description: "Stake tokens and earn rewards. Generated by Zapp.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-gray-900 text-white antialiased">
        {children}
      </body>
    </html>
  );
}
`;
}
