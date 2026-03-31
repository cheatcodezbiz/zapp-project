"use client";

import { cn } from "@zapp/ui";
import { usePreviewStore } from "../../stores/preview-store";
import { SandboxPreview } from "./SandboxPreview";
import { CodeViewer } from "./CodeViewer";
import { SimulationView } from "./SimulationView";
import type { PreviewTab } from "@zapp/shared-types";

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

const TABS: { id: PreviewTab; label: string; icon: React.ReactNode }[] = [
  {
    id: "preview",
    label: "Preview",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-3.5 w-3.5"
      >
        <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
        <path
          fillRule="evenodd"
          d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  {
    id: "code",
    label: "Code",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-3.5 w-3.5"
      >
        <path
          fillRule="evenodd"
          d="M6.28 5.22a.75.75 0 010 1.06L2.56 10l3.72 3.72a.75.75 0 01-1.06 1.06L.97 10.53a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 0zm7.44 0a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L17.44 10l-3.72-3.72a.75.75 0 010-1.06zM11.377 2.011a.75.75 0 01.612.867l-2.5 14.5a.75.75 0 01-1.478-.255l2.5-14.5a.75.75 0 01.866-.612z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  {
    id: "simulation",
    label: "Simulation",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-3.5 w-3.5"
      >
        <path d="M15.5 2A1.5 1.5 0 0014 3.5v13a1.5 1.5 0 001.5 1.5h1a1.5 1.5 0 001.5-1.5v-13A1.5 1.5 0 0016.5 2h-1zM9.5 6A1.5 1.5 0 008 7.5v9A1.5 1.5 0 009.5 18h1a1.5 1.5 0 001.5-1.5v-9A1.5 1.5 0 0010.5 6h-1zM3.5 10A1.5 1.5 0 002 11.5v5A1.5 1.5 0 003.5 18h1A1.5 1.5 0 006 16.5v-5A1.5 1.5 0 004.5 10h-1z" />
      </svg>
    ),
  },
];

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div className="h-6 w-2/3 animate-pulse rounded bg-gray-800" />
      <div className="h-4 w-1/2 animate-pulse rounded bg-gray-800" />
      <div className="mt-4 flex-1 animate-pulse rounded-lg bg-gray-800" />
      <div className="flex gap-3">
        <div className="h-20 flex-1 animate-pulse rounded-lg bg-gray-800" />
        <div className="h-20 flex-1 animate-pulse rounded-lg bg-gray-800" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-gray-500">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="h-16 w-16 text-gray-700"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
        />
      </svg>
      <p className="text-sm font-medium">
        Generate your first dApp to see it here
      </p>
      <p className="max-w-sm text-center text-xs text-gray-600">
        Describe your dApp in the chat panel and Zapp will generate the smart
        contract, frontend, and tests. The live preview will appear here.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PreviewPanel() {
  const activeTab = usePreviewStore((s) => s.activeTab);
  const setActiveTab = usePreviewStore((s) => s.setActiveTab);
  const files = usePreviewStore((s) => s.files);
  const isPreviewLoading = usePreviewStore((s) => s.isPreviewLoading);

  const hasFiles = files.length > 0;

  return (
    <div className="flex h-full flex-col bg-gray-900">
      {/* Tab bar */}
      <div className="flex border-b border-gray-700 bg-gray-800">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors",
              activeTab === tab.id
                ? "border-b-2 border-indigo-500 text-white"
                : "text-gray-400 hover:text-gray-200",
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isPreviewLoading ? (
        <LoadingSkeleton />
      ) : !hasFiles ? (
        <EmptyState />
      ) : (
        <div className="flex-1 overflow-hidden">
          {activeTab === "preview" && <SandboxPreview />}
          {activeTab === "code" && <CodeViewer />}
          {activeTab === "simulation" && <SimulationView />}
        </div>
      )}
    </div>
  );
}
