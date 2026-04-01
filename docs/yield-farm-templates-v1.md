# ZAPP DeFi Template Architectures — Yield Farm Templates

**Version:** 2.0 | **Date:** April 1, 2026

Complete contract architecture specs for 8 yield farm template types. Each spec defines the contract structure, storage layout, functions, events, security measures, and specific vulnerability fixes from original protocols. Used by the AI agent as context when generating contracts from templates.

## Base Requirements (All Templates)

- Solidity ^0.8.28, MIT license
- UUPS upgradeable via ZappBaseUpgradeable
- ERC-7201 namespaced storage
- AccessControl, ReentrancyGuard, Pausable inherited from base
- Events for all state changes, NatSpec comments
- OpenZeppelin 5.x import paths

## Security Standards (ALWAYS ON)

These security features are non-negotiable regardless of economic mode. They prevent actual exploits and rug pulls.

| # | Security Feature | Detail |
|---|---|---|
| 1 | No migrator function | Prevents dev from draining all LP. No migrator code in any template, ever. |
| 2 | Anti-duplicate LP check | `nonDuplicated` modifier prevents adding the same LP token to multiple pools to game emissions. |
| 3 | SafeERC20 on all transfers | Prevents weird token transfer failures with non-standard ERC-20s. |
| 4 | nonReentrant on all state-changing functions | All external functions that transfer tokens use `nonReentrant` modifier. |
| 5 | 1-block flash loan protection | Minimum deposit duration (at least 1 block) before rewards can be claimed. `block.number` checks prevent same-block deposit+withdraw exploits. |
| 6 | 1e18 precision on accTokenPerShare | Prevents rounding loss vs original 1e12 used by PancakeSwap. |
| 7 | emergencyWithdraw ALWAYS available — NO admin gate, NO penalty fee | Users can ALWAYS get their principal back. No `emergencyWithdrawEnabled` flag. No admin can block this. Users forfeit rewards but keep principal. Period. |
| 8 | Deposit fee capped at 400 bps (4%) | Prevents honeypot fees. Matches GooseDefi standard. |
| 9 | Checks-effects-interactions pattern | Validate -> update state -> transfer. Prevents reentrancy exploits. |
| 10 | Events on all state changes | Full on-chain transparency for every deposit, withdraw, harvest, and config change. |

Additional security standards:
- **Access control**: DEFAULT_ADMIN_ROLE for contract owner (upgrade, pause, emergency). OPERATOR_ROLE for day-to-day operations (add pools, adjust rates).
- **Pausable**: `pause()` / `unpause()` gated by admin role. Emergency deposits/harvests can be stopped.
- **No drain function**: No function to drain user deposits under any circumstance.
- **Oracle safety**: Use Chainlink price feeds or TWAPs — NEVER use LP pair reserves as a price oracle.
- **Integer safety**: Solidity ^0.8.28 built-in overflow/underflow checks.

---

## Economic Defaults (Degen Mode — DEFAULT)

These are the default economic parameters for templates 1-8. Degen Mode is the DEFAULT for all yield farm templates. The AI agent should NEVER default to conservative/sustainable economics unless the user explicitly requests it.

```
rewardPerBlock:         40e18        // 40 tokens per block
maxSupply:              0            // Unlimited — MasterChef mints freely
devFeeBps:              909          // 9.09% to dev (1/11 of emissions, PancakeSwap standard)
depositFeeNative:       0            // 0% on native token pairs
depositFeeNonNative:    400          // 4% on non-native pairs
harvestInterval:        0            // No harvest lockup (EXCEPTION: Template 3 keeps 4hr as its differentiator)
emissionReduction:      NONE         // No auto-reduction schedule
maxRewardPerBlock:      unlimited    // No hard cap on emissions
timelockOnEmissions:    false        // Operator adjusts freely (EXCEPTION: Template 2 GooseDefi keeps 6hr timelock as its differentiator)
circuitBreaker:         false        // No circuit breaker
treasuryBacked:         false        // MasterChef MINTS tokens — that's the model
```

**Pool allocation defaults:**
```
Pool 0: REWARD-BNB LP      allocPoint: 4000  (40% of emissions — the main pool, gets 4x weight)
Pool 1: REWARD-BUSD LP      allocPoint: 2000  (20%)
Pool 2: BNB-BUSD LP         allocPoint: 1000  (10%)
Pool 3: REWARD single stake allocPoint: 1000  (10%, the syrup pool equivalent)
```

