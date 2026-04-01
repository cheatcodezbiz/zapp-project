"use client";

import { useEffect, useRef, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Group, Panel, Separator, useDefaultLayout } from "react-resizable-panels";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { PreviewPanel } from "@/components/preview/PreviewPanel";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { useChat } from "@/hooks/useChat";
import { useCreditStore } from "@/stores/credit-store";

// ---------------------------------------------------------------------------
// Inner component that uses useSearchParams (must be inside Suspense)
// ---------------------------------------------------------------------------

function BuilderInner() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const projectId = params.id;
  const { messages, isStreaming, sendMessage } = useChat(projectId);

  const balanceCents = useCreditStore((s) => s.balanceCents);

  // Handle ?message= query param — auto-send initial message
  const sentInitialRef = useRef(false);
  const initialMessage = searchParams.get("message");

  useEffect(() => {
    if (initialMessage && !sentInitialRef.current) {
      sentInitialRef.current = true;
      sendMessage(initialMessage);
    }
  }, [initialMessage, sendMessage]);

  // Persist panel layout in localStorage across sessions
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: "zapp-builder",
  });

  return (
    <>
      {/* Credit low banner */}
      {balanceCents < 50 && (
        <div className="flex items-center justify-between rounded-sm bg-error/10 px-4 py-2 text-sm text-error mx-4 mt-2">
          <span>Credits low — load more to continue building</span>
          <Link
            href="/app/load-credits"
            className="font-label font-semibold hover:underline"
          >
            Load Credits →
          </Link>
        </div>
      )}

      {/* Desktop: resizable split panels */}
      <div className="hidden h-[calc(100vh-48px)] md:block">
        <Group
          orientation="horizontal"
          className="h-full"
          defaultLayout={defaultLayout}
          onLayoutChanged={onLayoutChanged}
        >
          {/* Chat Panel — 40% default */}
          <Panel defaultSize="40%" minSize="25%" maxSize="60%">
            <ChatPanel
              messages={messages}
              isStreaming={isStreaming}
              onSendMessage={sendMessage}
            />
          </Panel>

          {/* Resize handle */}
          <Separator className="w-1.5 bg-surface-container-high transition-colors hover:bg-primary/60 active:bg-primary" />

          {/* Preview Panel — 60% default */}
          <Panel defaultSize="60%" minSize="30%">
            <ErrorBoundary>
              <PreviewPanel />
            </ErrorBoundary>
          </Panel>
        </Group>
      </div>

      {/* Mobile: stacked layout */}
      <div className="flex h-[calc(100vh-48px)] flex-col md:hidden">
        <div className="flex-1 overflow-hidden">
          <ChatPanel
            messages={messages}
            isStreaming={isStreaming}
            onSendMessage={sendMessage}
          />
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Builder Page — wraps inner in Suspense for useSearchParams
// ---------------------------------------------------------------------------

export default function BuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-surface-bright border-t-primary" />
        </div>
      }
    >
      <BuilderInner />
    </Suspense>
  );
}
