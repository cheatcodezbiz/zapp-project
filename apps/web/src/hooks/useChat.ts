"use client";

import { useCallback, useEffect, useRef } from "react";
import { useChatStore } from "@/stores/chat-store";
import { usePreviewStore } from "@/stores/preview-store";
import type { ChatMessage, GeneratedArtifact, ChatStreamEvent, ImageAttachment } from "@zapp/shared-types";
import { artifactToFile } from "@zapp/shared-types";

/**
 * Custom hook for chat interaction with the Zapp AI.
 *
 * On mount, fetches conversation history and generated artifacts from the
 * database and hydrates the chat and preview stores.
 *
 * Streams responses from the SSE endpoint (`POST /api/chat/stream`).
 * Dispatches token, tool, artifact, and error events to the chat and
 * preview stores in real time.
 */
export function useChat(projectId: string) {
  const messages = useChatStore((s) => s.messages);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const setMessages = useChatStore((s) => s.setMessages);
  const addMessage = useChatStore((s) => s.addMessage);
  const setStreaming = useChatStore((s) => s.setStreaming);
  const updateStreamContent = useChatStore((s) => s.updateStreamContent);
  const addStreamEvent = useChatStore((s) => s.addStreamEvent);
  const addToolCall = useChatStore((s) => s.addToolCall);
  const updateToolCallStatus = useChatStore((s) => s.updateToolCallStatus);
  const finalizeStream = useChatStore((s) => s.finalizeStream);
  const clearMessages = useChatStore((s) => s.clearMessages);

  // Preview store actions for wiring artifacts + simulation
  const setFiles = usePreviewStore((s) => s.setFiles);
  const addFile = usePreviewStore((s) => s.addFile);
  const updateFile = usePreviewStore((s) => s.updateFile);
  const setActiveTab = usePreviewStore((s) => s.setActiveTab);
  const setSimulationResults = usePreviewStore((s) => s.setSimulationResults);

  // Track whether we've loaded history for this project
  const loadedRef = useRef<string | null>(null);

  // ---- Load conversation history + artifacts on mount ----
  useEffect(() => {
    if (loadedRef.current === projectId) return;
    loadedRef.current = projectId;

    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    // Clear chat messages
    clearMessages();

    // Only preserve pre-loaded files if they were set for THIS project (template unlock)
    const store = usePreviewStore.getState();
    const hasPreloadedForThis = store.preloadedForProject === projectId && store.files.length > 0;

    // Clear preloaded tracking — it's consumed on first load
    if (hasPreloadedForThis) {
      store.setPreloadedForProject(null);
    } else {
      // Different project or no preloaded files — start fresh
      setFiles([]);
    }

    fetch(`${apiBase}/chat.history?input=${encodeURIComponent(JSON.stringify({ json: { projectId } }))}`, {
      headers: { "Content-Type": "application/json" },
    })
      .then((res) => res.json())
      .then((data) => {
        // tRPC with superjson wraps data in { result: { data: { json: {...} } } }
        const wrapped = data?.result?.data;
        const result = wrapped?.json ?? wrapped;
        if (!result) return;

        // Hydrate chat messages
        const msgs: ChatMessage[] = result.messages ?? [];
        setMessages(msgs);

        // Hydrate preview files from saved artifacts (overrides preloaded if present)
        const artifacts: GeneratedArtifact[] = result.artifacts ?? [];
        if (artifacts.length > 0) {
          setFiles(artifacts.map(artifactToFile));

          // Auto-select tab based on what's available
          const hasFrontend = artifacts.some((a) => a.type === "frontend");
          if (hasFrontend) {
            setActiveTab("preview");
          } else {
            setActiveTab("code");
          }
        }
        // If no API artifacts and we had preloaded files for this project, they stay
        // If no API artifacts and no preloaded files, already cleared above
      })
      .catch(() => {
        // Silent fail — keep pre-loaded template files if history can't load
      });
  }, [projectId, setMessages, setFiles, setActiveTab, clearMessages]);

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
    async (content: string, images?: ImageAttachment[]) => {
      if ((!content.trim() && (!images || images.length === 0)) || isStreaming) return;

      // 1. Optimistic user message
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: content.trim(),
        timestamp: new Date().toISOString(),
        images,
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
          body: JSON.stringify({ projectId, message: content.trim(), images }),
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

                case "simulation":
                  if (event.simulationData) {
                    setSimulationResults(event.simulationData);
                    setActiveTab("simulation");
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
      setSimulationResults,
      setActiveTab,
    ],
  );

  return {
    messages,
    isStreaming,
    sendMessage,
    clearMessages,
  };
}
