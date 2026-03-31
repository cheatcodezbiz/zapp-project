# ZAPP DeFi Template Architectures — Yield Farm Templates

**Version:** 1.0 | **Date:** March 31, 2026

Complete contract architecture specs for 8 yield farm template types. Each spec defines the contract structure, storage layout, functions, events, security measures, and specific vulnerability fixes from original protocols. Used by the AI agent as context when generating contracts from templates.

## Base Requirements (All Templates)

- Solidity ^0.8.28, MIT license
- UUPS upgradeable via ZappBaseUpgradeable
- ERC-7201 namespaced storage
- AccessControl, ReentrancyGuard, Pausable inherited from base
- Events for all state changes, NatSpec comments
- OpenZeppelin 5.x import paths

## Global Security Standards

### Flash Loan Protection
- Use Chainlink price feeds or TWAPs — NEVER use LP pair reserves as a price oracle
- Minimum deposit duration (at least 1 block) before rewards can be claimed
- block.number checks to prevent same-block deposit+withdraw exploits

### Reentrancy Protection
- All external functions that transfer tokens use nonReentrant modifier
- Follow checks-effects-interactions pattern: validate → update state → transfer

### Access Control
- DEFAULT_ADMIN_ROLE for contract owner (upgrade, pause, emergency)
- OPERATOR_ROLE for day-to-day operations (add pools, adjust rates)
- Timelock on critical admin functions — minimum 6-hour delay
- NO migrator function. Ever. Period.

### Integer Safety
- Solidity ^0.8.28 built-in overflow/underflow checks
- SafeERC20 for all token transfers
- Accumulator values use 1e18 precision (not 1e12)

### Emergency Mechanisms
- pause() / unpause() gated by admin role
- emergencyWithdraw() available when paused — returns principal, forfeits rewards
- No function to drain user deposits under any circumstance

---

## Template 1: PancakeSwap-Style MasterChef

Standard yield farm. Users stake LP tokens in pools, earn a reward token emitted per block. Each pool has an allocation weight.

**Contracts:** RewardToken.sol, MasterChef.sol, SyrupPool.sol

**Key Security Fixes vs PancakeSwap:**
- No hidden dummy pools — use updateEmissionRate() directly
- No migrator function
- LP token duplicate check
- depositFeeBps capped at 400 (4%)
- devFeeBps capped at 1000 (10%) and transparent
- accRewardPerShare uses 1e18 precision (not 1e12)
- Emission rate has hard cap (maxRewardPerBlock)
- Automatic emission reduction schedule (optional)

---

## Template 2: GooseDefi-Style Transparent Farm

Fork of Template 1 with emphasis on transparency. No migrator, transparent emission adjustment, deposit fees as primary revenue model.

**Changes vs Template 1:**
1. Transparent emission control with event logging and timelock
2. No migrator code — explicitly removed with comment
3. Deposit fee model — 0% on native token pairs, 4% on non-native
4. Anti-duplicate LP check via nonDuplicated modifier
5. CertiK audit compatibility patterns

---

## Template 3: PantherSwap-Style Anti-Dump Farm

Yield farm with aggressive anti-dump mechanics: transfer tax, anti-whale limits, harvest lockup, auto-liquidity, and referral system.

**Contracts:** PantherToken.sol, MasterChef.sol, Referral.sol

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

**Key Mechanics:**
- Burn Energy to mint Runner at fixed ratio
- Permanent staking (no withdraw function)
- NFT tiers: Bronze (+5%), Silver (+10%), Gold (+20%), Legendary (+30%)
- Lootbox uses Chainlink VRF for verifiable randomness in production

---

## Template 5: PancakeBunny-Style Auto-Compounding Vault

Yield optimiser that auto-compounds LP farming rewards. Share-based accounting (like ERC-4626).

**Contracts:** VaultController.sol, VaultFlipToFlip.sol, VaultStake.sol, ZapHelper.sol

**CRITICAL Security Fix vs PancakeBunny:**
1. Uses Chainlink price feeds for ALL price calculations (original used LP pair reserves)
2. Minimum deposit duration of 1 block before rewards can be claimed
3. Does NOT mint bonus tokens based on performance
4. If bonus minting desired, uses TWAP oracle not spot pair reserves

---

## Template 6: JetFuel-Style Deflationary Dual-Token Ecosystem

Two-token ecosystem: Token A (FUEL) deflationary with burn-on-transfer, Token B (JET) governance earned from staking.

**Contracts:** FuelToken.sol, JetToken.sol, Hanger.sol, VaultController.sol, Launchpad.sol

**Key Mechanics:**
- 1% burn + 1% staking fund on every FUEL transfer
- Emission phases (fast start → normal)
- JET holders vote on emission rates, fees, and launchpad projects

---

## Template 7: SushiSwap-Style Revenue-Sharing DEX

DEX with xToken staking bar model. Receipt token auto-appreciates as trading fees accrue.

**Contracts:** ProtocolToken.sol, StakingBar.sol, FeeDistributor.sol

**Key Mechanic:** FeeDistributor buys protocol tokens with swap fees and sends to StakingBar. Ratio automatically adjusts — no harvesting needed.

**Security:** No flash loan risk (based on actual balances, not price feeds). Ratio can only go UP. Minimum staking duration prevents same-block enter+leave.

---

## Template 8: Uniswap V2-Style AMM DEX

Constant product AMM. Core building block for all templates needing token swapping.

**Contracts:** Factory.sol, Pair.sol, Router.sol, WETH.sol

**CRITICAL Security Fix vs Uranium Finance:**
- Single FEE_DENOMINATOR constant used in BOTH balance adjustment AND K check
- Uranium used 10000 for adjustment but 1000 for check, allowing 100x drainage
- TWAP oracle built in via cumulative price tracking
- Protocol fee extraction uses kLast comparison (SushiSwap model)

---

## Template Parameter Reference

| Parameter | Type | Default | Templates | Description |
|---|---|---|---|---|
| tokenName | string | required | All | Name of the reward/protocol token |
| tokenSymbol | string | required | All | Symbol |
| rewardPerBlock | uint256 | 40e18 | 1,2,3,4,6 | Tokens emitted per block |
| maxSupply | uint256 | 0 (unlimited) | All | Hard cap on token supply |
| depositFeeBps | uint16 | 400 | 1,2,3 | Deposit fee for non-native LP farms |
| transferTaxBps | uint16 | 500 | 3 | Transfer tax rate |
| burnRatePct | uint16 | 20 | 3,6 | % of tax that gets burned |
| antiWhaleMaxBps | uint16 | 50 | 3 | Max transfer as % of supply |
| harvestIntervalSec | uint256 | 28800 | 3 | Seconds between harvests (8 hours) |
| referralCommissionBps | uint16 | 100 | 3 | Referral commission rate |
| performanceFeeBps | uint16 | 300 | 5,6 | Vault performance fee |
| swapFeeBps | uint16 | 30 | 7,8 | DEX swap fee |
| devFeeBps | uint16 | 909 | 1,2 | Dev allocation of emissions |
| timelockDuration | uint256 | 21600 | All | Seconds for admin timelock (6 hours) |
| chain | string | "base" | All | Target EVM chain |

---

## AI Agent Implementation Notes

When a user selects a template or describes something matching one:
1. Identify closest template(s)
2. Ask clarifying questions for configurable parameters
3. Generate contracts using the architecture specs as structural guide
4. Apply all global security standards
5. Generate matching frontend
6. Suggest running a simulation
7. Suggest security audit before deployment

Explain each security feature to the user in plain English.
