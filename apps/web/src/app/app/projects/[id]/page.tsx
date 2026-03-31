"use client";

import { useParams } from "next/navigation";
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
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status] ?? STATUS_STYLES.draft}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: project, isLoading, error } = trpc.projects.getById.useQuery(
    { id: params.id },
    { retry: false },
  );

  // --- Loading state ---
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <p className="text-sm text-muted-foreground">Loading project...</p>
      </div>
    );
  }

  // --- Not found ---
  if (error || !project) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <p className="text-lg font-medium text-foreground">
          Project not found
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          The project you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/app"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/app"
          className="mb-4 inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
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
            className="mr-1"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Projects
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                {project.name}
              </h1>
              <StatusBadge status={project.status} />
            </div>
            {project.description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {project.description}
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {project.chain} &middot; Created {formatDate(project.createdAt)}
            </p>
          </div>
        </div>

        {/* Open in Builder */}
        <Link
          href={`/app/projects/${params.id}/builder`}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 font-display text-sm font-medium text-on-primary transition-all hover:shadow-[0_0_20px_rgba(143,245,255,0.3)]"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" />
          </svg>
          Open in Builder
        </Link>
      </div>

      {/* Project details */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Status</p>
          <p className="mt-2">
            <StatusBadge status={project.status} />
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Chain</p>
          <p className="mt-1 text-lg font-semibold text-foreground capitalize">
            {project.chain}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Last Updated</p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {formatDate(project.updatedAt)}
          </p>
        </div>
      </div>
    </div>
  );
}
