"use client";

import { useCallback } from "react";
import { useChatStore } from "@/stores/chat-store";
import { usePreviewStore } from "@/stores/preview-store";
import type { ChatMessage, GeneratedArtifact, ChatStreamEvent } from "@zapp/shared-types";
import { artifactToFile } from "@zapp/shared-types";

/**
 * Custom hook for chat interaction with the Zapp AI.
 *
 * Streams responses from the SSE endpoint (`POST /api/chat/stream`).
 * Dispatches token, tool, artifact, and error events to the chat and
 * preview stores in real time.
 */
export function useChat(projectId: string) {
  const messages = useChatStore((s) => s.messages);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const addMessage = useChatStore((s) => s.addMessage);
  const setStreaming = useChatStore((s) => s.setStreaming);
  const updateStreamContent = useChatStore((s) => s.updateStreamContent);
  const addStreamEvent = useChatStore((s) => s.addStreamEvent);
  const addToolCall = useChatStore((s) => s.addToolCall);
  const updateToolCallStatus = useChatStore((s) => s.updateToolCallStatus);
  const finalizeStream = useChatStore((s) => s.finalizeStream);
  const clearMessages = useChatStore((s) => s.clearMessages);

  // Preview store actions for wiring artifacts
  const addFile = usePreviewStore((s) => s.addFile);
  const updateFile = usePreviewStore((s) => s.updateFile);
  const setActiveTab = usePreviewStore((s) => s.setActiveTab);

  /**
   * Process a single artifact from the stream and sync it into the
   * preview store.
   */
  const processArtifact = useCallback(
    (artifact: GeneratedArtifact) => {
      const currentFiles = usePreviewStore.getState().files;
      const existing = currentFiles.find((f) => f.filename === artifact.filename);

      if (existing) {
        updateFile(existing.id, artifact.code);
      } else {
        addFile(artifactToFile(artifact));
      }

      // Auto-switch the active tab based on artifact type
      if (artifact.type === "contract" || artifact.type === "test") {
        setActiveTab("code");
      } else if (artifact.type === "frontend") {
        setActiveTab("preview");
      }
    },
    [addFile, updateFile, setActiveTab],
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;

      // 1. Optimistic user message
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: content.trim(),
        timestamp: new Date().toISOString(),
      };
      addMessage(userMessage);
      setStreaming(true);

      let accumulatedText = "";

      try {
        // 2. POST to SSE endpoint (direct to API server to avoid Next.js proxy buffering)
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const response = await fetch(`${apiBase}/api/chat/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, message: content.trim() }),
        });

        if (!response.ok || !response.body) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // 3. Read the stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE messages.
          // SSE events are separated by double-newlines; each data line
          // starts with "data: ".  We split on newlines and keep any
          // incomplete trailing fragment in the buffer for the next chunk.
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;

            try {
              const event: ChatStreamEvent = JSON.parse(trimmed.slice(6));

              switch (event.type) {
                case "token":
                  accumulatedText += event.content || "";
                  updateStreamContent(accumulatedText);
                  break;

                case "tool_start":
                  addToolCall({
                    id: crypto.randomUUID(),
                    toolName: event.toolName || "unknown",
                    input: event.toolInput || {},
                    status: "running",
                  });
                  addStreamEvent({
                    type: "tool_start",
                    toolName: event.toolName,
                  });
                  break;

                case "tool_result":
                  updateToolCallStatus(event.toolName || "", "completed");
                  addStreamEvent({
                    type: "tool_complete",
                    toolName: event.toolName,
                  });
                  break;

                case "artifact":
                  if (event.artifact) {
                    processArtifact(event.artifact);
                    addStreamEvent({
                      type: "artifact",
                      artifactFilename: event.artifact.filename,
                      artifactLines: event.artifact.code.split("\n").length,
                    });
                  }
                  break;

                case "done":
                  finalizeStream();
                  break;

                case "error": {
                  const errorMsg: ChatMessage = {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    content: `Error: ${event.error || "Something went wrong"}`,
                    timestamp: new Date().toISOString(),
                  };
                  addMessage(errorMsg);
                  setStreaming(false);
                  break;
                }
              }
            } catch {
              // Skip malformed SSE lines
            }
          }
        }
      } catch (error) {
        const errorMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
          timestamp: new Date().toISOString(),
        };
        addMessage(errorMessage);
        setStreaming(false);
      } finally {
        // no-op: preview loading is not set on send
      }
    },
    [
      projectId,
      isStreaming,
      addMessage,
      setStreaming,
      updateStreamContent,
      addStreamEvent,
      addToolCall,
      updateToolCallStatus,
      finalizeStream,
      processArtifact,
    ],
  );

  return {
    messages,
    isStreaming,
    sendMessage,
    clearMessages,
  };
}
