// ---------------------------------------------------------------------------
// Deployment pipeline types
// ---------------------------------------------------------------------------

import type {
  ChainId,
  DeploymentId,
  EthAddress,
  ISOTimestamp,
  ProjectId,
  Timestamped,
  TxHash,
  UserId,
} from "./common";

// ---- Pipeline stages ----

export type DeploymentStage =
  | "generate"
  | "compile"
  | "test"
  | "deploy"
  | "host";

/** Discriminated union — status of an individual pipeline stage. */
export type StageResult =
  | { status: "pending" }
  | { status: "running"; startedAt: ISOTimestamp }
  | { status: "succeeded"; startedAt: ISOTimestamp; finishedAt: ISOTimestamp; output: StageOutput }
  | { status: "failed"; startedAt: ISOTimestamp; finishedAt: ISOTimestamp; error: string }
  | { status: "skipped"; reason: string };

// ---- Stage-specific outputs ----

export interface GenerateOutput {
  stage: "generate";
  /** Generated Solidity source files (path → content). */
  solidityFiles: Record<string, string>;
  /** Generated React frontend files (path → content). */
  frontendFiles: Record<string, string>;
}

export interface CompileOutput {
  stage: "compile";
  abi: unknown[];
  bytecode: string;
  compilerVersion: string;
  warnings: string[];
}

export interface TestOutput {
  stage: "test";
  passed: number;
  failed: number;
  skipped: number;
  /** Individual test case results. */
  cases: TestCaseResult[];
}

export interface TestCaseResult {
  name: string;
  status: "passed" | "failed" | "skipped";
  durationMs: number;
  error?: string;
}

export interface DeployOutput {
  stage: "deploy";
  /** UUPS proxy address — this is the address users interact with. */
  proxyAddress: EthAddress;
  /** Current implementation address behind the proxy. */
  implementationAddress: EthAddress;
  /** Admin/owner address that can trigger upgrades. */
  adminAddress: EthAddress;
  deployTxHash: TxHash;
  chainId: ChainId;
  blockNumber: number;
  /** Gas used by the deploy transaction. */
  gasUsed: bigint;
}

export interface HostOutput {
  stage: "host";
  /** Public URL where the generated frontend is served. */
  url: string;
  /** CDN or hosting provider identifier. */
  provider: string;
}

export type StageOutput =
  | GenerateOutput
  | CompileOutput
  | TestOutput
  | DeployOutput
  | HostOutput;

// ---- Full deployment record ----

export type DeploymentStatus =
  | "queued"
  | "in_progress"
  | "succeeded"
  | "failed"
  | "cancelled";

export interface DeploymentRecord extends Timestamped {
  deploymentId: DeploymentId;
  projectId: ProjectId;
  userId: UserId;
  targetChainId: ChainId;
  status: DeploymentStatus;
  /** Ordered map of stage → result. */
  stages: Record<DeploymentStage, StageResult>;
  /** Set after a successful deploy stage. */
  proxyAddress?: EthAddress;
  /** Set after a successful host stage. */
  hostedUrl?: string;
  completedAt?: ISOTimestamp;
  failureReason?: string;
}

// ---- Deployment progress (pushed over WebSocket) ----

export interface DeploymentProgress {
  deploymentId: DeploymentId;
  currentStage: DeploymentStage;
  stageStatus: "running" | "succeeded" | "failed";
  /** 0–100 overall completion percentage. */
  percentComplete: number;
  message?: string;
}

// ---- Upgrade (UUPS proxy upgrade) ----

export interface UpgradeRecord extends Timestamped {
  deploymentId: DeploymentId;
  projectId: ProjectId;
  /** Previous implementation address. */
  previousImplementation: EthAddress;
  /** New implementation address. */
  newImplementation: EthAddress;
  upgradeTxHash: TxHash;
  chainId: ChainId;
}
