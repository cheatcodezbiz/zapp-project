"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
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
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Templates
        </h1>
        <p className="text-sm text-muted-foreground">
          Start with a proven template, customize it, simulate, then deploy.
        </p>
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
                ? "bg-surface-container-high text-on-surface shadow-[0_0_0_1px_rgba(143,245,255,0.3)]"
                : "bg-surface-container-high text-on-surface-variant hover:text-on-surface"
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

        {/* Blank project card */}
        <Link
          href="/app/templates/blank"
          className="group flex flex-col items-center justify-center rounded-md border-2 border-dashed border-border p-6 transition-colors hover:border-primary/50 hover:bg-surface-container-high"
        >
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-border transition-colors group-hover:border-primary/50">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6 text-muted-foreground transition-colors group-hover:text-primary"
            >
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-on-surface">
            Blank Project
          </h3>
          <p className="mt-1 text-center text-sm text-on-surface-variant">
            Start from scratch with an empty project
          </p>
        </Link>
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
