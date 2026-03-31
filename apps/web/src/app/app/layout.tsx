"use client";

import { useState, useMemo } from "react";
import { usePathname } from "next/navigation";
import { CreditBalance } from "@/components/credits";
import { ConnectButton, AuthGuard } from "@/components/auth";

// ---------------------------------------------------------------------------
// Nav items with icons
// ---------------------------------------------------------------------------

const NAV_ITEMS = [
  { href: "/app", label: "Dashboard", exact: true, icon: "dashboard" },
  { href: "/app/templates", label: "Builder", exact: false, icon: "builder" },
  { href: "/app/deploy", label: "Contracts", exact: false, icon: "contracts" },
  { href: "/app/simulate", label: "Deploy", exact: false, icon: "deploy" },
  { href: "/app/settings", label: "Settings", exact: false, icon: "settings" },
];

function NavIcon({ icon, className }: { icon: string; className?: string }) {
  const cls = `h-5 w-5 ${className || ""}`;
  switch (icon) {
    case "dashboard":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={cls}>
          <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
        </svg>
      );
    case "builder":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={cls}>
          <path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z" />
        </svg>
      );
    case "contracts":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={cls}>
          <path d="M20 19.59V8l-6-6H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c.45 0 .85-.15 1.19-.4l-4.43-4.43c-.8.52-1.74.83-2.76.83-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5c0 1.02-.31 1.96-.83 2.75L20 19.59zM9 13c0 1.66 1.34 3 3 3s3-1.34 3-3-1.34-3-3-3-3 1.34-3 3z" />
        </svg>
      );
    case "deploy":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={cls}>
          <path d="M9.19 6.35c-2.04 2.29-3.44 5.58-3.57 5.89L2 10.69l4.05-4.05c.47-.47 1.15-.68 1.81-.55l1.33.26zM11.17 17s3.74-1.55 5.89-3.7c5.4-5.4 4.5-9.62 4.21-10.57-.95-.3-5.17-1.19-10.57 4.21C8.55 9.09 7 12.83 7 12.83L11.17 17zm6.48-2.85c-2.29 2.04-5.58 3.44-5.89 3.57L13.31 22l4.05-4.05c.47-.47.68-1.15.55-1.81l-.26-1.33zM9 18c0 .83-.34 1.58-.88 2.12C6.94 21.3 2 22 2 22s.7-4.94 1.88-6.12A2.996 2.996 0 019 18zm-1.59-1.59C6.89 16.15 6.27 16 5.59 16c-.07.65-.16 1.41-.32 2.16.75-.16 1.51-.25 2.16-.32-.03-.64-.17-1.26-.43-1.77l-.01.01-.58-.67z" />
        </svg>
      );
    case "settings":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={cls}>
          <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
        </svg>
      );
    default:
      return null;
  }
}

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

  return (
    <div className="flex min-h-screen">
      {/* ── Desktop Sidebar ─────────────────────────────────────────── */}
      <aside className="hidden w-64 shrink-0 bg-surface-container-low md:flex md:flex-col py-6">
        {/* Logo */}
        <div className="px-6 mb-10">
          <div className="flex items-center gap-2 text-primary">
            <span className="font-display text-xl font-bold tracking-tight">Zapp</span>
          </div>
          <p className="mt-1 font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/50">
            Pro Builder
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 text-sm transition-all click-feedback-subtle ${
                  active
                    ? "rounded-r-full bg-surface-container-high text-primary font-bold border-l-4 border-primary"
                    : "rounded-full text-on-surface-variant hover:text-primary hover:bg-surface-container"
                }`}
              >
                <NavIcon icon={item.icon} className={active ? "text-primary" : ""} />
                <span className="font-display tracking-tight">{item.label}</span>
              </a>
            );
          })}
        </nav>

        {/* Bottom area */}
        <div className="px-6 mt-auto">
          {/* New Project CTA */}
          <button className="w-full py-4 bg-primary text-on-primary rounded-full font-display font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(143,245,255,0.2)] hover:shadow-[0_0_30px_rgba(143,245,255,0.4)] transition-all active:scale-95">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
            </svg>
            New Project
          </button>

          {/* Wallet chip */}
          <div className="mt-6">
            <ConnectButton />
          </div>

          {/* Credits */}
          <div className="mt-4">
            <CreditBalance />
          </div>
        </div>
      </aside>

      {/* ── Mobile Header ───────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col md:hidden">
        <header className="flex h-14 items-center justify-between bg-surface-container-low px-4">
          <span className="font-display text-lg font-bold text-primary">Zapp</span>
          <div className="flex items-center gap-3">
            <ConnectButton />
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="rounded-full p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
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
          <nav className="flex flex-col gap-1 bg-surface-container-low p-3">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href, item.exact);
              return (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 rounded-full px-4 py-3 text-sm font-display transition-colors ${
                    active
                      ? "bg-surface-container-high text-primary font-bold"
                      : "text-on-surface-variant hover:text-primary hover:bg-surface-container"
                  }`}
                >
                  <NavIcon icon={item.icon} />
                  {item.label}
                </a>
              );
            })}
            <div className="mt-2 pt-2">
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
