# ZAPP TEMPLATE ECONOMICS — DEGEN MODE vs GRANDPA MODE
## Addendum to Template Specs 05, 06 (Templates 1-8, 14)

**Version:** 2.0
**Date:** April 1, 2026
**Purpose:** This document OVERRIDES the economic defaults in `05-defi-template-architectures.md` and `06-defi-template-architectures-advanced.md` for templates 1-8 and 14. The original specs were written with a sustainability bias that strips the soul out of what made these protocols attractive. This addendum restores the authentic degen economics as the DEFAULT while keeping only the security fixes that prevent actual exploits.

**The Core Philosophy:**
> People don't join GooseDefi forks for 15% APY. They join because Pool 1 shows 89,000% APY on day one. That's not a bug — that's the product. The farm's job is to attract fast liquidity, create volume, and give degens a playground. "Safe and sustainable" is a death sentence for a degen farm. The contract itself should be safe (no exploits, no rugs, no migrator). The ECONOMICS should be insane.

---

## DEGEN MODE vs GRANDPA MODE

Every template 1-8 and 14 now has two economic modes. **Degen Mode is the DEFAULT.** Grandpa Mode is opt-in.

### When the AI Agent Should Suggest Each Mode

**Degen Mode (default):** The user says any of these:
- "Build me a yield farm"
- "GooseDefi fork"
- "PancakeSwap fork"  
- "Degen farm"
- "High APY farm"
- "Launch a farm"
- Anything that doesn't explicitly mention sustainability or long-term

**Grandpa Mode (opt-in):** The user explicitly says:
- "I want sustainable yields"
- "Long-term farm"
- "Low emission"
- "Treasury-backed rewards"
- "Institutional"
- "Real yield"

The AI should NEVER default to Grandpa Mode. If the user asks for a "yield farm" without qualification, it's Degen Mode.

---

## WHAT STAYS FROM THE ORIGINAL SPEC (Non-Negotiable Security)

These security features are ALWAYS ON regardless of mode. They prevent actual exploits and rug pulls — not economic outcomes:

| Security Feature | Why It Stays | Applies To |
|---|---|---|
| No migrator function | Prevents dev from draining all LP | All |
| Anti-duplicate LP check | Prevents adding same LP twice to game emissions | All |
| SafeERC20 on all transfers | Prevents weird token transfer failures | All |
| Checks-effects-interactions | Prevents reentrancy exploits | All |
| `nonReentrant` on all external state-changing functions | Prevents reentrancy | All |
| Flash loan protection (1-block deposit minimum) | Prevents same-block deposit+harvest | All |
| `1e18` precision on accTokenPerShare | Prevents rounding loss vs original `1e12` | All |
| Deposit fee capped at 400 bps (4%) | Prevents honeypot fees, matches GooseDefi standard | 1-6 |
| emergencyWithdraw ALWAYS available (not admin-gated) | Users can always get principal back | All |
| Pausable for emergency situations | Admin can stop new deposits/harvests in crisis | All |
| Events on all state changes | Full on-chain transparency | All |
| No function to drain user deposits | Fundamental trust | All |

### Fix Needed on DuckFarm Contract

The current `emergencyWithdraw` function requires `$.emergencyWithdrawEnabled` to be true. **This is wrong.** Emergency withdraw must ALWAYS work. Change:

```solidity
// WRONG (current DuckFarm):
function emergencyWithdraw(uint256 _pid) external nonReentrant {
    if (!$.emergencyWithdrawEnabled) revert EmergencyActive(); // <-- THIS LOCKS USER FUNDS
    // ...
}

// CORRECT:
function emergencyWithdraw(uint256 _pid) external nonReentrant {
    // No admin gate. Users can ALWAYS emergency withdraw.
    // They forfeit rewards but get their principal back. Period.
    // ...
}
```

---

## WHAT CHANGES IN DEGEN MODE (Removed/Relaxed Restrictions)

These were in the original spec as "safety" but they actually kill the farm:

