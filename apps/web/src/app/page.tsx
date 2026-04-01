"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConnectButton } from "@/components/auth/connect-button";
import { useAuthStore } from "@/stores/auth-store";
import { useCreditStore } from "@/stores/credit-store";

// ---------------------------------------------------------------------------
// Template type for the gallery teaser
// ---------------------------------------------------------------------------

interface Template {
  id: string;
  name: string;
  category?: string;
  priceCents?: number;
}

// ---------------------------------------------------------------------------
// Landing Page
// ---------------------------------------------------------------------------

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, connect } = useAuthStore();
  const balanceCents = useCreditStore((s) => s.balanceCents);

  // Redirect after wallet connection — use localStorage balance (no auth needed)
  useEffect(() => {
    if (!isAuthenticated) return;

    if (balanceCents >= 1000) {
      router.push("/app");
    } else {
      router.push("/app/load-credits");
    }
  }, [isAuthenticated, balanceCents, router]);

  // Fetch templates for gallery teaser
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    const apiBase =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    fetch(
      apiBase +
        "/templates.list?input=" +
        encodeURIComponent(JSON.stringify({ json: {} }))
    )
      .then((res) => res.json())
      .then((data) => {
        const wrapped = data?.result?.data;
        const list = wrapped?.json ?? wrapped;
        if (Array.isArray(list)) {
          setTemplates(list.slice(0, 4));
        }
      })
      .catch(() => {
        // silent — gallery is non-critical
      });
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between border-b border-surface-bright px-6 py-4">
        <span className="font-display text-xl font-bold tracking-tight text-primary">
          Zapp
        </span>
        <ConnectButton />
      </header>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section
        className="flex flex-col items-center justify-center px-6 py-24 text-center"
        style={{
          background:
            "radial-gradient(ellipse at top center, rgba(0, 79, 86, 0.13) 0%, #0e0e0f 60%)",
        }}
      >
        <div className="mx-auto max-w-2xl space-y-6">
          <h1 className="font-display text-4xl font-bold text-on-surface md:text-6xl">
            Build any dApp with plain English
          </h1>
          <p className="text-lg text-on-surface-variant">
            Smart contracts, frontends, and tokenomics — built by AI in minutes
          </p>
          <button
            onClick={connect}
            className="mt-4 inline-flex items-center rounded-sm bg-primary px-8 py-3 font-label font-semibold text-on-primary transition-colors hover:bg-primary/90"
          >
            Connect Wallet to Start Building &rarr;
          </button>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────────────── */}
      <section className="border-t border-surface-bright px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-center font-display text-3xl font-bold text-on-surface">
            How it works
          </h2>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
            {STEPS.map((step) => (
              <div
                key={step.number}
                className="rounded-sm bg-surface-container p-6"
              >
                <span className="font-display text-2xl font-bold text-primary">
                  {step.number}
                </span>
                <h3 className="mt-3 font-label font-semibold text-on-surface">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-on-surface-variant">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Template Gallery Teaser ─────────────────────────────────── */}
      <section className="border-t border-surface-bright px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-8 text-center font-display text-3xl font-bold text-on-surface">
            Template Gallery
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
            {templates.length > 0
              ? templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={connect}
                    className="rounded-sm bg-surface-container p-5 text-left transition-colors hover:bg-surface-container-high"
                  >
                    <h3 className="font-label font-semibold text-on-surface">
                      {t.name}
                    </h3>
                    {t.category && (
                      <span className="mt-2 inline-block rounded-sm bg-primary/10 px-2 py-0.5 font-label text-xs text-primary">
                        {t.category}
                      </span>
                    )}
                    {t.priceCents != null && (
                      <p className="mt-2 text-sm text-on-surface-variant">
                        ${(t.priceCents / 100).toFixed(0)}
                      </p>
                    )}
                  </button>
                ))
              : /* Skeleton placeholders while loading */
                Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-28 animate-pulse rounded-sm bg-surface-container"
                  />
                ))}
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={connect}
              className="font-label text-sm text-primary transition-colors hover:text-primary/80"
            >
              Connect Wallet to Browse All 45 &rarr;
            </button>
          </div>
        </div>
      </section>

      {/* ── Pricing Line ────────────────────────────────────────────── */}
      <section className="border-t border-surface-bright px-6 py-12">
        <p className="text-center text-sm text-on-surface-variant">
          Credits start at $10. Templates from $50-$500. AI edits ~$0.50 each.
          Pay only for what you use.
        </p>
      </section>

      {/* ── Footer CTA ──────────────────────────────────────────────── */}
      <section className="border-t border-surface-bright px-6 py-20">
        <div className="mx-auto max-w-md text-center">
          <button
            onClick={connect}
            className="inline-flex items-center rounded-sm bg-primary px-8 py-3 font-label font-semibold text-on-primary transition-colors hover:bg-primary/90"
          >
            Connect Wallet to Start Building &rarr;
          </button>
          <p className="mt-4 text-xs text-on-surface-variant">
            Pay with USDT, ETH, BTC, or SOL
          </p>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="border-t border-surface-bright px-6 py-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <span className="font-display text-sm font-bold text-primary">
            Zapp
          </span>
          <span className="text-xs text-on-surface-variant">
            &copy; {new Date().getFullYear()} Zapp
          </span>
        </div>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// How It Works steps data
// ---------------------------------------------------------------------------

const STEPS = [
  {
    number: "1",
    title: "Pick a template or describe your idea",
    description:
      "Choose from 45 proven DeFi and crypto-game architectures, or just describe what you want.",
  },
  {
    number: "2",
    title: "Chat with AI to customize",
    description:
      "Tweak tokenomics, APY rates, vesting schedules, and UI in plain English.",
  },
  {
    number: "3",
    title: "Preview & test live",
    description:
      "See your dApp running with simulated data. Test every flow before spending a cent on gas.",
  },
  {
    number: "4",
    title: "Deploy to any chain",
    description:
      "One-click deploy to Ethereum, Base, Arbitrum, or Polygon with a hosted frontend.",
  },
];
