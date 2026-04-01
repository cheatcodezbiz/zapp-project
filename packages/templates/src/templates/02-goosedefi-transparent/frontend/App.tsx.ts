export const APP_TSX = `import { useState, useEffect, useCallback } from "react";

// ─── Types ──────────────────────────────────────────────────────────────
interface PoolData {
  pid: number;
  lpToken: string;
  lpName: string;
  allocPoint: number;
  depositFeeBps: number;
  isNativePair: boolean;
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
    lpName: "EGG-BNB LP",
    allocPoint: 4000,
    depositFeeBps: 0,
    isNativePair: true,
    tvl: "2,340,000",
    apr: "186.4",
    userStaked: "0.00",
    pendingReward: "0.00",
  },
  {
    pid: 1,
    lpToken: "0x5678...efgh",
    lpName: "EGG-BUSD LP",
    allocPoint: 3000,
    depositFeeBps: 400,
    isNativePair: false,
    tvl: "1,560,000",
    apr: "124.8",
    userStaked: "0.00",
    pendingReward: "0.00",
  },
  {
    pid: 2,
    lpToken: "0x9abc...ijkl",
    lpName: "BNB-BUSD LP",
    allocPoint: 1500,
    depositFeeBps: 400,
    isNativePair: false,
    tvl: "4,200,000",
    apr: "28.3",
    userStaked: "0.00",
    pendingReward: "0.00",
  },
  {
    pid: 3,
    lpToken: "0xdef0...mnop",
    lpName: "ETH-BNB LP",
    allocPoint: 1500,
    depositFeeBps: 400,
    isNativePair: false,
    tvl: "1,890,000",
    apr: "42.1",
    userStaked: "0.00",
    pendingReward: "0.00",
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────
function truncateAddress(addr: string): string {
  if (addr.length <= 10) return addr;
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

// ─── App Component ──────────────────────────────────────────────────────
function App() {
  const [account, setAccount] = useState<string | null>(null);
  const [pools, setPools] = useState<PoolData[]>(MOCK_POOLS);
  const [stakeAmounts, setStakeAmounts] = useState<Record<number, string>>({});
  const [unstakeAmounts, setUnstakeAmounts] = useState<Record<number, string>>({});
  const [totalBurned, setTotalBurned] = useState("1,234,567");
  const [burnValue, setBurnValue] = useState("518,518");

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
      setStakeAmounts((prev) => ({ ...prev, [pid]: "" }));
    },
    [stakeAmounts]
  );

  const handleUnstake = useCallback(
    async (pid: number) => {
      const amount = unstakeAmounts[pid];
      if (!amount || parseFloat(amount) <= 0) return;
      console.log("Unstaking", amount, "LP tokens from pool", pid);
      setUnstakeAmounts((prev) => ({ ...prev, [pid]: "" }));
    },
    [unstakeAmounts]
  );

  const handleHarvest = useCallback(async (pid: number) => {
    console.log("Harvesting rewards from pool", pid);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-indigo-400">
              Transparent Farm
            </h1>
            <p className="text-sm text-gray-400">
              All fees are used for token buyback and burn
            </p>
          </div>
          <button
            onClick={connectWallet}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium transition hover:bg-indigo-500"
          >
            {account ? truncateAddress(account) : "Connect Wallet"}
          </button>
        </div>
      </header>

      {/* Transparency Banner */}
      <div className="mx-auto mt-6 max-w-6xl px-4 sm:px-6">
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-900/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <h3 className="font-semibold text-indigo-300">Transparency Promise</h3>
          </div>
          <p className="text-sm text-gray-300">
            All deposit fees (4% on non-native pairs) are sent directly to the buyback contract,
            which purchases tokens from the market and burns them permanently.
            Emission changes require a 6-hour timelock — no surprise changes.
          </p>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="mx-auto mt-6 grid max-w-6xl grid-cols-1 gap-4 px-4 sm:grid-cols-4 sm:px-6">
        <div className="rounded-xl bg-gray-800 p-4 text-center">
          <p className="text-sm text-gray-400">Total Value Locked</p>
          <p className="text-xl font-bold text-indigo-400">\$9,990,000</p>
        </div>
        <div className="rounded-xl bg-gray-800 p-4 text-center">
          <p className="text-sm text-gray-400">Token Price</p>
          <p className="text-xl font-bold text-green-400">\$0.42</p>
        </div>
        <div className="rounded-xl bg-gray-800 p-4 text-center">
          <p className="text-sm text-gray-400">Total Burned</p>
          <p className="text-xl font-bold text-orange-400">{totalBurned}</p>
        </div>
        <div className="rounded-xl bg-gray-800 p-4 text-center">
          <p className="text-sm text-gray-400">Burn Value</p>
          <p className="text-xl font-bold text-red-400">\${burnValue}</p>
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
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400">
                      Alloc: {pool.allocPoint / 100}x
                    </span>
                    {pool.isNativePair ? (
                      <span className="rounded bg-green-900/50 px-2 py-0.5 text-xs text-green-400 border border-green-700/50">
                        0% Fee
                      </span>
                    ) : (
                      <span className="rounded bg-orange-900/50 px-2 py-0.5 text-xs text-orange-400 border border-orange-700/50">
                        4% Fee (Buyback)
                      </span>
                    )}
                  </div>
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
                    {pool.pendingReward} EGG
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
        <p>Transparent Farm — Built with Zapp</p>
        <p className="mt-1">
          All deposit fees go to buyback and burn. 6-hour timelock on emission changes.
        </p>
      </footer>
    </div>
  );
}
`;
