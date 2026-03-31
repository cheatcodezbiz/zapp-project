// ---------------------------------------------------------------------------
// Zapp AI Agent — ReAct (Reason + Act) conversational agent
// ---------------------------------------------------------------------------
// The core agentic loop: stream Claude's response, detect tool calls,
// execute them, feed results back, and repeat until Claude responds
// with plain text (no more tool calls).
// ---------------------------------------------------------------------------

import Anthropic from "@anthropic-ai/sdk";
import type { AgentConfig, ChatStreamEvent, ChatMessage } from "@zapp/shared-types";
import { buildAgentSystemPrompt } from "./prompts/agent-system";
import { tools } from "./tools/index";
import { executeTool } from "./tools/executor";

// ---------------------------------------------------------------------------
// Types for Anthropic message format
// ---------------------------------------------------------------------------

interface TextBlock {
  type: "text";
  text: string;
}

interface ToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

type ContentBlock = TextBlock | ToolUseBlock;

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | ContentBlock[];
}

interface ToolResultBlock {
  type: "tool_result";
  tool_use_id: string;
  content: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MAX_LOOP_ITERATIONS = 10;
const MAX_CONVERSATION_MESSAGES = 20;
const MODEL = "claude-sonnet-4-20250514" as const;
const MAX_TOKENS = 8192;

/**
 * Convert ChatMessage[] from our shared types to Anthropic's message format.
 * Keeps only the last N messages to manage context window.
 */
function convertMessages(
  history: ChatMessage[],
): AnthropicMessage[] {
  const recent = history.slice(-MAX_CONVERSATION_MESSAGES);

  return recent
    .filter((msg) => msg.role === "user" || msg.role === "assistant")
    .map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }));
}

// ---------------------------------------------------------------------------
// Main agent loop
// ---------------------------------------------------------------------------

export async function runAgent(config: AgentConfig): Promise<void> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const systemPrompt = buildAgentSystemPrompt(config.projectContext);

  // Build the initial messages array from conversation history
  const messages: AnthropicMessage[] = convertMessages(
    config.conversationHistory,
  );

  // Ensure there is at least one user message
  if (
    messages.length === 0 ||
    messages[messages.length - 1]!.role !== "user"
  ) {
    config.onError(
      new Error("Agent requires at least one user message to start."),
    );
    return;
  }

  let iteration = 0;

  while (iteration < MAX_LOOP_ITERATIONS) {
    iteration++;

    try {
      // ---- Step 1: Call Claude with streaming ----
      const stream = client.messages.stream({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages,
        tools,
      });

      // Accumulate the full response for the message history
      let accumulatedText = "";
      const toolUseBlocks: ToolUseBlock[] = [];

      // Track current tool_use block being built from streaming events
      let currentToolId: string | null = null;
      let currentToolName: string | null = null;
      let currentToolInputJson = "";

      // ---- Step 2: Process the stream ----
      const response = await stream.finalMessage();

      // Process the completed response content blocks
      for (const block of response.content) {
        if (block.type === "text") {
          accumulatedText += block.text;
          // Emit tokens — for streaming we emit the full text at once
          // since we're using finalMessage(). For true streaming,
          // use the event-based approach below.
          config.onToken(block.text);
        } else if (block.type === "tool_use") {
          toolUseBlocks.push({
            type: "tool_use",
            id: block.id,
            name: block.name,
            input: block.input as Record<string, unknown>,
          });
        }
      }

      // ---- Step 3: Check if we have tool calls ----
      if (toolUseBlocks.length === 0) {
        // No tool calls — the agent is done responding
        config.onDone();
        return;
      }

      // ---- Step 4: Build the assistant message with all content blocks ----
      const assistantContent: ContentBlock[] = [];
      if (accumulatedText) {
        assistantContent.push({ type: "text", text: accumulatedText });
      }
      for (const tool of toolUseBlocks) {
        assistantContent.push(tool);
      }
      messages.push({ role: "assistant", content: assistantContent });

      // ---- Step 5: Execute each tool and collect results ----
      const toolResults: ToolResultBlock[] = [];

      for (const tool of toolUseBlocks) {
        // Notify that a tool is starting
        config.onToolStart(tool.name, tool.input);

        // Execute the tool
        const { result } = await executeTool(
          tool.name,
          tool.input,
          config,
        );

        // Notify with the result
        config.onToolResult(tool.name, result);

        // Add tool result to the results array
        toolResults.push({
          type: "tool_result",
          tool_use_id: tool.id,
          content: JSON.stringify(result),
        });
      }

      // ---- Step 6: Push tool results as a user message and loop ----
      messages.push({
        role: "user",
        content: toolResults as unknown as ContentBlock[],
      });

      // Continue the loop — Claude will process tool results and either
      // respond with text or make more tool calls
    } catch (error) {
      // Handle Anthropic API errors
      if (error instanceof Anthropic.APIError) {
        const apiError = new Error(
          `Anthropic API error (${error.status}): ${error.message}`,
        );
        config.onError(apiError);
        return;
      }

      // Handle other errors
      const genericError =
        error instanceof Error
          ? error
          : new Error("An unexpected error occurred in the agent loop.");
      config.onError(genericError);
      return;
    }
  }

  // If we exhausted all iterations, force-stop
  config.onToken(
    "\n\n---\n*I've reached my maximum reasoning depth for this request. Please send a follow-up message if you need me to continue.*",
  );
  config.onDone();
}

