"use client";

// ---------------------------------------------------------------------------
// Chain Selector — pick the target EVM chain for deployment
// ---------------------------------------------------------------------------

interface Chain {
  id: number;
  name: string;
  icon: string;
}

const CHAINS: Chain[] = [
  { id: 1, name: "Ethereum", icon: "\u{1F48E}" },
  { id: 8453, name: "Base", icon: "\u{1F535}" },
  { id: 42161, name: "Arbitrum One", icon: "\u{1F537}" },
  { id: 137, name: "Polygon", icon: "\u{1F7E3}" },
];

export interface ChainSelectorProps {
  selectedChainId: number | null;
  onSelect: (chainId: number) => void;
}

export function ChainSelector({ selectedChainId, onSelect }: ChainSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {CHAINS.map((chain) => {
        const isSelected = selectedChainId === chain.id;
        return (
          <button
            key={chain.id}
            type="button"
            onClick={() => onSelect(chain.id)}
            className={`
              flex items-center gap-3 rounded-lg border p-4
              text-left transition-all
              focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
              focus:ring-offset-card
              ${
                isSelected
                  ? "border-primary ring-2 ring-primary bg-primary/5"
                  : "border-border bg-card hover:border-muted-foreground/40"
              }
            `}
          >
            {/* Chain icon */}
            <span className="text-2xl leading-none" role="img" aria-label={chain.name}>
              {chain.icon}
            </span>

            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">
                {chain.name}
              </span>
              <span className="inline-flex w-fit rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Mainnet
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
