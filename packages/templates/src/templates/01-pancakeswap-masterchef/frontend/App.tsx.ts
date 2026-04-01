export const APP_TSX = `import { useState, useEffect, useCallback } from "react";

// ─── Types ──────────────────────────────────────────────────────────────
interface PoolData {
  pid: number;
  lpToken: string;
  lpName: string;
  allocPoint: number;
  depositFeeBps: number;
  tvl: string;
  apr: string;
  userStaked: string;
  pendingReward: string;
}

// ─── Mock Data ──────────────────────────────────────────────────────────
const MOCK_POOLS: PoolData[] = [
  {
    pid: 0,
    lpToken: "0x1234...abcd",
    lpName: "RWD-ETH LP",
    allocPoint: 4000,
    depositFeeBps: 0,
    tvl: "1,245,000",
    apr: "142.5",
    userStaked: "0.00",
    pendingReward: "0.00",
  },
  {
    pid: 1,
    lpToken: "0x5678...efgh",
    lpName: "RWD-USDC LP",
    allocPoint: 3000,
    depositFeeBps: 0,
    tvl: "890,000",
    apr: "98.2",
    userStaked: "0.00",
    pendingReward: "0.00",
  },
  {
    pid: 2,
    lpToken: "0x9abc...ijkl",
    lpName: "ETH-USDC LP",
    allocPoint: 2000,
    depositFeeBps: 400,
    tvl: "2,100,000",
    apr: "34.7",
    userStaked: "0.00",
    pendingReward: "0.00",
  },
  {
    pid: 3,
    lpToken: "0xdef0...mnop",
    lpName: "WBTC-ETH LP",
    allocPoint: 1000,
    depositFeeBps: 400,
    tvl: "3,450,000",
    apr: "18.3",
    userStaked: "0.00",
    pendingReward: "0.00",
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────
function truncateAddress(addr: string): string {
  if (addr.length <= 10) return addr;
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

// ─── App Component ──────────────────────────────────────────────────────
function App() {
  const [account, setAccount] = useState<string | null>(null);
  const [pools, setPools] = useState<PoolData[]>(MOCK_POOLS);
  const [stakeAmounts, setStakeAmounts] = useState<Record<number, string>>({});
  const [unstakeAmounts, setUnstakeAmounts] = useState<Record<number, string>>({});
  const [totalTvl, setTotalTvl] = useState("7,685,000");
  const [rewardPrice, setRewardPrice] = useState("0.42");

  const connectWallet = useCallback(async () => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      try {
        const { BrowserProvider } = await import("ethers");
        const provider = new BrowserProvider((window as any).ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        setAccount(address);
      } catch (err) {
        console.error("Failed to connect wallet:", err);
      }
    } else {
      alert("Please install MetaMask or another Web3 wallet.");
    }
  }, []);

  const handleStake = useCallback(
    async (pid: number) => {
      const amount = stakeAmounts[pid];
      if (!amount || parseFloat(amount) <= 0) return;
      console.log("Staking", amount, "LP tokens in pool", pid);
      // In production: call masterChef.deposit(pid, parseEther(amount))
      setStakeAmounts((prev) => ({ ...prev, [pid]: "" }));
    },
    [stakeAmounts]
  );

  const handleUnstake = useCallback(
    async (pid: number) => {
      const amount = unstakeAmounts[pid];
      if (!amount || parseFloat(amount) <= 0) return;
      console.log("Unstaking", amount, "LP tokens from pool", pid);
      // In production: call masterChef.withdraw(pid, parseEther(amount))
      setUnstakeAmounts((prev) => ({ ...prev, [pid]: "" }));
    },
    [unstakeAmounts]
  );

  const handleHarvest = useCallback(async (pid: number) => {
    console.log("Harvesting rewards from pool", pid);
    // In production: call masterChef.harvest(pid)
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-indigo-400">MasterChef Farm</h1>
            <p className="text-sm text-gray-400">Stake LP tokens to earn RWD rewards</p>
          </div>
          <button
            onClick={connectWallet}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium transition hover:bg-indigo-500"
          >
            {account ? truncateAddress(account) : "Connect Wallet"}
          </button>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="mx-auto mt-6 grid max-w-6xl grid-cols-1 gap-4 px-4 sm:grid-cols-3 sm:px-6">
        <div className="rounded-xl bg-gray-800 p-4 text-center">
          <p className="text-sm text-gray-400">Total Value Locked</p>
          <p className="text-2xl font-bold text-indigo-400">\${totalTvl}</p>
        </div>
        <div className="rounded-xl bg-gray-800 p-4 text-center">
          <p className="text-sm text-gray-400">RWD Price</p>
          <p className="text-2xl font-bold text-green-400">\${rewardPrice}</p>
        </div>
        <div className="rounded-xl bg-gray-800 p-4 text-center">
          <p className="text-sm text-gray-400">Reward Per Block</p>
          <p className="text-2xl font-bold text-yellow-400">40 RWD</p>
        </div>
      </div>

      {/* Pool List */}
      <div className="mx-auto mt-8 max-w-6xl px-4 pb-12 sm:px-6">
        <h2 className="mb-4 text-xl font-semibold">Active Pools</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {pools.map((pool) => (
            <div
              key={pool.pid}
              className="rounded-xl border border-gray-700 bg-gray-800 p-6 transition hover:border-indigo-500/50"
            >
              {/* Pool Header */}
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">{pool.lpName}</h3>
                  <p className="text-xs text-gray-400">
                    Alloc: {pool.allocPoint / 100}x
                    {pool.depositFeeBps > 0
                      ? \` | Fee: \${pool.depositFeeBps / 100}%\`
                      : " | No Fee"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">APR</p>
                  <p className="text-xl font-bold text-green-400">{pool.apr}%</p>
                </div>
              </div>

              {/* TVL */}
              <div className="mb-4 flex justify-between text-sm">
                <span className="text-gray-400">TVL</span>
                <span>\${pool.tvl}</span>
              </div>

              {/* Your Stake */}
              <div className="mb-4 flex justify-between text-sm">
                <span className="text-gray-400">Your Stake</span>
                <span>{pool.userStaked} LP</span>
              </div>

              {/* Pending Rewards */}
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Pending Rewards</p>
                  <p className="text-lg font-semibold text-indigo-400">
                    {pool.pendingReward} RWD
                  </p>
                </div>
                <button
                  onClick={() => handleHarvest(pool.pid)}
                  disabled={!account || parseFloat(pool.pendingReward) <= 0}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Harvest
                </button>
              </div>

              {/* Stake Input */}
              <div className="mb-3 flex gap-2">
                <input
                  type="number"
                  placeholder="Amount to stake"
                  value={stakeAmounts[pool.pid] || ""}
                  onChange={(e) =>
                    setStakeAmounts((prev) => ({
                      ...prev,
                      [pool.pid]: e.target.value,
                    }))
                  }
                  className="flex-1 rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                />
                <button
                  onClick={() => handleStake(pool.pid)}
                  disabled={!account}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Stake
                </button>
              </div>

              {/* Unstake Input */}
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Amount to unstake"
                  value={unstakeAmounts[pool.pid] || ""}
                  onChange={(e) =>
                    setUnstakeAmounts((prev) => ({
                      ...prev,
                      [pool.pid]: e.target.value,
                    }))
                  }
                  className="flex-1 rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                />
                <button
                  onClick={() => handleUnstake(pool.pid)}
                  disabled={!account}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Unstake
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-6 text-center text-sm text-gray-500">
        <p>MasterChef Farm — Built with Zapp</p>
        <p className="mt-1">
          No migrator function. Emergency withdraw always available.
        </p>
      </footer>
    </div>
  );
}
`;