// ---------------------------------------------------------------------------
// Streaming variant — emits tokens as they arrive
// ---------------------------------------------------------------------------
// This version uses the event-based stream API for true token-by-token
// streaming. Use this when you need real-time token delivery to the client.
// ---------------------------------------------------------------------------

export async function runAgentStreaming(
  config: AgentConfig,
): Promise<void> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const systemPrompt = buildAgentSystemPrompt(config.projectContext);

  const messages: AnthropicMessage[] = convertMessages(
    config.conversationHistory,
  );

  if (
    messages.length === 0 ||
    messages[messages.length - 1]!.role !== "user"
  ) {
    config.onError(
      new Error("Agent requires at least one user message to start."),
    );
    return;
  }

  let iteration = 0;

  while (iteration < MAX_LOOP_ITERATIONS) {
    iteration++;

    try {
      const stream = client.messages.stream({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages,
        tools,
      });

      let accumulatedText = "";
      const toolUseBlocks: ToolUseBlock[] = [];

      // Current tool being assembled from stream events
      let currentToolUse: Partial<ToolUseBlock> | null = null;
      let currentToolInputJson = "";

      // Process streaming events
      stream.on("text", (text) => {
        accumulatedText += text;
        config.onToken(text);
      });

      stream.on("contentBlock", (block) => {
        if (block.type === "tool_use") {
          toolUseBlocks.push({
            type: "tool_use",
            id: block.id,
            name: block.name,
            input: block.input as Record<string, unknown>,
          });
        }
      });

      // Wait for the stream to complete
      const response = await stream.finalMessage();

      // Reconcile — ensure we captured all tool_use blocks from the final message
      // (the contentBlock event may not fire for tool_use in all SDK versions)
      if (toolUseBlocks.length === 0) {
        for (const block of response.content) {
          if (block.type === "tool_use") {
            toolUseBlocks.push({
              type: "tool_use",
              id: block.id,
              name: block.name,
              input: block.input as Record<string, unknown>,
            });
          }
        }
      }

      // Also ensure accumulated text is complete
      if (!accumulatedText) {
        for (const block of response.content) {
          if (block.type === "text") {
            accumulatedText += block.text;
            config.onToken(block.text);
          }
        }
      }

      // No tool calls — done
      if (toolUseBlocks.length === 0) {
        config.onDone();
        return;
      }

      // Build assistant message
      const assistantContent: ContentBlock[] = [];
      if (accumulatedText) {
        assistantContent.push({ type: "text", text: accumulatedText });
      }
      for (const tool of toolUseBlocks) {
        assistantContent.push(tool);
      }
      messages.push({ role: "assistant", content: assistantContent });

      // Execute tools
      const toolResults: ToolResultBlock[] = [];

      for (const tool of toolUseBlocks) {
        config.onToolStart(tool.name, tool.input);
        const { result } = await executeTool(tool.name, tool.input, config);
        config.onToolResult(tool.name, result);
        toolResults.push({
          type: "tool_result",
          tool_use_id: tool.id,
          content: JSON.stringify(result),
        });
      }

      messages.push({
        role: "user",
        content: toolResults as unknown as ContentBlock[],
      });
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        config.onError(
          new Error(
            `Anthropic API error (${error.status}): ${error.message}`,
          ),
        );
        return;
      }
      config.onError(
        error instanceof Error
          ? error
          : new Error("An unexpected error occurred in the agent loop."),
      );
      return;
    }
  }

  config.onToken(
    "\n\n---\n*I've reached my maximum reasoning depth for this request. Please send a follow-up message if you need me to continue.*",
  );
  config.onDone();
}
