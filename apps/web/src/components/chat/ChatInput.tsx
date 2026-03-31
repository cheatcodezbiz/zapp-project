"use client";

import { useState, useRef, useCallback, type KeyboardEvent } from "react";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isStreaming: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Multi-line chat input with send button.
 * Enter sends, Shift+Enter adds a new line.
 * Auto-grows up to 6 lines then scrolls.
 */
export function ChatInput({ onSendMessage, isStreaming }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSend = value.trim().length > 0 && !isStreaming;

  const handleSend = useCallback(() => {
    if (!canSend) return;
    onSendMessage(value);
    setValue("");
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [canSend, value, onSendMessage]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleInput = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    // Reset height to auto so scrollHeight recalculates
    el.style.height = "auto";
    // Grow up to max-height (6 lines ~ 144px), then scroll
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
  }, []);

  return (
    <div className="border-t border-gray-700 bg-gray-900 p-4">
      <div className="flex items-end gap-3">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            handleInput();
          }}
          onKeyDown={handleKeyDown}
          placeholder={
            isStreaming
              ? "Waiting for response..."
              : "Describe what you want to build..."
          }
          disabled={isStreaming}
          rows={1}
          className="max-h-36 min-h-[40px] flex-1 resize-none rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={!canSend}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-indigo-600"
          aria-label="Send message"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
