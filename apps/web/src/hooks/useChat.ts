"use client";

import { useCallback } from "react";
import { useChatStore } from "@/stores/chat-store";
import { usePreviewStore } from "@/stores/preview-store";
import { trpc } from "@/lib/trpc";
import type { ChatMessage, GeneratedArtifact } from "@zapp/shared-types";
import { artifactToFile } from "@zapp/shared-types";

/**
 * Custom hook for chat interaction with the Zapp AI.
 *
 * Manages optimistic message insertion, tRPC mutation calls, and
 * streaming state. When artifacts arrive from the API, they are
 * forwarded to the preview store so the preview panel updates live.
 */
export function useChat(projectId: string) {
  const messages = useChatStore((s) => s.messages);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const addMessage = useChatStore((s) => s.addMessage);
  const setStreaming = useChatStore((s) => s.setStreaming);
  const updateStreamContent = useChatStore((s) => s.updateStreamContent);
  const finalizeStream = useChatStore((s) => s.finalizeStream);
  const clearMessages = useChatStore((s) => s.clearMessages);

  // Preview store actions for wiring artifacts
  const addFile = usePreviewStore((s) => s.addFile);
  const updateFile = usePreviewStore((s) => s.updateFile);
  const setActiveTab = usePreviewStore((s) => s.setActiveTab);
  const setPreviewLoading = usePreviewStore((s) => s.setPreviewLoading);

  const chatSend = trpc.chat.send.useMutation();

  /**
   * Process artifacts returned by the AI agent and sync them into
   * the preview store.
   */
  const processArtifacts = useCallback(
    (artifacts: GeneratedArtifact[]) => {
      if (!artifacts || artifacts.length === 0) return;

      const currentFiles = usePreviewStore.getState().files;

      for (const artifact of artifacts) {
        // Check if a file with the same filename already exists
        const existing = currentFiles.find(
          (f) => f.filename === artifact.filename,
        );

        if (existing) {
          // Update existing file content
          updateFile(existing.id, artifact.code);
        } else {
          // Add as a new file
          addFile(artifactToFile(artifact));
        }
      }

      // Auto-switch the active tab based on artifact type
      const lastArtifact = artifacts[artifacts.length - 1];
      if (lastArtifact) {
        if (lastArtifact.type === "contract" || lastArtifact.type === "test") {
          setActiveTab("code");
        } else if (lastArtifact.type === "frontend") {
          setActiveTab("preview");
        }
      }
    },
    [addFile, updateFile, setActiveTab],
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;

      // 1. Add user message optimistically
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: content.trim(),
        timestamp: new Date().toISOString(),
      };
      addMessage(userMessage);

      // 2. Set streaming state
      setStreaming(true);
      setPreviewLoading(true);

      try {
        // 3. Call tRPC mutation
        const result = await chatSend.mutateAsync({
          projectId,
          message: content.trim(),
        });

        // 4. Process any artifacts from the response
        if (result.artifacts && result.artifacts.length > 0) {
          processArtifacts(result.artifacts as GeneratedArtifact[]);
        }

        // 5. Store the response as stream content and finalize
        updateStreamContent(result.response);
        finalizeStream();
      } catch (error) {
        // On error, add an error message from the assistant
        const errorMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "Sorry, something went wrong. Please try again.",
          timestamp: new Date().toISOString(),
        };
        addMessage(errorMessage);
        setStreaming(false);
      } finally {
        setPreviewLoading(false);
      }
    },
    [
      projectId,
      isStreaming,
      addMessage,
      setStreaming,
      setPreviewLoading,
      updateStreamContent,
      finalizeStream,
      chatSend,
      processArtifacts,
    ],
  );

  return {
    messages,
    isStreaming,
    sendMessage,
    clearMessages,
  };
}
