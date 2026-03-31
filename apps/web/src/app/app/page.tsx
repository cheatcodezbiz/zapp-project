"use client";

import { useProjectStore } from "@/stores/project-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_STYLES: Record<string, string> = {
  deployed: "bg-green-500/15 text-green-400 border border-green-500/30",
  generating: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
  compiled: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  simulated: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  failed: "bg-red-500/15 text-red-400 border border-red-500/30",
  draft: "bg-gray-500/15 text-gray-400 border border-gray-500/30",
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
  const projects = useProjectStore((s) => s.projects);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Projects
          </h1>
          <p className="text-sm text-muted-foreground">
            Your dApp projects, all in one place.
          </p>
        </div>
        <a
          href="/app/templates"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          New Project
        </a>
      </div>

      {/* Project list or empty state */}
      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <p className="mb-2 text-lg font-medium text-foreground">
            No projects yet
          </p>
          <p className="mb-6 text-sm text-muted-foreground">
            Create your first dApp by describing what you want to build.
          </p>
          <a
            href="/app/templates"
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Create your first project
          </a>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <a
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
              <p className="text-sm text-muted-foreground">
                {project.templateId
                  .replace(/-/g, " ")
                  .replace(/\b\w/g, (c) => c.toUpperCase())}
              </p>

              {project.deployment && (
                <p className="mt-1 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                    {project.deployment.chainName}
                  </span>
                </p>
              )}

              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {formatDate(project.createdAt)}
                </p>
                <span className="text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  View &rarr;
                </span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
