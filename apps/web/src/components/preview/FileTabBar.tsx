"use client";

import { cn } from "@zapp/ui";
import { usePreviewStore } from "../../stores/preview-store";

// ---------------------------------------------------------------------------
// File type badge
// ---------------------------------------------------------------------------

function fileTypeBadge(filename: string): { label: string; className: string } {
  if (filename.endsWith(".sol"))
    return { label: "SOL", className: "text-purple-400" };
  if (filename.endsWith(".tsx"))
    return { label: "TSX", className: "text-blue-400" };
  if (filename.endsWith(".test.ts") || filename.endsWith(".test.tsx"))
    return { label: "TEST", className: "text-green-400" };
  if (filename.endsWith(".ts"))
    return { label: "TS", className: "text-blue-300" };
  return { label: "FILE", className: "text-gray-400" };
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
    <div className="flex overflow-x-auto border-b border-gray-700 bg-gray-800 scrollbar-thin scrollbar-thumb-gray-600">
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
              "flex shrink-0 items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors",
              isActive
                ? "border-b-2 border-indigo-500 bg-gray-700 text-white"
                : "text-gray-400 hover:bg-gray-750 hover:text-gray-200",
            )}
          >
            <span className={cn("text-[10px] font-bold", badge.className)}>
              [{badge.label}]
            </span>
            <span className="truncate max-w-[140px]">{file.filename}</span>
            {file.previousContent && (
              <span className="ml-1 rounded bg-indigo-500/20 px-1 py-0.5 text-[9px] text-indigo-300">
                Changed
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
