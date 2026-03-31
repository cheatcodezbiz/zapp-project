"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@zapp/ui";
import { usePreviewStore } from "../../stores/preview-store";
import { FileTabBar } from "./FileTabBar";

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={cn("h-4 w-4", className)}
    >
      <path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z" />
      <path d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={cn("h-4 w-4", className)}
    >
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Syntax highlight helpers (lightweight, no external dep needed)
// ---------------------------------------------------------------------------

/** Language-specific keyword sets for basic syntax coloring */
const KEYWORDS_SOLIDITY = new Set([
  "pragma", "solidity", "import", "contract", "interface", "library",
  "function", "modifier", "event", "struct", "enum", "mapping",
  "public", "private", "internal", "external", "view", "pure", "payable",
  "returns", "return", "if", "else", "for", "while", "do",
  "require", "revert", "emit", "new", "delete", "address", "bool",
  "uint256", "uint128", "uint64", "uint32", "uint8", "int256",
  "bytes32", "bytes", "string", "memory", "storage", "calldata",
  "true", "false", "this", "msg", "block", "tx",
  "is", "abstract", "override", "virtual",
]);

const KEYWORDS_TS = new Set([
  "import", "export", "from", "default", "const", "let", "var",
  "function", "return", "if", "else", "for", "while", "do",
  "switch", "case", "break", "continue", "new", "delete", "typeof",
  "instanceof", "in", "of", "class", "extends", "implements",
  "interface", "type", "enum", "async", "await", "try", "catch",
  "finally", "throw", "yield", "true", "false", "null", "undefined",
  "void", "this", "super", "as", "readonly", "declare",
  "useState", "useEffect", "useCallback", "useMemo", "useRef",
]);

function getLanguageClass(language: string): string {
  switch (language) {
    case "solidity":
      return "language-solidity";
    case "tsx":
    case "typescript":
      return "language-typescript";
    default:
      return "language-plaintext";
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CodeViewer() {
  const files = usePreviewStore((s) => s.files);
  const activeFileId = usePreviewStore((s) => s.activeFileId);
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeFile = useMemo(
    () => files.find((f) => f.id === activeFileId) ?? files[0] ?? null,
    [files, activeFileId],
  );

  const lines = useMemo(
    () => (activeFile ? activeFile.content.split("\n") : []),
    [activeFile],
  );

  const lineNumberWidth = useMemo(
    () => Math.max(String(lines.length).length * 0.65 + 0.8, 2.5),
    [lines.length],
  );

  const handleCopy = useCallback(async () => {
    if (!activeFile) return;
    try {
      await navigator.clipboard.writeText(activeFile.content);
      setCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may be unavailable in some contexts
    }
  }, [activeFile]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  // --- Empty state ---
  if (!activeFile) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-500">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className="h-12 w-12 text-gray-600"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
          />
        </svg>
        <p className="text-sm">No code to display</p>
        <p className="text-xs text-gray-600">
          Generated files will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* File tabs */}
      <FileTabBar />

      {/* Code block */}
      <div className="relative flex-1 overflow-auto bg-gray-950">
        {/* Copy button */}
        <button
          onClick={handleCopy}
          className={cn(
            "absolute right-3 top-3 z-10 flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
            copied
              ? "bg-green-800/50 text-green-300"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white",
          )}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? "Copied" : "Copy"}
        </button>

        {/* Version / changes badge */}
        {activeFile.previousContent && (
          <div className="absolute right-3 top-12 z-10 rounded bg-indigo-500/20 px-2 py-0.5 text-[10px] font-medium text-indigo-300">
            v{activeFile.version} &middot; Changes
          </div>
        )}

        <pre className="h-full overflow-auto p-0">
          <code className={getLanguageClass(activeFile.language)}>
            <table className="w-full border-collapse">
              <tbody>
                {lines.map((line, i) => (
                  <tr key={i} className="hover:bg-gray-900/50">
                    <td
                      className="select-none border-r border-gray-800 px-3 py-0 text-right align-top text-xs leading-6 text-gray-600"
                      style={{ width: `${lineNumberWidth}rem` }}
                    >
                      {i + 1}
                    </td>
                    <td className="px-4 py-0 text-xs leading-6 text-gray-300 whitespace-pre">
                      {line}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </code>
        </pre>
      </div>
    </div>
  );
}
