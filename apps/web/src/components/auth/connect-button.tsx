"use client";

import { useState, useRef, useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";

export function ConnectButton() {
  const { address, displayName, isConnecting, isAuthenticated, connect, disconnect } =
    useAuthStore();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  if (!isAuthenticated) {
    return (
      <button
        onClick={connect}
        disabled={isConnecting}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {isConnecting ? "Connecting..." : "Connect Wallet"}
      </button>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-lg border border-border bg-surface-container px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-container-high"
      >
        <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
        {displayName}
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-border bg-card p-1 shadow-lg">
          <div className="px-3 py-2 text-xs text-muted-foreground">
            {address}
          </div>
          <hr className="my-1 border-border" />
          <button
            onClick={() => {
              disconnect();
              setMenuOpen(false);
            }}
            className="w-full rounded-md px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-surface-container-high"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
