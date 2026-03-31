# ZAPP Game Template Architectures — Crypto Game Templates (15-19)

**Version:** 1.0 | **Date:** April 1, 2026

Complete contract architecture specs for 5 crypto game template types, reverse-engineered from the most successful play-to-earn games of the 2021-2022 era. Each includes "Zapp Safe Edition" modifications fixing economic death spirals and security vulnerabilities.

**Key Insight:** Every crypto game from this era is fundamentally smart contracts + a themed React frontend. No Unity, no Unreal, no game engine. All web3 + React. Zapp can build these TODAY.

**Prerequisites:** All global security standards from Part 1 (yield-farm-templates-v1.md) apply, plus game-specific standards below.

## Game-Specific Security Standards

### Anti-Bot Protection
- Stamina/energy systems that rate-limit actions per time period
- Minimum cooldown between consecutive actions (prevents script spamming)
- Optional CAPTCHA integration for high-value actions (frontend-enforced)

### Economic Sustainability Standards
The #1 killer of P2E games is unsustainable tokenomics. All templates MUST:
- Have at least 2 token sinks for every token source
- Cap daily reward emissions based on treasury balance (never mint more than treasury can back)
- Include circuit breaker that reduces rewards when token price drops below configurable threshold
- Use dual-token model: inflationary utility token (gameplay) + capped governance token (value accrual)
- Track net emission rate and expose it publicly (transparency prevents hidden inflation)

### Randomness
- Chainlink VRF for any outcome affecting token/NFT value
- Commit-reveal scheme as fallback if VRF too expensive
- NEVER use blockhash alone — miner-manipulable for high-value outcomes

### NFT Standards
- ERC-721 for unique entities (characters, pets, land)
- ERC-1155 for stackable items (potions, materials, common equipment)
- On-chain attributes for gameplay-critical stats (stored in contract, not just metadata URI)
- Off-chain metadata (IPFS) for visual assets (images, animations)
- Royalty support (EIP-2981) on all NFTs

---

## Template 15: CryptoBlades-Style RPG Battle Game (Safe Edition)

**Original:** CryptoBlades (BSC, 2021)

Players mint hero characters, forge weapons, battle enemies to earn tokens. Elemental advantage system (Fire > Earth > Lightning > Water). Weapon tiers 1-5 stars. Stamina system limits daily battles.

**Contracts:** GameToken.sol, GovernanceToken.sol, HeroNFT.sol, WeaponNFT.sol, BattleEngine.sol, StaminaManager.sol, Marketplace.sol, RewardPool.sol

**Key Mechanics:**
- HeroNFT: ERC-721 with on-chain stats (element, level, XP, attack/defense/speed/HP, battle/win count). VRF-randomised stats on mint.
- WeaponNFT: ERC-721 with tier (1-5 stars), element, attack/defense/speed bonuses, trait slots, durability. Tier drop rates: 1★ 50%, 2★ 30%, 3★ 15%, 4★ 4%, 5★ 1%. Reforging burns one weapon to boost another.
- BattleEngine: PvE with elemental advantage (+50% damage) / disadvantage (-25%). Player chooses stamina cost (40/80/120/160/200) scaling rewards proportionally. PvP with staked token matches (90% to winner, 10% protocol).
- StaminaManager: Max 200, regens 1 per 300 seconds (5 min). ~32 battles/day max.
- RewardPool: Treasury-backed (never mints new tokens). Dynamic reward scaling via Chainlink oracle — adjusts token amount to maintain USD target. Daily emission cap. Reserve floor circuit breaker. Early withdrawal tax (15% decaying 1%/day).

**Security Fixes vs CryptoBlades:**
- Treasury-backed rewards, not infinite minting
- Dynamic reward scaling based on oracle price (prevents inflation spiral)
- Daily emission cap prevents runaway rewards
- Reserve floor circuit breaker stops rewards if treasury depleted
- Early withdrawal tax discourages instant dumping
- Stamina limits bot farming (~32 battles/day)
- Weapon durability creates ongoing sink
- Dual-token model: GameToken (unlimited, inflationary) + GovernanceToken (capped)

---

## Template 16: Axie-Style Creature Breeding & Battle (Safe Edition)

**Original:** Axie Infinity (Ethereum/Ronin, 2018-present)

Collect, breed, and battle digital creatures. Dual-token economy (AXS governance + SLP utility). Card-based combat with 3-creature teams. Breeding with inherited genetics. Marketplace trading.

**Contracts:** GovernanceToken.sol, UtilityToken.sol, CreatureNFT.sol, BreedingEngine.sol, BattleArena.sol, Marketplace.sol, Staking.sol, ScholarshipManager.sol

