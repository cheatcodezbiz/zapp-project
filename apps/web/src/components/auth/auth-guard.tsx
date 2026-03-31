"use client";

// NOTE: Wallet gate disabled for MVP. Re-enable when deploying with real auth.
export function AuthGuard({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
