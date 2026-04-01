"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const CATEGORIES = [
  { label: "All", value: "all" },
  { label: "DeFi", value: "defi" },
  { label: "Games", value: "game" },
  { label: "Utility", value: "utility" },
  { label: "Launch", value: "launch" },
  { label: "Governance", value: "governance" },
  { label: "NFT", value: "nft" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simple hash to generate a deterministic gradient from a string. */
function nameToHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

// ---------------------------------------------------------------------------
// Skeleton Card
// ---------------------------------------------------------------------------

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-sm bg-surface-container overflow-hidden">
      <div className="h-28 bg-surface-container-high" />
      <div className="p-4 space-y-3">
        <div className="h-4 w-3/4 rounded bg-surface-container-high" />
        <div className="h-3 w-full rounded bg-surface-container-high" />
        <div className="flex items-center justify-between pt-2">
          <div className="h-5 w-16 rounded-full bg-surface-container-high" />
          <div className="h-4 w-12 rounded bg-surface-container-high" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<TemplateManifest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");

  // Fetch templates
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
        const wrapped = data?.result?.data;
        const list: TemplateManifest[] = wrapped?.json ?? wrapped ?? [];
        setTemplates(list);
      } catch (err) {
        console.error("Failed to fetch templates:", err);
        setError("Failed to load templates. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    fetchTemplates();
  }, []);

  // Client-side category filter
  const filtered = useMemo(() => {
    if (activeCategory === "all") return templates;
    return templates.filter((t) => t.category === activeCategory);
  }, [templates, activeCategory]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="font-display text-2xl text-on-surface">Templates</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Browse 45 proven dApp architectures
        </p>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => setActiveCategory(cat.value)}
            className={
              activeCategory === cat.value
                ? "rounded-full bg-primary/20 px-4 py-1.5 text-sm text-primary"
                : "rounded-full bg-surface-container px-4 py-1.5 text-sm text-on-surface-variant hover:bg-surface-container-high"
            }
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && !loading && (
        <div className="rounded-sm border border-error/30 bg-error/10 p-4 text-center text-sm text-error">
          {error}
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Template Grid */}
      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => {
            const hue = nameToHue(t.name);
            return (
              <div
                key={t.id}
                onClick={() => router.push(`/app/templates/${t.id}`)}
                className="cursor-pointer rounded-sm bg-surface-container overflow-hidden transition-colors hover:bg-surface-container-high"
              >
                {/* Gradient top section */}
                <div
                  className="h-28"
                  style={{
                    background: `linear-gradient(135deg, hsl(${hue}, 60%, 20%) 0%, hsl(${(hue + 60) % 360}, 50%, 15%) 100%)`,
                  }}
                />

                {/* Card body */}
                <div className="p-4 space-y-2">
                  <h3 className="font-label font-semibold text-on-surface">
                    {t.name}
                  </h3>
                  <p className="text-sm text-on-surface-variant line-clamp-2">
                    {t.description}
                  </p>

                  {/* Bottom row */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-xs text-on-surface-variant capitalize">
                        {t.category}
                      </span>
                      {t.securityFeatures.length > 0 && (
                        <span className="text-xs text-tertiary">
                          ✓ {t.securityFeatures.length} security features
                        </span>
                      )}
                    </div>
                    <span className="font-label font-semibold text-primary">
                      ${(t.price / 100).toFixed(0)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-sm border border-dashed border-surface-bright py-16">
          <p className="text-sm text-on-surface-variant">
            No templates found in this category.
          </p>
        </div>
      )}
    </div>
  );
}
