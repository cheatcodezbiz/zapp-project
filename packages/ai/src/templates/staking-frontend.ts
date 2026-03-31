/**
 * Hardcoded staking frontend template.
 *
 * Generates a self-contained Next.js 14 "use client" page component
 * with wallet connection, staking forms, and pool stat display.
 */

export interface StakingFrontendParams {
  contractName: string;
  hasCompounding: boolean;
  hasEmergencyWithdraw: boolean;
}

export function generateStakingFrontend(params: StakingFrontendParams): string {
  const { contractName, hasCompounding, hasEmergencyWithdraw } = params;

  const compoundButton = hasCompounding
    ? `
          <button
            onClick={handleCompound}
            disabled={!connected || loading}
            className="w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Processing..." : "Compound Rewards"}
          </button>`
    : "";

  const emergencyButton = hasEmergencyWithdraw
    ? `
          <button
            onClick={handleEmergencyWithdraw}
            disabled={!connected || loading}
            className="w-full rounded-lg bg-red-600 px-4 py-3 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Processing..." : "Emergency Withdraw"}
          </button>`
    : "";

  const compoundHandler = hasCompounding
    ? `
  const handleCompound = async () => {
    if (!contract) return;
    setLoading(true);
    setError("");
    try {
      const tx = await contract.compoundRewards();
      await tx.wait();
      setSuccess("Rewards compounded successfully!");
      await refreshData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Compound failed");
    } finally {
      setLoading(false);
    }
  };`
    : "";

  const emergencyHandler = hasEmergencyWithdraw
    ? `
  const handleEmergencyWithdraw = async () => {
    if (!contract) return;
    setLoading(true);
    setError("");
    try {
      const tx = await contract.emergencyWithdraw();
      await tx.wait();
      setSuccess("Emergency withdrawal successful!");
      await refreshData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Emergency withdraw failed");
    } finally {
      setLoading(false);
    }
  };`
    : "";

  const compoundAbi = hasCompounding
    ? `\n    "function compoundRewards() external",`
    : "";

  const emergencyAbi = hasEmergencyWithdraw
    ? `\n    "function emergencyWithdraw() external",`
    : "";

  return `"use client";

import { useState, useEffect, useCallback } from "react";
import { BrowserProvider, Contract, formatEther, parseEther } from "ethers";

// ---------------------------------------------------------------------------
// Configuration — replace with your deployed addresses
// ---------------------------------------------------------------------------

const CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000";
const TOKEN_ADDRESS = "0x0000000000000000000000000000000000000000";

const STAKING_ABI = [
    "function stake(uint256 amount) external",
    "function unstake(uint256 amount) external",
    "function claimRewards() external",${compoundAbi}${emergencyAbi}
    "function pendingRewards(address user) external view returns (uint256)",
    "function getStakerInfo(address user) external view returns (uint256 amount, uint256 rewardDebt, uint256 stakedAt, uint256 lockUntil)",
    "function getPoolInfo() external view returns (uint256 totalStaked, uint256 rewardRateBps, uint256 lockDuration, uint256 accRewardPerShare)",
];

const ERC20_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function balanceOf(address owner) external view returns (uint256)",
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ${contractName}Page() {
  // Wallet state
  const [connected, setConnected] = useState(false);
  const [account, setAccount] = useState<string>("");
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [tokenContract, setTokenContract] = useState<Contract | null>(null);

  // Pool info
  const [totalStaked, setTotalStaked] = useState("0");
  const [rewardRate, setRewardRate] = useState(0);
  const [lockDuration, setLockDuration] = useState(0);

  // User info
  const [stakedAmount, setStakedAmount] = useState("0");
  const [pendingReward, setPendingReward] = useState("0");
  const [lockUntil, setLockUntil] = useState(0);
  const [tokenBalance, setTokenBalance] = useState("0");

  // Form state
  const [stakeInput, setStakeInput] = useState("");
  const [unstakeInput, setUnstakeInput] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ------------------------------------------------------------------
  // Wallet connection
  // ------------------------------------------------------------------

  const connectWallet = async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      setError("Please install MetaMask or another Web3 wallet.");
      return;
    }
    try {
      const bp = new BrowserProvider(window.ethereum);
      const accounts = await bp.send("eth_requestAccounts", []);
      const signer = await bp.getSigner();
      const stakingContract = new Contract(CONTRACT_ADDRESS, STAKING_ABI, signer);
      const erc20 = new Contract(TOKEN_ADDRESS, ERC20_ABI, signer);

      setProvider(bp);
      setAccount(accounts[0]);
      setContract(stakingContract);
      setTokenContract(erc20);
      setConnected(true);
      setError("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to connect wallet");
    }
  };

  // ------------------------------------------------------------------
  // Data fetching
  // ------------------------------------------------------------------

  const refreshData = useCallback(async () => {
    if (!contract || !tokenContract || !account) return;
    try {
      const [pool, staker, pending, balance] = await Promise.all([
        contract.getPoolInfo(),
        contract.getStakerInfo(account),
        contract.pendingRewards(account),
        tokenContract.balanceOf(account),
      ]);

      setTotalStaked(formatEther(pool.totalStaked));
      setRewardRate(Number(pool.rewardRateBps));
      setLockDuration(Number(pool.lockDuration));

      setStakedAmount(formatEther(staker.amount));
      setLockUntil(Number(staker.lockUntil));
      setPendingReward(formatEther(pending));
      setTokenBalance(formatEther(balance));
    } catch {
      // silently fail — data will refresh on next action
    }
  }, [contract, tokenContract, account]);

  useEffect(() => {
    if (connected) {
      refreshData();
      const interval = setInterval(refreshData, 15_000);
      return () => clearInterval(interval);
    }
  }, [connected, refreshData]);

  // ------------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------------

  const handleStake = async () => {
    if (!contract || !tokenContract || !stakeInput) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const amount = parseEther(stakeInput);
      // Approve if needed
      const allowance = await tokenContract.allowance(account, CONTRACT_ADDRESS);
      if (allowance < amount) {
        const approveTx = await tokenContract.approve(CONTRACT_ADDRESS, amount);
        await approveTx.wait();
      }
      const tx = await contract.stake(amount);
      await tx.wait();
      setSuccess(\`Successfully staked \${stakeInput} tokens!\`);
      setStakeInput("");
      await refreshData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Stake failed");
    } finally {
      setLoading(false);
    }
  };

  const handleUnstake = async () => {
    if (!contract || !unstakeInput) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const tx = await contract.unstake(parseEther(unstakeInput));
      await tx.wait();
      setSuccess(\`Successfully unstaked \${unstakeInput} tokens!\`);
      setUnstakeInput("");
      await refreshData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unstake failed");
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    if (!contract) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const tx = await contract.claimRewards();
      await tx.wait();
      setSuccess("Rewards claimed successfully!");
      await refreshData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Claim failed");
    } finally {
      setLoading(false);
    }
  };
${compoundHandler}${emergencyHandler}

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------

  const truncateAddress = (addr: string) =>
    addr ? \`\${addr.slice(0, 6)}...\${addr.slice(-4)}\` : "";

  const formatLockTime = (ts: number) => {
    if (ts === 0) return "None";
    const now = Math.floor(Date.now() / 1000);
    if (ts <= now) return "Unlocked";
    const remaining = ts - now;
    const hours = Math.floor(remaining / 3600);
    const mins = Math.floor((remaining % 3600) / 60);
    return \`\${hours}h \${mins}m remaining\`;
  };

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="mx-auto max-w-2xl px-4 py-12">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold">${contractName}</h1>
          {connected ? (
            <span className="rounded-full bg-gray-800 px-4 py-2 text-sm text-gray-300">
              {truncateAddress(account)}
            </span>
          ) : (
            <button
              onClick={connectWallet}
              className="rounded-lg bg-indigo-600 px-5 py-2 font-semibold text-white transition hover:bg-indigo-700"
            >
              Connect Wallet
            </button>
          )}
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-900/50 px-4 py-3 text-red-300">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-lg bg-green-900/50 px-4 py-3 text-green-300">
            {success}
          </div>
        )}

        {/* Pool Stats */}
        <div className="mb-6 rounded-lg bg-gray-800 p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-300">Pool Stats</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-400">Total Staked</p>
              <p className="text-xl font-bold">{totalStaked}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Reward Rate</p>
              <p className="text-xl font-bold">{rewardRate / 100}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Lock Duration</p>
              <p className="text-xl font-bold">{lockDuration > 0 ? \`\${lockDuration / 3600}h\` : "None"}</p>
            </div>
          </div>
        </div>

        {/* User Stats */}
        {connected && (
          <div className="mb-6 rounded-lg bg-gray-800 p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-300">Your Position</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-sm text-gray-400">Wallet Balance</p>
                <p className="text-lg font-bold">{tokenBalance}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Staked</p>
                <p className="text-lg font-bold">{stakedAmount}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Pending Rewards</p>
                <p className="text-lg font-bold text-green-400">{pendingReward}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Lock Status</p>
                <p className="text-lg font-bold">{formatLockTime(lockUntil)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        {connected && (
          <div className="space-y-4">
            {/* Stake */}
            <div className="rounded-lg bg-gray-800 p-6">
              <h3 className="mb-3 font-semibold text-gray-300">Stake Tokens</h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Amount to stake"
                  value={stakeInput}
                  onChange={(e) => setStakeInput(e.target.value)}
                  className="flex-1 rounded-lg bg-gray-700 px-4 py-3 text-white placeholder-gray-500 outline-none ring-indigo-500 focus:ring-2"
                />
                <button
                  onClick={handleStake}
                  disabled={loading || !stakeInput}
                  className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "..." : "Stake"}
                </button>
              </div>
            </div>

            {/* Unstake */}
            <div className="rounded-lg bg-gray-800 p-6">
              <h3 className="mb-3 font-semibold text-gray-300">Unstake Tokens</h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Amount to unstake"
                  value={unstakeInput}
                  onChange={(e) => setUnstakeInput(e.target.value)}
                  className="flex-1 rounded-lg bg-gray-700 px-4 py-3 text-white placeholder-gray-500 outline-none ring-indigo-500 focus:ring-2"
                />
                <button
                  onClick={handleUnstake}
                  disabled={loading || !unstakeInput}
                  className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "..." : "Unstake"}
                </button>
              </div>
            </div>

            {/* Claim / Compound / Emergency */}
            <div className="flex gap-3">
              <button
                onClick={handleClaim}
                disabled={!connected || loading}
                className="flex-1 rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Processing..." : "Claim Rewards"}
              </button>${compoundButton}${emergencyButton}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
`;
}
