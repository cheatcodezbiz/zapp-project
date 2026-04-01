"use client";

import { useState, useMemo, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { useCreditStore } from "@/stores/credit-store";
import { CreditBalance } from "@/components/credits";
import { ConnectButton } from "@/components/auth";
import { formatCredits } from "@/lib/format-credits";
import { trpc } from "@/lib/trpc";

// ---------------------------------------------------------------------------
// Nav icons (inline SVGs)
// ---------------------------------------------------------------------------

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className ?? "h-5 w-5"}>
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </svg>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className ?? "h-5 w-5"}>
      <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
    </svg>
  );
}

function GridIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className ?? "h-5 w-5"}>
      <path d="M3 3h8v8H3V3zm0 10h8v8H3v-8zm10-10h8v8h-8V3zm0 10h8v8h-8v-8z" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className ?? "h-5 w-5"}>
      <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Nav config
// ---------------------------------------------------------------------------

const NAV_ITEMS = [
  { href: "/app", label: "Home", exact: true, Icon: HomeIcon },
  { href: "/app/templates", label: "Templates", exact: false, Icon: GridIcon },
  { href: "/app/settings", label: "Settings", exact: false, Icon: SettingsIcon },
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
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const { isAuthenticated, address } = useAuthStore();
  const { balanceCents } = useCreditStore();

  useEffect(() => setMounted(true), []);

  // ── Wallet + Credit Gate ───────────────────────────────────────────────
  useEffect(() => {
    // Allow load-credits page without credit gate
    if (pathname === "/app/load-credits") return;

    if (!isAuthenticated) {
      router.replace("/");
      return;
    }
    if (balanceCents < 1000) {
      router.replace("/app/load-credits");
      return;
    }
  }, [isAuthenticated, balanceCents, pathname, router]);

  // ── Builder route detection ─────────────────────────────────────────────
  const isBuilderRoute = useMemo(
    () => /\/app\/projects\/[^/]+\/builder/.test(pathname),
    [pathname],
  );

  // ── Recent projects (hook must be called before any early return) ──────
  const { data: recentData } = trpc.projects.list.useQuery(
    { limit: 5 },
    { enabled: isAuthenticated && !isBuilderRoute },
  );
  const recentProjects = recentData?.items ?? [];

  // Builder routes use their own full-width layout — bypass sidebar shell
  if (isBuilderRoute) {
    return <>{children}</>;
  }

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  const truncatedAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "";

  return (
    <div className="flex min-h-screen bg-surface">
      {/* ── Desktop Sidebar ─────────────────────────────────────────── */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-surface-bright bg-surface-container-low md:flex">
        {/* Logo */}
        <div className="px-5 pt-6 pb-6">
          <div className="flex items-center gap-2">
            <span className="font-display text-xl font-bold tracking-tight text-primary">
              Zapp
            </span>
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-3 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-sm text-sm transition-colors ${
                  active
                    ? "bg-surface-container-high text-primary font-medium"
                    : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                }`}
              >
                <item.Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Projects nav item — scrolls to projects section on dashboard */}
          <Link
            href="/app#projects"
            className={`flex items-center gap-3 px-4 py-2.5 rounded-sm text-sm transition-colors text-on-surface-variant hover:bg-surface-container hover:text-on-surface`}
          >
            <FolderIcon className="h-5 w-5" />
            <span>Projects</span>
          </Link>

          {/* ── Recent Projects ────────────────────────────────────── */}
          {recentProjects.length > 0 && (
            <div className="mt-6 pt-4 border-t border-surface-bright">
              <p className="px-4 mb-2 font-label text-xs uppercase tracking-wider text-on-surface-variant">
                Recent
              </p>
              <div className="space-y-0.5">
                {recentProjects.slice(0, 5).map((project) => (
                  <Link
                    key={project.id}
                    href={`/app/projects/${project.id}/builder`}
                    className="flex items-center gap-2 px-4 py-2 rounded-sm text-sm text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors truncate"
                    title={project.name}
                  >
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-surface-bright shrink-0" />
                    <span className="truncate">{project.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* ── Bottom section ──────────────────────────────────────── */}
        <div className="mt-auto border-t border-surface-bright px-4 py-4 space-y-3">
          {/* Credit balance + Buy More */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 text-on-surface-variant"
              >
                <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
              </svg>
              <span className="text-sm font-medium tabular-nums text-on-surface" suppressHydrationWarning>
                {mounted ? formatCredits(balanceCents) : "$0.00"}
              </span>
            </div>
            <Link
              href="/app/load-credits"
              className="text-xs font-medium text-primary hover:underline"
            >
              Buy More
            </Link>
          </div>

          {/* Wallet address */}
          {address && (
            <div className="flex items-center gap-2 text-xs text-on-surface-variant">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500 shrink-0" />
              <span className="font-mono">{truncatedAddress}</span>
            </div>
          )}

          {/* Connect/Disconnect button */}
          <ConnectButton />
        </div>
      </aside>

      {/* ── Mobile Header ───────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between bg-surface-container-low px-4 md:hidden">
          {/* Hamburger */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-sm p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
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

          {/* Logo centered */}
          <span className="font-display text-lg font-bold text-primary">Zapp</span>

          {/* Credit balance on right */}
          <span className="text-sm font-medium tabular-nums text-on-surface" suppressHydrationWarning>
            {mounted ? formatCredits(balanceCents) : "$0.00"}
          </span>
        </header>

        {/* Mobile dropdown nav */}
        {mobileOpen && (
          <nav className="flex flex-col gap-1 bg-surface-container-low p-3 md:hidden border-b border-surface-bright">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-sm text-sm transition-colors ${
                    active
                      ? "bg-surface-container-high text-primary font-medium"
                      : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                  }`}
                >
                  <item.Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/app#projects"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 rounded-sm text-sm text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
            >
              <FolderIcon className="h-5 w-5" />
              Projects
            </Link>
            <div className="mt-2 pt-2 border-t border-surface-bright px-2">
              <CreditBalance />
            </div>
            <div className="px-2 mt-2">
              <ConnectButton />
            </div>
          </nav>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl px-6 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
