"use client";

import { useState, useCallback } from "react";
import { ChainSelector, DeployStatus } from "@/components/deploy";
import { useCreditStore } from "@/stores/credit-store";
import { formatCredits } from "@/lib/format-credits";

// ---------------------------------------------------------------------------
// Chain metadata
// ---------------------------------------------------------------------------

const CHAINS = [
  { id: 1, name: "Ethereum", icon: "\u{1F48E}", explorer: "https://etherscan.io" },
  { id: 8453, name: "Base", icon: "\u{1F535}", explorer: "https://basescan.org" },
  { id: 42161, name: "Arbitrum One", icon: "\u{1F537}", explorer: "https://arbiscan.io" },
  { id: 137, name: "Polygon", icon: "\u{1F7E3}", explorer: "https://polygonscan.com" },
] as const;

/** Deployment gas fee in cents */
const DEPLOY_COST_CENTS = 500; // $5.00

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function randomAddress(): string {
  return (
    "0x" +
    Array.from({ length: 40 }, () =>
      Math.floor(Math.random() * 16).toString(16),
    ).join("")
  );
}

function randomTxHash(): string {
  return (
    "0x" +
    Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16),
    ).join("")
  );
}

// ---------------------------------------------------------------------------
// Deploy Page
// ---------------------------------------------------------------------------

type DeployState = "idle" | "deploying" | "deployed" | "failed";

export default function DeployPage() {
  const [selectedChainId, setSelectedChainId] = useState<number | null>(null);
  const [deployStatus, setDeployStatus] = useState<DeployState>("idle");
  const [proxyAddress, setProxyAddress] = useState<string>();
  const [implAddress, setImplAddress] = useState<string>();
  const [txHash, setTxHash] = useState<string>();
  const [deployError, setDeployError] = useState<string>();

  const balanceCents = useCreditStore((s) => s.balanceCents);
  const spendCredits = useCreditStore((s) => s.spendCredits);

  const selectedChain = CHAINS.find((c) => c.id === selectedChainId) ?? null;
  const canAfford = balanceCents >= DEPLOY_COST_CENTS;

  // ── Simulate deployment ─────────────────────────────────────────────

  const handleDeploy = useCallback(() => {
    if (!selectedChain) return;

    // Deduct credits
    const ok = spendCredits(DEPLOY_COST_CENTS);
    if (!ok) {
      setDeployStatus("failed");
      setDeployError("Insufficient credit balance. Please add credits.");
      return;
    }

    setDeployStatus("deploying");
    setDeployError(undefined);

    // Simulate stages over ~2.5 seconds, then succeed
    setTimeout(() => {
      setImplAddress(randomAddress());
      setProxyAddress(randomAddress());
      setTxHash(randomTxHash());
      setDeployStatus("deployed");
    }, 2800);
  }, [selectedChain, spendCredits]);

  const handleRetry = useCallback(() => {
    setDeployStatus("idle");
    setDeployError(undefined);
  }, []);

  const handleReset = useCallback(() => {
    setSelectedChainId(null);
    setDeployStatus("idle");
    setProxyAddress(undefined);
    setImplAddress(undefined);
    setTxHash(undefined);
    setDeployError(undefined);
  }, []);

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Deploy Your dApp
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a target chain and deploy your generated smart contracts.
        </p>
      </div>

      {/* Chain selector */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Select Chain
        </h2>
        <ChainSelector
          selectedChainId={selectedChainId}
          onSelect={setSelectedChainId}
        />
      </section>

      {/* Cost & deploy button */}
      <section className="flex items-center gap-4">
        <button
          type="button"
          disabled={!selectedChainId || deployStatus === "deploying" || !canAfford}
          onClick={handleDeploy}
          className="
            rounded-lg bg-primary px-5 py-2.5
            text-sm font-semibold text-primary-foreground
            transition-colors hover:bg-primary/80
            disabled:cursor-not-allowed disabled:opacity-50
            focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
            focus:ring-offset-card
          "
        >
          {deployStatus === "deploying" ? "Deploying..." : "Deploy"}
        </button>

        <span className="text-sm text-muted-foreground">
          Deployment gas fee:{" "}
          <span className="font-medium text-foreground">
            ~{formatCredits(DEPLOY_COST_CENTS)}
          </span>
        </span>

        {!canAfford && (
          <span className="text-xs font-medium text-red-500">
            Insufficient credits ({formatCredits(balanceCents)} available)
          </span>
        )}
      </section>

      {/* Deployment status */}
      <DeployStatus
        status={deployStatus}
        chainName={selectedChain?.name ?? ""}
        proxyAddress={proxyAddress}
        implementationAddress={implAddress}
        txHash={txHash}
        explorerUrl={selectedChain?.explorer}
        error={deployError}
        onRetry={handleRetry}
      />

      {/* Post-deployment actions */}
      {deployStatus === "deployed" && (
        <div className="flex items-center gap-3">
          <a
            href="/app"
            className="
              rounded-lg bg-primary px-4 py-2
              text-sm font-medium text-primary-foreground
              transition-colors hover:bg-primary/80
            "
          >
            View Project
          </a>
          <button
            type="button"
            onClick={handleReset}
            className="
              rounded-lg border border-border px-4 py-2
              text-sm font-medium text-foreground
              transition-colors hover:bg-secondary
            "
          >
            Deploy Another
          </button>
        </div>
      )}
    </div>
  );
}
