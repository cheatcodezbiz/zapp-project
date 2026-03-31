export interface ChainConfig {
  id: number;
  name: string;
  rpcUrl: string;
  blockExplorerUrl: string;
  depositContract: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  isTestnet: boolean;
}

export const SUPPORTED_CHAINS: ChainConfig[] = [
  {
    id: 1,
    name: "Ethereum",
    rpcUrl: process.env.NEXT_PUBLIC_ETH_RPC_URL ?? "https://eth.llamarpc.com",
    blockExplorerUrl: "https://etherscan.io",
    depositContract: "0x0000000000000000000000000000000000000000",
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
    isTestnet: false,
  },
  {
    id: 8453,
    name: "Base",
    rpcUrl: process.env.NEXT_PUBLIC_BASE_RPC_URL ?? "https://mainnet.base.org",
    blockExplorerUrl: "https://basescan.org",
    depositContract: "0x0000000000000000000000000000000000000000",
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
    isTestnet: false,
  },
  {
    id: 42161,
    name: "Arbitrum One",
    rpcUrl: process.env.NEXT_PUBLIC_ARB_RPC_URL ?? "https://arb1.arbitrum.io/rpc",
    blockExplorerUrl: "https://arbiscan.io",
    depositContract: "0x0000000000000000000000000000000000000000",
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
    isTestnet: false,
  },
  {
    id: 137,
    name: "Polygon",
    rpcUrl: process.env.NEXT_PUBLIC_POLYGON_RPC_URL ?? "https://polygon-rpc.com",
    blockExplorerUrl: "https://polygonscan.com",
    depositContract: "0x0000000000000000000000000000000000000000",
    nativeCurrency: {
      name: "POL",
      symbol: "POL",
      decimals: 18,
    },
    isTestnet: false,
  },
];

/**
 * Look up a chain configuration by its chain ID.
 * Returns undefined if the chain is not supported.
 */
export function getChainConfig(chainId: number): ChainConfig | undefined {
  return SUPPORTED_CHAINS.find((chain) => chain.id === chainId);
}