| Removed Restriction | Why It's Removed | Original Spec Said |
|---|---|---|
| ~~Hard cap on emission rate (maxRewardPerBlock)~~ | Degens want 40-100 tokens/block. A cap kills the APY display. | "Emission rate has hard cap" |
| ~~Automatic emission reduction schedule~~ | Nobody launches a goose fork planning for month 6. The farm lives or dies in 72 hours. | "Automatic emission reduction schedule (optional)" |
| ~~Timelocked emission changes (6 hour minimum)~~ | Operator needs to adjust emissions in real-time to respond to market. Keep timelock for admin-level functions (upgrade, pause) only. | "Minimum 6-hour delay on emission changes" |
| ~~Dynamic reward scaling based on token price~~ | This is a Grandpa feature. Degens don't want the farm reducing rewards when price drops — they want MORE rewards to attract more liquidity. | "Dynamic reward scaling based on oracle price" |
| ~~Treasury-backed rewards (no minting)~~ | MasterChef MINTS tokens. That's the model. The reward token has a minter role and MasterChef uses it. Pre-funding a treasury is Grandpa Mode. | "Never mint new tokens as rewards" |
| ~~Circuit breaker~~ | If the token goes to $0.001, degens are still farming. A circuit breaker that pauses rewards sends everyone to the next fork instantly. | "Circuit breaker reduces rewards when price drops" |
| ~~Harvest lockup (default)~~ | Lockups are a Grandpa feature. Degens want to harvest and sell every 30 minutes. PantherSwap (Template 3) can have it as its differentiator since that's what made PantherSwap different. | "2-8 hour harvest intervals" |

---

## DEGEN MODE DEFAULTS BY TEMPLATE

### Template 1: PancakeSwap MasterChef (Degen Edition)

```
rewardPerBlock:         40e18        // 40 tokens per block (authentic PancakeSwap launch rate)
startBlock:             current      // Start immediately — no delay
totalAllocPoint:        1000         // Starting allocation
devFeeBps:              909          // 9.09% to dev (1/11 of emissions, PancakeSwap standard)
maxSupply:              0            // Unlimited — MasterChef mints freely
depositFeeBps:          0            // 0% on native pairs
depositFeeNonNative:    400          // 4% on non-native pairs
timelockDelay:          0            // No timelock on emission changes (operator can adjust freely)
emissionReduction:      NONE         // No auto-reduction. Operator adjusts manually if they want.
```

**Pool allocation defaults (the authentic PancakeSwap structure):**
```
Pool 0: REWARD-BNB LP      allocPoint: 4000  (40% of emissions, the main pool)
Pool 1: REWARD-BUSD LP      allocPoint: 2000  (20%)
Pool 2: BNB-BUSD LP         allocPoint: 1000  (10%)  
Pool 3: REWARD single stake allocPoint: 1000  (10%, the syrup pool equivalent)
```

The first pool gets 4x weight. This is intentional — it concentrates rewards on the main LP pair, giving it absurd APY numbers that attract liquidity. Early farmers in Pool 0 with $1,000 might see 50,000%+ APY. That number IS the marketing.

**What the AI should generate for the frontend:**
- APY displayed in HUGE text with green color
- Pool 0 highlighted as "FEATURED" or "HOT"
- Countdown to start block if farm hasn't started yet
- TVL prominently displayed (creates FOMO as it grows)

### Template 2: GooseDefi Transparent Farm (Degen Edition)

Same as Template 1 but with these specific GooseDefi traits:
```
depositFeeNative:       0            // 0% on REWARD-BNB
depositFeeNonNative:    400          // 4% on everything else — THIS IS THE REVENUE MODEL
feeUse:                 "buyback"    // Fees used to buy back and burn reward token (transparent)
timelockOnEmissions:    true         // GooseDefi's differentiator: emission changes are timelocked
timelockDelay:          21600        // 6 hours (GooseDefi standard)
```

