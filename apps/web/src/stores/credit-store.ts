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

export const useCreditStore = create<CreditState>((set, get) => ({
  balanceCents: 0,
  isLoading: true,
  hydrated: false,

  addCredits: (amountCents) =>
    set((state) => ({
      balanceCents: state.balanceCents + amountCents,
    })),

  spendCredits: (amountCents) => {
    const { balanceCents } = get();
    if (amountCents > balanceCents) return false;
    set({ balanceCents: balanceCents - amountCents });
    return true;
  },

  setBalance: (cents) => set({ balanceCents: cents, hydrated: true, isLoading: false }),

  setLoading: (loading) => set({ isLoading: loading }),
}));