Pool 0 gets 4x allocation. This concentrates rewards on the main LP pair, producing high APY numbers that attract liquidity. Early farmers in Pool 0 with $1,000 might see 50,000%+ APY. That number IS the marketing.

---

## Template 1: PancakeSwap-Style MasterChef

Standard yield farm. Users stake LP tokens in pools, earn a reward token emitted per block. Each pool has an allocation weight.

**Contracts:** RewardToken.sol, MasterChef.sol, SyrupPool.sol

**Defaults:**
```
rewardPerBlock:         40e18
startBlock:             current      // Start immediately
totalAllocPoint:        1000
devFeeBps:              909          // 9.09% to dev
maxSupply:              0            // Unlimited
depositFeeNative:       0
depositFeeNonNative:    400          // 4%
timelockDelay:          0            // No timelock on emission changes
emissionReduction:      NONE
```

**Key Security Fixes vs PancakeSwap:**
- No hidden dummy pools — use updateEmissionRate() directly
- No migrator function
- LP token duplicate check
- depositFeeBps capped at 400 (4%)
- devFeeBps capped at 1000 (10%) and transparent
- accRewardPerShare uses 1e18 precision (not 1e12)

**Frontend guidance:**
- APY displayed in large text with green color
- Pool 0 highlighted as "FEATURED" or "HOT"
- Countdown to start block if farm hasn't started yet
- TVL prominently displayed

---

## Template 2: GooseDefi-Style Transparent Farm

Fork of Template 1 with emphasis on transparency. No migrator, transparent emission adjustment, deposit fees as primary revenue model.

**Defaults (overrides from Template 1):**
```
depositFeeNative:       0
depositFeeNonNative:    400          // 4% — THIS IS THE REVENUE MODEL
feeUse:                 "buyback"    // Fees buy back and burn reward token
timelockOnEmissions:    true         // GooseDefi's differentiator: emission changes ARE timelocked
timelockDelay:          21600        // 6 hours (GooseDefi standard)
```