The GooseDefi innovation was transparency + deposit fees as revenue. The farm MINTS tokens aggressively but the 4% deposit fee on non-native pairs creates constant buy pressure via buyback-and-burn. The economics are degen but there's a built-in deflationary mechanic.

### Template 3: PantherSwap Anti-Dump (Degen Edition)

```
transferTaxRate:        500          // 5% tax on every transfer
burnRate:               20           // 20% of tax burned (1% of transfer)
autoLiquidityRate:      80           // 80% of tax to auto-liquidity
antiWhaleMaxBps:        50           // Max 0.5% of supply per transfer
harvestInterval:        14400        // 4 hours between harvests (PantherSwap standard)
referralCommission:     100          // 1% referral commission
```

PantherSwap IS the harvest lockup template. The 4-hour lockup is its identity. But it's 4 hours, not 24 — degens tolerate 4 hours. They DON'T tolerate 24.

The anti-whale (0.5% max transfer) is what made PantherSwap work — it prevents one whale from crashing the price in a single dump. This is degen-compatible because it protects the other degens from whales.

### Template 4: BSC Runner Gamified (Degen Edition)

```
energyPerBlock:         80e18        // Aggressive energy emission
conversionRate:         10           // 10 Energy = 1 Runner
permanentStaking:       true         // Runner staking is permanent — no withdraw. This IS the mechanic.
nftBoostMax:            30000        // 300% max boost with legendary NFT
lootboxCostRunner:      1000e18      // 1000 Runner per lootbox
```

The permanent staking is what made BSC Runner unique. You burn Energy to get Runner, stake Runner permanently for yield boost. It's a one-way door. Degens love it because the permanently staked Runner creates visible "commitment" metrics. The frontend should show "Total Runner Permanently Staked: 2,847,291" prominently.

### Template 5: PancakeBunny Auto-Compounder (Degen Edition)

```
performanceFeeBps:      300          // 3% performance fee (authentic Bunny rate)
withdrawalFeeBps:       10           // 0.1% early withdrawal fee
withdrawalFeeFreePeriod: 259200      // 72 hours (3 days)
minCompoundInterval:    3600         // Compound every hour minimum
```

**THE CRITICAL FIX (non-negotiable even in Degen Mode):**
The PancakeBunny oracle fix STAYS. Use Chainlink price feeds, NOT LP pair reserves. This is the specific exploit that caused the $45M hack. This isn't economic conservatism — this is preventing an actual attack vector.

Everything else stays authentic to the original Bunny experience: 3% performance fee, frequent compounding, minimal withdrawal fee.

### Template 6: JetFuel Deflationary (Degen Edition)

```
fuelBurnRate:           100          // 1% burn on every FUEL transfer
fuelHangerRate:         100          // 1% to staking pool on every transfer
phase0EmissionRate:     50e18        // Accelerated "fast start" emission
phase0Duration:         864000       // ~4 weeks of fast start (864,000 blocks at 3s)
phase1EmissionRate:     10e18        // Normal rate after fast start
```

JetFuel's dual-phase emission is its identity. The "fast start" with 5x normal emissions for the first month IS the degen mechanic. It rewards early adopters massively. Keep it.

### Template 7: SushiSwap Revenue-Sharing (Degen Edition)

```
swapFeeBps:             25           // 0.25% swap fee (SushiSwap standard)
xTokenFeeShare:         5            // 0.05% of swaps go to xToken holders (1/5 of fee)
// No emission involved — xToken model is naturally sustainable
// The degen element is the VAMPIRE ATTACK migration mechanic
```

SushiSwap's degen factor isn't emissions — it's the vampire attack. The migration contract that incentivises users to move LP from a competitor's DEX to yours. The template should include the optional `Migrator.sol` that offers REWARD tokens to LP providers who migrate their liquidity. This is different from a malicious migrator (which drains LP) — this is an incentive migrator (which rewards LP migration).

**IMPORTANT: This is the ONE template where a migration function is appropriate.** But it must be clearly documented that this migrator INCENTIVISES migration, it does NOT forcibly move LP. The user deposits their old LP, receives reward tokens, and gets new LP on the new DEX.

