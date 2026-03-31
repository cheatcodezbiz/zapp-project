"use client";

import { useState, useMemo } from "react";
import { templates } from "@/lib/templates";
import type { TemplateCategory } from "@/lib/templates";
import { TemplateCard } from "@/components/templates";

// ---------------------------------------------------------------------------
// Category filter tabs
// ---------------------------------------------------------------------------

const CATEGORY_TABS: { label: string; value: TemplateCategory | "all" }[] = [
  { label: "All", value: "all" },
  { label: "DeFi", value: "defi" },
  { label: "NFT", value: "nft" },
  { label: "DAO", value: "dao" },
  { label: "Token", value: "token" },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TemplatesPage() {
  const [activeCategory, setActiveCategory] = useState<
    TemplateCategory | "all"
  >("all");

  const filtered = useMemo(() => {
    if (activeCategory === "all") return templates;
    return templates.filter((t) => t.category === activeCategory);
  }, [activeCategory]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Templates
        </h1>
        <p className="text-sm text-muted-foreground">
          Start with a proven template, customize it, simulate, then deploy.
        </p>
      </div>

      {/* Category filter tabs */}
      <div className="flex flex-wrap gap-2">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveCategory(tab.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeCategory === tab.value
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((t) => (
          <TemplateCard
            key={t.id}
            id={t.id}
            name={t.name}
            description={t.description}
            category={t.category}
            difficulty={t.difficulty}
            tags={t.tags}
            icon={t.icon}
            estimatedCredits={t.estimatedCredits}
          />
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <p className="text-sm text-muted-foreground">
            No templates in this category yet.
          </p>
        </div>
      )}
    </div>
  );
}
