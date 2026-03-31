"use client";

import { useState } from "react";
import { useCreditStore } from "@/stores/credit-store";
import { formatCredits, calculateFee } from "@/lib/format-credits";

// ---------------------------------------------------------------------------
// Preset amounts (in cents)
// ---------------------------------------------------------------------------

const PRESETS = [
  { label: "$10", cents: 1_000 },
  { label: "$25", cents: 2_500 },
  { label: "$50", cents: 5_000 },
  { label: "$100", cents: 10_000 },
] as const;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CreditTopUpProps {
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// CreditTopUp
// ---------------------------------------------------------------------------

export function CreditTopUp({ onClose }: CreditTopUpProps) {
  const addCredits = useCreditStore((s) => s.addCredits);

  const [selectedCents, setSelectedCents] = useState<number>(5_000);
  const [customInput, setCustomInput] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [success, setSuccess] = useState(false);
  const [creditedCents, setCreditedCents] = useState(0);

  // Resolve the active deposit amount
  const depositCents = isCustom
    ? Math.round((parseFloat(customInput) || 0) * 100)
    : selectedCents;

  const { fee, net } = calculateFee(depositCents);
  const isValid = depositCents >= 100; // minimum $1.00

  // ---------- handlers ----------

  function selectPreset(cents: number) {
    setIsCustom(false);
    setSelectedCents(cents);
  }

  function handleCustomChange(value: string) {
    // Allow only digits and a single decimal point
    if (/^\d*\.?\d{0,2}$/.test(value)) {
      setCustomInput(value);
      setIsCustom(true);
    }
  }

  function handleTopUp() {
    if (!isValid || net <= 0) return;
    addCredits(net);
    setCreditedCents(net);
    setSuccess(true);
  }

  // ---------- success state ----------

  if (success) {
    return (
      <Backdrop onClose={onClose}>
        <div className="flex flex-col items-center gap-4 py-4">
          {/* Checkmark */}
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-6 w-6 text-emerald-400"
            >
              <path
                fillRule="evenodd"
                d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            Credits Added!
          </h3>
          <p className="text-sm text-muted-foreground">
            {formatCredits(creditedCents)} has been added to your balance.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="
              mt-2 rounded-md bg-primary px-4 py-2
              text-sm font-medium text-primary-foreground
              transition-colors hover:bg-primary/80
              focus:outline-none focus:ring-2 focus:ring-primary
            "
          >
            Done
          </button>
        </div>
      </Backdrop>
    );
  }

  // ---------- main form ----------

  return (
    <Backdrop onClose={onClose}>
      <h2 className="text-lg font-semibold text-foreground">
        Add Credits
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Simulated top-up &mdash; no real payment processed.
      </p>

      {/* ---- Preset buttons ---- */}
      <div className="mt-5 grid grid-cols-4 gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.cents}
            type="button"
            onClick={() => selectPreset(p.cents)}
            className={`
              rounded-md border px-3 py-2 text-sm font-medium transition-colors
              focus:outline-none focus:ring-2 focus:ring-primary
              ${
                !isCustom && selectedCents === p.cents
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-surface-container text-on-surface-variant hover:border-primary/50"
              }
            `}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* ---- Custom input ---- */}
      <div className="mt-3">
        <label
          htmlFor="topup-custom"
          className="mb-1 block text-xs text-muted-foreground"
        >
          Or enter a custom amount
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
            $
          </span>
          <input
            id="topup-custom"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={customInput}
            onFocus={() => setIsCustom(true)}
            onChange={(e) => handleCustomChange(e.target.value)}
            className="
              w-full rounded-md border border-border bg-surface-container py-2 pl-7 pr-3
              text-sm tabular-nums text-foreground
              placeholder:text-muted-foreground/50
              focus:outline-none focus:ring-2 focus:ring-primary
            "
          />
        </div>
      </div>

      {/* ---- Fee breakdown ---- */}
      {depositCents > 0 && (
        <div className="mt-4 space-y-1 rounded-md border border-border bg-surface-container p-3 text-sm">
          <Row label="Deposit" value={formatCredits(depositCents)} />
          <Row
            label="Platform fee (7.5%)"
            value={`-${formatCredits(fee)}`}
            muted
          />
          <div className="my-1 border-t border-border" />
          <Row
            label="Credits received"
            value={formatCredits(net)}
            bold
          />
        </div>
      )}

      {/* ---- Actions ---- */}
      <div className="mt-5 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="
            rounded-md px-4 py-2 text-sm font-medium text-muted-foreground
            transition-colors hover:text-foreground
            focus:outline-none focus:ring-2 focus:ring-primary
          "
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!isValid}
          onClick={handleTopUp}
          className="
            rounded-md bg-primary px-4 py-2
            text-sm font-medium text-primary-foreground
            transition-colors hover:bg-primary/80
            disabled:cursor-not-allowed disabled:opacity-40
            focus:outline-none focus:ring-2 focus:ring-primary
          "
        >
          Top Up
        </button>
      </div>
    </Backdrop>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Modal backdrop + centered card. */
function Backdrop({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* overlay */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
        role="button"
        tabIndex={-1}
        aria-label="Close dialog"
      />
      {/* card */}
      <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
        {children}
      </div>
    </div>
  );
}

/** Single row in the fee breakdown. */
function Row({
  label,
  value,
  muted,
  bold,
}: {
  label: string;
  value: string;
  muted?: boolean;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span
        className={
          muted
            ? "text-muted-foreground"
            : bold
              ? "font-medium text-foreground"
              : "text-foreground"
        }
      >
        {label}
      </span>
      <span
        className={`tabular-nums ${
          muted
            ? "text-muted-foreground"
            : bold
              ? "font-semibold text-foreground"
              : "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