### Template 8: Uniswap V2 AMM DEX (Degen Edition)

```
swapFeeBps:             30           // 0.3% (Uniswap standard)
protocolFeeBps:         5            // 0.05% to protocol (SushiSwap model)
lpFeeShare:             25           // 0.25% to LPs
```

The DEX itself isn't really "degen" — it's infrastructure. But the degen deployment is launching it with massive farming incentives on the first LP pairs. The AI should suggest pairing this template with Template 1 (MasterChef) to incentivise early liquidity.

### Template 14: OlympusDAO Bonding + POL (Degen Edition)

This one needs the BIGGEST change from the original spec. The original spec had:
- Per-epoch mint limits
- Treasury backing enforcement ($1 floor)
- 5% max bond discount
- Conservative rebase rate (0.3% per epoch)

That's not OlympusDAO. That's a treasury bill. Here's the authentic OHM experience:

```
// Staking — THE degen metric. OHM launched with ~80,000% APY staking.
rewardRateBps:          700          // 7% per epoch (not 0.3%)
epochDuration:          28800        // 8 hours (3 epochs per day)
// At 7% per epoch, 3 epochs/day = ~21% daily compound = insane APY display
// The frontend should calculate and show the "APY" number: (1.07)^(365*3) - 1 = absurd number
// This is the (3,3) mechanic. The number looks insane because it IS insane.

warmupEpochs:           0            // NO warmup. Instant staking. Degens hate waiting.

// Bonding — discounts must be attractive
maxDiscountBps:         1500         // 15% max bond discount (not 5%)
vestingDuration:        432000       // 5 days vesting (OHM standard)
// 15% discount with 5-day vesting means bonds are actually attractive
// At 5% discount nobody buys bonds — they just stake

// Treasury
backingPerToken:        1e18         // $1 backing per OHM (the "risk-free value")
// BUT: do NOT enforce this as a minting cap in degen mode
// The treasury TRACKS backing but doesn't PREVENT minting above it
// The market price trades at a premium to backing when demand is high
// That premium is the whole point — it's what creates the flywheel

// Minting
maxMintPerEpoch:        0            // UNLIMITED in degen mode
// The original spec capped this. In degen mode, the protocol mints
// whatever is needed for staking rebases and bond payouts.
// The constraint is the bonding math, not an artificial cap.
```

**What the AI should generate for the OHM fork frontend:**
- MASSIVE APY number displayed center-screen
- (3,3) explanation tooltip: "Stake -> Earn compound rewards every 8 hours"
- Dashboard showing: Price, Market Cap, TVL, Treasury Balance, Backing per Token
- Bond page showing available bonds with discount percentages
- Staking page with current index (how much 1 sOHM is worth in OHM over time)
- "Runway" metric: how many days the treasury can sustain current rebase rate

**THE ONE NON-NEGOTIABLE FIX for OHM:**
Bond pricing MUST use Chainlink oracle, not internal pair reserves. This prevents flash loan manipulation of bond prices. Everything else stays authentic OHM.

---

## GRANDPA MODE OVERRIDES (Opt-In Only)

When the user explicitly requests sustainable/long-term economics, apply these overrides on top of the base template:

```
// Grandpa Mode additions (applied on top of any template 1-8, 14)

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

warmupPeriod:           2            // 2 epochs before staking rewards accrue (Template 14)

maxMintPerEpoch:        calculated   // Based on treasury runway (Template 14)

// For Template 14 (OHM) Grandpa Mode:
rewardRateBps:          30           // 0.3% per epoch (real yield territory)
maxDiscountBps:         500          // 5% bond discount
backingEnforced:        true         // Cannot mint below $1 backing
```

---

## HOW THE AI SHOULD PRESENT THE CHOICE

When a user asks for a yield farm, the AI should NOT lecture them about sustainability. Instead:

