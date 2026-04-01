"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { trpc } from "@/lib/trpc";

// ---------------------------------------------------------------------------
// Suggestion chips
// ---------------------------------------------------------------------------

const SUGGESTIONS = [
  "Yield farm on Base",
  "Token with tax",
  "Staking dApp",
  "Pump.fun clone",
];

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<string, { className: string; label: string }> = {
  deployed: { className: "text-tertiary", label: "Deployed" },
  generating: { className: "text-primary", label: "Generating" },
  compiled: { className: "text-on-surface-variant", label: "Compiled" },
  simulated: { className: "text-on-surface-variant", label: "Simulated" },
  failed: { className: "text-error", label: "Failed" },
  draft: { className: "text-on-surface-variant", label: "Draft" },
  testing: { className: "text-primary", label: "Testing" },
  deploying: { className: "text-primary", label: "Deploying" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.draft!;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-label font-medium ${s.className}`}>
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full ${
          status === "deployed"
            ? "bg-tertiary"
            : status === "failed"
              ? "bg-error"
              : "bg-on-surface-variant"
        }`}
      />
      {s.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Deterministic gradient from project name
// ---------------------------------------------------------------------------

function projectGradient(name: string) {
  const hash = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const hue1 = hash % 360;
  const hue2 = (hash * 7) % 360;
  return `linear-gradient(135deg, hsl(${hue1}, 70%, 40%), hsl(${hue2}, 60%, 30%))`;
}

// ---------------------------------------------------------------------------
// Dashboard Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const router = useRouter();
  const { address } = useAuthStore();
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data, isLoading } = trpc.projects.list.useQuery({ limit: 50 });
  const projects = data?.items ?? [];

  const createProject = trpc.projects.create.useMutation();

  const truncatedAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "";

  // ── Submit handler ──────────────────────────────────────────────────
  async function handleSubmit() {
    const text = inputValue.trim();
    if (!text) return;

    try {
      const proj = await createProject.mutateAsync({
        name: text.slice(0, 50),
        description: text,
        chain: "base",
      });
      router.push(
        `/app/projects/${proj.id}/builder?message=${encodeURIComponent(text)}`,
      );
    } catch {
      // TODO: surface error to user
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleChipClick(text: string) {
    setInputValue(text);
    inputRef.current?.focus();
  }

  // ── New blank project ───────────────────────────────────────────────
  async function handleNewBlankProject() {
    try {
      const proj = await createProject.mutateAsync({
        name: "Untitled Project",
        chain: "base",
      });
      router.push(`/app/projects/${proj.id}/builder`);
    } catch {
      // TODO: surface error
    }
  }

  return (
    <div className="space-y-10">
      {/* ── Greeting ────────────────────────────────────────────────── */}
      <div className="text-center">
        <h1 className="font-display text-2xl text-on-surface">
          Hey {truncatedAddress} — what do you want to build?
        </h1>
      </div>

      {/* ── Chat Input ──────────────────────────────────────────────── */}
      <div className="mx-auto w-full max-w-2xl">
        <div className="relative bg-surface-container rounded-sm p-4">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your dApp idea..."
            rows={3}
            className="w-full resize-none bg-transparent text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none font-sans text-sm leading-relaxed pr-12"
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!inputValue.trim() || createProject.isPending}
            className="absolute right-4 bottom-4 flex h-8 w-8 items-center justify-center rounded-sm bg-primary text-on-primary transition-colors hover:bg-primary/80 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Send"
          >
            {createProject.isPending ? (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            )}
          </button>
        </div>

        {/* ── Suggestion Chips ────────────────────────────────────── */}
        <div className="mt-3 flex flex-wrap gap-2 justify-center">
          {SUGGESTIONS.map((text) => (
            <button
              key={text}
              type="button"
              onClick={() => handleChipClick(text)}
              className="bg-surface-container rounded-full px-4 py-2 text-sm text-on-surface-variant hover:bg-surface-container-high hover:text-primary cursor-pointer transition-colors"
            >
              {text}
            </button>
          ))}
        </div>
      </div>

      {/* ── Projects Section ────────────────────────────────────────── */}
      <section id="projects">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg text-on-surface">Your Projects</h2>
          {projects.length > 3 && (
            <Link
              href="/app/templates"
              className="text-sm font-medium text-primary hover:underline"
            >
              See All &rarr;
            </Link>
          )}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3 text-on-surface-variant text-sm">
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
              </svg>
              Loading projects...
            </div>
          </div>
        )}

        {!isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/app/projects/${project.id}/builder`}
                className="group rounded-sm border border-surface-bright bg-surface-container overflow-hidden transition-colors hover:border-primary/50"
              >
                {/* Gradient thumbnail */}
                <div
                  className="h-24 w-full"
                  style={{ background: projectGradient(project.name) }}
                />
                {/* Card body */}
                <div className="p-4 space-y-2">
                  <h3 className="font-label font-semibold text-on-surface group-hover:text-primary transition-colors truncate">
                    {project.name}
                  </h3>
                  <div className="flex items-center justify-between">
                    <StatusBadge status={project.status} />
                    <span className="text-xs font-label text-on-surface-variant">
                      {project.chain}
                    </span>
                  </div>
                </div>
              </Link>
            ))}

            {/* New Project card */}
            <button
              type="button"
              onClick={handleNewBlankProject}
              disabled={createProject.isPending}
              className="group rounded-sm border-2 border-dashed border-surface-bright hover:border-primary bg-transparent flex flex-col items-center justify-center min-h-[168px] transition-colors cursor-pointer disabled:opacity-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-8 w-8 text-on-surface-variant group-hover:text-primary transition-colors"
              >
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
              </svg>
              <span className="mt-2 text-sm font-label text-on-surface-variant group-hover:text-primary transition-colors">
                New Project
              </span>
            </button>
          </div>
        )}

        {/* Templates CTA — shown when no projects exist */}
        {!isLoading && projects.length === 0 && (
          <div className="mt-6 text-center">
            <Link
              href="/app/templates"
              className="text-sm font-medium text-primary hover:underline"
            >
              Browse 45 templates &rarr;
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
