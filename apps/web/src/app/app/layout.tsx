"use client";

import { useState, useMemo } from "react";
import { usePathname } from "next/navigation";
import { CreditBalance } from "@/components/credits";
import { ConnectButton, AuthGuard } from "@/components/auth";

// ---------------------------------------------------------------------------
// Nav items
// ---------------------------------------------------------------------------

const NAV_ITEMS = [
  { href: "/app", label: "Projects", exact: true },
  { href: "/app/deploy", label: "Deploy", exact: false },
  { href: "/app/simulate", label: "Simulate", exact: false },
  { href: "/app/templates", label: "Templates", exact: false },
  { href: "/app/settings", label: "Settings", exact: false },
];

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Builder routes use their own full-width layout — bypass the sidebar shell
  const isBuilderRoute = useMemo(
    () => /\/app\/projects\/[^/]+\/builder/.test(pathname),
    [pathname],
  );

  if (isBuilderRoute) {
    return <AuthGuard>{children}</AuthGuard>;
  }

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  const navLinks = NAV_ITEMS.map((item) => {
    const active = isActive(item.href, item.exact);
    return (
      <a
        key={item.href}
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={`rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary ${
          active
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {item.label}
      </a>
    );
  });

  return (
    <div className="flex min-h-screen">
      {/* ── Desktop Sidebar ─────────────────────────────────────────── */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card md:flex md:flex-col">
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <a href="/" className="text-lg font-bold tracking-tight text-foreground">
            Zapp
          </a>
          <ConnectButton />
        </div>
        <nav className="flex flex-col gap-1 p-3">{navLinks}</nav>
        <div className="mt-auto border-t border-border p-3">
          <CreditBalance />
        </div>
      </aside>

      {/* ── Mobile Header ───────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col md:hidden">
        <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
          <a href="/" className="text-lg font-bold tracking-tight text-foreground">
            Zapp
          </a>
          <div className="flex items-center gap-3">
            <ConnectButton />
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label="Toggle menu"
            >
              {mobileOpen ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </header>

        {/* Mobile dropdown nav */}
        {mobileOpen && (
          <nav className="flex flex-col gap-1 border-b border-border bg-card p-3">
            {navLinks}
            <div className="mt-2 border-t border-border pt-2">
              <CreditBalance />
            </div>
          </nav>
        )}

        {/* Mobile main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl px-4 py-6">
            <AuthGuard>{children}</AuthGuard>
          </div>
        </main>
      </div>

      {/* ── Desktop Main Content ────────────────────────────────────── */}
      <main className="hidden flex-1 overflow-y-auto md:block">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <AuthGuard>{children}</AuthGuard>
        </div>
      </main>
    </div>
  );
}
