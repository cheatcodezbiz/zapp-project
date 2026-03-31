"use client";

import Link from "next/link";

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
// TemplateCard
// ---------------------------------------------------------------------------

export function TemplateCard({
  id,
  name,
  description,
  tags,
  icon,
}: TemplateCardProps) {
  return (
    <div className="group flex flex-col rounded-md bg-surface-container p-6 transition-colors hover:bg-surface-container-high">
      {/* Icon + title */}
      <div className="mb-3 flex items-start gap-3">
        <span className="text-2xl leading-none" role="img" aria-label={name}>
          {icon}
        </span>
        <h3 className="text-base font-semibold text-on-surface leading-tight">
          {name}
        </h3>
      </div>

      {/* Description — clamp to 2 lines */}
      <p className="text-sm text-on-surface-variant leading-relaxed line-clamp-2 mb-4">
        {description}
      </p>

      {/* Tags — quiet, gray labels */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {tags.map((tag) => (
          <span
            key={tag}
            className="rounded-sm bg-surface-container-high px-2 py-0.5 text-xs text-on-surface-variant"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* CTA — pushed to bottom */}
      <div className="mt-auto flex items-center justify-end">
        <Link
          href={`/app/templates/${id}`}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Use Template
        </Link>
      </div>
    </div>
  );
}