**Changes vs Template 1:**
1. Transparent emission control with event logging and timelock (the timelock IS GooseDefi's identity)
2. No migrator code — explicitly removed with comment
3. Deposit fee model — 0% on native token pairs, 4% on non-native
4. Anti-duplicate LP check via nonDuplicated modifier
5. CertiK audit compatibility patterns

The GooseDefi innovation was transparency + deposit fees as revenue. The farm MINTS tokens aggressively but the 4% deposit fee on non-native pairs creates constant buy pressure via buyback-and-burn. The economics are degen but there's a built-in deflationary mechanic.

---

## Template 3: PantherSwap-Style Anti-Dump Farm

Yield farm with aggressive anti-dump mechanics: transfer tax, anti-whale limits, harvest lockup, auto-liquidity, and referral system.

**Contracts:** PantherToken.sol, MasterChef.sol, Referral.sol

**Defaults (overrides from global):**
```
transferTaxRate:        500          // 5% tax on every transfer
burnRate:               20           // 20% of tax burned (1% of transfer)
autoLiquidityRate:      80           // 80% of tax to auto-liquidity
antiWhaleMaxBps:        50           // Max 0.5% of supply per transfer
harvestInterval:        14400        // 4 hours between harvests (PantherSwap standard — this IS the template's identity)
referralCommission:     100          // 1% referral commission
```

PantherSwap IS the harvest lockup template. The 4-hour lockup is its identity, but it's 4 hours, not 24 — degens tolerate 4 hours. The anti-whale (0.5% max transfer) protects other degens from whales dumping.

**Key Security Fixes vs PantherSwap:**
- transferTaxRate has MAXIMUM_TRANSFER_TAX_RATE constant (10%)
- maxTransferAmountRate minimum of 50 (0.5%) — can't freeze transfers
- inSwapAndLiquify flag prevents reentrancy during swap operations
- Excluded addresses list prevents contract/pair/router from being whale-blocked
- Operator role separate from admin

---

## Template 4: BSC Runner-Style Gamified Farm

Dual-token gamified yield farm with permanent staking, NFT yield boosters, and lootbox mechanics.

**Contracts:** EnergyToken.sol, RunnerToken.sol, MasterChef.sol, RunnerStaking.sol, RunnerNFT.sol (ERC-1155), Lootbox.sol

**Defaults:**
```
energyPerBlock:         80e18        // Aggressive energy emission
conversionRate:         10           // 10 Energy = 1 Runner
permanentStaking:       true         // Runner staking is permanent — no withdraw
nftBoostMax:            30000        // 300% max boost with legendary NFT
lootboxCostRunner:      1000e18      // 1000 Runner per lootbox
```

**Key Mechanics:**
- Burn Energy to mint Runner at fixed ratio
- Permanent staking (no withdraw function) — this IS the mechanic
- NFT tiers: Bronze (+5%), Silver (+10%), Gold (+20%), Legendary (+30%)
- Lootbox uses Chainlink VRF for verifiable randomness in production
- Frontend should show "Total Runner Permanently Staked" prominently

---

## Template 5: PancakeBunny-Style Auto-Compounding Vault

Yield optimiser that auto-compounds LP farming rewards. Share-based accounting (like ERC-4626).

**Contracts:** VaultController.sol, VaultFlipToFlip.sol, VaultStake.sol, ZapHelper.sol

**Defaults:**
```
performanceFeeBps:      300          // 3% performance fee (authentic Bunny rate)
withdrawalFeeBps:       10           // 0.1% early withdrawal fee
withdrawalFeeFreePeriod: 259200     // 72 hours (3 days)
minCompoundInterval:    3600         // Compound every hour minimum
```

**CRITICAL Security Fix vs PancakeBunny (NON-NEGOTIABLE even in Degen Mode):**
1. Uses Chainlink price feeds for ALL price calculations (original used LP pair reserves — the specific exploit that caused the $45M hack)
2. Minimum deposit duration of 1 block before rewards can be claimed
3. Does NOT mint bonus tokens based on performance
4. If bonus minting desired, uses TWAP oracle not spot pair reserves

---

## Template 6: JetFuel-Style Deflationary Dual-Token Ecosystem

Two-token ecosystem: Token A (FUEL) deflationary with burn-on-transfer, Token B (JET) governance earned from staking.

**Contracts:** FuelToken.sol, JetToken.sol, Hanger.sol, VaultController.sol, Launchpad.sol

**Defaults:**
```
fuelBurnRate:           100          // 1% burn on every FUEL transfer
fuelHangerRate:         100          // 1% to staking pool on every transfer
phase0EmissionRate:     50e18        // Accelerated "fast start" emission
phase0Duration:         864000       // ~4 weeks of fast start (864,000 blocks at 3s)
phase1EmissionRate:     10e18        // Normal rate after fast start
```

**Key Mechanics:**
- 1% burn + 1% staking fund on every FUEL transfer
- Dual-phase emission: "fast start" with 5x normal emissions for the first month rewards early adopters
- JET holders vote on emission rates, fees, and launchpad projects

---

## Template 7: SushiSwap-Style Revenue-Sharing DEX

DEX with xToken staking bar model. Receipt token auto-appreciates as trading fees accrue.

**Contracts:** ProtocolToken.sol, StakingBar.sol, FeeDistributor.sol

**Defaults:**
```
swapFeeBps:             25           // 0.25% swap fee (SushiSwap standard)
xTokenFeeShare:         5            // 0.05% of swaps go to xToken holders (1/5 of fee)
```

**Key Mechanic:** FeeDistributor buys protocol tokens with swap fees and sends to StakingBar. Ratio automatically adjusts — no harvesting needed.

**Security:** No flash loan risk (based on actual balances, not price feeds). Ratio can only go UP. Minimum staking duration prevents same-block enter+leave.

**Degen element:** The vampire attack migration mechanic. The template includes an optional incentive `Migrator.sol` that offers REWARD tokens to LP providers who migrate their liquidity from a competitor's DEX. This migrator INCENTIVISES migration (users voluntarily deposit old LP, receive rewards, get new LP) — it does NOT forcibly move LP. This is the ONE template where a migration function is appropriate.

---

## Template 8: Uniswap V2-Style AMM DEX

Constant product AMM. Core building block for all templates needing token swapping.

**Contracts:** Factory.sol, Pair.sol, Router.sol, WETH.sol

**Defaults:**
```
swapFeeBps:             30           // 0.3% (Uniswap standard)
protocolFeeBps:         5            // 0.05% to protocol (SushiSwap model)
lpFeeShare:             25           // 0.25% to LPs
```

**CRITICAL Security Fix vs Uranium Finance:**
- Single FEE_DENOMINATOR constant used in BOTH balance adjustment AND K check
- Uranium used 10000 for adjustment but 1000 for check, allowing 100x drainage
- TWAP oracle built in via cumulative price tracking
- Protocol fee extraction uses kLast comparison (SushiSwap model)

The DEX itself is infrastructure. The degen deployment is launching it with massive farming incentives on the first LP pairs. The AI should suggest pairing this template with Template 1 (MasterChef) to incentivise early liquidity.

---

## Template Parameter Reference

| Parameter | Degen Default | Grandpa Default | Templates | Description |
|---|---|---|---|---|
| rewardPerBlock | 40e18 | 10e18 | 1,2,3,4,6 | Tokens emitted per block |
| maxSupply | 0 (unlimited) | calculated | 1,2,3,4,6 | Hard cap on token supply |
| devFeeBps | 909 (9.09%) | 500 (5%) | 1,2 | Dev allocation of emissions |
| depositFeeNative | 0 | 0 | 1,2,3 | Deposit fee on native pairs |
| depositFeeNonNative | 400 (4%) | 200 (2%) | 1,2,3 | Deposit fee on non-native pairs |
| harvestInterval | 0 (none) | 28800 (8hr) | 1,2,3 | Seconds between harvests |
| emissionReduction | false | true | 1,2,3,4,6 | Auto emission reduction schedule |
| maxRewardPerBlock | unlimited | 2x initial | 1,2,3,4,6 | Hard cap on emission rate |
| circuitBreaker | false | true | All | Price-triggered reward reduction |
| treasuryBacked | false (mint) | true (pre-fund) | All | Reward source: mint vs treasury |
| timelockOnEmissions | false | true (6hr) | 1,3,4,5,6 | Timelock on emission changes |
| transferTaxRate | 500 (5%) | 300 (3%) | 3 | Transfer tax rate |
| antiWhaleMaxBps | 50 (0.5%) | 100 (1%) | 3 | Max transfer as % of supply |
| performanceFeeBps | 300 (3%) | 200 (2%) | 5 | Vault performance fee |
| swapFeeBps | 25-30 | 25-30 | 7,8 | DEX swap fee |
| chain | "base" | "base" | All | Target EVM chain |

Note: Template 2 (GooseDefi) ALWAYS has `timelockOnEmissions: true` with 6hr delay — it's the template's identity, not an economic mode choice.

---

## Grandpa Mode (OPT-IN)

Only activated when the user explicitly says "sustainable", "long-term", "real yield", or "institutional". The AI should NEVER default to Grandpa Mode. If the user asks for a "yield farm" without qualification, it's Degen Mode.

When the user explicitly requests sustainable/long-term economics, apply these overrides on top of the base template:

```
emissionReduction:      true
emissionReductionRate:  500          // 5% reduction per period
emissionReductionPeriod: 864000     // Every ~30 days (at 3s blocks)

maxRewardPerBlock:      INITIAL * 2  // Hard cap at 2x starting rate

harvestLockup:          true
harvestInterval:        28800        // 8 hours between harvests

circuitBreaker:         true
circuitBreakerThreshold: // 50% of launch price

treasuryBacked:         true         // Rewards come from pre-funded treasury
// MasterChef does NOT have minter role
// Instead, tokens are pre-deposited into the contract

timelockOnEmissions:    true
timelockDelay:          21600        // 6 hours minimum delay on emission changes
```

**Only mention Grandpa Mode if the user explicitly asks about sustainability:**
> "If you want this farm to run for months instead of weeks, I can switch to Grandpa Mode — treasury-backed rewards, emission reduction schedule, and harvest lockups. This gives you 15-30% APY instead of 50,000%, but the APY holds steady. Want me to switch?"

---

## AI Agent Implementation Notes

When a user selects a template or describes something matching one:
1. Identify closest template(s)
2. Ask clarifying questions for configurable parameters
3. Generate contracts using the architecture specs as structural guide
4. Apply all security standards (always on)
5. Use Degen Mode defaults unless user explicitly requests sustainability
6. Generate matching frontend
7. Suggest running a simulation
8. Suggest security audit before deployment
