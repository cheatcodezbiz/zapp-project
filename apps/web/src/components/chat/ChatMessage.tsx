"use client";

import { useState, useCallback, type ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import type { ChatMessage as ChatMessageType, ToolCall } from "@zapp/shared-types";

// ---------------------------------------------------------------------------
// Copy button for code blocks
// ---------------------------------------------------------------------------

function CodeCopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [code]);

  return (
    <button
      onClick={handleCopy}
      className="absolute right-2 top-2 rounded px-2 py-1 text-xs text-gray-400 transition-colors hover:bg-gray-800 hover:text-gray-200"
      aria-label="Copy code"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Tool call status card
// ---------------------------------------------------------------------------

function ToolCallCard({ toolCall }: { toolCall: ToolCall }) {
  const statusIcons: Record<ToolCall["status"], string> = {
    pending: "\u23F3",
    running: "\u2699\uFE0F",
    completed: "\u2705",
    error: "\u274C",
  };

  const statusColors: Record<ToolCall["status"], string> = {
    pending: "border-gray-600 bg-gray-800/50",
    running: "border-yellow-600/50 bg-yellow-900/20",
    completed: "border-green-600/50 bg-green-900/20",
    error: "border-red-600/50 bg-red-900/20",
  };

  return (
    <div
      className={`mt-2 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${statusColors[toolCall.status]}`}
    >
      <span>{statusIcons[toolCall.status]}</span>
      <span className="font-mono text-gray-300">{toolCall.toolName}</span>
      <span className="text-gray-500">
        {toolCall.status}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Artifact card
// ---------------------------------------------------------------------------

function ArtifactCard({ artifact }: { artifact: { id: string; type: string; filename: string; code: string } }) {
  const lines = artifact.code.split("\n").length;
  const typeLabels: Record<string, string> = {
    contract: "Contract",
    frontend: "Frontend",
    test: "Test",
  };

  return (
    <div className="mt-2 flex items-center gap-2 rounded-lg border border-green-600/50 bg-green-900/20 px-3 py-2 text-xs">
      <span className="font-medium text-green-400">{typeLabels[artifact.type] || "File"}</span>
      <span className="font-mono text-green-300">{artifact.filename}</span>
      <span className="text-gray-500">{lines} lines</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Timestamp formatting
// ---------------------------------------------------------------------------

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// ChatMessage component
// ---------------------------------------------------------------------------

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end px-4 py-2">
        <div className="max-w-[80%]">
          <div className="rounded-2xl bg-indigo-600 px-4 py-3 text-sm text-white">
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
          <p className="mt-1 text-right text-xs text-gray-500">
            {formatTimestamp(message.timestamp)}
          </p>
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="flex justify-start px-4 py-2">
      <div className="max-w-[80%]">
        <span className="mb-1 block text-xs font-medium text-indigo-400">
          Zapp AI
        </span>
        <div className="prose prose-invert prose-sm max-w-none rounded-2xl bg-gray-800 px-4 py-3 text-gray-100">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={{
              pre({ children, ...props }: ComponentPropsWithoutRef<"pre">) {
                // Extract code text for copy button
                let codeText = "";
                try {
                  const child = children as unknown as { props?: { children?: string } } | null;
                  if (child && typeof child === "object" && child.props && typeof child.props.children === "string") {
                    codeText = child.props.children;
                  }
                } catch {
                  // ignore extraction failure
                }
                return (
                  <div className="group relative">
                    <CodeCopyButton code={codeText} />
                    <pre
                      className="overflow-x-auto rounded-lg bg-gray-950 p-4 text-sm"
                      {...props}
                    >
                      {children}
                    </pre>
                  </div>
                );
              },
              code({ children, className, ...props }: ComponentPropsWithoutRef<"code">) {
                const isInline = !className;
                if (isInline) {
                  return (
                    <code
                      className="rounded bg-gray-950 px-1.5 py-0.5 text-sm text-indigo-300"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                }
                return (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        {/* Tool call status cards */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-1 space-y-1">
            {message.toolCalls.map((tc) => (
              <ToolCallCard key={tc.id} toolCall={tc} />
            ))}
          </div>
        )}

        {/* Artifact cards */}
        {message.artifacts && message.artifacts.length > 0 && (
          <div className="mt-1 space-y-1">
            {message.artifacts.map((artifact) => (
              <ArtifactCard key={artifact.id} artifact={artifact} />
            ))}
          </div>
        )}

        <p className="mt-1 text-xs text-gray-500">
          {formatTimestamp(message.timestamp)}
        </p>
      </div>
    </div>
  );
}
