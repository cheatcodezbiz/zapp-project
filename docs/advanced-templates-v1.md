# ZAPP DeFi Template Architectures — Part 2 (Advanced)

**Version:** 1.0 | **Date:** April 1, 2026

Continuation of yield-farm-templates-v1.md. Covers templates 9-14 — Ethereum-origin protocols with more complex mechanics. Each includes "Zapp Safe Edition" modifications fixing known vulnerabilities.

**Prerequisites:** All global security standards from Part 1 apply. Additional standards for advanced templates below.

## Additional Security Standards (Advanced Templates)

- **Oracle manipulation protection:** All price-dependent calculations use Chainlink feeds with staleness checks (revert if data older than 1 hour)
- **Governance attack protection:** Vote-locking minimum 7 days, vote weight snapshots at proposal creation (not vote time)
- **Sandwich attack protection:** All swaps route through slippage-protected router with deadline parameters
- **Donation attack protection:** Share-based vaults use virtual offset (ERC-4626 inflation attack mitigation) — initialise with dead share deposit

---

## Template 9: Curve-Style StableSwap AMM (Safe Edition)

AMM optimised for same-value assets (stablecoins, wrapped assets). Uses StableSwap invariant — 100-1000x less slippage than Uniswap for pegged pairs.

**Contracts:** StableSwapFactory.sol, StableSwapPool.sol, GaugeController.sol, VotingEscrow.sol, Minter.sol, FeeDistributor.sol

**Key Math:** Blends constant-sum (x+y=D) and constant-product (xy=k) via amplification coefficient A (sweet spot 100-2000 for stables). Solved iteratively via Newton's method.

**Security Fixes vs Curve:**
- Deadline parameter on all swaps (sandwich protection)
- A ramp limited to 10x change, minimum 1-day duration (prevents governance drain)
- lastBlockNumber check prevents same-block add_liquidity + exchange manipulation
- Kill switch only disables deposits/swaps — withdrawals always work
- Admin fee as pool surplus, not separate minting
- All precision normalised to 18 decimals internally (prevents rounding exploits on 6-decimal tokens)

**veToken Model:** Linear decay vote power (locked_amount * time_remaining / max_lock). Min 7-day lock, max 4 years. Non-transferable. Snapshots at proposal creation block.

**GaugeController:** 10-day vote cooldown, weight changes apply with 1-week delay, total vote power capped at 10000 bps.

---

## Template 10: Convex-Style Boost Aggregator (Safe Edition)

Pools governance tokens from many users to provide maximum yield boost from underlying farm. Small depositors get same boost as whales.

**Contracts:** Booster.sol, BaseRewardPool.sol, WrappedGovernanceToken.sol, ProtocolToken.sol, StakingRewards.sol

**Fee Structure (default 17% of rewards):** 4.5% to protocol token stakers, 10% to wrapped governance stakers, 2% treasury, 0.5% harvest caller incentive.

