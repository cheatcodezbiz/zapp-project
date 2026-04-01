"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

// ---------------------------------------------------------------------------
// Types matching the API response
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

interface UnlockResult {
  success: boolean;
  templateName: string;
  newBalance: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const TIER_COLORS: Record<string, string> = {
  utility: "bg-gray-600 text-gray-100",
  standard: "bg-indigo-600 text-indigo-100",
  advanced: "bg-purple-600 text-purple-100",
  platform: "bg-amber-600 text-amber-100",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TemplateDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const templateId = Number(params.id);

  const [template, setTemplate] = useState<TemplateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlockSuccess, setUnlockSuccess] = useState<UnlockResult | null>(null);

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
          if (res.status === 404 || res.status === 500) {
            // tRPC wraps NOT_FOUND as 500 with error shape
            const body = await res.json().catch(() => null);
            const msg =
              body?.error?.message ?? `Template ${templateId} not found`;
            throw new Error(msg);
          }
          throw new Error(`API error: ${res.status}`);
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
          setUnlockError(errorData.message);
          return;
        }
        setUnlockError(errorData?.message ?? "Failed to unlock template");
        return;
      }

      const result = data?.result?.data?.json ?? data?.result?.data;
      setUnlockSuccess(result);

      // Redirect after a short delay so user sees success
      setTimeout(() => {
        router.push(`/app/projects/new?templateId=${templateId}`);
      }, 1500);
    } catch (err) {
      setUnlockError("Network error. Please try again.");
    } finally {
      setUnlocking(false);
    }
  }, [template, templateId, router]);

  // ── Loading ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-600 border-t-indigo-500" />
        <span className="ml-3 text-gray-400">Loading template...</span>
      </div>
    );
  }

  // ── Error / Not Found ──────────────────────────────────────────────────
  if (error || !template) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg font-medium text-white">Template not found</p>
        <p className="mt-2 text-sm text-gray-400">
          {error ?? "The template you're looking for doesn't exist."}
        </p>
        <a
          href="/app/templates"
          className="mt-6 inline-flex h-10 items-center rounded-md bg-indigo-600 px-6 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Back to Templates
        </a>
      </div>
    );
  }

  const m = template.manifest;
  const priceUsd = (m.price / 100).toFixed(0);

  // ── Success State ──────────────────────────────────────────────────────
  if (unlockSuccess) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-900/40">
          <svg
            className="h-8 w-8 text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white">Template Unlocked!</h2>
        <p className="mt-2 text-gray-400">
          {unlockSuccess.templateName} is ready. Redirecting to project setup...
        </p>
        <p className="mt-4 text-sm text-gray-500">
          New balance: ${(Number(unlockSuccess.newBalance) / 100).toFixed(2)}
        </p>
      </div>
    );
  }

  // ── Main Detail View ───────────────────────────────────────────────────
  return (
    <div className="space-y-8 py-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <a href="/app/templates" className="hover:text-white transition-colors">
          Templates
        </a>
        <span>/</span>
        <span className="text-white">{m.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {m.name}
            </h1>
            <span
              className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${
                TIER_COLORS[m.tier] ?? "bg-gray-600 text-gray-100"
              }`}
            >
              {m.tier}
            </span>
          </div>
          <p className="text-gray-400">{m.description}</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="rounded bg-gray-700 px-2.5 py-0.5 text-xs font-medium text-gray-300 capitalize">
              {m.category}
            </span>
            <span className="text-xs text-gray-500">
              {m.contracts.length} contract{m.contracts.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Price + Unlock CTA */}
      <div className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800 p-6">
        <div>
          <p className="text-sm text-gray-400">Price</p>
          <p className="text-3xl font-bold text-white">${priceUsd}</p>
        </div>
        <button
          type="button"
          onClick={handleUnlock}
          disabled={unlocking}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {unlocking ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Unlocking...
            </>
          ) : (
            <>
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                />
              </svg>
              Unlock &amp; Start Building
            </>
          )}
        </button>
      </div>

      {/* Unlock error */}
      {unlockError && (
        <div className="rounded-lg border border-red-800 bg-red-900/30 p-4 text-sm text-red-300">
          {unlockError}
        </div>
      )}

      {/* Contracts */}
      <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
          Smart Contracts
        </h3>
        <div className="space-y-3">
          {m.contracts.map((c) => (
            <div
              key={c.filename}
              className="flex items-start gap-3 rounded-md bg-gray-900/50 p-4"
            >
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded bg-indigo-600/20 text-indigo-400">
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-white">{c.filename}</p>
                <p className="mt-0.5 text-xs text-gray-400">{c.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Frontend */}
      {m.frontend && (
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
            Frontend
          </h3>
          <div className="flex items-start gap-3 rounded-md bg-gray-900/50 p-4">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded bg-cyan-600/20 text-cyan-400">
              <svg
                className="h-4 w-4"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-white">
                {m.frontend.filename}
              </p>
              <p className="mt-0.5 text-xs text-gray-400">
                {m.frontend.description}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Security Features */}
      {template.securityFeatures.length > 0 && (
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
            Security Features
          </h3>
          <ul className="space-y-2">
            {template.securityFeatures.map((feature) => (
              <li key={feature} className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 shrink-0 text-green-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm text-gray-300">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Configurable Parameters */}
      {template.configurableParameters.length > 0 && (
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
            Configurable Parameters
          </h3>
          <div className="flex flex-wrap gap-2">
            {template.configurableParameters.map((param) => (
              <span
                key={param}
                className="rounded-md border border-gray-600 bg-gray-900/50 px-3 py-1.5 text-sm text-gray-300"
              >
                {param}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
