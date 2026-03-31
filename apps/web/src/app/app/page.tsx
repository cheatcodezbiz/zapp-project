"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_STYLES: Record<string, string> = {
  deployed: "bg-tertiary/15 text-tertiary",
  generating: "bg-primary/15 text-primary",
  compiled: "bg-primary-dim/15 text-primary-dim",
  simulated: "bg-primary-dim/15 text-primary-dim",
  failed: "bg-error/15 text-error",
  draft: "bg-surface-bright text-on-surface-variant",
  testing: "bg-primary/15 text-primary",
  deploying: "bg-primary/15 text-primary",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status] ?? STATUS_STYLES.draft}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const { data, isLoading } = trpc.projects.list.useQuery({ limit: 50 });
  const projects = data?.items ?? [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Projects
          </h1>
          <p className="text-sm text-muted-foreground">
            Your dApp projects, all in one place.
          </p>
        </div>
        <Link
          href="/app/templates"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          New Project
        </Link>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-muted-foreground">Loading projects...</p>
        </div>
      )}

      {/* Project list or empty state */}
      {!isLoading && projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <p className="mb-2 text-lg font-medium text-foreground">
            No projects yet
          </p>
          <p className="mb-6 text-sm text-muted-foreground">
            Create your first dApp by describing what you want to build.
          </p>
          <Link
            href="/app/templates"
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Create your first project
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/app/projects/${project.id}`}
              className="group rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/50 hover:bg-card/80"
            >
              {/* Title + badge */}
              <div className="mb-3 flex items-start justify-between">
                <h3 className="text-base font-semibold text-foreground group-hover:text-primary">
                  {project.name}
                </h3>
                <StatusBadge status={project.status} />
              </div>

              {/* Meta */}
              {project.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {project.description}
                </p>
              )}

              <p className="mt-1 text-xs text-muted-foreground">
                {project.chain}
              </p>

              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {formatDate(project.createdAt)}
                </p>
                <span className="text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  View &rarr;
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
