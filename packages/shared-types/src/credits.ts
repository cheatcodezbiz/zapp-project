// ---------------------------------------------------------------------------
// Credit system types — USD-pegged, stored as BIGINT integer cents
// ---------------------------------------------------------------------------

import type {
  ChainId,
  EthAddress,
  ISOTimestamp,
  Timestamped,
  TransactionId,
  TxHash,
  UserId,
} from "./common";

/**
 * Integer cents (e.g. $42.50 = 4250n). All monetary amounts on the platform
 * use this representation to avoid floating-point precision issues.
 */
export type CreditAmount = bigint;

// ---- Credit balance ----
export interface CreditBalance extends Timestamped {
  userId: UserId;
  /** Current spendable balance in integer cents. */
  balance: CreditAmount;
  /** Lifetime total credits purchased. */
  lifetimePurchased: CreditAmount;
  /** Lifetime total credits consumed. */
  lifetimeSpent: CreditAmount;
}

// ---- Deposit flow ----
export type DepositStatus =
  | "pending_tx"
  | "confirming"
  | "converting"
  | "credited"
  | "failed";

export interface CreditDeposit extends Timestamped {
  transactionId: TransactionId;
  userId: UserId;
  /** Chain the crypto was sent on. */
  chainId: ChainId;
  /** On-chain tx hash of the incoming crypto transfer. */
  txHash: TxHash;
  /** Token contract address (native asset if zero address). */
  tokenAddress: EthAddress;
  tokenSymbol: string;
  /** Raw token amount as a decimal string (before conversion). */
  tokenAmount: string;
  /** USD value at time of conversion, in integer cents. */
  usdValueCents: CreditAmount;
  /** Platform deposit fee in integer cents (5-10% of usdValueCents). */
  depositFeeCents: CreditAmount;
  /** Net credits added to the user's balance. */
  creditedAmount: CreditAmount;
  status: DepositStatus;
  /** Set when status is "failed". */
  failureReason?: string;
}

// ---- Spending ----
export type SpendCategory =
  | "simulation"
  | "generation"
  | "compilation"
  | "testing"
  | "deployment_gas"
  | "hosting"
  | "upgrade";

export interface CreditSpend extends Timestamped {
  transactionId: TransactionId;
  userId: UserId;
  category: SpendCategory;
  /** Positive amount deducted in integer cents. */
  amount: CreditAmount;
  /** Human-readable description (e.g. "Staking simulation — 500 time steps"). */
  description: string;
  /** Related project, if applicable. */
  projectId?: string;
}

// ---- Price quote (shown before user confirms) ----
export interface CreditQuote {
  category: SpendCategory;
  estimatedCostCents: CreditAmount;
  /** How the estimate was computed (for transparency). */
  breakdown: CreditQuoteLineItem[];
}

export interface CreditQuoteLineItem {
  label: string;
  amountCents: CreditAmount;
}
