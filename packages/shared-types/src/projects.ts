// ---------------------------------------------------------------------------
// Project & template types
// ---------------------------------------------------------------------------

import type {
  ChainId,
  DeepReadonly,
  EthAddress,
  ISOTimestamp,
  ProjectId,
  TemplateId,
  Timestamped,
  UserId,
} from "./common";
import type { RiskClassification } from "./simulation";
import type { DeploymentRecord } from "./deployment";

// ---- Template catalogue ----
export type TemplateCategory =
  | "staking"    // Phase 1
  | "lending"
  | "dex"
  | "nft"
  | "governance";

export interface Template extends Timestamped {
  templateId: TemplateId;
  category: TemplateCategory;
  name: string;
  description: string;
  /** Semver of the template schema. */
  version: string;
  /** JSON Schema that validates TemplateParams for this category. */
  paramsSchema: Record<string, unknown>;
  /** Whether this template is available to users yet. */
  enabled: boolean;
}

// ---- Template parameters (discriminated by category) ----
export interface StakingParams {
  category: "staking";
  /** Token to be staked (existing ERC-20 address or "new" to generate one). */
  stakeToken: EthAddress | "new";
  /** Annual reward rate as basis points (e.g. 500 = 5%). */
  rewardRateBps: number;
  /** Minimum lock duration in seconds (0 = no lock). */
  lockDurationSec: number;
  /** Optional max total staked cap in token base units (decimal string). */
  maxTotalStaked?: string;
}

/** Placeholder — will be fleshed out in later phases. */
export interface LendingParams  { category: "lending";  [key: string]: unknown; }
export interface DexParams      { category: "dex";      [key: string]: unknown; }
export interface NftParams      { category: "nft";      [key: string]: unknown; }
export interface GovernanceParams { category: "governance"; [key: string]: unknown; }

export type TemplateParams =
  | StakingParams
  | LendingParams
  | DexParams
  | NftParams
  | GovernanceParams;

// ---- Project ----
export type ProjectStatus =
  | "draft"
  | "simulated"
  | "generating"
  | "compiled"
  | "testing"
  | "deploying"
  | "deployed"
  | "failed";

export interface Project extends Timestamped {
  projectId: ProjectId;
  userId: UserId;
  name: string;
  /** The plain-English prompt the user typed to describe their dApp. */
  userPrompt: string;
  templateId: TemplateId;
  templateParams: TemplateParams;
  targetChainId: ChainId;
  status: ProjectStatus;
  /** Latest risk classification (set after simulation). */
  riskClassification?: RiskClassification;
  /** Latest deployment info (set after successful deploy). */
  deployment?: DeploymentRecord;
  /** Reason for failure when status is "failed". */
  failureReason?: string;
}

/** Read-only snapshot used for public project galleries. */
export type ProjectSummary = DeepReadonly<
  Pick<
    Project,
    | "projectId"
    | "name"
    | "templateId"
    | "targetChainId"
    | "status"
    | "riskClassification"
    | "createdAt"
  >
>;
