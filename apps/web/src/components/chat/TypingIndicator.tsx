"use client";

/**
 * Animated typing indicator shown while the AI is generating a response.
 * Three bouncing dots with staggered animation.
 */
export function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="flex flex-col gap-1">
        <span className="font-label text-xs font-medium text-primary">
          Zapp AI
        </span>
        <div className="flex items-center gap-2 rounded-md bg-surface-container-high px-4 py-3">
          <div className="flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 animate-bounce rounded-full bg-primary/60"
              style={{ animationDelay: "0ms", animationDuration: "1s" }}
            />
            <span
              className="inline-block h-2 w-2 animate-bounce rounded-full bg-primary/60"
              style={{ animationDelay: "150ms", animationDuration: "1s" }}
            />
            <span
              className="inline-block h-2 w-2 animate-bounce rounded-full bg-primary/60"
              style={{ animationDelay: "300ms", animationDuration: "1s" }}
            />
          </div>
          <span className="text-sm text-on-surface-variant">
            Zapp AI is thinking...
          </span>
        </div>
      </div>
    </div>
  );
}
