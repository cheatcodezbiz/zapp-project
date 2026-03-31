# ZAPP Utility Template Architectures — Infrastructure & Tools (20-44)

**Version:** 1.0 | **Date:** April 1, 2026

Contract architecture specs for 25 utility templates covering the complete lifecycle of a crypto project: token creation → launch → treasury management → governance → marketplace → engagement → infrastructure. The "picks and shovels" that every DeFi protocol, game, and token launch needs.

**Note:** Template 45 (Pump.fun Bonding Curve Launchpad) is documented separately in `docs/pumpfun-template-v1.md`.

---

## Category 1: Token Lifecycle (Templates 20-23)

### Template 20: Token Factory
One-click ERC-20 deployment with configurable features. **Contracts:** TokenFactory.sol + CustomToken.sol

Configurable features (all optional): burn-on-transfer (max 5%), buy/sell tax (max 10%/15%), max wallet (min 1% of supply), max transaction (min 0.5%), mintable with hard cap, blacklist, pause. Safety caps enforced by factory to prevent honeypots.

### Template 21: Token Vesting
Lock team/investor/advisor tokens with cliff + linear/graded release. **Contracts:** TokenVesting.sol

Schedule types: linear, monthly, quarterly, custom milestones. Revocable option for admin. Batch creation for gas efficiency. Publicly verifiable on-chain.

### Template 22: Airdrop Distributor
Batch token distribution. **Contracts:** MerkleAirdrop.sol + MultiSender.sol

MerkleAirdrop: Gas-efficient claims via Merkle proof verification. Campaigns with start/end times, admin reclaim of unclaimed tokens. MultiSender: Direct batch send to up to 500 addresses per tx.

### Template 23: Liquidity Locker
Time-locked LP token vault. **Contracts:** LiquidityLocker.sol

Minimum 30-day lock. Lock can be EXTENDED but never shortened (one-way trust). Public countdown to unlock. Proves to investors project cannot rug-pull liquidity.

---

## Category 2: Launch Infrastructure (Templates 24-26)

### Template 24: Presale / Launchpad
Token presale with hardcap, softcap, whitelist (Merkle), contribution limits, vested claims. **Contracts:** Presale.sol

States: Pending → Active → Success/Failed → Finalised. Auto-liquidity at finalisation (optional). Emergency refund available before finalisation. If softcap not met, all contributors can refund.

### Template 25: Fair Launch
No presale, no team allocation, no VC. 100% distributed via farming from block 1. **Contracts:** FairLaunchToken.sol + FairLaunchFarm.sol

Token has NO owner mint function. Entire supply minted to farm at deployment. After emission period ends, no more tokens can ever be created. Simplicity IS the feature.

### Template 26: Liquidity Bootstrapping Pool (LBP)
Dutch auction-style token launch. **Contracts:** LBP.sol

Weight shifts linearly from startWeight (e.g. 96%) to endWeight (e.g. 50%) over duration. Price naturally decays — prevents bot frontrunning, enables fair price discovery. Balancer-style weighted math.

---

## Category 3: Treasury & Governance (Templates 27-30)

### Template 27: Multisig Wallet
M-of-N signature wallet. **Contracts:** MultisigWallet.sol

Submit → confirm → execute flow. addOwner/removeOwner/changeThreshold all go through multisig approval. No single owner can change rules.

### Template 28: DAO Governance
On-chain proposals, token-weighted voting, timelock execution. **Contracts:** GovernorContract.sol + TimelockController.sol + GovernanceToken.sol

Based on OpenZeppelin Governor (EIP-5805). Vote power snapshotted at proposal creation block. Flow: propose → voting delay → vote → queue in timelock → execute.

### Template 29: Treasury Manager
Diversified treasury with allocation targets and auto-rebalance. **Contracts:** TreasuryManager.sol

Configurable allocation targets (stables, native, project token, yield). Rebalance when drift exceeds threshold. Deploy idle assets to whitelisted yield vaults. Emergency withdraw all.

### Template 30: Payroll / Streaming Payments
Continuous per-second token streaming. **Contracts:** StreamingPayments.sol

Create stream with start/end time. Recipients claim accumulated amount at any time. Optional cancelable flag lets sender reclaim unvested portion.

---

## Category 4: Marketplace & Exchange (Templates 31-33)

### Template 31: NFT Marketplace
List, bid, buy, sell NFTs with royalty enforcement. **Contracts:** Marketplace.sol + CollectionFactory.sol

Fixed-price listings + timed auctions. EIP-2981 royalty enforcement on all sales. Platform fee configurable. Make/accept offers on any NFT. CollectionFactory deploys new ERC-721/ERC-1155 collections.

### Template 32: NFT Launchpad
Launch NFT collections with multi-phase minting. **Contracts:** NFTLaunchpad.sol (deploys LaunchCollection.sol)

Configurable mint phases (allowlist via Merkle, public, Dutch auction). Per-phase: price, wallet limit, supply cap, time window. Delayed reveal mechanic with randomised offset.

### Template 33: OTC Escrow
Peer-to-peer trustless token/NFT trades. **Contracts:** OTCEscrow.sol

Party A creates trade + deposits → Party B accepts + deposits → atomic swap. Supports ERC-20 and ERC-721. Either party can cancel before counterparty deposits. Expiry timestamp.

---

## Category 5: Security & Compliance (Templates 34-36)

### Template 34: Timelock Controller
Delay admin function execution. **Contracts:** TimelockController.sol (OpenZeppelin pattern)

