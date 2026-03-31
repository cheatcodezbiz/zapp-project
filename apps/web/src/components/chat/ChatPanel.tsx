"use client";

import { useRef, useEffect } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { TypingIndicator } from "./TypingIndicator";
import type { ChatMessage as ChatMessageType } from "@zapp/shared-types";

// ---------------------------------------------------------------------------
// Template suggestions (shown when no messages)
// ---------------------------------------------------------------------------

const TEMPLATE_SUGGESTIONS = [
  {
    title: "ERC-20 Token",
    description: "Create a custom token with minting, burning, and pausable features",
    prompt: "Build me an ERC-20 token with mint, burn, and pause functionality",
  },
  {
    title: "NFT Collection",
    description: "Launch an NFT collection with metadata, royalties, and allowlist",
    prompt: "Create an NFT collection with metadata storage, royalties, and an allowlist mint",
  },
  {
    title: "Staking Protocol",
    description: "Build a staking vault with rewards, lock periods, and withdrawals",
    prompt: "Build a staking protocol where users can stake tokens and earn rewards over time",
  },
  {
    title: "DAO Governance",
    description: "Set up on-chain governance with proposals, voting, and execution",
    prompt: "Create a DAO governance system with proposal creation, voting, and automatic execution",
  },
];

function TemplateSuggestions({
  onSelect,
}: {
  onSelect: (prompt: string) => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6">
      <div className="mb-8 text-center">
        <h2 className="text-xl font-semibold text-white">
          What do you want to build?
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          Describe your dApp or pick a template to get started.
        </p>
      </div>
      <div className="grid w-full max-w-lg grid-cols-1 gap-3 sm:grid-cols-2">
        {TEMPLATE_SUGGESTIONS.map((tmpl) => (
          <button
            key={tmpl.title}
            onClick={() => onSelect(tmpl.prompt)}
            className="rounded-xl border border-gray-700 bg-gray-800 p-4 text-left transition-colors hover:border-indigo-500/50 hover:bg-gray-750"
          >
            <p className="text-sm font-medium text-white">{tmpl.title}</p>
            <p className="mt-1 text-xs text-gray-400">{tmpl.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ChatPanel
// ---------------------------------------------------------------------------

interface ChatPanelProps {
  messages: ChatMessageType[];
  isStreaming: boolean;
  onSendMessage: (message: string) => void;
}

export function ChatPanel({
  messages,
  isStreaming,
  onSendMessage,
}: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change or streaming starts
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages, isStreaming]);

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-full flex-col bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">
            Z
          </div>
          <span className="text-sm font-medium text-white">Zapp AI</span>
        </div>
        {hasMessages && (
          <span className="text-xs text-gray-500">
            {messages.length} message{messages.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Message area */}
      {hasMessages ? (
        <div ref={scrollRef} className="flex-1 overflow-y-auto py-4">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          {isStreaming && <TypingIndicator />}
        </div>
      ) : (
        <TemplateSuggestions onSelect={onSendMessage} />
      )}

      {/* Input */}
      <ChatInput onSendMessage={onSendMessage} isStreaming={isStreaming} />
    </div>
  );
}
