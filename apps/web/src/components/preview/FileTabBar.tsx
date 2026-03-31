"use client";

import { cn } from "@zapp/ui";
import { usePreviewStore } from "../../stores/preview-store";

// ---------------------------------------------------------------------------
// File type badge
// ---------------------------------------------------------------------------

function fileTypeBadge(filename: string): { label: string; className: string } {
  if (filename.endsWith(".sol"))
    return { label: "SOL", className: "text-secondary" };
  if (filename.endsWith(".tsx"))
    return { label: "TSX", className: "text-primary" };
  if (filename.endsWith(".test.ts") || filename.endsWith(".test.tsx"))
    return { label: "TEST", className: "text-tertiary" };
  if (filename.endsWith(".ts"))
    return { label: "TS", className: "text-primary-dim" };
  return { label: "FILE", className: "text-on-surface-variant" };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FileTabBar() {
  const files = usePreviewStore((s) => s.files);
  const activeFileId = usePreviewStore((s) => s.activeFileId);
  const setActiveFile = usePreviewStore((s) => s.setActiveFile);
  const setActiveTab = usePreviewStore((s) => s.setActiveTab);

  if (files.length === 0) return null;

  return (
    <div className="flex overflow-x-auto bg-surface-container-low">
      {files.map((file) => {
        const badge = fileTypeBadge(file.filename);
        const isActive = file.id === activeFileId;

        return (
          <button
            key={file.id}
            onClick={() => {
              setActiveFile(file.id);
              setActiveTab("code");
            }}
            className={cn(
              "flex shrink-0 items-center gap-1.5 px-3 py-2 font-label text-xs font-medium transition-colors",
              isActive
                ? "border-b-2 border-primary bg-surface-container text-on-surface"
                : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
            )}
          >
            <span className={cn("text-[10px] font-bold", badge.className)}>
              [{badge.label}]
            </span>
            <span className="truncate max-w-[140px]">{file.filename}</span>
            {file.previousContent && (
              <span className="ml-1 rounded-sm bg-primary/20 px-1 py-0.5 text-[9px] text-primary">
                Changed
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
