// ---------------------------------------------------------------------------
// Auth & session types — SIWE (Sign-In with Ethereum) wallet-based auth
// ---------------------------------------------------------------------------

import type {
  ChainId,
  EthAddress,
  ISOTimestamp,
  SessionId,
  Timestamped,
  UserId,
} from "./common";

// ---- SIWE challenge/response ----
export interface SiweChallenge {
  /** EIP-4361 plaintext message the wallet must sign. */
  message: string;
  /** Server-generated nonce embedded in the message. */
  nonce: string;
  /** Expiry for this challenge. */
  expiresAt: ISOTimestamp;
}

export interface SiweSignature {
  message: string;
  signature: `0x${string}`;
}

// ---- Session ----
export type SessionStatus = "active" | "expired" | "revoked";

export interface Session extends Timestamped {
  sessionId: SessionId;
  userId: UserId;
  walletAddress: EthAddress;
  chainId: ChainId;
  status: SessionStatus;
  expiresAt: ISOTimestamp;
  /** IP address at session creation (for abuse detection, never shown to users). */
  ipAddress?: string;
  userAgent?: string;
}

// ---- User profile ----
export interface UserProfile extends Timestamped {
  userId: UserId;
  /** Primary wallet that created the account. */
  primaryWallet: EthAddress;
  /** Additional linked wallets. */
  linkedWallets: EthAddress[];
  /** Optional display name (not required — wallet address is the identity). */
  displayName?: string;
  /** Optional avatar URL. */
  avatarUrl?: string;
}

// ---- Auth context passed through the request pipeline ----
export interface AuthContext {
  userId: UserId;
  sessionId: SessionId;
  walletAddress: EthAddress;
  chainId: ChainId;
}
