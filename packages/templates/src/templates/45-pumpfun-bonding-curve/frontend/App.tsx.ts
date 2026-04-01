export const APP_TSX = `import { useState, useCallback, useMemo } from "react";

// ─── Types ──────────────────────────────────────────────────────────────
interface TokenData {
  address: string;
  name: string;
  symbol: string;
  description: string;
  imageUri: string;
  creator: string;
  currentPrice: string;
  marketCap: string;
  totalRaised: string;
  graduationProgress: number;
  graduated: boolean;
  createdAt: string;
  volume24h: string;
}

type Tab = "browse" | "create" | "trade";
type SortBy = "newest" | "trending" | "graduating";

// ─── Mock Data ──────────────────────────────────────────────────────────
const MOCK_TOKENS: TokenData[] = [
  {
    address: "0xaaa1...1111",
    name: "BaseDoge",
    symbol: "BDOGE",
    description: "The first doge on Base. Much wow.",
    imageUri: "",
    creator: "0xabc...def",
    currentPrice: "0.00042",
    marketCap: "42,000",
    totalRaised: "12.5",
    graduationProgress: 18,
    graduated: false,
    createdAt: "2 hours ago",
    volume24h: "8,400",
  },
  {
    address: "0xbbb2...2222",
    name: "ChadCoin",
    symbol: "CHAD",
    description: "For chads only. We are so back.",
    imageUri: "",
    creator: "0x123...456",
    currentPrice: "0.0069",
    marketCap: "420,000",
    totalRaised: "48.2",
    graduationProgress: 69,
    graduated: false,
    createdAt: "5 hours ago",
    volume24h: "156,000",
  },
  {
    address: "0xccc3...3333",
    name: "Pepe Classic",
    symbol: "PEPEC",
    description: "The OG Pepe on Base chain.",
    imageUri: "",
    creator: "0x789...012",
    currentPrice: "0.0128",
    marketCap: "890,000",
    totalRaised: "65.8",
    graduationProgress: 95,
    graduated: false,
    createdAt: "1 day ago",
    volume24h: "340,000",
  },
  {
    address: "0xddd4...4444",
    name: "GigaBrain",
    symbol: "GIGA",
    description: "AI meets memes. The singularity is here.",
    imageUri: "",
    creator: "0xfed...cba",
    currentPrice: "0.0256",
    marketCap: "1,200,000",
    totalRaised: "72.1",
    graduationProgress: 100,
    graduated: true,
    createdAt: "3 days ago",
    volume24h: "520,000",
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
  const [activeTab, setActiveTab] = useState<Tab>("browse");
  const [sortBy, setSortBy] = useState<SortBy>("trending");
  const [tokens] = useState<TokenData[]>(MOCK_TOKENS);
  const [selectedToken, setSelectedToken] = useState<TokenData | null>(null);

  // Create token form
  const [createName, setCreateName] = useState("");
  const [createSymbol, setCreateSymbol] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createImage, setCreateImage] = useState("");

  // Trade form
  const [tradeAmount, setTradeAmount] = useState("");
  const [tradeMode, setTradeMode] = useState<"buy" | "sell">("buy");
  const [slippage, setSlippage] = useState("5");

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

  const handleCreateToken = useCallback(async () => {
    if (!createName || !createSymbol) return;
    console.log("Creating token:", { createName, createSymbol, createDescription, createImage });
    // In production: call tokenFactory.createToken(name, symbol, description, imageUri, { value: creationFee })
    setCreateName("");
    setCreateSymbol("");
    setCreateDescription("");
    setCreateImage("");
    setActiveTab("browse");
  }, [createName, createSymbol, createDescription, createImage]);

  const handleTrade = useCallback(async () => {
    if (!selectedToken || !tradeAmount) return;
    console.log(tradeMode === "buy" ? "Buying" : "Selling", tradeAmount, selectedToken.symbol);
    // In production: call bondingCurve.buy() or bondingCurve.sell()
    setTradeAmount("");
  }, [selectedToken, tradeAmount, tradeMode]);

  const sortedTokens = useMemo(() => {
    const sorted = [...tokens];
    if (sortBy === "newest") sorted.sort((a, b) => a.createdAt > b.createdAt ? -1 : 1);
    if (sortBy === "trending") sorted.sort((a, b) => parseFloat(b.volume24h.replace(/,/g, "")) - parseFloat(a.volume24h.replace(/,/g, "")));
    if (sortBy === "graduating") sorted.sort((a, b) => b.graduationProgress - a.graduationProgress);
    return sorted;
  }, [tokens, sortBy]);

  // ─── Bonding Curve Visualization (SVG) ────────────────────────────────
  const renderBondingCurve = (token: TokenData) => {
    const progress = token.graduationProgress / 100;
    const points: string[] = [];
    for (let i = 0; i <= 50; i++) {
      const x = (i / 50) * 280 + 10;
      const y = 150 - (Math.pow(i / 50, 1.5) * 130);
      points.push(x + "," + y);
    }
    const currentX = progress * 280 + 10;
    const currentY = 150 - (Math.pow(progress, 1.5) * 130);

    return (
      <svg viewBox="0 0 300 170" className="w-full h-40 mt-2">
        {/* Grid lines */}
        <line x1="10" y1="150" x2="290" y2="150" stroke="#374151" strokeWidth="1" />
        <line x1="10" y1="20" x2="10" y2="150" stroke="#374151" strokeWidth="1" />
        {/* Curve */}
        <polyline
          points={points.join(" ")}
          fill="none"
          stroke="#6366f1"
          strokeWidth="2"
          opacity="0.3"
        />
        {/* Filled area up to current position */}
        <polyline
          points={points.slice(0, Math.floor(progress * 50) + 1).join(" ") +
            " " + currentX + ",150 10,150"}
          fill="url(#curveGradient)"
          opacity="0.5"
        />
        {/* Current position dot */}
        <circle cx={currentX} cy={currentY} r="5" fill="#6366f1" />
        {/* Graduation line */}
        <line x1="290" y1="20" x2="290" y2="150" stroke="#22c55e" strokeWidth="1" strokeDasharray="4" />
        <text x="275" y="15" fill="#22c55e" fontSize="8">GRAD</text>
        {/* Labels */}
        <text x="140" y="165" fill="#9ca3af" fontSize="8" textAnchor="middle">Supply</text>
        <text x="5" y="85" fill="#9ca3af" fontSize="8" textAnchor="middle" transform="rotate(-90, 5, 85)">Price</text>
        <defs>
          <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.05" />
          </linearGradient>
        </defs>
      </svg>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-indigo-400">Launchpad</h1>
            <p className="text-sm text-gray-400">Create and trade tokens on bonding curves</p>
          </div>
          <button
            onClick={connectWallet}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium transition hover:bg-indigo-500"
          >
            {account ? truncateAddress(account) : "Connect Wallet"}
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="mx-auto mt-6 max-w-6xl px-4 sm:px-6">
        <div className="flex gap-1 rounded-lg bg-gray-800 p-1">
          {(["browse", "create", "trade"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={\`flex-1 rounded-md px-4 py-2 text-sm font-medium transition \${
                activeTab === tab
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:text-white"
              }\`}
            >
              {tab === "browse" ? "Browse Tokens" : tab === "create" ? "Create Token" : "Trade"}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-6 max-w-6xl px-4 pb-12 sm:px-6">
        {/* ─── Browse Tab ──────────────────────────────────────────── */}
        {activeTab === "browse" && (
          <div>
            {/* Sort Controls */}
            <div className="mb-4 flex items-center gap-2">
              <span className="text-sm text-gray-400">Sort by:</span>
              {(["newest", "trending", "graduating"] as SortBy[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSortBy(s)}
                  className={\`rounded-full px-3 py-1 text-xs font-medium transition \${
                    sortBy === s
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:text-white"
                  }\`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>

            {/* Token Grid */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {sortedTokens.map((token) => (
                <div
                  key={token.address}
                  onClick={() => {
                    setSelectedToken(token);
                    setActiveTab("trade");
                  }}
                  className="cursor-pointer rounded-xl border border-gray-700 bg-gray-800 p-5 transition hover:border-indigo-500/50"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold">{token.name}</h3>
                        <span className="text-sm text-gray-400">\${token.symbol}</span>
                        {token.graduated && (
                          <span className="rounded bg-green-900/50 px-2 py-0.5 text-xs text-green-400 border border-green-700/50">
                            Graduated
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-400">{token.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-400">\${token.currentPrice}</p>
                      <p className="text-xs text-gray-400">ETH</p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
                    <div>
                      <p className="text-gray-400">Market Cap</p>
                      <p className="font-semibold">\${token.marketCap}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Raised</p>
                      <p className="font-semibold">{token.totalRaised} ETH</p>
                    </div>
                    <div>
                      <p className="text-gray-400">24h Vol</p>
                      <p className="font-semibold">\${token.volume24h}</p>
                    </div>
                  </div>

                  {/* Graduation Progress Bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Graduation Progress</span>
                      <span>{token.graduationProgress}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-700 overflow-hidden">
                      <div
                        className={\`h-full rounded-full transition-all \${
                          token.graduationProgress >= 100
                            ? "bg-green-500"
                            : token.graduationProgress >= 75
                            ? "bg-yellow-500"
                            : "bg-indigo-500"
                        }\`}
                        style={{ width: Math.min(token.graduationProgress, 100) + "%" }}
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex justify-between text-xs text-gray-500">
                    <span>by {truncateAddress(token.creator)}</span>
                    <span>{token.createdAt}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Create Tab ──────────────────────────────────────────── */}
        {activeTab === "create" && (
          <div className="mx-auto max-w-lg">
            <div className="rounded-xl border border-gray-700 bg-gray-800 p-6">
              <h2 className="text-xl font-bold mb-6">Launch a New Token</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Token Name</label>
                  <input
                    type="text"
                    placeholder="e.g. BaseDoge"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Token Symbol</label>
                  <input
                    type="text"
                    placeholder="e.g. BDOGE"
                    value={createSymbol}
                    onChange={(e) => setCreateSymbol(e.target.value.toUpperCase())}
                    maxLength={10}
                    className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Description</label>
                  <textarea
                    placeholder="Tell us about your token..."
                    value={createDescription}
                    onChange={(e) => setCreateDescription(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Image URL (optional)</label>
                  <input
                    type="text"
                    placeholder="https://... or ipfs://..."
                    value={createImage}
                    onChange={(e) => setCreateImage(e.target.value)}
                    className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                  {/* Image preview area */}
                  <div className="mt-2 h-32 rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center">
                    {createImage ? (
                      <img src={createImage} alt="Token" className="h-full object-contain rounded" />
                    ) : (
                      <span className="text-gray-500 text-sm">Image preview</span>
                    )}
                  </div>
                </div>

                <div className="rounded-lg bg-gray-900 p-3 text-sm">
                  <p className="text-gray-400">Creation Fee: <span className="text-white font-semibold">0.02 ETH</span></p>
                  <p className="text-gray-400 mt-1">Fair Launch: <span className="text-green-400">100% of tokens go to bonding curve</span></p>
                  <p className="text-gray-400 mt-1">Creator Allocation: <span className="text-green-400">0%</span></p>
                </div>

                <button
                  onClick={handleCreateToken}
                  disabled={!account || !createName || !createSymbol}
                  className="w-full rounded-lg bg-indigo-600 py-3 text-sm font-semibold transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {account ? "Launch Token (0.02 ETH)" : "Connect Wallet to Launch"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Trade Tab ──────────────────────────────────────────── */}
        {activeTab === "trade" && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Chart / Token Info */}
            <div className="rounded-xl border border-gray-700 bg-gray-800 p-6">
              {selectedToken ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-bold">{selectedToken.name}</h2>
                      <p className="text-sm text-gray-400">\${selectedToken.symbol}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-400">\${selectedToken.currentPrice}</p>
                      <p className="text-xs text-gray-400">ETH per token</p>
                    </div>
                  </div>

                  <p className="text-sm text-gray-400 mb-4">{selectedToken.description}</p>

                  {/* Bonding Curve Chart */}
                  <div className="rounded-lg bg-gray-900 p-3">
                    <p className="text-xs text-gray-400 mb-1">Bonding Curve</p>
                    {renderBondingCurve(selectedToken)}
                  </div>

                  {/* Graduation Progress */}
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">Graduation</span>
                      <span className="font-semibold">{selectedToken.graduationProgress}%</span>
                    </div>
                    <div className="h-3 rounded-full bg-gray-700 overflow-hidden">
                      <div
                        className={\`h-full rounded-full transition-all \${
                          selectedToken.graduationProgress >= 100
                            ? "bg-green-500"
                            : selectedToken.graduationProgress >= 75
                            ? "bg-yellow-500"
                            : "bg-indigo-500"
                        }\`}
                        style={{ width: Math.min(selectedToken.graduationProgress, 100) + "%" }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedToken.totalRaised} ETH raised of 69,420 USD threshold
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-gray-900 p-2 text-center">
                      <p className="text-gray-400">Market Cap</p>
                      <p className="font-semibold">\${selectedToken.marketCap}</p>
                    </div>
                    <div className="rounded-lg bg-gray-900 p-2 text-center">
                      <p className="text-gray-400">24h Volume</p>
                      <p className="font-semibold">\${selectedToken.volume24h}</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex h-64 items-center justify-center text-gray-500">
                  <p>Select a token from Browse to trade</p>
                </div>
              )}
            </div>

            {/* Trade Interface */}
            <div className="rounded-xl border border-gray-700 bg-gray-800 p-6">
              <h3 className="text-lg font-bold mb-4">
                {selectedToken ? \`Trade \${selectedToken.symbol}\` : "Trade"}
              </h3>

              {/* Buy/Sell Toggle */}
              <div className="flex gap-1 rounded-lg bg-gray-900 p-1 mb-4">
                <button
                  onClick={() => setTradeMode("buy")}
                  className={\`flex-1 rounded-md py-2 text-sm font-medium transition \${
                    tradeMode === "buy"
                      ? "bg-green-600 text-white"
                      : "text-gray-400 hover:text-white"
                  }\`}
                >
                  Buy
                </button>
                <button
                  onClick={() => setTradeMode("sell")}
                  className={\`flex-1 rounded-md py-2 text-sm font-medium transition \${
                    tradeMode === "sell"
                      ? "bg-red-600 text-white"
                      : "text-gray-400 hover:text-white"
                  }\`}
                >
                  Sell
                </button>
              </div>

              {/* Amount Input */}
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-1">
                  {tradeMode === "buy" ? "ETH Amount" : "Token Amount"}
                </label>
                <input
                  type="number"
                  placeholder="0.0"
                  value={tradeAmount}
                  onChange={(e) => setTradeAmount(e.target.value)}
                  className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-3 text-lg outline-none focus:border-indigo-500"
                />
              </div>

              {/* Slippage Setting */}
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-1">Slippage Tolerance</label>
                <div className="flex gap-2">
                  {["1", "3", "5", "10"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSlippage(s)}
                      className={\`rounded-lg px-3 py-1 text-sm transition \${
                        slippage === s
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-700 text-gray-400 hover:text-white"
                      }\`}
                    >
                      {s}%
                    </button>
                  ))}
                  <input
                    type="number"
                    value={slippage}
                    onChange={(e) => setSlippage(e.target.value)}
                    className="w-16 rounded-lg border border-gray-600 bg-gray-700 px-2 py-1 text-sm text-center outline-none"
                    placeholder="%"
                  />
                </div>
              </div>

              {/* Estimated Output */}
              {tradeAmount && selectedToken && (
                <div className="mb-4 rounded-lg bg-gray-900 p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Estimated {tradeMode === "buy" ? "tokens" : "ETH"}</span>
                    <span className="font-semibold">
                      {tradeMode === "buy"
                        ? (parseFloat(tradeAmount) / parseFloat(selectedToken.currentPrice)).toFixed(2)
                        : (parseFloat(tradeAmount) * parseFloat(selectedToken.currentPrice)).toFixed(6)}
                    </span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-gray-400">Platform Fee (1%)</span>
                    <span className="text-yellow-400">
                      {(parseFloat(tradeAmount || "0") * 0.01).toFixed(6)}
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={handleTrade}
                disabled={!account || !selectedToken || !tradeAmount}
                className={\`w-full rounded-lg py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 \${
                  tradeMode === "buy"
                    ? "bg-green-600 hover:bg-green-500"
                    : "bg-red-600 hover:bg-red-500"
                }\`}
              >
                {!account
                  ? "Connect Wallet"
                  : !selectedToken
                  ? "Select a Token"
                  : tradeMode === "buy"
                  ? "Buy " + (selectedToken?.symbol || "")
                  : "Sell " + (selectedToken?.symbol || "")}
              </button>

              {/* Safety Info */}
              <div className="mt-4 rounded-lg border border-gray-700 p-3 text-xs text-gray-500 space-y-1">
                <p>Fair launch: 0% creator allocation</p>
                <p>LP locked permanently on graduation</p>
                <p>Platform fee capped at 1%</p>
                <p>No real liquidity manipulation before graduation</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-6 text-center text-sm text-gray-500">
        <p>Bonding Curve Launchpad — Built with Zapp</p>
        <p className="mt-1">
          Fair launch. LP locked on graduation. 1% platform fee.
        </p>
      </footer>
    </div>
  );
}
`;
