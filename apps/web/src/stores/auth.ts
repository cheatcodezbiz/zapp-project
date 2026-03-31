import { create } from "zustand";

interface Session {
  token: string;
  expiresAt: number;
}

interface AuthState {
  /** Connected wallet address (e.g. "0x...") */
  walletAddress: string | null;
  /** Active session after SIWE or similar auth */
  session: Session | null;
  /** Derived — true when we have both a wallet and a valid session */
  isAuthenticated: boolean;

  /** Set the connected wallet address */
  setWalletAddress: (address: string | null) => void;
  /** Store a session after authentication */
  setSession: (session: Session | null) => void;
  /** Clear everything on disconnect / sign-out */
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  walletAddress: null,
  session: null,
  isAuthenticated: false,

  setWalletAddress: (address) =>
    set((state) => ({
      walletAddress: address,
      isAuthenticated: !!address && !!state.session,
    })),

  setSession: (session) =>
    set((state) => ({
      session,
      isAuthenticated: !!state.walletAddress && !!session,
    })),

  reset: () =>
    set({
      walletAddress: null,
      session: null,
      isAuthenticated: false,
    }),
}));
