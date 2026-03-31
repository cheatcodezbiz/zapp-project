"use client";

import { create } from "zustand";
import type { ChatMessage, ToolCall } from "@zapp/shared-types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StreamEvent {
  type: "text" | "tool_start" | "tool_complete" | "artifact";
  content?: string;
  toolName?: string;
  artifactFilename?: string;
  artifactLines?: number;
}

interface ChatStore {
  messages: ChatMessage[];
  isStreaming: boolean;
  currentStreamContent: string;
  streamEvents: StreamEvent[];
  activeToolCalls: ToolCall[];
  // Actions
  addMessage: (msg: ChatMessage) => void;
  updateStreamContent: (content: string) => void;
  addStreamEvent: (event: StreamEvent) => void;
  addToolCall: (toolCall: ToolCall) => void;
  updateToolCallStatus: (toolName: string, status: ToolCall["status"]) => void;
  finalizeStream: () => void;
  clearMessages: () => void;
  setStreaming: (streaming: boolean) => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  isStreaming: false,
  currentStreamContent: "",
  streamEvents: [],
  activeToolCalls: [],

  addMessage: (msg) =>
    set((state) => ({
      messages: [...state.messages, msg],
    })),

  updateStreamContent: (content) =>
    set({ currentStreamContent: content }),

  addStreamEvent: (event) =>
    set((state) => ({
      streamEvents: [...state.streamEvents, event],
    })),

  addToolCall: (toolCall) =>
    set((state) => ({
      activeToolCalls: [...state.activeToolCalls, toolCall],
    })),

  updateToolCallStatus: (toolName, status) =>
    set((state) => ({
      activeToolCalls: state.activeToolCalls.map((tc) =>
        tc.toolName === toolName ? { ...tc, status } : tc,
      ),
    })),

  finalizeStream: () => {
    const { currentStreamContent, messages, activeToolCalls } = get();
    if (!currentStreamContent && activeToolCalls.length === 0) return;

    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: currentStreamContent || "Done.",
      timestamp: new Date().toISOString(),
      toolCalls: activeToolCalls.length > 0 ? activeToolCalls : undefined,
    };

    set({
      messages: [...messages, assistantMessage],
      currentStreamContent: "",
      streamEvents: [],
      activeToolCalls: [],
      isStreaming: false,
    });
  },

  clearMessages: () =>
    set({ messages: [], currentStreamContent: "", streamEvents: [], activeToolCalls: [] }),

  setStreaming: (streaming) =>
    set({ isStreaming: streaming }),
}));
