"use client";

import { useAuthStore } from "@/stores/auth-store";
import { ConnectButton } from "@/components/auth/connect-button";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-high">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-muted-foreground"
            >
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            Connect your wallet to continue
          </h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Sign in with your Ethereum wallet to access the Zapp dApp builder.
          </p>
        </div>
        <ConnectButton />
      </div>
    );
  }

  return <>{children}</>;
}
