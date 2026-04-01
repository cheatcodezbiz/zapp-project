"use client";

import Link from "next/link";
import { useCreditStore } from "@/stores/credit-store";
import { formatCredits } from "@/lib/format-credits";

// ---------------------------------------------------------------------------
// Builder Layout — Top bar with back link, credit balance, deploy button
// ---------------------------------------------------------------------------

export default function BuilderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const balanceCents = useCreditStore((s) => s.balanceCents);

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Top bar */}
      <div className="flex h-12 shrink-0 items-center justify-between bg-surface-container-low px-4 border-b border-surface-bright">
        {/* Left: Back link + Builder label */}
        <div className="flex items-center gap-3">
          <Link
            href="/app"
            className="flex items-center gap-1.5 text-sm text-on-surface-variant transition-colors hover:text-primary"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Dashboard
          </Link>
          <span className="text-sm font-display font-medium text-on-surface">
            Builder
          </span>
        </div>

        {/* Right: Credit balance + Deploy button */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-label text-on-surface-variant">
            {formatCredits(balanceCents)}
          </span>
          <button
            type="button"
            className="rounded-sm bg-primary px-4 py-1.5 text-sm font-label text-on-primary"
          >
            Deploy
          </button>
        </div>
      </div>

      {/* Content area — full height */}
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
