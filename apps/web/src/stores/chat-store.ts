"use client";

import { create } from "zustand";
import type { ChatMessage } from "@zapp/shared-types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatStore {
  messages: ChatMessage[];
  isStreaming: boolean;
  currentStreamContent: string;
  // Actions
  addMessage: (msg: ChatMessage) => void;
  updateStreamContent: (content: string) => void;
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

  addMessage: (msg) =>
    set((state) => ({
      messages: [...state.messages, msg],
    })),

  updateStreamContent: (content) =>
    set({ currentStreamContent: content }),

  finalizeStream: () => {
    const { currentStreamContent, messages } = get();
    if (!currentStreamContent) return;

    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: currentStreamContent,
      timestamp: new Date().toISOString(),
    };

    set({
      messages: [...messages, assistantMessage],
      currentStreamContent: "",
      isStreaming: false,
    });
  },

  clearMessages: () =>
    set({ messages: [], currentStreamContent: "" }),

  setStreaming: (streaming) =>
    set({ isStreaming: streaming }),
}));
