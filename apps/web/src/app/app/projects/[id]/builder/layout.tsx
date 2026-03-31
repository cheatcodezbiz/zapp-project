"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

// ---------------------------------------------------------------------------
// Builder Layout — full-width, no sidebar
// ---------------------------------------------------------------------------

export default function BuilderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  return (
    <div className="flex h-screen flex-col bg-gray-950">
      {/* Top bar */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-gray-800 px-4">
        {/* Left: Back button */}
        <Link
          href={`/app/projects/${projectId}`}
          className="flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-white"
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
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Project
        </Link>

        {/* Center: Builder title */}
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600 text-[10px] font-bold text-white">
            Z
          </div>
          <span className="text-sm font-medium text-white">Builder</span>
        </div>

        {/* Right: Credits placeholder */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
            <path d="M12 18V6" />
          </svg>
          <span>Credits</span>
        </div>
      </div>

      {/* Content area — full height */}
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
