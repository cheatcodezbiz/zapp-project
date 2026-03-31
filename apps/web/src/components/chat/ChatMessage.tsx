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
      className="absolute right-2 top-2 rounded-sm px-2 py-1 text-xs text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
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
  const isCompleted = toolCall.status === "completed";
  const isError = toolCall.status === "error";
  const isRunning = toolCall.status === "running";

  return (
    <div
      className={`mt-2 flex items-center gap-2 rounded-sm bg-surface-container-high px-3 py-2 text-xs ${
        isError ? "text-error" : ""
      }`}
    >
      {isCompleted ? (
        <span className="text-tertiary">&#10003;</span>
      ) : isRunning ? (
        <span className="text-primary animate-pulse">&#9881;</span>
      ) : isError ? (
        <span className="text-error">&#10007;</span>
      ) : (
        <span className="text-on-surface-variant">&#8987;</span>
      )}
      <span className="font-mono text-on-surface-variant">{toolCall.toolName}</span>
      <span className={isCompleted ? "text-tertiary" : "text-on-surface-variant/50"}>
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
    <div className="mt-2 flex items-center gap-2 rounded-sm bg-surface-container-high px-3 py-2 text-xs">
      <span className="text-tertiary">&#10003;</span>
      <span className="font-label font-medium text-tertiary">{typeLabels[artifact.type] || "File"}</span>
      <span className="font-mono text-on-surface-variant">{artifact.filename}</span>
      <span className="text-on-surface-variant/50">{lines} lines</span>
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
          <div className="rounded-md bg-surface-container-high px-4 py-3 text-sm text-on-surface">
            <p className="whitespace-pre-wrap">{message.content}</p>
            {message.images && message.images.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {message.images.map((img) => (
                  <img
                    key={img.id}
                    src={`data:${img.mimeType};base64,${img.data}`}
                    alt={img.name || "Attached image"}
                    className="max-h-32 rounded-md border border-outline-variant/20"
                    style={{ maxWidth: '200px' }}
                  />
                ))}
              </div>
            )}
          </div>
          <p className="mt-1 text-right font-label text-xs text-on-surface-variant/50">
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
        <span className="mb-1 block font-label text-xs font-medium text-primary">
          Zapp AI
        </span>
        <div className="prose prose-invert prose-sm max-w-none rounded-md bg-surface-container-high px-4 py-3 text-on-surface">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={{
              pre({ children, ...props }: ComponentPropsWithoutRef<"pre">) {
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
                      className="overflow-x-auto rounded-sm bg-surface-container-lowest p-4 text-sm"
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
                      className="rounded-sm bg-surface-container-lowest px-1.5 py-0.5 text-sm text-primary"
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

        <p className="mt-1 font-label text-xs text-on-surface-variant/50">
          {formatTimestamp(message.timestamp)}
        </p>
      </div>
    </div>
  );
}