**Good (Degen Mode by default):**
> "I've set up your farm with 40 tokens per block emission and 4x allocation on the main pool. Your DUCK-BNB pool will show approximately 52,000% APY at launch with $10K TVL. The 4% deposit fee on non-native pairs is your revenue stream. Want me to adjust the emission rate or add more pools?"

**Bad (don't do this):**
> "I've configured conservative emissions with a circuit breaker and treasury-backed rewards to ensure long-term sustainability. The APY starts at 15% and..."

If the user asks "what's the APY going to be?", calculate it honestly and show the number. Don't add warnings about it being "unsustainable." They know. Everyone who's ever launched a goose fork knows the APY drops as TVL grows. That's not a bug — it's the core mechanic of yield farming.

**Only mention Grandpa Mode if the user explicitly asks about sustainability:**
> "If you want this farm to run for months instead of weeks, I can switch to Grandpa Mode — treasury-backed rewards, emission reduction schedule, and harvest lockups. This gives you 15-30% APY instead of 50,000%, but the APY holds steady. Want me to switch?"

---

## PARAMETER REFERENCE UPDATE

| Parameter | Degen Default | Grandpa Default | Templates |
|---|---|---|---|
| rewardPerBlock | 40e18 | 10e18 | 1,2,3,4,6 |
| maxSupply | 0 (unlimited) | calculated | 1,2,3,4,6 |
| devFeeBps | 909 (9.09%) | 500 (5%) | 1,2 |
| depositFeeNative | 0 | 0 | 1,2,3 |
| depositFeeNonNative | 400 (4%) | 200 (2%) | 1,2,3 |
| harvestInterval | 0 (none) | 28800 (8hr) | 1,2,3 |
| emissionReduction | false | true | 1,2,3,4,6 |
| maxRewardPerBlock | unlimited | 2x initial | 1,2,3,4,6 |
| circuitBreaker | false | true | All |
| treasuryBacked | false (mint) | true (pre-fund) | All |
| timelockOnEmissions | false | true (6hr) | 1,2,3,4,6 |
| transferTaxRate | 500 (5%) | 300 (3%) | 3 |
| antiWhaleMaxBps | 50 (0.5%) | 100 (1%) | 3 |
| performanceFeeBps | 300 (3%) | 200 (2%) | 5 |
| warmupEpochs | 0 | 2 | 14 |
| rewardRateBps (rebase) | 700 (7%/epoch) | 30 (0.3%/epoch) | 14 |
| maxDiscountBps (bonds) | 1500 (15%) | 500 (5%) | 14 |
| maxMintPerEpoch | 0 (unlimited) | calculated | 14 |
| vestingDuration (bonds) | 432000 (5 days) | 432000 (5 days) | 14 |

---

## THE DEGEN FARM REVENUE MODEL (For the Deployer)

The deployer (Zapp user) makes money from a degen farm through:

1. **Dev emission share (9.09%)** — MasterChef mints extra tokens for the dev address. At 40 tokens/block with 9.09% dev share, that's ~3.6 tokens/block to the deployer. If the token is $0.10, that's $0.36/block x ~28,800 blocks/day = ~$10,368/day in the first few days when price is highest.

2. **Deposit fees (4% on non-native)** — Every time someone deposits into a non-native pool, 4% goes to the fee recipient. If $100K flows through non-native pools on day 1, that's $4,000 immediately.

3. **Token allocation** — The deployer typically holds a chunk of the pre-minted supply (or mints it via the dev share). If they hold 10% of supply and the market cap hits $1M in the first week, that's $100K in paper value.

The math works because the farm's lifespan in degen mode is measured in days to weeks. The deployer extracts value through fees and emissions during the high-activity period. Once TVL and price decline, the farm naturally winds down. This is understood by all participants.

**The Zapp advantage:** Unlike a random fork deployed by a Telegram dev, Zapp-generated contracts have no migrator, no backdoor, and no way for the deployer to steal LP. The deployer profits through LEGITIMATE mechanisms (dev share + deposit fees), not through rug pulls. That's the trust layer.

---

*End of Degen Mode Economics Spec*
*Version 2.0 — April 1, 2026*
