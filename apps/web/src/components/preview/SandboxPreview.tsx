"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@zapp/ui";
import { usePreviewStore } from "../../stores/preview-store";
import { buildPreviewHTML } from "./preview-html-template";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Strip "use client" directives and import statements from generated code
 * so it can run in the Babel-transformed iframe context.
 */
function stripImportsAndDirectives(code: string): string {
  return code
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      // Remove "use client" / "use server" directives
      if (/^["']use (client|server)["'];?$/.test(trimmed)) return false;
      // Remove import statements (static imports)
      if (/^import\s/.test(trimmed)) return false;
      // Remove duplicate React hook destructuring (template already provides these)
      if (/^const\s+\{.*\}\s*=\s*React\s*;?\s*$/.test(trimmed)) return false;
      // Remove export statements
      if (/^export\s+(default\s+)?/.test(trimmed)) return false;
      return true;
    })
    .join("\n");
}

/**
 * Try to extract a JSON ABI string from a Solidity file's content.
 * In a real build pipeline this would come from compilation output;
 * here we do a best-effort extraction if the file contains an ABI comment.
 */
function extractABI(
  files: { language: string; content: string }[],
): string | undefined {
  const solFile = files.find((f) => f.language === "solidity");
  if (!solFile) return undefined;

  // Look for a JSON ABI block in a comment — common in generated code
  const match = solFile.content.match(/\/\*\s*ABI:\s*(\[[\s\S]*?\])\s*\*\//);
  if (match?.[1]) {
    try {
      JSON.parse(match[1]);
      return match[1];
    } catch {
      // Not valid JSON — ignore
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={cn("h-4 w-4", className)}
    >
      <path
        fillRule="evenodd"
        d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311V15a.75.75 0 01-1.5 0v-3.5a.75.75 0 01.75-.75H8.5a.75.75 0 010 1.5H7.058l.166.166a4 4 0 006.691-1.832.75.75 0 111.397.54zM4.688 8.576a5.5 5.5 0 019.201-2.466l.312.311V5a.75.75 0 011.5 0v3.5a.75.75 0 01-.75.75H11.5a.75.75 0 010-1.5h1.442l-.166-.166a4 4 0 00-6.691 1.832.75.75 0 01-1.397-.54z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function MonitorIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className={cn("h-12 w-12", className)}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25z"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SandboxPreview() {
  const files = usePreviewStore((s) => s.files);
  const setPreviewError = usePreviewStore((s) => s.setPreviewError);
  const previewError = usePreviewStore((s) => s.previewError);

  const [iframeKey, setIframeKey] = useState(0);

  // Find the main frontend file (tsx)
  const frontendFile = useMemo(
    () => files.find((f) => f.language === "tsx"),
    [files],
  );

  // Build the HTML content
  const htmlContent = useMemo(() => {
    if (!frontendFile) return null;

    const cleanedCode = stripImportsAndDirectives(frontendFile.content);
    const abi = extractABI(files);
    return buildPreviewHTML(cleanedCode, abi);
  }, [frontendFile, files]);

  // Listen for postMessage errors from the iframe
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (
        event.data &&
        typeof event.data === "object" &&
        event.data.type === "preview-error"
      ) {
        const msg = event.data.message as string;
        setPreviewError(msg);
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [setPreviewError]);

  const handleRefresh = useCallback(() => {
    setPreviewError(null);
    setIframeKey((k) => k + 1);
  }, [setPreviewError]);

  // --- Empty state ---
  if (!htmlContent) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-on-surface-variant">
        <MonitorIcon className="text-surface-bright" />
        <p className="font-display text-sm text-on-surface">No preview available</p>
        <p className="max-w-xs text-center text-xs text-on-surface-variant">
          Generate a frontend component to see a live preview of your dApp
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col">
      {/* Error banner */}
      {previewError && (
        <div className="bg-error-container/30 px-3 py-2 text-xs text-error">
          <span className="mr-1 font-semibold">Error:</span>
          {previewError}
        </div>
      )}

      {/* Refresh button */}
      <button
        onClick={handleRefresh}
        className="absolute right-2 top-2 z-10 rounded-full bg-surface-container-high/80 p-1.5 text-on-surface-variant backdrop-blur-sm transition-colors hover:bg-surface-bright hover:text-primary"
        title="Refresh preview"
      >
        <RefreshIcon />
      </button>

      {/* Iframe */}
      <iframe
        key={iframeKey}
        srcDoc={htmlContent}
        sandbox="allow-scripts"
        className="w-full flex-1 border-0"
        title="dApp Preview"
      />
    </div>
  );
}