**Security Fixes vs Convex:**
- Fee structure immutable after deployment
- isShutdown is one-way (can't be unset), only stops deposits
- earmarkRewards() permissionless (caller incentive ensures it's called)
- Booster logic is non-upgradeable (frozen)
- Wrapped governance token intentionally has no unwrap (transparent, documented)
- 7-day reward distribution period prevents reward sniping

---

## Template 11: Yearn-Style Multi-Strategy Vault (Safe Edition)

ERC-4626 vault deploying capital across multiple yield strategies simultaneously. Auto-compounds returns.

**Contracts:** Vault.sol, BaseStrategy.sol, StrategyLending.sol, StrategyLP.sol, StrategyStaking.sol, VaultFactory.sol

**Key Mechanics:**
- Share-based accounting with virtual offsets (inflation attack protection)
- Locked profit mechanism (linear release over 6 hours, anti-sandwich)
- Strategy reporting with gain/loss/debt rebalancing
- Performance fee via share minting (dilution), not asset extraction
- maxDebtPerHarvest rate-limits capital flow per harvest cycle
- Guardian role can revoke strategies in emergency

**VaultFactory:** Permissionless deployment via CREATE2 clones. Caps: max 5% management fee, max 50% performance fee.

---

## Template 12: Pendle-Style Yield Tokenisation (Safe Edition)

Splits yield-bearing assets into Principal Tokens (PT, fixed-rate) and Yield Tokens (YT, leveraged yield speculation). Custom AMM with time-decay pricing.

**Contracts:** StandardisedYield.sol (SY, EIP-5115), PrincipalToken.sol (PT), YieldToken.sol (YT), YieldTokenFactory.sol, PendleMarket.sol, MarketFactory.sol

**Key Mechanics:**
- SY wraps any yield-bearing token (stETH, rETH, etc.) into standard interface
- mintPY splits SY into equal PT + YT
- PT redeemable at par at maturity, YT collects all yield until maturity
- AMM uses logistic curve with time decay — PT price converges to par at expiry
- Built-in TWAP oracle via observation array

**Security Fixes vs Pendle:**
- maxRateIncrease on SY caps exchange rate growth per update
- Deadline on all swaps
- Market auto-disables swaps at expiry
- Factory enforces minimum 30-day market duration
- LP withdrawal guarantee at all ratios

---

## Template 13: EigenLayer-Style Restaking Vault (Safe Edition)

Accepts LSTs (stETH, rETH, cbETH) and delegates to operators running AVS. Base staking yield + AVS rewards. Additional risk = additional reward.

**Contracts:** RestakingVault.sol, OperatorRegistry.sol, SlashingManager.sol, RewardDistributor.sol, WithdrawalQueue.sol

**Key Mechanics:**
- Share-based accounting (slashing affects all proportionally)
- Queued withdrawals with 7-day unbonding period
- Operator registry with freeze-on-slash
- Slashing during unbonding reduces withdrawal proportionally

**Security Fixes:**
- 7-day minimum withdrawal delay (prevents front-running slashing)
- Slashing capped at maxSlashableBps (default 50%)
- Operators frozen after slash, must be governance-reviewed to unfreeze
- 1-day cooldown on operator delegation changes
- No "last out wins" dynamic (share-based)

---

## Template 14: OlympusDAO-Style Bonding + Protocol-Owned Liquidity (Safe Edition)

Protocol builds permanent liquidity via bonding. Users sell assets (LP, stablecoins) at discount for vested protocol tokens. Treasury owns its own liquidity.

**Contracts:** ProtocolToken.sol, Treasury.sol, BondDepository.sol, StakingPool.sol, PriceOracle.sol

**Key Mechanics:**
- Treasury controls all minting, enforces backingPerToken minimum reserves
- Bonds: deposit quote tokens, receive vested protocol tokens at dynamic discount
- Linear vesting with partial redemption
- Rebase staking (xSushi model — ratio only goes up as rewards added)
- Auto-stake option on bond redemption for (3,3) strategy
- Warmup period prevents rebase sniping

**Security Fixes vs OlympusDAO:**
- Per-epoch mint limits prevent runaway inflation
- backingPerToken enforces minimum reserves (prevents death spiral)
- Bond discount capped at maxDiscountBps (default 5%)
- maxDebt caps total outstanding bonds
- Bond pricing via Chainlink oracles, not pair reserves
- Warmup period on staking (default 2 epochs)
- Rebase function separate from staking (no zero-stake rebase trigger)

---

## Template Parameter Reference (9-14)

| Parameter | Type | Default | Templates | Description |
|---|---|---|---|---|
| amplificationCoeff | uint256 | 200 | 9 | StableSwap amplification factor |
| numCoins | uint256 | 2 | 9 | Tokens in StableSwap pool (2-4) |
| swapFeeBps | uint16 | 4 | 9 | Swap fee (0.04% for stables) |
| lockDurationMax | uint256 | 4 years | 9,10 | Max veToken lock duration |
| platformFeeBps | uint16 | 1700 | 10 | Total fee on boosted rewards |
| managementFeeBps | uint16 | 200 | 11 | Annual vault management fee |
| performanceFeeBps | uint16 | 2000 | 11 | Vault performance fee on profits |
| maxStrategies | uint16 | 20 | 11 | Max strategies per vault |
| lockedProfitRelease | uint256 | 21600 | 11 | Profit release period (6 hours) |
| maturityDuration | uint256 | 90 days | 12 | PT/YT maturity period |
| scalarRoot | uint256 | varies | 12 | AMM curve shape parameter |
| withdrawalDelay | uint256 | 7 days | 13 | Restaking unbonding period |
| maxSlashableBps | uint16 | 5000 | 13 | Max slashable percentage (50%) |
| operatorCommission | uint16 | 500 | 13 | Operator commission (5%) |
| backingPerToken | uint256 | 1e18 | 14 | Min treasury backing per token ($1) |
| maxDiscountBps | uint16 | 500 | 14 | Max bond discount (5%) |
| vestingDuration | uint256 | 5 days | 14 | Bond vesting period |
| epochDuration | uint256 | 28800 | 14 | Rebase epoch (8 hours) |
| rewardRateBps | uint16 | 30 | 14 | Staking reward per epoch (0.3%) |
| warmupEpochs | uint256 | 2 | 14 | Staking warmup period |
| maxMintPerEpoch | uint256 | varies | 14 | Treasury mint cap per epoch |

---

## Vulnerability Cross-Reference

| Fix | Exploit Prevented | Template | Original Victim |
|---|---|---|---|
| Chainlink oracle (not pair reserves) | Flash loan price manipulation | 10, 14 | PancakeBunny ($45M) |
| K invariant single constant | Fee constant mismatch | 8, 9 | Uranium Finance ($50M) |
| Deadline on swaps | Sandwich attacks | 9, 12 | Various DEX users |
| A ramp limits (10x, 1-day min) | Governance drain via extreme A | 9 | Curve parameter attacks |
| Virtual shares (ERC-4626 offset) | First depositor inflation attack | 11, 13 | Multiple vaults |
| Locked profit release | Sandwich around harvest | 11 | Yearn vault gaming |
| Per-epoch mint limits | Runaway inflation | 14 | OlympusDAO forks |
| maxDebt cap on bonds | Over-leverage death spiral | 14 | Various OHM forks |
| No migrator function | Developer fund drain | All | Multiple BSC farms |
| 7-day withdrawal delay | Front-running slashing | 13 | Restaking exploits |
| Vote cooldown (10 days) | Rapid vote flipping | 9 | Gauge manipulation |
| Warmup period on staking | Rebase sniping | 14 | OHM fork gaming |
| maxRateIncrease on SY | Exchange rate manipulation | 12 | Yield oracle attacks |
| Fee immutability | Admin fee extraction | 10 | Trust violations |
