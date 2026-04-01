"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Deterministic gradient from project name (same as dashboard)
// ---------------------------------------------------------------------------

function projectGradient(name: string) {
  const hash = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const hue1 = hash % 360;
  const hue2 = (hash * 7) % 360;
  return `linear-gradient(135deg, hsl(${hue1}, 70%, 40%), hsl(${hue2}, 60%, 30%))`;
}

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// Trash Page
// ---------------------------------------------------------------------------

export default function TrashPage() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.projects.listTrash.useQuery();
  const trashedProjects = data?.items ?? [];

  const restoreProject = trpc.projects.restore.useMutation({
    onSuccess: (_data, variables) => {
      utils.projects.listTrash.invalidate();
      utils.projects.list.invalidate();
      toast.success("Project restored to your dashboard");
    },
  });

  const emptyTrash = trpc.projects.emptyTrash.useMutation({
    onSuccess: (data) => {
      utils.projects.listTrash.invalidate();
      toast.success(`${data.deleted} project${data.deleted === 1 ? "" : "s"} permanently deleted`);
    },
  });

  const [confirmEmpty, setConfirmEmpty] = useState(false);

  function handleEmptyTrash() {
    if (!confirmEmpty) {
      setConfirmEmpty(true);
      toast.warning("Are you sure? This will permanently delete all trashed projects.", {
        duration: 6000,
        action: {
          label: "Delete All",
          onClick: () => {
            emptyTrash.mutate();
            setConfirmEmpty(false);
          },
        },
        onDismiss: () => setConfirmEmpty(false),
        onAutoClose: () => setConfirmEmpty(false),
      });
      return;
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-on-surface">
            Trash
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            {trashedProjects.length === 0
              ? "No deleted projects"
              : `${trashedProjects.length} deleted project${trashedProjects.length === 1 ? "" : "s"}`}
          </p>
        </div>

        {trashedProjects.length > 0 && (
          <button
            type="button"
            onClick={handleEmptyTrash}
            disabled={emptyTrash.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-medium text-error border border-error/30 hover:bg-error/10 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
            </svg>
            {emptyTrash.isPending ? "Deleting..." : "Empty Trash"}
          </button>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-3 text-on-surface-variant text-sm">
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
              <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
            </svg>
            Loading trash...
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && trashedProjects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-12 w-12 opacity-30 mb-4">
            <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z" clipRule="evenodd" />
          </svg>
          <p className="text-sm">Trash is empty</p>
        </div>
      )}

      {/* Trashed projects grid */}
      {!isLoading && trashedProjects.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {trashedProjects.map((project) => (
            <div
              key={project.id}
              className="group relative rounded-sm border border-surface-bright bg-surface-container overflow-hidden opacity-75 hover:opacity-100 transition-opacity"
            >
              {/* Gradient thumbnail with strikethrough overlay */}
              <div className="relative h-24 w-full">
                <div
                  className="absolute inset-0"
                  style={{ background: projectGradient(project.name) }}
                />
                <div className="absolute inset-0 bg-surface/40" />
              </div>

              {/* Card body */}
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-label font-semibold text-on-surface truncate">
                    {project.name}
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Deleted {timeAgo(project.deletedAt)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => restoreProject.mutate({ id: project.id })}
                    disabled={restoreProject.isPending}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium text-primary border border-primary/30 hover:bg-primary/10 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                      <path fillRule="evenodd" d="M7.793 2.232a.75.75 0 01-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 010 10.75H10.75a.75.75 0 010-1.5h2.875a3.875 3.875 0 000-7.75H3.622l4.146 3.957a.75.75 0 01-1.036 1.085l-5.5-5.25a.75.75 0 010-1.085l5.5-5.25a.75.75 0 011.06.025z" clipRule="evenodd" />
                    </svg>
                    Restore
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
