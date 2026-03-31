"use client";

import { useParams } from "next/navigation";
import { Group, Panel, Separator, useDefaultLayout } from "react-resizable-panels";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { PreviewPanel } from "@/components/preview/PreviewPanel";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { useChat } from "@/hooks/useChat";

// ---------------------------------------------------------------------------
// Builder Page
// ---------------------------------------------------------------------------

export default function BuilderPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const { messages, isStreaming, sendMessage } = useChat(projectId);

  // Persist panel layout in localStorage across sessions
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: "zapp-builder",
  });

  return (
    <>
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
          <Separator className="w-1.5 bg-gray-800 transition-colors hover:bg-indigo-600 active:bg-indigo-500" />

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
