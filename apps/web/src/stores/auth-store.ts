"use client";

import { create } from "zustand";

interface AuthState {
  /** Connected wallet address or null */
  address: string | null;
  /** Display name (truncated address) */
  displayName: string | null;
  /** Whether currently connecting */
  isConnecting: boolean;
  /** Whether user is authenticated (has signed message) */
  isAuthenticated: boolean;

  connect: () => Promise<void>;
  disconnect: () => void;
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export const useAuthStore = create<AuthState>((set) => ({
  address: null,
  displayName: null,
  isConnecting: false,
  isAuthenticated: false,

  connect: async () => {
    set({ isConnecting: true });

    try {
      if (typeof window === "undefined" || !window.ethereum) {
        // MVP fallback: simulate a wallet connection with a random address
        const simulated =
          "0x" +
          Array.from({ length: 40 }, () =>
            Math.floor(Math.random() * 16).toString(16),
          ).join("");

        set({
          address: simulated,
          displayName: truncateAddress(simulated),
          isConnecting: false,
          isAuthenticated: true,
        });
        return;
      }

      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];

      const first = accounts[0];
      if (!first) {
        set({ isConnecting: false });
        return;
      }

      const address = first;

      // MVP: auto-authenticate after connecting (skip actual SIWE signature)
      set({
        address,
        displayName: truncateAddress(address),
        isConnecting: false,
        isAuthenticated: true,
      });
    } catch {
      set({ isConnecting: false });
    }
  },

  disconnect: () => {
    set({
      address: null,
      displayName: null,
      isConnecting: false,
      isAuthenticated: false,
    });
  },
}));