**Key Mechanics:**
- CreatureNFT: ERC-721 with on-chain genetic system. 6 body parts (eyes, ears, mouth, horn, back, tail), each with dominant + 2 recessive genes. 6 classes (Aquatic, Beast, Bird, Bug, Plant, Reptile). Stats: HP, speed, skill, morale. Max 7 breeds per creature.
- BreedingEngine: Genetic inheritance algorithm — dominant gene 37.5% from each parent's dominant, 12.5% from each parent's recessive1, 3% mutation chance. Exponentially increasing breed cost (150 → 300 → 450 → 750 → 1200 → 1950 → 3150 utility tokens). Cannot breed siblings or parent-child. VRF randomness for genetics.
- BattleArena: 3v3 team combat, card system, seasonal rankings.
- ScholarshipManager: On-chain delegated play. Manager lends creatures to scholar, auto-split rewards (configurable, max 70% scholar share). Creatures locked during scholarship.

**Security Fixes vs Axie Infinity:**
- Utility token emission capped by daily treasury budget (prevents 300M daily mint that killed SLP)
- Breed cost uses oracle-adjusted pricing (maintains USD value)
- Circuit breaker reduces battle rewards when utility token drops below threshold
- Scholarships on-chain with enforced splits (not trust-based)
- Creature locking during scholarship prevents rug
- 5-day maturation period on bred creatures (prevents instant breed-sell loops)
- Burn mechanics: utility tokens burned on breeding, weapon repair, marketplace fees, level-up
- Net emission tracking: contract exposes dailyMinted - dailyBurned publicly

---

## Template 17: CryptoZoon-Style Monster Collection Game (Safe Edition)

**Original:** CryptoZoon (BSC, 2021)

Pokemon-inspired monster collection. Buy eggs → hatch into creatures with random rarity → fight monsters → earn tokens. Simplified version of Template 16 focused on egg-hatching/monster-fighting loop rather than breeding genetics.

**Additional Contracts (beyond base game contracts):** EggShop.sol, EvolutionEngine.sol, BossRaid.sol, PvPArena.sol

**Key Differences vs Template 16:**
1. Egg system instead of breeding — gacha model, no genetic inheritance
2. 6-tier rarity: Common (40%), Uncommon (25%), Rare (20%), Super Rare (10%), Epic (4%), Legendary (1%)
3. Evolution: consume creatures + tokens to boost a creature (burn sink)
4. PvP with token stakes — winner takes pot minus protocol fee
5. Boss raids — weekly community boss with contribution-based reward distribution
6. Simpler battle system — direct stat comparison, no card system

