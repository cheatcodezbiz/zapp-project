"use client";

import Link from "next/link";
import { formatCredits } from "@/lib/format-credits";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface TemplateCardProps {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  tags: string[];
  icon: string;
  estimatedCredits: number;
}

// ---------------------------------------------------------------------------
// Difficulty badge styles
// ---------------------------------------------------------------------------

const DIFFICULTY_STYLES: Record<
  TemplateCardProps["difficulty"],
  string
> = {
  beginner: "bg-emerald-500/10 text-emerald-400",
  intermediate: "bg-amber-500/10 text-amber-400",
  advanced: "bg-red-500/10 text-red-400",
};

const DIFFICULTY_LABELS: Record<TemplateCardProps["difficulty"], string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

// ---------------------------------------------------------------------------
// TemplateCard
// ---------------------------------------------------------------------------

export function TemplateCard({
  id,
  name,
  description,
  category,
  difficulty,
  tags,
  icon,
  estimatedCredits,
}: TemplateCardProps) {
  return (
    <div className="flex flex-col bg-card border border-border rounded-lg p-5 hover:border-primary/50 transition">
      {/* Icon + name */}
      <div className="flex items-start gap-3 mb-3">
        <span className="text-3xl leading-none" role="img" aria-label={name}>
          {icon}
        </span>
        <h3 className="text-base font-semibold text-foreground leading-tight">
          {name}
        </h3>
      </div>

      {/* Description — clamp to 3 lines */}
      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-4">
        {description}
      </p>

      {/* Category + difficulty badges */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="inline-flex items-center rounded-md bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium capitalize">
          {category}
        </span>
        <span
          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${DIFFICULTY_STYLES[difficulty]}`}
        >
          {DIFFICULTY_LABELS[difficulty]}
        </span>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {tags.map((tag) => (
          <span
            key={tag}
            className="bg-secondary text-muted-foreground text-xs rounded-full px-2 py-0.5"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Spacer to push cost + button to bottom */}
      <div className="mt-auto flex items-center justify-between pt-3 border-t border-border">
        <span className="text-sm text-muted-foreground">
          ~{formatCredits(estimatedCredits)}
        </span>
        <Link
          href={`/app/templates/${id}`}
          className="inline-flex items-center justify-center bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-primary/90"
        >
          Use Template
        </Link>
      </div>
    </div>
  );
}
