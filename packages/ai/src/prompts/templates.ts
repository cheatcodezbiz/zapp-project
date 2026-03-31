/**
 * Template-specific prompt builders.
 *
 * These functions take generation parameters and produce the user-message
 * content that is sent alongside the system prompt to the AI model.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StakingGenerationParams {
  /** Contract name in PascalCase, e.g. "ZappStaking" */
  name: string;
  /** Address of an existing ERC-20 token, or "new" to generate one */
  stakeTokenAddress: string | "new";
  /** Annual reward rate in basis points (e.g. 500 = 5%) */
  rewardRateBps: number;
  /** Minimum lock duration in seconds (0 = no lock) */
  lockDurationSec: number;
  /** Maximum total staked amount (wei string), or undefined for unlimited */
  maxTotalStaked: string | undefined;
  /** Whether to include emergencyWithdraw() function */
  hasEmergencyWithdraw: boolean;
  /** Whether to include compoundRewards() function */
  hasCompounding: boolean;
}

// ---------------------------------------------------------------------------
// Staking — Contract prompt
// ---------------------------------------------------------------------------

export function buildStakingContractPrompt(params: StakingGenerationParams): string {
  const features: string[] = [];
  if (params.hasEmergencyWithdraw) features.push("emergencyWithdraw()");
  if (params.hasCompounding) features.push("compoundRewards()");

  const lockNote =
    params.lockDurationSec > 0
      ? `Lock period: ${params.lockDurationSec} seconds after each stake.`
      : "No lock period — users can unstake immediately.";

  const capNote = params.maxTotalStaked
    ? `Maximum total staked cap: ${params.maxTotalStaked} (wei).`
    : "No maximum total staked cap.";

  const tokenNote =
    params.stakeTokenAddress === "new"
      ? "Generate a companion ERC-20 token contract as well."
      : `Stake/reward token address (set via initialize): ${params.stakeTokenAddress}`;

  return `Generate a staking smart contract with the following specification:

**Contract name**: \`${params.name}\`
**Inherits**: \`ZappBaseUpgradeable\` (import from \`../ZappBaseUpgradeable.sol\`)

## Token
${tokenNote}

## Parameters
- Annual reward rate: ${params.rewardRateBps} basis points (${params.rewardRateBps / 100}%)
- ${lockNote}
- ${capNote}

## Required Functions
- \`initialize(string dappId, address admin, address upgrader, address stakeToken, uint256 rewardRate, uint256 lockDuration${params.maxTotalStaked ? ", uint256 maxStaked" : ""})\`
- \`stake(uint256 amount)\` — stakes tokens, updates reward accounting
- \`unstake(uint256 amount)\` — unstakes tokens after lock period, claims pending rewards
- \`claimRewards()\` — claims accumulated rewards without unstaking
- \`pendingRewards(address user)\` — view function returning unclaimed rewards
- \`updatePool()\` — updates the global reward accumulator
${features.map((f) => `- \`${f}\``).join("\n")}

## Required Admin Functions
- \`setRewardRate(uint256 newRate)\` — only DEFAULT_ADMIN_ROLE
- \`pause()\` / \`unpause()\` — inherited from ZappBaseUpgradeable

## Reward Mechanism
Use the MasterChef reward-per-share accumulator pattern:
- Maintain \`accRewardPerShare\` (scaled by 1e18 PRECISION constant)
- On each pool update, add \`(elapsed * rewardRate) / totalStaked\` to the accumulator
- Each staker's pending reward = \`(stakerAmount * accRewardPerShare / PRECISION) - rewardDebt\`
- Update \`rewardDebt\` on stake/unstake/claim

## Storage (ERC-7201)
Use a namespaced storage struct at \`zapp.storage.staking\`:
\`\`\`
StakingStorage {
  IERC20 stakeToken;
  uint256 rewardRateBps;
  uint256 lockDuration;
  uint256 totalStaked;
  uint256 accRewardPerShare;
  uint256 lastRewardTimestamp;
  uint256 maxStaked;
  mapping(address => StakerInfo) stakers;
}
\`\`\`

## StakerInfo Struct
\`\`\`
StakerInfo {
  uint256 amount;
  uint256 rewardDebt;
  uint256 stakedAt;
  uint256 lockUntil;
}
\`\`\`

## Events
- \`Staked(address indexed user, uint256 amount)\`
- \`Unstaked(address indexed user, uint256 amount)\`
- \`RewardsClaimed(address indexed user, uint256 amount)\`
${params.hasCompounding ? '- `Compounded(address indexed user, uint256 amount)`' : ""}
- \`RewardRateUpdated(uint256 oldRate, uint256 newRate)\`

## Modifiers
- All user functions: \`whenNotPaused\`, \`nonReentrant\`
- Admin functions: \`onlyRole(DEFAULT_ADMIN_ROLE)\`
`;
}

// ---------------------------------------------------------------------------
// Staking — Frontend prompt
// ---------------------------------------------------------------------------

export function buildStakingFrontendPrompt(contractName: string): string {
  return `Generate a Next.js 14 App Router page component for interacting with the \`${contractName}\` staking contract.

## Requirements
1. "use client" directive at the top.
2. Wallet connection using window.ethereum and ethers.js v6 BrowserProvider.
3. Display:
   - Connected wallet address (truncated)
   - Pool stats: total staked, reward rate, lock duration
   - User stats: staked amount, pending rewards, lock expiry
4. Actions:
   - Stake form: amount input + "Stake" button (calls approve then stake)
   - Unstake form: amount input + "Unstake" button
   - "Claim Rewards" button
5. Transaction status: loading spinner, success/error toasts.
6. Styling: Tailwind CSS dark theme (bg-gray-900, bg-gray-800, text-white).
7. TypeScript .tsx file.
8. Include a CONTRACT_ADDRESS placeholder constant and inline ABI array (only the functions used).

The component should be self-contained in a single file and ready to drop into a Next.js app/page.tsx.
`;
}

// ---------------------------------------------------------------------------
// Staking — Test prompt
// ---------------------------------------------------------------------------

export function buildStakingTestPrompt(contractName: string): string {
  return `Generate a comprehensive Hardhat test suite for the \`${contractName}\` staking contract.

## Requirements
1. Use \`@nomicfoundation/hardhat-toolbox\` (ethers v6, Chai).
2. Deploy via \`@openzeppelin/hardhat-upgrades\` (\`upgrades.deployProxy\`).
3. Deploy a mock ERC-20 token for staking.
4. Use \`loadFixture\` from \`@nomicfoundation/hardhat-network-helpers\` for isolation.
5. Use \`time.increase\` / \`time.latest\` for time-dependent tests.

## Test Groups
### Initialization
- Verify initial state: reward rate, lock duration, total staked = 0
- Verify admin has DEFAULT_ADMIN_ROLE
- Verify cannot initialize twice

### Staking
- Stake successfully, verify event and balance changes
- Stake updates reward accounting correctly
- Cannot stake 0 amount
- Cannot stake when paused

### Unstaking
- Unstake successfully after lock period
- Cannot unstake before lock expires
- Cannot unstake more than staked
- Unstake claims pending rewards automatically

### Rewards
- Pending rewards accumulate over time
- Claim rewards correctly
- Multiple stakers receive proportional rewards
- Reward accounting after stake/unstake

### Access Control
- Only admin can setRewardRate
- Only admin can pause/unpause

### Edge Cases
- Stake when pool is empty (first staker)
- Unstake entire balance
- Multiple stake/unstake cycles

## Output
TypeScript test file for Hardhat.
`;
}
