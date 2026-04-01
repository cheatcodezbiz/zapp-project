"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCreditStore } from "@/stores/credit-store";
import { formatCredits } from "@/lib/format-credits";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TemplateManifest {
  id: number;
  slug: string;
  name: string;
  description: string;
  category: string;
  tier: string;
  price: number;
  contracts: { filename: string; description: string }[];
  frontend: { filename: string; description: string } | null;
  configurableParameters: string[];
  securityFeatures: string[];
}

interface TemplateDetail {
  manifest: TemplateManifest;
  configurableParameters: string[];
  securityFeatures: string[];
  defaults: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TemplateDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const templateId = Number(params.id);

  const balanceCents = useCreditStore((s) => s.balanceCents);

  const [template, setTemplate] = useState<TemplateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);

  // Fetch template detail
  useEffect(() => {
    if (isNaN(templateId)) {
      setError("Invalid template ID");
      setLoading(false);
      return;
    }

    async function fetchTemplate() {
      try {
        setLoading(true);
        const url = `${apiBase}/templates.getById?input=${encodeURIComponent(
          JSON.stringify({ json: { id: templateId } }),
        )}`;
        const res = await fetch(url);
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          const msg =
            body?.error?.message ?? `Template ${templateId} not found`;
          throw new Error(msg);
        }
        const data = await res.json();
        const detail: TemplateDetail =
          data?.result?.data?.json ?? data?.result?.data;
        setTemplate(detail);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to load template";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    fetchTemplate();
  }, [templateId]);

  // Handle unlock
  const handleUnlock = useCallback(async () => {
    if (!template) return;
    setUnlocking(true);
    setUnlockError(null);

    try {
      const projectId = crypto.randomUUID();
      const res = await fetch(`${apiBase}/templates.unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          json: { templateId, projectId },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorData = data?.error;
        if (errorData?.data?.code === "UNAUTHORIZED") {
          setUnlockError("Sign in required. Please connect your wallet first.");
          return;
        }
        if (errorData?.data?.code === "PRECONDITION_FAILED") {
          setUnlockError(
            "Insufficient credits to unlock this template. Please load more credits.",
          );
          return;
        }
        setUnlockError(errorData?.message ?? "Failed to unlock template");
        return;
      }

      const result = data?.result?.data?.json ?? data?.result?.data ?? data;

      // Deduct credits locally (MVP — server is public, credits managed client-side)
      const { spendCredits } = useCreditStore.getState();
      spendCredits(template.manifest.price);

      // Navigate to builder
      router.push(`/app/projects/${projectId}/builder`);
    } catch {
      setUnlockError("Network error. Please try again.");
    } finally {
      setUnlocking(false);
    }
  }, [template, templateId, router]);

  // ── Loading ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6 py-4">
        <div className="h-4 w-40 animate-pulse rounded bg-surface-container-high" />
        <div className="h-8 w-80 animate-pulse rounded bg-surface-container-high" />
        <div className="h-4 w-full animate-pulse rounded bg-surface-container-high" />
        <div className="h-64 animate-pulse rounded-sm bg-surface-container" />
      </div>
    );
  }

  // ── Error / Not Found ──────────────────────────────────────────────────
  if (error || !template) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg font-display text-on-surface">
          Template not found
        </p>
        <p className="mt-2 text-sm text-on-surface-variant">
          {error ?? "The template you're looking for doesn't exist."}
        </p>
        <Link
          href="/app/templates"
          className="mt-6 inline-flex h-10 items-center rounded-sm bg-primary px-6 text-sm font-label font-semibold text-on-primary"
        >
          Back to Templates
        </Link>
      </div>
    );
  }

  const m = template.manifest;
  const priceUsd = (m.price / 100).toFixed(0);
  const insufficientCredits = balanceCents < m.price;

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-4">
      {/* Back link */}
      <Link
        href="/app/templates"
        className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant transition-colors hover:text-primary"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Templates
      </Link>

      {/* Template Header */}
      <div>
        <h1 className="font-display text-3xl text-on-surface">{m.name}</h1>
        <p className="mt-2 text-base text-on-surface-variant">
          {m.description}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <span className="rounded-full bg-surface-container-high px-3 py-0.5 text-xs text-on-surface-variant capitalize">
            {m.category}
          </span>
          <span className="rounded-full bg-surface-container-high px-3 py-0.5 text-xs text-on-surface-variant capitalize">
            {m.tier}
          </span>
        </div>
      </div>

      {/* Contracts Section */}
      {m.contracts.length > 0 && (
        <div>
          <h2 className="mb-3 font-display text-lg text-on-surface">
            Contracts
          </h2>
          <div className="space-y-2">
            {m.contracts.map((c) => (
              <div
                key={c.filename}
                className="rounded-sm bg-surface-container p-4"
              >
                <p className="font-mono text-sm text-primary">{c.filename}</p>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {c.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Frontend Section */}
      {m.frontend && (
        <div>
          <h2 className="mb-3 font-display text-lg text-on-surface">
            Frontend
          </h2>
          <div className="rounded-sm bg-surface-container p-4">
            <p className="font-mono text-sm text-primary">
              {m.frontend.filename}
            </p>
            <p className="mt-1 text-sm text-on-surface-variant">
              {m.frontend.description}
            </p>
          </div>
        </div>
      )}

      {/* Security Features */}
      {template.securityFeatures.length > 0 && (
        <div>
          <h2 className="mb-3 font-display text-lg text-on-surface">
            Security Features
          </h2>
          <ul className="space-y-2">
            {template.securityFeatures.map((feature) => (
              <li key={feature} className="flex items-center gap-2">
                <span className="text-tertiary">✓</span>
                <span className="text-sm text-on-surface">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Configurable Parameters */}
      {template.configurableParameters.length > 0 && (
        <div>
          <h2 className="mb-3 font-display text-lg text-on-surface">
            Configurable Parameters
          </h2>
          <ul className="space-y-1.5">
            {template.configurableParameters.map((param) => (
              <li
                key={param}
                className="flex items-center gap-2 text-sm text-on-surface-variant"
              >
                <span className="text-on-surface-variant">&#8226;</span>
                <span>{param}</span>
                {template.defaults[param] !== undefined && (
                  <span className="text-xs text-on-surface-variant/60">
                    (default: {String(template.defaults[param])})
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Unlock CTA */}
      <div className="rounded-sm border border-surface-bright bg-surface-container p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-on-surface-variant">
                {priceUsd} credits (${priceUsd})
              </p>
              <p className="mt-1 text-sm text-on-surface-variant">
                Your balance: {formatCredits(balanceCents)}
              </p>
            </div>
          </div>

          {insufficientCredits && (
            <div className="flex items-center justify-between rounded-sm bg-error/10 px-4 py-2">
              <span className="text-sm text-error">Insufficient credits</span>
              <Link
                href="/app/load-credits"
                className="text-sm font-label font-semibold text-error hover:underline"
              >
                Load More Credits →
              </Link>
            </div>
          )}

          {unlockError && (
            <div className="rounded-sm bg-error/10 px-4 py-2 text-sm text-error">
              {unlockError}
            </div>
          )}

          <button
            type="button"
            onClick={handleUnlock}
            disabled={unlocking || insufficientCredits}
            className="w-full rounded-sm bg-primary px-8 py-3 font-label font-semibold text-on-primary transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {unlocking ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary/30 border-t-on-primary" />
                Unlocking...
              </span>
            ) : (
              "Unlock & Start Building"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