Configurable minimum delay (e.g. 24h). Schedule → wait → execute. All pending transactions publicly visible via events. Proposer/executor roles.

### Template 35: Token Blacklist / Whitelist
Transfer restriction system. **Contracts:** TransferRestriction.sol

Modes: none, whitelist-only, blacklist. Applied as `_beforeTokenTransfer` override. Optional freeze flag to make lists immutable.

### Template 36: Emergency Pause System
Multi-sig controlled pause with auto-unpause. **Contracts:** EmergencyPause.sol

`maxPauseDuration` ensures contract CANNOT be permanently frozen. After timeout, anyone can call `unpause()`. Prevents griefing by malicious guardians.

---

## Category 6: Engagement & Growth (Templates 37-40)

### Template 37: Referral System
On-chain referral tracking with tiered commissions. **Contracts:** ReferralRegistry.sol

Up to 3-tier deep chain (5% / 2% / 1% defaults). Optional minimum stake requirement to generate referral link. Integrated by other contracts calling `recordReferral()`.

### Template 38: Staking Rewards
Simple single-asset staking with configurable APY. **Contracts:** StakingRewards.sol

Standard accRewardPerShare accumulator pattern. Configurable lock duration with early unstake penalty. Fixed duration pool with start/end time.

### Template 39: Lottery / Raffle
Periodic lottery with VRF random drawing. **Contracts:** Lottery.sol

Configurable prize tiers (jackpot 50%, second tier, third tier, burn 20%, treasury). Chainlink VRF for provably fair draws. Deterministic ticket numbers (no user choice).

### Template 40: Prediction Market
Binary outcome betting, oracle-resolved. **Contracts:** PredictionMarket.sol

5-minute rounds. Bull/bear bets on price movement. Chainlink price feed determines outcome. Winners split losers' pool proportionally. 3% treasury fee default.

---

## Category 7: Infrastructure (Templates 41-44)

### Template 41: Token Bridge (Simplified)
Cross-chain token transfer via lock-and-mint. **Contracts:** BridgeVault.sol + BridgeMinter.sol

Relayer multisig (3-of-5 minimum). Nonce tracking prevents replay. Source chain locks tokens, destination chain mints wrapped version.

### Template 42: Payment Splitter
Automatic payment splitting. **Contracts:** PaymentSplitter.sol

Configure payees and share percentages (basis points, must sum to 10000). Handles both native ETH and ERC-20 tokens. Set once, runs forever.

### Template 43: NFT Staking Vault
Stake NFTs to earn token rewards. **Contracts:** NFTStakingVault.sol

Different rarity tiers earn different rates (e.g. Common 10/day, Rare 50/day, Legendary 200/day). Claim accumulated rewards at any time.

### Template 44: Wrapped Token
Wrap native tokens (ETH→WETH). **Contracts:** WrappedToken.sol

Simplest possible contract. Deposit native → get ERC-20. Burn ERC-20 → get native back. Always 1:1 backed. No admin functions, no fees.

---

## Complete Template Index (20-44)

| # | Template | Category | Complexity | Contracts |
|---|---|---|---|---|
| 20 | Token Factory | Token Lifecycle | Simple | 2 |
| 21 | Token Vesting | Token Lifecycle | Medium | 1 |
| 22 | Airdrop Distributor | Token Lifecycle | Medium | 2 |
| 23 | Liquidity Locker | Token Lifecycle | Simple | 1 |
| 24 | Presale / Launchpad | Launch | Medium | 1 |
| 25 | Fair Launch | Launch | Simple | 2 |
| 26 | Liquidity Bootstrapping Pool | Launch | Advanced | 1 |
| 27 | Multisig Wallet | Treasury | Medium | 1 |
| 28 | DAO Governance | Governance | Advanced | 3 |
| 29 | Treasury Manager | Treasury | Medium | 1 |
| 30 | Streaming Payments | Treasury | Simple | 1 |
| 31 | NFT Marketplace | Marketplace | Advanced | 2 |
| 32 | NFT Launchpad | Marketplace | Medium | 1 |
| 33 | OTC Escrow | Marketplace | Simple | 1 |
| 34 | Timelock Controller | Security | Simple | 1 |
| 35 | Token Blacklist/Whitelist | Security | Simple | 1 |
| 36 | Emergency Pause | Security | Simple | 1 |
| 37 | Referral System | Engagement | Simple | 1 |
| 38 | Staking Rewards | Engagement | Simple | 1 |
| 39 | Lottery / Raffle | Engagement | Medium | 1 |
| 40 | Prediction Market | Engagement | Advanced | 1 |
| 41 | Token Bridge | Infrastructure | Advanced | 2 |
| 42 | Payment Splitter | Infrastructure | Simple | 1 |
| 43 | NFT Staking Vault | Infrastructure | Simple | 1 |
| 44 | Wrapped Token | Infrastructure | Simple | 1 |

---

## Composability Guide

| Use Case | Templates Combined |
|---|---|
| Full token launch | 20 + 21 + 23 + 24 + 27 + 34 |
| DeFi protocol launch | 20 + 21 + 1 (MasterChef) + 7 (xToken Bar) + 28 + 34 |
| NFT game launch | 15-19 (Game) + 31 + 32 + 43 + 37 |
| Memecoin launchpad | 45 (Pump.fun) + 39 + 40 |
| DAO treasury | 27 + 28 + 29 + 30 + 34 |

AI agent should suggest complementary templates based on what the user is building.
