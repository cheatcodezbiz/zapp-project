"use client";

import { create } from "zustand";

interface CreditState {
  /** Current balance in integer cents (e.g. 10000 = $100.00) */
  balanceCents: number;
  isLoading: boolean;
  /** Whether we've hydrated from the API at least once */
  hydrated: boolean;

  /** Add credits to the balance (already net of fees). */
  addCredits: (amountCents: number) => void;
  /** Spend credits. Returns false if the balance is insufficient. */
  spendCredits: (amountCents: number) => boolean;
  /** Set the balance directly (e.g. after fetching from the server). */
  setBalance: (cents: number) => void;
  /** Mark as loading */
  setLoading: (loading: boolean) => void;
}

/** Read persisted demo balance from localStorage. */
function getPersistedBalance(): number {
  if (typeof window === "undefined") return 0;
  const raw = localStorage.getItem("zapp_demo_credits");
  return raw ? Number(raw) : 0;
}

/** Persist balance to localStorage for testing. */
function persistBalance(cents: number) {
  if (typeof window !== "undefined") {
    localStorage.setItem("zapp_demo_credits", String(cents));
  }
}

export const useCreditStore = create<CreditState>((set, get) => ({
  balanceCents: getPersistedBalance(),
  isLoading: true,
  hydrated: false,

  addCredits: (amountCents) => {
    const next = get().balanceCents + amountCents;
    persistBalance(next);
    set({ balanceCents: next });
  },

  spendCredits: (amountCents) => {
    const { balanceCents } = get();
    if (amountCents > balanceCents) return false;
    const next = balanceCents - amountCents;
    persistBalance(next);
    set({ balanceCents: next });
    return true;
  },

  setBalance: (cents) => {
    persistBalance(cents);
    set({ balanceCents: cents, hydrated: true, isLoading: false });
  },

  setLoading: (loading) => set({ isLoading: loading }),
}));
