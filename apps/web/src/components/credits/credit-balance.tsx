"use client";

import { useState } from "react";
import { useCreditStore } from "@/stores/credit-store";
import { formatCredits } from "@/lib/format-credits";
import { CreditTopUp } from "./credit-topup";

// ---------------------------------------------------------------------------
// Wallet icon (inline SVG)
// ---------------------------------------------------------------------------

function WalletIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0"
    >
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// CreditBalance
// ---------------------------------------------------------------------------

export function CreditBalance() {
  const balanceCents = useCreditStore((s) => s.balanceCents);
  const [showTopUp, setShowTopUp] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5">
        <WalletIcon />
        <span className="text-sm font-medium tabular-nums text-foreground">
          {formatCredits(balanceCents)}
        </span>
        <button
          type="button"
          onClick={() => setShowTopUp(true)}
          className="
            ml-1 rounded-md bg-primary px-2 py-0.5
            text-xs font-medium text-primary-foreground
            transition-colors hover:bg-primary/80
            focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
            focus:ring-offset-card
          "
        >
          Add Credits
        </button>
      </div>

      {showTopUp && <CreditTopUp onClose={() => setShowTopUp(false)} />}
    </>
  );
}
