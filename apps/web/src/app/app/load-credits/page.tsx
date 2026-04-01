"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useCreditStore } from "@/stores/credit-store";
import { ConnectButton } from "@/components/auth/connect-button";
import { trpc } from "@/lib/trpc";

// ---------------------------------------------------------------------------
// Credit packages
// ---------------------------------------------------------------------------

const PACKAGES = [
  { dollars: 10, credits: 1000, bonus: null },
  { dollars: 50, credits: 5500, bonus: "10% bonus" },
  { dollars: 100, credits: 12000, bonus: "20% bonus" },
  { dollars: 500, credits: 65000, bonus: "30% bonus" },
] as const;

const TOKENS = ["USDT", "ETH", "BTC", "SOL"] as const;

// ---------------------------------------------------------------------------
// Load Credits Page
// ---------------------------------------------------------------------------

export default function LoadCreditsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const balanceCents = useCreditStore((s) => s.balanceCents);
  const setBalance = useCreditStore((s) => s.setBalance);

  const [selectedPkg, setSelectedPkg] = useState(0);
  const [selectedToken, setSelectedToken] = useState<(typeof TOKENS)[number]>("USDT");

  // Fetch balance when authenticated
  const { data: balanceData } = trpc.credits.getBalance.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
  });

  // Sync balance from API
  useEffect(() => {
    if (balanceData) {
      setBalance(Number(balanceData.balance));
    }
  }, [balanceData, setBalance]);

  // Redirect to app if balance is sufficient
  useEffect(() => {
    if (balanceCents >= 1000) {
      router.push("/app");
    }
  }, [balanceCents, router]);

  const pkg = PACKAGES[selectedPkg]!;

  // Demo credits handler (MVP only)
  function handleGrantDemo() {
    useCreditStore.getState().setBalance(10000);
    router.push("/app");
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between border-b border-surface-bright bg-surface-container px-6 py-4">
        <span className="font-display text-xl font-bold tracking-tight text-primary">
          Zapp
        </span>
        <div className="flex items-center gap-4">
          {isAuthenticated && (
            <span className="text-sm text-on-surface-variant">
              {balanceCents > 0
                ? `$${(balanceCents / 100).toFixed(2)}`
                : "$0.00"}
            </span>
          )}
          <ConnectButton />
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <main className="flex flex-1 flex-col items-center px-6 py-16">
        <div className="w-full max-w-lg space-y-8">
          {/* Heading */}
          <div className="text-center">
            <h1 className="font-display text-3xl font-bold text-on-surface">
              Load Credits to Start
            </h1>
            <p className="mt-2 text-on-surface-variant">
              Minimum $10 to start building. Credits never expire.
            </p>
          </div>

          {/* ── Credit Packages ───────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            {PACKAGES.map((p, i) => (
              <button
                key={p.dollars}
                onClick={() => setSelectedPkg(i)}
                className={`rounded-sm p-4 text-left transition-all ${
                  selectedPkg === i
                    ? "border-2 border-primary bg-surface-container-high"
                    : "border-2 border-transparent bg-surface-container hover:bg-surface-container-high"
                }`}
              >
                <p className="font-display text-xl font-bold text-on-surface">
                  ${p.dollars}
                </p>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {p.credits.toLocaleString()} credits
                </p>
                {p.bonus && (
                  <span className="mt-2 inline-block rounded-sm bg-tertiary/10 px-2 py-0.5 font-label text-xs font-semibold text-tertiary">
                    {p.bonus}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Payment Token Selector ────────────────────────────────── */}
          <div>
            <p className="mb-3 font-label text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              Pay with
            </p>
            <div className="flex gap-2">
              {TOKENS.map((token) => (
                <button
                  key={token}
                  onClick={() => setSelectedToken(token)}
                  className={`flex-1 rounded-sm border px-3 py-2 font-label text-sm font-semibold transition-all ${
                    selectedToken === token
                      ? "border-primary bg-primary/20 text-primary"
                      : "border-outline-variant bg-surface-container text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {token}
                </button>
              ))}
            </div>
          </div>

          {/* ── CTA Button ────────────────────────────────────────────── */}
          <button
            className="w-full rounded-sm bg-primary py-3 font-label font-semibold text-on-primary transition-colors hover:bg-primary/90"
          >
            Load ${pkg.dollars} — Start Building
          </button>

          {/* ── What Credits Buy ──────────────────────────────────────── */}
          <div className="rounded-sm border border-surface-bright bg-surface-container p-5">
            <p className="mb-3 font-label text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              What credits buy
            </p>
            <ul className="space-y-2 text-sm text-on-surface-variant">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-primary">&#x2022;</span>
                Unlock a template: 5,000-50,000 credits
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-primary">&#x2022;</span>
                AI customization: ~50 credits per edit
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-primary">&#x2022;</span>
                Deployment guidance: 1,000 credits
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-primary">&#x2022;</span>
                Simulations: 200 credits each
              </li>
            </ul>
          </div>

          {/* ── Demo Credits (MVP only) ───────────────────────────────── */}
          <div className="text-center">
            <button
              onClick={handleGrantDemo}
              className="text-sm text-on-surface-variant transition-colors hover:text-on-surface"
            >
              Grant Demo Credits (testing only)
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
