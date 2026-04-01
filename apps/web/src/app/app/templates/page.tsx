"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";

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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const CATEGORY_TABS: { label: string; value: string }[] = [
  { label: "All", value: "all" },
  { label: "DeFi", value: "defi" },
  { label: "Game", value: "game" },
  { label: "Token", value: "token" },
  { label: "Launch", value: "launch" },
  { label: "NFT", value: "nft" },
  { label: "Governance", value: "governance" },
];

const TIER_COLORS: Record<string, string> = {
  utility: "bg-gray-600 text-gray-100",
  standard: "bg-indigo-600 text-indigo-100",
  advanced: "bg-purple-600 text-purple-100",
  platform: "bg-amber-600 text-amber-100",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<TemplateManifest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch templates from API
  useEffect(() => {
    async function fetchTemplates() {
      try {
        setLoading(true);
        const url = `${apiBase}/templates.list?input=${encodeURIComponent(
          JSON.stringify({ json: {} }),
        )}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = await res.json();
        // tRPC wraps response in { result: { data: { json: [...] } } }
        const items: TemplateManifest[] =
          data?.result?.data?.json ?? data?.result?.data ?? [];
        setTemplates(items);
      } catch (err) {
        console.error("Failed to fetch templates:", err);
        setError("Failed to load templates. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    fetchTemplates();
  }, []);

  // Filter by category and search
  const filtered = useMemo(() => {
    let result = templates;
    if (activeCategory !== "all") {
      result = result.filter((t) => t.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.slug.toLowerCase().includes(q),
      );
    }
    return result;
  }, [templates, activeCategory, searchQuery]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Templates
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Start with a proven template, customize it, simulate, then deploy.
        </p>
      </div>

      {/* Search bar */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
        <input
          type="text"
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveCategory(tab.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeCategory === tab.value
                ? "bg-indigo-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-600 border-t-indigo-500" />
          <span className="ml-3 text-gray-400">Loading templates...</span>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="rounded-lg border border-red-800 bg-red-900/30 p-4 text-center text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Template grid */}
      {!loading && !error && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <Link
              key={t.id}
              href={`/app/templates/${t.id}`}
              className="group flex flex-col rounded-lg border border-gray-700 bg-gray-800 p-6 transition-all hover:border-indigo-500/50 hover:bg-gray-750 hover:shadow-lg hover:shadow-indigo-500/5"
            >
              {/* Header row: name + tier badge */}
              <div className="mb-3 flex items-start justify-between gap-2">
                <h3 className="text-base font-semibold text-white leading-tight">
                  {t.name}
                </h3>
                <span
                  className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium capitalize ${
                    TIER_COLORS[t.tier] ?? "bg-gray-600 text-gray-100"
                  }`}
                >
                  {t.tier}
                </span>
              </div>

              {/* Description */}
              <p className="mb-4 text-sm text-gray-400 leading-relaxed line-clamp-2">
                {t.description}
              </p>

              {/* Category badge */}
              <div className="mb-4 flex items-center gap-2">
                <span className="rounded bg-gray-700 px-2 py-0.5 text-xs font-medium text-gray-300 capitalize">
                  {t.category}
                </span>
                <span className="text-xs text-gray-500">
                  {t.contracts.length} contract{t.contracts.length !== 1 ? "s" : ""}
                </span>
                {t.securityFeatures.length > 0 && (
                  <span className="flex items-center gap-1 text-xs text-green-400">
                    <svg
                      className="h-3 w-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {t.securityFeatures.length} security
                  </span>
                )}
              </div>

              {/* Price */}
              <div className="mt-auto flex items-center justify-between pt-3 border-t border-gray-700">
                <span className="text-lg font-bold text-white">
                  ${(t.price / 100).toFixed(0)}
                </span>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-indigo-400 group-hover:text-indigo-300">
                  View Details
                  <svg
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.25 4.5l7.5 7.5-7.5 7.5"
                    />
                  </svg>
                </span>
              </div>
            </Link>
          ))}

          {/* Blank project card */}
          <Link
            href="/app/templates/blank"
            className="group flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-700 p-6 transition-colors hover:border-indigo-500/50 hover:bg-gray-800/50"
          >
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-gray-600 transition-colors group-hover:border-indigo-500/50">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6 text-gray-500 transition-colors group-hover:text-indigo-400"
              >
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-white">
              Blank Project
            </h3>
            <p className="mt-1 text-center text-sm text-gray-400">
              Start from scratch with an empty project
            </p>
          </Link>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-700 py-16">
          <p className="text-sm text-gray-400">
            No templates match your search.
          </p>
        </div>
      )}
    </div>
  );
}