**Token Sinks (7 total):**
1. Egg purchases (primary sink)
2. Evolution costs (creature + token burn)
3. PvP arena stakes (losers' tokens → winners + protocol)
4. Marketplace fees (5% on all NFT trades)
5. Boss raid entry fees
6. Weapon/item repair costs
7. Stamina potions

---

## Template 18: Plant vs Undead-Style Farming Sim (Safe Edition)

**Original:** Plant vs Undead (BSC, 2021)

Tower defense / farming hybrid. Buy plant NFTs, place on land plots, water daily to grow, harvest Energy tokens. Energy converts to Farm tokens. Social mechanics (water neighbours' plants for rewards).

**Contracts:** FarmToken.sol, EnergyToken.sol, PlantNFT.sol, LandNFT.sol, FarmManager.sol, CommunityQuests.sol, TowerDefense.sol

**Key Mechanics:**
- PlantNFT: Growth stages (Seed → Sprout → Young → Mature → Blooming). Health degrades without watering. Yield rate scaled by rarity and stage.
- LandNFT: Soil quality and capacity limits (prevents infinite farm scaling).
- FarmManager: Plant on land, water daily (own or neighbours'), harvest energy from mature plants (120-hour cooldown). Community watering gives small energy reward.
- EnergyToken: NOT tradeable on DEX. Only convertible to FarmToken via contract at controlled dynamic rate.
- Dynamic conversion rate: `rate = treasuryBalance / totalEnergySupply`. Self-balancing — more players = more energy = lower conversion rate. Capped at max/min rates.

**Security Fixes vs Plant vs Undead:**
- Energy-to-token conversion is treasury-backed with dynamic rate (not fixed 1:1 which caused PVU hyperinflation)
- Energy NOT tradeable on DEX — only convertible through contract at controlled rate
- 120-hour harvest cooldown per plant (not just daily)
- Plant health degrades without watering (ongoing engagement, not plant-and-forget)
- Land capacity limits prevent infinite scaling
- Tower defense mode provides additional token sink
- Community watering rewards too small to profitably multi-account farm

---

## Template 19: Idle Staking Game — "Stake NFTs to Earn" (Safe Edition)

Distilled pattern from dozens of BSC idle games (BNB Heroes, CryptoMines, Fisherman Joe, etc.). Simplest possible P2E game — buy NFT characters/tools → stake them → passively earn tokens → buy better NFTs → compound.

**Why This Template Exists:** Requires almost no frontend complexity — just NFT display, stake/unstake button, rewards counter. Yet generated massive revenue. It's "yield farm wearing a costume." The AI can generate the entire frontend in a single call.

**Contracts:** GameToken.sol, WorkerNFT.sol, ToolNFT.sol (ERC-1155), IdleStaking.sol, Shop.sol, RepairShop.sol

**Key Mechanics:**
- IdleStaking: Stake worker NFT + tool NFTs. Combined earning power accrues rewards per block. Standard MasterChef-style accRewardPerShare accounting.
- Tool degradation (the critical sink): Tools degrade at `degradationRatePerDay` bps/day. At 200 bps/day (2%), tools fully degrade in 50 days. Players must unstake and repair (costs GameToken) or buy new tools. Creates continuous token sink offsetting emissions.

**Frontend (minimal):** Grid of staked workers with stats, stake/unstake buttons, pending rewards counter, claim button, shop page for workers/tools.

---

## Frontend Guidance for Game Templates

| Template | Theme | Color Palette | Key UI Elements |
|---|---|---|---|
| 15 (RPG Battle) | Dark fantasy, medieval | Deep purple, gold accents, red health bars | Character cards with stats, battle log, weapon forge animation |
| 16 (Creature Battle) | Bright Pokemon-style | Pastel colors, vibrant creatures | Team display (3 creatures), battle arena, breeding preview |
| 17 (Monster Collection) | Neon sci-fi monsters | Dark with neon green/blue | Egg gacha animation, creature grid, evolution progress |
| 18 (Farm Sim) | Cozy farm aesthetic | Green, brown, sunlight yellow | Grid-based farm view, plant growth stages, watering can icon |
| 19 (Idle Staker) | Clean dashboard | Dark with accent color | Worker cards in grid, earnings ticker, shop catalogue |

**Must-Have Frontend Components (ALL Games):**
1. Wallet connection with network detection
2. Token balance display (both game + governance if dual-token)
3. NFT inventory grid with stats
4. Action buttons with loading states and tx confirmation
5. Rewards dashboard (pending, claimed, lifetime)
6. Marketplace tab (buy/sell/browse)
7. Leaderboard (top players by earnings/level/wins)
8. Demo mode with mock data when wallet disconnected

---

## Template Parameter Reference (15-19)

| Parameter | Type | Default | Templates | Description |
|---|---|---|---|---|
| gameTokenName | string | required | All | Game reward token name |
| gameTokenSymbol | string | required | All | Symbol (e.g., "SKILL", "SLP") |
| govTokenName | string | optional | 15,16 | Governance token name (if dual-token) |
| maxDailyEmission | uint256 | varies | All | Daily reward cap from treasury |
| mintCostToken | uint256 | varies | 15,16,17 | Token cost to mint character/creature |
| eggCost | uint256 | 12500e18 | 17 | Token cost per egg |
| maxBreedCount | uint8 | 7 | 16 | Max breeding per creature |
| staminaMax | uint256 | 200 | 15,16,17 | Max stamina per character |
| staminaRegenSec | uint256 | 300 | 15,16,17 | Seconds per stamina point regen |
| harvestCooldownSec | uint256 | 432000 | 18 | Seconds between harvests (120 hours) |
| toolDegradationBps | uint256 | 200 | 19 | Tool durability loss per day in bps |
| pvpStakeAmount | uint256 | 1000e18 | 16,17 | Token stake per PvP match |
| pvpProtocolFeeBps | uint16 | 1000 | 16,17 | Protocol fee on PvP stakes |
| earlyWithdrawalTaxBps | uint16 | 1500 | 15,16,17 | Tax on claiming rewards < 24hrs |
| taxDecayPerDayBps | uint16 | 100 | 15,16,17 | Tax reduction per day |
| marketplaceFeeBps | uint16 | 500 | All | NFT marketplace fee (5%) |
| communityWaterReward | uint256 | 10e18 | 18 | Energy reward for watering neighbour's plant |
| bossRaidDuration | uint256 | 604800 | 17 | Boss raid duration (7 days) |
| scholarMaxShareBps | uint16 | 7000 | 16 | Max scholar reward share (70%) |

---

## Economic Sustainability Cheat Sheet

**The Golden Rule: Treasury-Backed Rewards** — NEVER mint new tokens as rewards. Always distribute from pre-funded treasury pool. Treasury runs low → rewards decrease automatically. Prevents hyperinflation.

**Sink/Source Balance:**

| Source (Earning) | Sink 1 | Sink 2 | Sink 3 |
|---|---|---|---|
| Battle rewards | Minting characters | Forging weapons | Marketplace fees |
| Farming yield | Evolution costs | Tool repair | Stamina potions |
| PvP winnings | Breeding costs | Equipment upgrade | Land expansion |
| Boss raid rewards | Entry fees | Cosmetic purchases | Guild creation |

**Circuit Breaker Pattern (all templates):**
1. Monitors token price via Chainlink oracle
2. Price below `emergencyThreshold` → reduces reward rate by 50%
3. Price below `criticalThreshold` → pauses rewards entirely
4. Admin can manually trigger/release
5. Players can ALWAYS withdraw staked NFTs regardless of circuit breaker state

This single pattern would have saved CryptoBlades, CryptoZoon, Plant vs Undead, and dozens of other games from token death spirals.
