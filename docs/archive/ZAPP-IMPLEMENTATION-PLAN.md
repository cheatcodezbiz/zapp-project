# ZAPP PLATFORM — FULL IMPLEMENTATION PLAN & TECH SPEC

## For: Claude Code Agent Swarm Execution

**Version:** 1.0
**Date:** March 31, 2026
**Author:** Thomas (Founder) + Claude Opus (Architect)
**Purpose:** This document is the single source of truth for transforming Zapp from a dashboard-style MVP into a Lovable-style conversational AI dApp builder. Any Claude Code agent working on this project MUST read this document first.

---

## TABLE OF CONTENTS

1. [Project Context & Current State](#1-project-context--current-state)
2. [Target Experience](#2-target-experience)
3. [Architecture Overview](#3-architecture-overview)
4. [Phase 1: Chat Interface & Streaming](#4-phase-1-chat-interface--streaming)
5. [Phase 2: Sandbox Preview System](#5-phase-2-sandbox-preview-system)
6. [Phase 3: AI Agent Brain & Tool Use](#6-phase-3-ai-agent-brain--tool-use)
7. [Phase 4: Integration, Polish & Iterative Editing](#7-phase-4-integration-polish--iterative-editing)
8. [Agent Swarm Execution Plan](#8-agent-swarm-execution-plan)
9. [Context Engineering & System Prompts](#9-context-engineering--system-prompts)
10. [File-by-File Implementation Guide](#10-file-by-file-implementation-guide)
11. [Testing & Validation](#11-testing--validation)
12. [Environment & Configuration](#12-environment--configuration)

---

## 1. PROJECT CONTEXT & CURRENT STATE

### What Zapp Is
Zapp is an AI-powered dApp builder that lets non-technical users create, simulate, and deploy blockchain applications (smart contracts + frontends) using plain English. Think "Lovable, but for blockchain, targeted at normies."

### Monorepo Structure
```
Zapp Project/
├── apps/
│   ├── api/          # tRPC backend (Node.js, HTTP+SSE)
│   └── web/          # Next.js 14 App Router frontend
├── packages/
│   ├── ai/           # Anthropic Claude integration (generation pipeline)
│   ├── contracts/    # Hardhat + OpenZeppelin smart contract artifacts
│   ├── db/           # Drizzle ORM + PostgreSQL schema
│   ├── shared-types/ # TypeScript types shared across packages
│   ├── simulation/   # 7-phase tokenomics simulation engine
│   ├── ui/           # shadcn/ui component library
│   └── web3-sdk/     # wagmi + viem + RainbowKit utilities
```

### What Already Works
- **Simulation engine** (100%) — 7-phase tokenomics model, risk classification, chart data
- **AI generation pipeline** (90%) — System prompts for Solidity/React/Tests, Anthropic SDK wired, template fallback
- **tRPC API** (70%) — All routes defined with Zod validation, middleware for auth/credits
- **Database schema** (80%) — Complete Drizzle ORM schema, not yet wired to API context
- **Frontend pages** (80%) — Landing, dashboard, simulate, templates, generate, deploy, settings
- **Web3 integration** (70%) — RainbowKit, wagmi, viem configured
- **Zustand stores** — Project, auth, credit, generation stores with demo data
- **Shared types** (95%) — Comprehensive TypeScript definitions

### What's Missing (What This Plan Builds)
1. **Conversational chat interface** — Split-screen layout with AI chat + live preview
2. **Sandbox preview panel** — Real-time rendering of generated dApps
3. **Conversational AI agent** — Claude as an orchestrating agent (not just a code generator)
4. **Iterative editing loop** — Edit existing code via conversation, not just one-shot generation
5. **Tool-use architecture** — AI decides when to generate, simulate, explain, or ask questions

---

## 2. TARGET EXPERIENCE

### User Flow (Before — Current)
```
User → Pick template → Set parameters → Click generate → Wait → See files on separate page
```

### User Flow (After — Target)
```
User → Opens project → Types "I want a staking dApp where users lock ETH for 30 days at 12% APY"
  → AI asks: "Should users be able to unstake early with a penalty, or is the lock strict?"
  → User: "Early unstake with 10% penalty"
  → AI: "Got it. I'll build a StakingVault contract with..."
  → [Preview panel shows contract structure forming]
  → AI generates contract → Preview shows Solidity code
  → AI generates frontend → Preview shows live dApp UI
  → User: "Make the stake button bigger and add a countdown timer"
  → AI patches the frontend → Preview updates instantly
  → User: "Run a simulation with 1000 users"
  → AI calls simulation engine → Charts appear in preview
  → User: "Deploy to Base"
  → AI initiates deployment pipeline
```

### Layout Target
```
┌─────────────────────────────────────────────────────────────────┐
│  [Zapp Logo]  [Project Name]  [Settings]  [Deploy]  [Credits]  │
├──────────────────────────────┬──────────────────────────────────┤
│                              │                                  │
│   CHAT PANEL (left ~40%)     │   PREVIEW PANEL (right ~60%)     │
│                              │                                  │
│   [AI message bubbles]       │   [Tab: Preview | Code | Sim]    │
│   [User message bubbles]     │                                  │
│   [Code blocks inline]       │   [Live iframe / code viewer /   │
│   [Status indicators]        │    simulation charts]             │
│                              │                                  │
│                              │                                  │
│   ┌────────────────────────┐ │                                  │
│   │ Type your message...   │ │                                  │
│   │              [Send ▶]  │ │                                  │
│   └────────────────────────┘ │                                  │
├──────────────────────────────┴──────────────────────────────────┤
│  [Files: Contract.sol] [StakingUI.tsx] [Tests.ts]               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. ARCHITECTURE OVERVIEW

### New Architecture (Post-Implementation)
```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js 14 Frontend                       │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ Chat Panel   │  │ Preview Panel│  │ File Explorer     │  │
│  │ (streaming)  │  │ (iframe)     │  │ (generated files) │  │
│  └──────┬───────┘  └──────┬───────┘  └───────────────────┘  │
│         │                 │                                   │
│    Zustand Stores: chat-store, preview-store, project-store  │
└─────────┬─────────────────┼──────────────────────────────────┘
          │                 │
          ▼                 │
┌─────────────────────┐     │
│  tRPC API Server    │     │
│  ┌───────────────┐  │     │
│  │ chat.send()   │──┼─────┘ (SSE stream)
│  │ chat.history()│  │
│  └───────┬───────┘  │
│          │          │
│  ┌───────▼───────┐  │
│  │ AI AGENT BRAIN│  │
│  │ (Orchestrator)│  │
│  │               │  │
│  │ Tools:        │  │
│  │ • generate()  │  │     ┌─────────────────┐
│  │ • simulate()  │──┼────→│ packages/ai     │
│  │ • explain()   │  │     │ packages/sim    │
│  │ • edit()      │  │     └─────────────────┘
│  │ • deploy()    │  │
│  └───────────────┘  │
│                     │
│  Existing routers:  │     ┌─────────────────┐
│  auth, credits,     │────→│ PostgreSQL      │
│  projects, etc.     │     │ (Drizzle ORM)   │
└─────────────────────┘     └─────────────────┘
```

### Key Design Decisions

**Decision 1: Streaming over WebSockets**
Use Server-Sent Events (SSE) for chat streaming, not WebSockets. Why: SSE is simpler, works with your existing tRPC setup (you already have SSE for job progress), and Claude's API streams via SSE natively. One-directional streaming is all you need — user messages go via regular HTTP POST, AI responses stream back via SSE.

**Decision 2: iframe Sandbox (Phase 1) → WebContainers (Phase 2)**
Start with a sandboxed iframe using `srcdoc` for previews. The AI generates a self-contained HTML file with React loaded from CDN. This gets you 80% of the Lovable experience with minimal infrastructure. Upgrade to WebContainers later when you need full Node.js in the browser.

**Decision 3: Single Conversational Agent with Tools**
Don't build multiple chatbots. Build ONE conversational AI agent that has access to tools (generate_contract, generate_frontend, run_simulation, etc.). The AI decides which tool to call based on conversation context. This is the Anthropic "tool use" pattern.

**Decision 4: Project-Scoped Conversations**
Each project has its own conversation history. When a user opens a project, they see the full chat history and can continue building. The AI always has the project's current state as context.

---

## 4. PHASE 1: CHAT INTERFACE & STREAMING

### Overview
Build the split-screen chat interface and the streaming API endpoint that connects to Claude.

### New Files to Create

#### `apps/web/src/app/app/projects/[id]/builder/page.tsx`
This is the NEW primary page — the Lovable-like builder experience.

```
Purpose: Split-screen layout with chat panel (left) and preview panel (right)
Route: /app/projects/[id]/builder
```

**Requirements:**
- Full-height layout (100vh minus top nav)
- Resizable split panel (default 40/60, draggable divider)
- Left panel: Chat component
- Right panel: Preview component with tabs (Preview | Code | Simulation)
- Bottom bar: Generated file tabs
- Load project data and conversation history on mount
- Mobile: Stack vertically with toggle between chat and preview

#### `apps/web/src/components/chat/ChatPanel.tsx`
The main chat container component.

**Requirements:**
- Scrollable message list with auto-scroll to bottom
- Each message shows: role (user/assistant), content, timestamp
- AI messages support markdown rendering (use `react-markdown`)
- AI messages support code blocks with syntax highlighting (use `highlight.js` or `prism`)
- AI messages show inline status indicators: "Generating contract...", "Running simulation..."
- Typing indicator while AI is streaming
- Scroll-to-bottom button when scrolled up

#### `apps/web/src/components/chat/ChatInput.tsx`
The message input component.

**Requirements:**
- Multi-line textarea (grows up to 6 lines, then scrolls)
- Send button (disabled when empty or while AI is responding)
- Send on Enter, new line on Shift+Enter
- Character counter (optional)
- Disabled state while AI is processing
- Template suggestions on empty state: "Build a staking dApp", "Create an ERC-20 token", "Design a governance system"

#### `apps/web/src/components/chat/ChatMessage.tsx`
Individual message bubble component.

**Requirements:**
- User messages: right-aligned, indigo background, white text
- AI messages: left-aligned, gray-800 background, white text
- Code blocks: dark background with copy button and language label
- Collapsible generated code sections (show summary, expand for full code)
- Tool-use indicators: when AI calls a tool, show a status card ("🔧 Generating StakingVault.sol...")
- Error states: red border with retry button

#### `apps/web/src/stores/chat-store.ts`
Zustand store for chat state.

```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  // Tool use tracking
  toolCalls?: {
    toolName: string;
    status: 'pending' | 'running' | 'completed' | 'error';
    result?: any;
  }[];
  // Generated artifacts
  artifacts?: {
    type: 'contract' | 'frontend' | 'test' | 'simulation';
    filename: string;
    code: string;
  }[];
}

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
```

#### `apps/api/src/router/chat.ts`
New tRPC router for chat functionality.

**Requirements:**
- `chat.send` — Protected procedure that accepts a message and project ID, streams AI response via SSE
- `chat.history` — Protected procedure that returns conversation history for a project
- `chat.clearHistory` — Protected procedure that clears conversation for a project

**Implementation pattern for `chat.send`:**
```typescript
// Pseudocode — the agent will implement this fully
chat.send = protectedProcedure
  .input(z.object({
    projectId: z.string(),
    message: z.string().min(1).max(10000),
  }))
  .subscription(async function* ({ input, ctx }) {
    // 1. Load project context (existing files, config, conversation history)
    // 2. Build the Claude message array (system prompt + history + new message)
    // 3. Call Anthropic API with streaming enabled
    // 4. Yield SSE events as tokens arrive:
    //    - { type: 'token', content: '...' }          — text token
    //    - { type: 'tool_start', tool: '...' }        — AI is calling a tool
    //    - { type: 'tool_result', tool: '...', data }  — tool returned result
    //    - { type: 'artifact', artifact: {...} }       — generated file
    //    - { type: 'done' }                            — stream complete
    // 5. Save conversation to database/store
  });
```

#### `apps/web/src/hooks/useChat.ts`
Custom React hook that manages the chat interaction.

**Requirements:**
- Connects to tRPC SSE subscription for `chat.send`
- Manages optimistic updates (show user message immediately)
- Handles streaming tokens into the chat store
- Handles tool-use events (update preview panel)
- Handles artifacts (update file store, trigger preview)
- Error handling with retry logic
- Abort controller for canceling streams

### Dependencies to Install

```bash
# Frontend
cd apps/web
pnpm add react-markdown remark-gfm rehype-highlight react-resizable-panels

# API (already has @anthropic-ai/sdk in packages/ai)
# No new deps needed — use existing Anthropic SDK
```

### Existing Files to Modify

#### `apps/api/src/router/index.ts`
Add the new chat router to the merged router:
```typescript
import { chatRouter } from './chat';
// Add to appRouter: chat: chatRouter
```

#### `apps/web/src/app/app/layout.tsx`
The builder page may need a different layout (no sidebar, full-width). Add a condition or create a separate layout for the builder route.

#### `apps/web/src/app/app/projects/[id]/page.tsx`
Add a prominent "Open Builder" button that navigates to `/app/projects/[id]/builder`.

---

## 5. PHASE 2: SANDBOX PREVIEW SYSTEM

### Overview
Build the right-side preview panel that renders generated code live.

### New Files to Create

#### `apps/web/src/components/preview/PreviewPanel.tsx`
The main preview container with tabs.

**Requirements:**
- Tab bar: "Preview" | "Code" | "Simulation"
- Preview tab: Sandboxed iframe showing the generated frontend
- Code tab: Syntax-highlighted code viewer showing all generated files
- Simulation tab: Recharts visualization of simulation results
- Loading state with skeleton UI while generating
- Error state if preview fails to render

#### `apps/web/src/components/preview/SandboxPreview.tsx`
The iframe-based live preview.

**CRITICAL IMPLEMENTATION DETAILS:**

```typescript
// The approach: Generate a self-contained HTML string and render it in an iframe via srcdoc
// This is safe (sandboxed), fast (no server needed), and simple

// The HTML template wraps the generated React component:
const buildPreviewHTML = (reactCode: string, contractABI?: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.umd.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    body { background: #111827; color: white; font-family: Inter, sans-serif; margin: 0; padding: 16px; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    // Contract ABI available as global
    ${contractABI ? `window.CONTRACT_ABI = ${contractABI};` : ''}

    // The generated React component code goes here
    ${reactCode}

    // Mount it
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(React.createElement(App));
  </script>
</body>
</html>
`;
```

**iframe requirements:**
```html
<iframe
  srcDoc={previewHTML}
  sandbox="allow-scripts allow-same-origin"
  style={{ width: '100%', height: '100%', border: 'none' }}
  title="dApp Preview"
/>
```

**Key points:**
- `sandbox="allow-scripts allow-same-origin"` — allows JS execution but restricts navigation, forms, popups
- Never use `allow-top-navigation` — prevents the iframe from redirecting the parent
- Use `postMessage` for parent↔iframe communication (e.g., to inject wallet provider mock)
- Rebuild the iframe whenever generated code changes (replace `srcdoc`)

#### `apps/web/src/components/preview/CodeViewer.tsx`
Syntax-highlighted code display for all generated files.

**Requirements:**
- File tab bar showing all generated files (Contract.sol, StakingUI.tsx, StakingTest.ts)
- Syntax highlighting using highlight.js (already available via rehype-highlight)
- Line numbers
- Copy-to-clipboard button
- Diff view option (show what changed in the last edit — use a simple inline diff)

#### `apps/web/src/components/preview/SimulationView.tsx`
Simulation results visualization.

**Requirements:**
- Reuse existing `ChartGrid` component from `apps/web/src/components/simulation/ChartGrid.tsx`
- Show risk badge from simulation results
- Show key metrics: APY, runway, max drawdown
- "Run Simulation" button that the AI can also trigger via tool use

#### `apps/web/src/stores/preview-store.ts`
Zustand store for preview state.

```typescript
interface GeneratedFile {
  id: string;
  filename: string;
  language: 'solidity' | 'typescript' | 'tsx';
  content: string;
  version: number;  // Increments on each edit
  previousContent?: string;  // For diff view
}

interface PreviewStore {
  files: GeneratedFile[];
  activeTab: 'preview' | 'code' | 'simulation';
  activeFileId: string | null;
  simulationResults: any | null;
  isPreviewLoading: boolean;
  previewError: string | null;

  // Actions
  setFiles: (files: GeneratedFile[]) => void;
  updateFile: (id: string, content: string) => void;
  addFile: (file: GeneratedFile) => void;
  setActiveTab: (tab: string) => void;
  setActiveFile: (id: string) => void;
  setSimulationResults: (results: any) => void;
  setPreviewLoading: (loading: boolean) => void;
  setPreviewError: (error: string | null) => void;
}
```

### Wallet Mocking for Preview
The preview iframe won't have a real wallet connected. Create a mock provider:

#### `apps/web/src/components/preview/wallet-mock.ts`
```typescript
// Inject a mock window.ethereum into the iframe
// This allows the generated dApp frontend to "connect wallet"
// without actually needing MetaMask
// The mock returns a hardcoded address and simulates transactions

const MOCK_WALLET = {
  address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD68',
  chainId: '0x2105', // Base chain ID
  // ... implement request() method for eth_requestAccounts, eth_chainId, etc.
};
```

---

## 6. PHASE 3: AI AGENT BRAIN & TOOL USE

### Overview
Transform the AI from a one-shot code generator into a conversational agent that uses tools. This is the most critical phase — this is what makes Zapp feel intelligent.

### Architecture: Tool-Use Pattern

Anthropic's Claude supports "tool use" (function calling) natively. Instead of the AI just generating text, you define tools it can call, and it decides when to call them based on conversation context.

```
User: "Build me a staking dApp"
  → AI thinks: "This is a generation request. I need to understand parameters first."
  → AI responds: "I'd love to help! A few questions first..."
  → [conversation continues]
  → AI thinks: "I have enough info. Time to generate."
  → AI calls tool: generate_contract({ type: 'staking', params: {...} })
  → Tool returns: { solidity: '...', filename: 'StakingVault.sol' }
  → AI calls tool: generate_frontend({ contractABI: '...', params: {...} })
  → Tool returns: { tsx: '...', filename: 'StakingUI.tsx' }
  → AI responds: "I've built your StakingVault contract and frontend! Here's what I created..."
```

### New Files to Create

#### `packages/ai/src/agent.ts`
The core conversational agent — THIS IS THE MOST IMPORTANT FILE IN THE ENTIRE PROJECT.

```typescript
// This file implements the AI agent that orchestrates the entire Zapp experience.
// It wraps the Anthropic SDK with tool definitions and conversation management.

import Anthropic from '@anthropic-ai/sdk';
import { AGENT_SYSTEM_PROMPT } from './prompts/agent-system';
import { tools, executeTool } from './tools';

interface AgentConfig {
  projectId: string;
  projectContext: ProjectContext;  // Current files, config, etc.
  conversationHistory: Message[];
  onToken: (token: string) => void;
  onToolStart: (toolName: string, input: any) => void;
  onToolResult: (toolName: string, result: any) => void;
  onArtifact: (artifact: GeneratedArtifact) => void;
  onDone: () => void;
  onError: (error: Error) => void;
}

interface ProjectContext {
  name: string;
  description: string;
  chain: string;
  existingFiles: { filename: string; content: string }[];
  simulationResults?: any;
  deploymentStatus?: any;
}

export async function runAgent(config: AgentConfig): Promise<void> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Build the system prompt with project context injected
  const systemPrompt = buildSystemPrompt(config.projectContext);

  // Build messages array: history + new user message
  const messages = config.conversationHistory;

  // The agentic loop — keeps running until the AI is done
  let continueLoop = true;

  while (continueLoop) {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: systemPrompt,
      messages: messages,
      tools: tools,
      stream: true,
    });

    // Process the streamed response
    // If the response contains tool_use blocks, execute the tools and loop
    // If the response is just text (no tool calls), stream it and stop

    let hasToolUse = false;
    let assistantContent = [];

    for await (const event of response) {
      if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') {
          config.onToken(event.delta.text);
          // Accumulate text
        }
      }
      if (event.type === 'content_block_start') {
        if (event.content_block.type === 'tool_use') {
          hasToolUse = true;
          config.onToolStart(event.content_block.name, event.content_block.input);
        }
      }
      // ... handle other event types
    }

    if (hasToolUse) {
      // Execute each tool call
      for (const toolCall of toolCalls) {
        const result = await executeTool(toolCall.name, toolCall.input, config);
        config.onToolResult(toolCall.name, result);

        // If the tool produced an artifact (generated code), emit it
        if (result.artifact) {
          config.onArtifact(result.artifact);
        }

        // Add tool result to messages for the next loop iteration
        messages.push({
          role: 'assistant',
          content: assistantContent,
        });
        messages.push({
          role: 'user',
          content: [{
            type: 'tool_result',
            tool_use_id: toolCall.id,
            content: JSON.stringify(result),
          }],
        });
      }
      // Loop continues — AI will process tool results and may call more tools or respond
    } else {
      // No tool calls — AI is done responding
      continueLoop = false;
      config.onDone();
    }
  }
}
```

#### `packages/ai/src/tools/index.ts`
Tool definitions for the Claude API.

```typescript
// These are the tools the AI agent can call.
// Each tool has a name, description, and input schema (JSON Schema).
// The AI reads these definitions and decides when to call each tool.

export const tools = [
  {
    name: 'generate_contract',
    description: `Generate a Solidity smart contract based on the user's requirements. Call this when you have enough information about what the user wants to build. The contract will follow UUPS upgradeable pattern with OpenZeppelin 5.x. Returns the Solidity source code.`,
    input_schema: {
      type: 'object',
      properties: {
        contractType: {
          type: 'string',
          enum: ['staking', 'token', 'nft', 'governance', 'vault', 'custom'],
          description: 'The type of contract to generate',
        },
        name: {
          type: 'string',
          description: 'Contract name in PascalCase (e.g., StakingVault)',
        },
        description: {
          type: 'string',
          description: 'Detailed description of contract functionality and requirements',
        },
        parameters: {
          type: 'object',
          description: 'Contract-specific parameters (e.g., rewardRate, lockDuration, maxStake)',
          additionalProperties: true,
        },
        features: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of features to include (e.g., ["emergencyWithdraw", "compounding", "tieredRewards"])',
        },
      },
      required: ['contractType', 'name', 'description'],
    },
  },
  {
    name: 'generate_frontend',
    description: `Generate a React frontend component for interacting with a smart contract. Call this after a contract has been generated, or when the user wants to update the UI. Returns a TSX component.`,
    input_schema: {
      type: 'object',
      properties: {
        contractName: {
          type: 'string',
          description: 'Name of the contract this frontend interacts with',
        },
        contractABI: {
          type: 'string',
          description: 'The ABI of the contract (JSON string). Pass the ABI from the generated contract.',
        },
        features: {
          type: 'array',
          items: { type: 'string' },
          description: 'UI features to include (e.g., ["stakeForm", "rewardsDisplay", "unstakeButton", "countdownTimer"])',
        },
        style: {
          type: 'string',
          enum: ['minimal', 'dashboard', 'defi-app'],
          description: 'UI style to use',
        },
      },
      required: ['contractName', 'features'],
    },
  },
  {
    name: 'generate_tests',
    description: `Generate a Hardhat test suite for a smart contract. Call this after contract generation. Returns TypeScript test code.`,
    input_schema: {
      type: 'object',
      properties: {
        contractName: { type: 'string' },
        contractCode: { type: 'string', description: 'The Solidity source code to test' },
      },
      required: ['contractName', 'contractCode'],
    },
  },
  {
    name: 'run_simulation',
    description: `Run a tokenomics simulation using the built-in 7-phase simulation engine. Call this when the user wants to test the economics of their protocol. Returns simulation results with charts and risk assessment.`,
    input_schema: {
      type: 'object',
      properties: {
        totalSupply: { type: 'number', description: 'Total token supply' },
        initialPrice: { type: 'number', description: 'Initial token price in USD' },
        rewardRate: { type: 'number', description: 'Annual reward rate (0-1, e.g., 0.12 for 12%)' },
        emissionDecay: { type: 'number', description: 'Emission decay rate per period (0-1)' },
        feeRate: { type: 'number', description: 'Protocol fee rate (0-1)' },
        initialStakers: { type: 'number', description: 'Number of initial stakers' },
        durationDays: { type: 'number', description: 'Simulation duration in days (default 360)' },
      },
      required: ['totalSupply', 'initialPrice', 'rewardRate'],
    },
  },
  {
    name: 'edit_code',
    description: `Edit an existing generated file. Call this when the user wants to modify something that's already been generated (e.g., "make the button blue", "add a countdown timer", "increase the lock period to 60 days"). Generates a new version of the specified file.`,
    input_schema: {
      type: 'object',
      properties: {
        filename: { type: 'string', description: 'The file to edit (e.g., "StakingVault.sol", "StakingUI.tsx")' },
        currentCode: { type: 'string', description: 'The current content of the file' },
        editInstructions: { type: 'string', description: 'What to change, in detail' },
      },
      required: ['filename', 'currentCode', 'editInstructions'],
    },
  },
  {
    name: 'explain_concept',
    description: `Explain a blockchain or DeFi concept to the user in simple terms. Call this when the user asks "what is...", "how does... work", "explain...", or when you need to educate them about a technical concept before making a decision.`,
    input_schema: {
      type: 'object',
      properties: {
        concept: { type: 'string', description: 'The concept to explain' },
        context: { type: 'string', description: 'How this relates to what the user is building' },
      },
      required: ['concept'],
    },
  },
  {
    name: 'security_audit',
    description: `Perform a security review of a smart contract. Call this before deployment, or when the user asks about security. Returns a list of findings with severity levels.`,
    input_schema: {
      type: 'object',
      properties: {
        contractCode: { type: 'string', description: 'The Solidity source code to audit' },
        contractName: { type: 'string' },
      },
      required: ['contractCode', 'contractName'],
    },
  },
];
```

#### `packages/ai/src/tools/executor.ts`
Tool execution logic — maps tool calls to actual implementations.

```typescript
// Each tool is implemented as an async function.
// The AI agent calls these tools and receives structured results.

export async function executeTool(
  toolName: string,
  input: any,
  config: AgentConfig
): Promise<ToolResult> {
  switch (toolName) {
    case 'generate_contract':
      return await executeGenerateContract(input, config);
    case 'generate_frontend':
      return await executeGenerateFrontend(input, config);
    case 'generate_tests':
      return await executeGenerateTests(input, config);
    case 'run_simulation':
      return await executeRunSimulation(input, config);
    case 'edit_code':
      return await executeEditCode(input, config);
    case 'explain_concept':
      // This one doesn't need a tool — the AI can just explain inline
      // But having it as a tool gives structure and consistency
      return { explanation: 'handled_by_ai' };
    case 'security_audit':
      return await executeSecurityAudit(input, config);
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

async function executeGenerateContract(input: any, config: AgentConfig) {
  // Use the existing packages/ai/src/generator.ts logic
  // But enhanced with the agent's understanding of what the user wants

  // 1. Build the generation prompt using the detailed system prompt
  // 2. Call Claude with the contract-specific system prompt
  // 3. Extract the Solidity code from the response
  // 4. Return as an artifact

  return {
    artifact: {
      type: 'contract',
      filename: `${input.name}.sol`,
      code: generatedSolidity,
      language: 'solidity',
    },
    summary: `Generated ${input.name} contract with ${input.features?.join(', ') || 'standard'} features.`,
  };
}

async function executeRunSimulation(input: any, config: AgentConfig) {
  // Use the existing packages/simulation/src/staking.ts directly!
  // This is already fully built and working.

  const { runStakingSimulation, classifyRisk, transformToChartData } = await import('@zapp/simulation');

  const results = runStakingSimulation({
    totalSupply: input.totalSupply,
    initialPrice: input.initialPrice,
    rewardRateBps: Math.round(input.rewardRate * 10000),
    emissionDecayRate: input.emissionDecay || 0.02,
    feeRate: input.feeRate || 0.003,
    initialStakers: input.initialStakers || 100,
    durationDays: input.durationDays || 360,
  });

  const risk = classifyRisk(results);
  const chartData = transformToChartData(results);

  return {
    simulation: { results, risk, chartData },
    summary: `Simulation complete: ${risk.level} risk. APY: ${risk.metrics.avgAPY}%, Runway: ${risk.metrics.runway} days.`,
  };
}

async function executeEditCode(input: any, config: AgentConfig) {
  // Use Claude to generate an edited version of the file
  // This is where iterative editing happens

  // 1. Send the current code + edit instructions to Claude
  // 2. Claude returns the modified code
  // 3. Return as an updated artifact

  // The system prompt for editing should emphasize:
  // - Make MINIMAL changes (don't rewrite the whole file)
  // - Preserve all existing functionality
  // - Only modify what was requested
  // - Return the COMPLETE file (not just the diff)
}
```

#### `packages/ai/src/prompts/agent-system.ts`
THE master system prompt for the conversational agent. This is the DNA of your product.

```typescript
export function buildAgentSystemPrompt(projectContext: ProjectContext): string {
  return `
# IDENTITY & ROLE

You are Zapp AI, a blockchain development assistant built into the Zapp platform. You help users create, test, and deploy decentralized applications (dApps) using natural language. Your users are NOT developers — they are entrepreneurs, creators, and community builders who want to launch blockchain projects without writing code.

# PERSONALITY & COMMUNICATION STYLE

- Speak in plain, conversational English. Avoid jargon unless you explain it first.
- Be encouraging and supportive. Building on blockchain is exciting, not scary.
- When you use a technical term, immediately explain it in parentheses. Example: "I'll set up a UUPS proxy (a pattern that lets you upgrade your contract later without losing data)."
- Be concise but thorough. Don't dump walls of text. Use short paragraphs.
- When generating code, always explain WHAT you built and WHY before or after showing the code.
- Show enthusiasm for the user's project. This is their vision — help them bring it to life.

# CORE CAPABILITIES (TOOLS)

You have access to the following tools. Use them when appropriate:

1. **generate_contract** — Generate Solidity smart contracts. Use when you have enough information about what the user wants.
2. **generate_frontend** — Generate React UI components for interacting with contracts. Use after a contract is generated.
3. **generate_tests** — Generate Hardhat test suites. Use after contract generation.
4. **run_simulation** — Run tokenomics simulations. Use when the user wants to test economics or when you want to validate a design.
5. **edit_code** — Edit existing generated files. Use when the user wants to modify something already built.
6. **explain_concept** — Explain blockchain concepts. Use when the user needs education before making a decision.
7. **security_audit** — Audit a smart contract for vulnerabilities. Use before deployment or when asked.

# BEHAVIORAL RULES

## When a User Describes What They Want to Build:
1. DO NOT immediately generate code.
2. First, confirm your understanding of what they want.
3. Ask 1-2 clarifying questions about the most important decisions (e.g., "Should the lock period be fixed or flexible?", "Do you want an admin to be able to pause the contract in an emergency?").
4. Once you have enough information, announce what you're about to build, then use the tools.
5. After generation, explain what you built in plain language.

## When a User Asks to Change Something:
1. Confirm what they want changed.
2. Use the edit_code tool to modify the specific file.
3. Explain what changed and why.

## When a User Asks About Security:
1. ALWAYS take security seriously. In blockchain, bugs = lost money.
2. Use the security_audit tool proactively before deployment.
3. Flag common vulnerabilities: reentrancy, access control, integer overflow, front-running.
4. Never dismiss a security concern.

## When a User Wants to Deploy:
1. First, suggest running a simulation if they haven't already.
2. Then, suggest a security audit if they haven't already.
3. Explain the deployment process and costs.
4. Confirm the target chain.
5. Only proceed with deployment when they've confirmed.

## Conversation Management:
- Keep track of what's been built so far. Reference it naturally.
- If the user seems confused, offer to explain concepts.
- If the user's request is vague, ask for clarification rather than guessing.
- If the user asks something outside your capabilities, be honest about limitations.
- Never hallucinate features or capabilities that don't exist.

# TECHNICAL CONSTRAINTS

When generating smart contracts:
- Always use Solidity ^0.8.28
- Always use UUPS upgradeable proxy pattern via OpenZeppelin 5.x
- Always inherit from ZappBaseUpgradeable (provides AccessControl, ReentrancyGuard, Pausable)
- Always use ERC-7201 namespaced storage
- Always include NatSpec documentation
- Always include access control on admin functions
- Always include reentrancy guards on external functions
- Always include pausable guards on user-facing functions
- NEVER generate code that handles private keys
- NEVER generate code with hardcoded addresses (use constructor/initializer parameters)

When generating frontends:
- Use React with hooks (no class components)
- Use Tailwind CSS with dark theme (bg-gray-900 base, indigo accents)
- Use ethers.js v6 for contract interaction
- Include proper error handling and loading states
- Include wallet connection flow
- Make the UI beautiful and intuitive — this is for non-technical users

# CURRENT PROJECT CONTEXT

Project: ${projectContext.name}
Description: ${projectContext.description || 'No description yet'}
Target Chain: ${projectContext.chain || 'Not yet selected'}

## Existing Files:
${projectContext.existingFiles.length > 0
  ? projectContext.existingFiles.map(f => `### ${f.filename}\n\`\`\`\n${f.content.substring(0, 2000)}${f.content.length > 2000 ? '\n... (truncated)' : ''}\n\`\`\``).join('\n\n')
  : 'No files generated yet. This is a new project.'}

${projectContext.simulationResults
  ? `## Latest Simulation Results:\nRisk Level: ${projectContext.simulationResults.risk?.level || 'N/A'}\nAvg APY: ${projectContext.simulationResults.risk?.metrics?.avgAPY || 'N/A'}%`
  : ''}

${projectContext.deploymentStatus
  ? `## Deployment Status: ${projectContext.deploymentStatus.stage}`
  : ''}
`.trim();
}
```

### Existing Files to Modify

#### `packages/ai/src/generator.ts`
Refactor to expose individual generation functions that the tool executor can call. Currently it's a monolithic `generateWithAI()` — break it into:
- `generateContractCode(params)` — returns just the Solidity string
- `generateFrontendCode(params)` — returns just the TSX string
- `generateTestCode(params)` — returns just the test string
Keep the existing functions working for backward compatibility.

#### `packages/ai/src/prompts/system.ts`
Keep existing prompts (they're good). They'll be used by individual tool executors. The new `agent-system.ts` prompt is for the CONVERSATIONAL layer — it wraps everything.

---

## 7. PHASE 4: INTEGRATION, POLISH & ITERATIVE EDITING

### Overview
Wire everything together, add error recovery, implement the iterative editing loop, and polish the UX.

### Key Integration Tasks

#### 7.1 — Wire Chat to Preview
When the AI agent generates an artifact via tool use, the artifact needs to flow from the API → chat store → preview store → iframe.

```
chat.send() streams response
  → SSE event: { type: 'artifact', artifact: { filename, code, type } }
  → useChat hook receives it
  → Updates preview-store with new/updated file
  → PreviewPanel re-renders iframe with new code
```

**Implementation in `useChat.ts`:**
```typescript
// When an artifact event arrives:
onArtifact: (artifact) => {
  const previewStore = usePreviewStore.getState();

  const existingFile = previewStore.files.find(f => f.filename === artifact.filename);
  if (existingFile) {
    previewStore.updateFile(existingFile.id, artifact.code);
  } else {
    previewStore.addFile({
      id: crypto.randomUUID(),
      filename: artifact.filename,
      language: artifact.type === 'contract' ? 'solidity' : 'tsx',
      content: artifact.code,
      version: 1,
    });
  }

  // Auto-switch to preview tab if a frontend was generated
  if (artifact.type === 'frontend') {
    previewStore.setActiveTab('preview');
  }
  // Auto-switch to code tab if a contract was generated
  if (artifact.type === 'contract') {
    previewStore.setActiveTab('code');
  }
}
```

#### 7.2 — Error Recovery Loop
When generated code fails to render in the preview iframe, capture the error and feed it back to the AI.

**In SandboxPreview.tsx:**
```typescript
// Listen for errors from the iframe
useEffect(() => {
  const handleMessage = (event: MessageEvent) => {
    if (event.data.type === 'preview-error') {
      previewStore.setPreviewError(event.data.error);
      // Optionally: auto-send the error to the AI for self-correction
      // chatStore.addSystemMessage(`Preview error: ${event.data.error}. Please fix.`);
    }
  };
  window.addEventListener('message', handleMessage);
  return () => window.removeEventListener('message', handleMessage);
}, []);
```

**In the iframe HTML template, add error catching:**
```javascript
window.onerror = function(msg, url, lineNo, columnNo, error) {
  window.parent.postMessage({
    type: 'preview-error',
    error: msg,
    line: lineNo,
  }, '*');
};
```

#### 7.3 — Iterative Editing
The `edit_code` tool is how the AI modifies existing files. Key requirements:
- AI receives the FULL current file content as context
- AI generates the FULL updated file (not a diff — diffs are error-prone)
- The preview store tracks versions so users can undo
- The preview iframe rebuilds with the new code

#### 7.4 — Conversation Persistence
Store conversations in the database for continuity across sessions.

**New schema addition to `packages/db/src/schema/`:**
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE messages (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id),
  role TEXT NOT NULL, -- 'user' | 'assistant' | 'system'
  content TEXT NOT NULL,
  tool_calls JSONB,
  artifacts JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 7.5 — UX Polish Checklist
- [ ] Smooth typing animation for AI responses
- [ ] Code blocks with syntax highlighting and copy button
- [ ] Loading skeletons during generation
- [ ] Toast notifications for key events ("Contract generated!", "Simulation complete")
- [ ] Keyboard shortcuts (Cmd+Enter to send, Esc to cancel)
- [ ] "Regenerate" button on AI messages
- [ ] "Undo last edit" button
- [ ] Mobile responsive (stack chat/preview vertically)
- [ ] Empty state with template suggestions
- [ ] Error boundary around preview iframe

---

## 8. AGENT SWARM EXECUTION PLAN

### Overview
This section defines how to use 4 Claude Code agents working in parallel to build everything described above. Each agent owns a specific domain and has clear boundaries. They converge through shared types and a defined integration contract.

### Agent Architecture
```
┌────────────────────────────────────────────────────┐
│                  SHARED CONTRACT                    │
│  packages/shared-types/src/chat.ts (types)         │
│  packages/shared-types/src/preview.ts (types)      │
│  Interface contracts defined FIRST, implemented    │
│  independently                                      │
└───────────┬──────────┬──────────┬──────────┬───────┘
            │          │          │          │
    ┌───────▼──┐ ┌─────▼────┐ ┌──▼───────┐ ┌▼──────────┐
    │ AGENT 1  │ │ AGENT 2  │ │ AGENT 3  │ │ AGENT 4   │
    │ Chat UI  │ │ Preview  │ │ AI Brain │ │ Integrator│
    │ & Stream │ │ Sandbox  │ │ & Tools  │ │ & Polish  │
    └──────────┘ └──────────┘ └──────────┘ └───────────┘
```

### Pre-Execution Step: Define Shared Types
BEFORE launching any agent, create the shared type interfaces that all agents must conform to. This prevents integration hell.

**Create `packages/shared-types/src/chat.ts`:**
```typescript
// ALL agents must use these types — this is the integration contract

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string; // ISO 8601
  toolCalls?: ToolCall[];
  artifacts?: GeneratedArtifact[];
}

export interface ToolCall {
  id: string;
  toolName: string;
  input: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'error';
  result?: any;
  error?: string;
}

export interface GeneratedArtifact {
  id: string;
  type: 'contract' | 'frontend' | 'test';
  filename: string;
  code: string;
  language: 'solidity' | 'typescript' | 'tsx';
  version: number;
}

export interface ChatStreamEvent {
  type: 'token' | 'tool_start' | 'tool_result' | 'artifact' | 'error' | 'done';
  content?: string;
  toolName?: string;
  toolInput?: any;
  toolResult?: any;
  artifact?: GeneratedArtifact;
  error?: string;
}

export interface ProjectContext {
  id: string;
  name: string;
  description: string;
  chain: string;
  existingFiles: GeneratedArtifact[];
  simulationResults?: any;
  deploymentStatus?: string;
}
```

---

### AGENT 1: Chat Interface & Streaming

**Domain:** Frontend chat UI + tRPC streaming endpoint
**Files Owned:**
```
apps/web/src/app/app/projects/[id]/builder/page.tsx    (NEW)
apps/web/src/components/chat/ChatPanel.tsx               (NEW)
apps/web/src/components/chat/ChatInput.tsx                (NEW)
apps/web/src/components/chat/ChatMessage.tsx              (NEW)
apps/web/src/components/chat/TypingIndicator.tsx          (NEW)
apps/web/src/stores/chat-store.ts                        (NEW)
apps/web/src/hooks/useChat.ts                            (NEW)
apps/api/src/router/chat.ts                              (NEW)
apps/api/src/router/index.ts                             (MODIFY — add chat router)
```

**Instructions for Agent 1:**
```
You are building the chat interface and streaming backend for Zapp, an AI-powered blockchain dApp builder.

READ FIRST:
- packages/shared-types/src/chat.ts (the type contracts you MUST follow)
- apps/web/src/app/app/layout.tsx (understand the existing layout)
- apps/web/src/stores/project-store.ts (understand the existing store pattern)
- apps/api/src/router/generation.ts (understand the existing SSE pattern)
- apps/api/src/trpc.ts (understand the tRPC setup)

YOUR TASK:
1. Create the split-screen builder page at /app/projects/[id]/builder
   - Use react-resizable-panels for the split layout
   - Left panel (40%): ChatPanel component
   - Right panel (60%): Placeholder div with text "Preview Panel — Agent 2 will build this"
   - The page should be full-height (100vh minus top nav)

2. Build the ChatPanel component
   - Scrollable message list
   - Auto-scroll to bottom on new messages
   - Render markdown in AI messages (use react-markdown + remark-gfm)
   - Syntax highlight code blocks (use rehype-highlight)
   - Show typing indicator when streaming

3. Build the ChatInput component
   - Multi-line textarea, grows up to 6 lines
   - Send on Enter, newline on Shift+Enter
   - Disabled while streaming
   - Template suggestions when empty: ["Build a staking dApp", "Create an ERC-20 token", "Design a governance system", "Build an NFT collection"]

4. Build the ChatMessage component
   - User messages: right-aligned, bg-indigo-600 text-white rounded-2xl
   - AI messages: left-aligned, bg-gray-800 text-gray-100 rounded-2xl
   - Show Zapp AI avatar for assistant messages
   - Collapsible code blocks with copy button
   - Tool call status cards (show when AI is using a tool)

5. Build the chat-store.ts (Zustand)
   - Follow the ChatMessage type from shared-types
   - Actions: addMessage, updateStreamContent, finalizeStream, clearMessages, setStreaming

6. Build the useChat.ts hook
   - Sends messages via tRPC mutation
   - Subscribes to SSE stream for responses
   - Handles ChatStreamEvent types (token, tool_start, tool_result, artifact, error, done)
   - Optimistic updates (show user message immediately)
   - For now, the artifact events should just be logged — Agent 4 will wire them to the preview

7. Build the chat.ts tRPC router
   - chat.send: protectedProcedure, accepts { projectId, message }, returns SSE stream
   - chat.history: protectedProcedure, accepts { projectId }, returns ChatMessage[]
   - For now, chat.send should call the AI agent from packages/ai/src/agent.ts
   - If packages/ai/src/agent.ts doesn't exist yet (Agent 3 is building it), create a STUB that:
     - Echoes the user's message back with "I'm Zapp AI! Agent 3 is still building my brain. Your message: {message}"
     - This allows you to test the full UI flow without the AI brain

INSTALL:
pnpm add react-markdown remark-gfm rehype-highlight react-resizable-panels --filter @zapp/web

TECH CONSTRAINTS:
- Use existing Tailwind dark theme (bg-gray-900 base, indigo accents)
- Use existing shadcn/ui components from packages/ui where possible
- Follow existing code patterns (look at other stores, hooks, components for style)
- TypeScript strict mode — no `any` types except where explicitly interfacing with external APIs
- All new components must be client components ("use client" directive)
```

---

### AGENT 2: Sandbox Preview System

**Domain:** Preview panel with iframe sandbox, code viewer, and simulation display
**Files Owned:**
```
apps/web/src/components/preview/PreviewPanel.tsx         (NEW)
apps/web/src/components/preview/SandboxPreview.tsx       (NEW)
apps/web/src/components/preview/CodeViewer.tsx            (NEW)
apps/web/src/components/preview/SimulationView.tsx        (NEW)
apps/web/src/components/preview/FileTabBar.tsx            (NEW)
apps/web/src/components/preview/preview-html-template.ts  (NEW)
apps/web/src/components/preview/wallet-mock.ts            (NEW)
apps/web/src/stores/preview-store.ts                     (NEW)
```

**Instructions for Agent 2:**
```
You are building the preview/sandbox system for Zapp, an AI-powered blockchain dApp builder.

READ FIRST:
- packages/shared-types/src/chat.ts (the type contracts, especially GeneratedArtifact)
- apps/web/src/components/simulation/ChartGrid.tsx (existing chart component to reuse)
- apps/web/src/components/simulation/ParamSliders.tsx (existing sliders)
- packages/simulation/src/staking.ts (understand the simulation engine output)

YOUR TASK:
1. Build the PreviewPanel component
   - Tab bar with three tabs: "Preview" | "Code" | "Simulation"
   - Each tab renders the corresponding sub-component
   - Default to "Preview" tab
   - Loading skeleton when isPreviewLoading is true
   - Empty state: "Generate your first dApp to see it here"

2. Build SandboxPreview (the iframe renderer)
   - Takes the generated frontend code (TSX) and renders it in a sandboxed iframe
   - Use srcdoc approach (NOT a separate URL)
   - The HTML template must include:
     - React 18 from CDN
     - ReactDOM from CDN
     - Tailwind CSS from CDN (via cdn.tailwindcss.com)
     - ethers.js v6 from CDN
     - Babel standalone for JSX transformation
   - The template wraps the generated component code in a Babel script tag
   - Set iframe sandbox="allow-scripts" (no allow-same-origin for security)
   - Add error catching in the iframe that posts errors to parent via postMessage
   - Add a "Refresh" button that re-renders the iframe
   - Handle the case where no frontend has been generated yet (show placeholder)
   - IMPORTANT: The generated code uses "use client" and imports — strip these before injection
     - Remove "use client" directive
     - Remove import statements (libraries are loaded via CDN globals)
     - Replace `import { useState } from 'react'` etc with destructuring from globals

3. Build CodeViewer
   - File tab bar showing all generated files
   - Syntax highlighted code using highlight.js
   - Line numbers on the left
   - Copy-to-clipboard button
   - Show file language icon (Solidity diamond, React atom, TypeScript TS)
   - If a file has a previousContent, show a "Show Changes" toggle that highlights diffs

4. Build SimulationView
   - Reuse the existing ChartGrid and RiskBadge components
   - Accept simulation results from the preview store
   - Show key metrics: APY, Risk Level, Runway, Max Drawdown
   - If no simulation has been run, show empty state with "Run a simulation to see results"

5. Build FileTabBar
   - Horizontal scrollable tab bar at the bottom of the preview
   - Shows each generated file as a tab
   - Clicking a tab switches to Code view for that file
   - Icon per file type (📄 .sol, ⚛️ .tsx, 🧪 .test.ts)

6. Build preview-html-template.ts
   - Export a function: buildPreviewHTML(reactCode: string, contractABI?: string): string
   - Returns a complete HTML document string for iframe srcdoc
   - Include all CDN scripts listed above
   - Include dark theme styling (bg-gray-900)
   - Include error boundary that catches and reports errors
   - Include a mock window.ethereum provider (from wallet-mock.ts)

7. Build wallet-mock.ts
   - Export a JavaScript string that can be injected into the iframe
   - Mocks window.ethereum with:
     - request({ method: 'eth_requestAccounts' }) → returns ['0x742d35Cc...']
     - request({ method: 'eth_chainId' }) → returns '0x2105' (Base)
     - request({ method: 'eth_getBalance' }) → returns '1000000000000000000' (1 ETH)
     - on/removeListener stubs
   - This allows generated frontends to "connect wallet" in the preview

8. Build preview-store.ts (Zustand)
   - Follow GeneratedArtifact type from shared-types
   - State: files[], activeTab, activeFileId, simulationResults, isPreviewLoading, previewError
   - Actions: setFiles, updateFile, addFile, setActiveTab, setActiveFile, setSimulationResults

TECH CONSTRAINTS:
- The iframe must be fully sandboxed — no access to parent cookies, localStorage, or DOM
- All CDN URLs must use specific version numbers (not @latest)
- The preview must work offline once loaded (no dynamic CDN fetches after initial load)
- Use existing Tailwind dark theme
- TypeScript strict mode
```

---

### AGENT 3: AI Agent Brain & Tool Use

**Domain:** The conversational AI agent, tool definitions, tool executors, and system prompts
**Files Owned:**
```
packages/ai/src/agent.ts                         (NEW)
packages/ai/src/tools/index.ts                   (NEW)
packages/ai/src/tools/executor.ts                (NEW)
packages/ai/src/tools/generate-contract.ts       (NEW)
packages/ai/src/tools/generate-frontend.ts       (NEW)
packages/ai/src/tools/generate-tests.ts          (NEW)
packages/ai/src/tools/run-simulation.ts          (NEW)
packages/ai/src/tools/edit-code.ts               (NEW)
packages/ai/src/tools/security-audit.ts          (NEW)
packages/ai/src/prompts/agent-system.ts          (NEW)
packages/ai/src/prompts/edit-system.ts           (NEW)
packages/ai/src/prompts/audit-system.ts          (NEW)
packages/ai/src/router.ts                        (MODIFY — add agent model routing)
```

**Instructions for Agent 3:**
```
You are building the AI agent brain for Zapp, an AI-powered blockchain dApp builder. This is the most critical component of the entire platform — it's what makes the AI feel intelligent and helpful.

READ FIRST:
- packages/shared-types/src/chat.ts (the type contracts — ChatStreamEvent is crucial)
- packages/ai/src/prompts/system.ts (existing generation prompts — DO NOT DELETE these)
- packages/ai/src/generator.ts (existing generation pipeline — reuse, don't rewrite)
- packages/ai/src/templates/ (existing template generators — reuse these)
- packages/ai/src/router.ts (existing model routing logic)
- packages/simulation/src/staking.ts (the simulation engine you'll call as a tool)
- packages/simulation/src/risk.ts (risk classification you'll use)
- packages/simulation/src/charts.ts (chart data transformation)

YOUR TASK:
1. Build agent.ts — The core agentic loop
   - Implements the ReAct (Reason + Act) pattern
   - Takes: projectContext, conversationHistory, user message
   - Streams: tokens, tool calls, tool results, artifacts, done signal
   - Uses Anthropic SDK with tool_use (you have @anthropic-ai/sdk already installed)
   - The loop: call Claude → if tool_use in response → execute tool → feed result back → call Claude again → repeat until no more tool calls
   - MUST stream text tokens as they arrive (don't wait for full response)
   - MUST handle the case where Claude calls multiple tools in sequence
   - MUST handle errors gracefully (if a tool fails, tell the AI about the error so it can recover)

2. Build the tool definitions (tools/index.ts)
   - Define all 7 tools with their JSON Schema input specifications
   - Tool descriptions MUST be clear and specific — Claude uses these to decide WHEN to call each tool
   - See the tool definitions in section 6 of this spec for the exact schema

3. Build tool executors (one file per tool)
   - generate-contract.ts: Uses existing packages/ai/src/generator.ts + the contract system prompt
   - generate-frontend.ts: Uses existing packages/ai/src/generator.ts + the frontend system prompt
   - generate-tests.ts: Uses existing packages/ai/src/generator.ts + the test system prompt
   - run-simulation.ts: Calls packages/simulation directly (already fully working!)
   - edit-code.ts: Sends current code + edit instructions to Claude with edit-specific prompt
   - security-audit.ts: Sends contract to Claude with audit-specific prompt

   CRITICAL: Reuse existing code from packages/ai/src/generator.ts wherever possible.
   The template generators in packages/ai/src/templates/ should be used as fallbacks.

4. Build the master system prompt (prompts/agent-system.ts)
   - See section 9 of this spec for the full prompt
   - Must accept ProjectContext and inject it dynamically
   - Must include all behavioral rules for the AI
   - Must include blockchain-specific safety constraints
   - Export: buildAgentSystemPrompt(context: ProjectContext): string

5. Build the edit system prompt (prompts/edit-system.ts)
   - Used when the edit_code tool is called
   - Instructs Claude to make MINIMAL changes to existing code
   - Must include: "Return the COMPLETE file, not just the changes"
   - Must include: "Preserve all existing functionality"
   - Must include: "Only modify what was explicitly requested"

6. Build the audit system prompt (prompts/audit-system.ts)
   - Used when the security_audit tool is called
   - Instructs Claude to check for common Solidity vulnerabilities
   - Must return structured findings: { severity, issue, location, recommendation }
   - Categories: Reentrancy, Access Control, Integer Overflow, Front-running, Gas Optimization, Logic Errors

CRITICAL ARCHITECTURE DECISIONS:
- The agent.ts file must export a single function: runAgent(config: AgentConfig)
- AgentConfig includes callback functions for streaming events (onToken, onToolStart, etc.)
- The chat.ts router (Agent 1's domain) will call runAgent() and wire callbacks to SSE
- If Agent 1 hasn't built chat.ts yet, create a simple test script that calls runAgent() directly

MODEL ROUTING:
- Conversational responses: claude-sonnet-4-20250514 (fast, good enough for chat)
- Contract generation (within tools): claude-sonnet-4-20250514 (high quality for code)
- Security audits: claude-sonnet-4-20250514 (thorough analysis)
- Edits: claude-sonnet-4-20250514 (precise modifications)
- Explanations: claude-haiku-4-20250514 (fast, cheaper for simple explanations)

ERROR HANDLING:
- If Anthropic API returns a rate limit error, yield an error event and tell the user to wait
- If a tool throws an exception, catch it, and feed the error message back to Claude as a tool_result with is_error: true — Claude will try to recover
- If the agentic loop exceeds 10 iterations, force-stop and tell the user
- Always set a max_tokens limit (8192 for generation, 4096 for chat/edits)

CONTEXT WINDOW MANAGEMENT:
- The conversation history sent to Claude should be LIMITED
- Keep the last 20 messages maximum
- For older messages, include only a summary (or omit them)
- The system prompt + project context + tools already takes ~2000-3000 tokens
- Leave room for Claude's response (8192 tokens)
- Total context target: ~30,000 tokens per request (well within Claude's 200K window, but focused)
```

---

### AGENT 4: Integration & Polish

**Domain:** Wiring everything together, state synchronization, error handling, UX polish
**Files Owned:**
```
apps/web/src/app/app/projects/[id]/builder/layout.tsx    (NEW — builder-specific layout)
apps/web/src/hooks/useBuilderSync.ts                     (NEW)
apps/web/src/components/chat/TemplateSuggestions.tsx      (NEW)
apps/web/src/components/common/ErrorBoundary.tsx          (NEW)
apps/web/src/components/common/Toast.tsx                  (NEW or MODIFY existing)
apps/web/src/app/app/projects/[id]/page.tsx              (MODIFY — add Builder button)
apps/web/src/app/app/layout.tsx                          (MODIFY — builder layout variant)
apps/web/src/stores/project-store.ts                     (MODIFY — add builder integration)
packages/shared-types/src/chat.ts                        (NEW — if not created in pre-step)
packages/shared-types/src/preview.ts                     (NEW)
packages/db/src/schema/conversations.ts                  (NEW)
packages/db/src/schema/messages.ts                       (NEW)
```

**Instructions for Agent 4:**
```
You are the integration agent for Zapp. Your job is to wire together the work of Agents 1, 2, and 3 into a cohesive experience, add polish, and handle edge cases.

READ FIRST:
- ALL files created by Agents 1, 2, and 3 (read the full builder/ directory)
- apps/web/src/stores/ (all existing stores)
- packages/shared-types/src/ (all type definitions)
- packages/db/src/schema/ (existing database schema)
- apps/web/src/app/app/layout.tsx (existing layout)

YOUR TASK:

1. Create the shared type contracts (if not already done)
   - packages/shared-types/src/chat.ts
   - packages/shared-types/src/preview.ts
   - These define the integration interfaces between all agents' code

2. Build useBuilderSync.ts — the master hook that synchronizes chat ↔ preview
   - When an artifact event arrives from the chat stream:
     - Add/update the file in preview-store
     - Auto-switch preview tab based on artifact type
   - When simulation results arrive:
     - Update preview-store simulation results
     - Auto-switch to simulation tab
   - When a tool call starts:
     - Show loading state in preview panel
   - This hook lives in the builder page and orchestrates both stores

3. Build the builder-specific layout
   - The builder page should NOT show the regular sidebar navigation
   - Instead: thin top bar with project name, back button, deploy button, credits
   - Full-height content area for the split-screen builder

4. Modify the project detail page
   - Add a prominent "Open in Builder" button (large, indigo, centered)
   - This navigates to /app/projects/[id]/builder

5. Add conversation persistence
   - Create database schema for conversations and messages tables
   - Wire chat.history to load from DB
   - Wire chat.send to save messages to DB after each exchange
   - If DB is not yet connected (known TODO), use in-memory store as fallback

6. Build ErrorBoundary component
   - Wraps the preview iframe
   - Catches rendering errors and shows a friendly message
   - "Something went wrong in the preview. Try asking Zapp AI to fix it."
   - Include a "Retry" button

7. Build TemplateSuggestions component
   - Shows when chat is empty (no messages yet)
   - Grid of 4 suggestion cards:
     - "🏦 Build a Staking dApp" → pre-fills: "I want to build a staking dApp where users can lock tokens and earn rewards"
     - "🪙 Create an ERC-20 Token" → pre-fills: "I want to create a custom ERC-20 token"
     - "🗳️ Build a Governance System" → pre-fills: "I want to build a DAO governance system"
     - "🎨 Launch an NFT Collection" → pre-fills: "I want to create and launch an NFT collection"
   - Clicking a card sends the pre-filled message

8. Polish & Edge Cases
   - Add toast notifications for: "Contract generated!", "Simulation complete!", "Error occurred"
   - Add keyboard shortcuts: Cmd+Enter to send, Esc to cancel streaming
   - Handle browser back/forward navigation in builder
   - Handle window resize (resizable panels should adapt)
   - Handle network disconnection (show "Reconnecting..." toast)
   - Add "Stop Generating" button that aborts the SSE stream

9. Mobile Responsiveness
   - On screens < 768px: stack chat and preview vertically
   - Add a toggle button to switch between chat and preview
   - Chat input should always be visible at bottom

INTEGRATION TESTING CHECKLIST:
After wiring everything together, manually verify:
- [ ] User can open a project and land in the builder
- [ ] Typing a message shows it in the chat immediately
- [ ] AI response streams in token by token
- [ ] When AI generates a contract, it appears in the Code tab
- [ ] When AI generates a frontend, it renders in the Preview tab
- [ ] When AI runs a simulation, results appear in the Simulation tab
- [ ] User can ask to edit existing code and see changes
- [ ] Errors in the preview iframe are caught and displayed
- [ ] Conversation persists when leaving and returning to the builder
- [ ] Template suggestions work and send the pre-filled message
```

---

### Agent Execution Order & Convergence

```
STEP 0 (YOU - Manual):
  Create packages/shared-types/src/chat.ts with the shared types
  Install dependencies: pnpm add react-markdown remark-gfm rehype-highlight react-resizable-panels --filter @zapp/web

STEP 1 (Parallel — Agents 1, 2, 3 simultaneously):
  Agent 1: Builds chat UI + streaming endpoint (with AI stub)
  Agent 2: Builds preview panel + iframe sandbox (with mock data)
  Agent 3: Builds AI agent brain + tools (with test script)

  Each agent can work independently because:
  - Agent 1 stubs the AI response (doesn't need Agent 3)
  - Agent 2 uses mock generated code (doesn't need Agent 3)
  - Agent 3 exports a function that Agent 1 will call (interface is pre-defined)

STEP 2 (Sequential — Agent 4 after 1+2+3 complete):
  Agent 4: Wires everything together, adds polish

  This agent MUST run after the others because it needs their code to integrate.

STEP 3 (Convergence — All agents review):
  Run the integration testing checklist from Agent 4's instructions.
  Fix any issues found.
```

---

## 9. CONTEXT ENGINEERING & SYSTEM PROMPTS

### The Prompt Hierarchy

```
┌─────────────────────────────────────────────────┐
│ LEVEL 1: Agent System Prompt (agent-system.ts)  │
│ "You are Zapp AI..." — personality, rules,      │
│ tool descriptions, behavioral constraints       │
│ ~1500 tokens, sent with EVERY request           │
├─────────────────────────────────────────────────┤
│ LEVEL 2: Project Context (dynamic injection)    │
│ Current files, chain, description, sim results  │
│ ~500-3000 tokens, varies per project            │
├─────────────────────────────────────────────────┤
│ LEVEL 3: Conversation History (recent messages) │
│ Last 20 messages of user↔AI dialogue            │
│ ~2000-10000 tokens, grows over time             │
├─────────────────────────────────────────────────┤
│ LEVEL 4: Tool-Specific Prompts (per-tool)       │
│ Used WITHIN tool execution (not in main chat)   │
│ e.g., contract generation prompt, audit prompt  │
│ ~500-1000 tokens, only when tool is called      │
└─────────────────────────────────────────────────┘
```

### Context Window Budget
```
Total available: 200,000 tokens (Claude Sonnet)
Target usage:   ~30,000 tokens per request

Breakdown:
- System prompt:         1,500 tokens
- Tool definitions:      2,000 tokens
- Project context:       3,000 tokens (cap — truncate files if needed)
- Conversation history: 10,000 tokens (last 20 messages, summarize older)
- User's new message:    1,000 tokens (max message length)
- Reserved for response: 8,192 tokens (max_tokens setting)
- Safety buffer:         4,308 tokens
                        ──────────
Total:                  30,000 tokens
```

### Context Rot Prevention
As the conversation gets long, implement "compaction":
1. After every 20 messages, summarize the oldest 10 into a single "summary" message
2. The summary preserves: key decisions made, files generated, current project state
3. Delete the original 10 messages and replace with the summary
4. This keeps the context window focused on recent, relevant information

### Prompt Testing Methodology
After building the system prompt:
1. Test with 10 different project ideas (staking, token, NFT, DEX, governance, etc.)
2. For each, verify: Does the AI ask clarifying questions? Does it generate correct code? Does it explain things in plain language?
3. Test edge cases: vague requests, contradictory instructions, security-sensitive requests
4. Test iterative editing: ask to change something, verify the AI references previous context
5. Test error recovery: give the AI broken code, verify it can diagnose and fix

---

## 10. FILE-BY-FILE IMPLEMENTATION GUIDE

### Complete New Files List

| # | File Path | Agent | Priority | Description |
|---|-----------|-------|----------|-------------|
| 1 | `packages/shared-types/src/chat.ts` | Pre-step | P0 | Shared type contracts |
| 2 | `packages/shared-types/src/preview.ts` | Pre-step | P0 | Preview type contracts |
| 3 | `apps/web/src/stores/chat-store.ts` | Agent 1 | P0 | Chat state management |
| 4 | `apps/web/src/hooks/useChat.ts` | Agent 1 | P0 | Chat interaction hook |
| 5 | `apps/web/src/components/chat/ChatPanel.tsx` | Agent 1 | P0 | Chat container |
| 6 | `apps/web/src/components/chat/ChatInput.tsx` | Agent 1 | P0 | Message input |
| 7 | `apps/web/src/components/chat/ChatMessage.tsx` | Agent 1 | P0 | Message bubble |
| 8 | `apps/web/src/components/chat/TypingIndicator.tsx` | Agent 1 | P1 | Streaming indicator |
| 9 | `apps/api/src/router/chat.ts` | Agent 1 | P0 | Chat API endpoint |
| 10 | `apps/web/src/app/app/projects/[id]/builder/page.tsx` | Agent 1 | P0 | Builder page |
| 11 | `apps/web/src/stores/preview-store.ts` | Agent 2 | P0 | Preview state |
| 12 | `apps/web/src/components/preview/PreviewPanel.tsx` | Agent 2 | P0 | Preview container |
| 13 | `apps/web/src/components/preview/SandboxPreview.tsx` | Agent 2 | P0 | iframe renderer |
| 14 | `apps/web/src/components/preview/CodeViewer.tsx` | Agent 2 | P0 | Code display |
| 15 | `apps/web/src/components/preview/SimulationView.tsx` | Agent 2 | P1 | Sim results |
| 16 | `apps/web/src/components/preview/FileTabBar.tsx` | Agent 2 | P1 | File tabs |
| 17 | `apps/web/src/components/preview/preview-html-template.ts` | Agent 2 | P0 | iframe HTML |
| 18 | `apps/web/src/components/preview/wallet-mock.ts` | Agent 2 | P1 | Mock wallet |
| 19 | `packages/ai/src/agent.ts` | Agent 3 | P0 | Core agent loop |
| 20 | `packages/ai/src/tools/index.ts` | Agent 3 | P0 | Tool definitions |
| 21 | `packages/ai/src/tools/executor.ts` | Agent 3 | P0 | Tool execution |
| 22 | `packages/ai/src/tools/generate-contract.ts` | Agent 3 | P0 | Contract tool |
| 23 | `packages/ai/src/tools/generate-frontend.ts` | Agent 3 | P0 | Frontend tool |
| 24 | `packages/ai/src/tools/generate-tests.ts` | Agent 3 | P1 | Test tool |
| 25 | `packages/ai/src/tools/run-simulation.ts` | Agent 3 | P0 | Simulation tool |
| 26 | `packages/ai/src/tools/edit-code.ts` | Agent 3 | P0 | Edit tool |
| 27 | `packages/ai/src/tools/security-audit.ts` | Agent 3 | P1 | Audit tool |
| 28 | `packages/ai/src/prompts/agent-system.ts` | Agent 3 | P0 | Master prompt |
| 29 | `packages/ai/src/prompts/edit-system.ts` | Agent 3 | P1 | Edit prompt |
| 30 | `packages/ai/src/prompts/audit-system.ts` | Agent 3 | P1 | Audit prompt |
| 31 | `apps/web/src/hooks/useBuilderSync.ts` | Agent 4 | P0 | State sync |
| 32 | `apps/web/src/app/app/projects/[id]/builder/layout.tsx` | Agent 4 | P0 | Builder layout |
| 33 | `apps/web/src/components/chat/TemplateSuggestions.tsx` | Agent 4 | P1 | Suggestions UI |
| 34 | `apps/web/src/components/common/ErrorBoundary.tsx` | Agent 4 | P1 | Error handling |
| 35 | `packages/db/src/schema/conversations.ts` | Agent 4 | P2 | DB schema |
| 36 | `packages/db/src/schema/messages.ts` | Agent 4 | P2 | DB schema |

### Files to Modify

| File Path | Agent | Change |
|-----------|-------|--------|
| `apps/api/src/router/index.ts` | Agent 1 | Add chatRouter |
| `apps/web/src/app/app/projects/[id]/page.tsx` | Agent 4 | Add "Open Builder" button |
| `apps/web/src/app/app/layout.tsx` | Agent 4 | Builder layout variant |
| `packages/ai/src/generator.ts` | Agent 3 | Expose individual generation functions |
| `packages/ai/src/router.ts` | Agent 3 | Add agent model routing |
| `apps/web/src/stores/project-store.ts` | Agent 4 | Add builder integration |
| `packages/shared-types/src/index.ts` | Agent 4 | Re-export new types |

---

## 11. TESTING & VALIDATION

### Unit Tests
- `packages/ai/src/__tests__/agent.test.ts` — Test the agentic loop with mocked Anthropic responses
- `packages/ai/src/__tests__/tools.test.ts` — Test each tool executor independently
- `apps/web/src/__tests__/chat-store.test.ts` — Test Zustand store actions
- `apps/web/src/__tests__/preview-store.test.ts` — Test preview store actions

### Integration Tests
- Full flow: user message → API → AI agent → tool execution → artifact → preview update
- Stream interruption: cancel mid-stream, verify cleanup
- Error recovery: AI generates broken code → error caught → AI self-corrects

### Manual Testing Script
```
1. Create a new project
2. Open the builder
3. Type: "I want to build a staking dApp where users lock ETH for 30 days"
4. Verify: AI asks clarifying questions
5. Answer the questions
6. Verify: AI generates a contract (appears in Code tab)
7. Verify: AI generates a frontend (appears in Preview tab, renders)
8. Type: "Make the stake button green instead of indigo"
9. Verify: AI edits the frontend, preview updates
10. Type: "Run a simulation with 500 users"
11. Verify: Simulation results appear in Simulation tab
12. Type: "Audit the contract for security issues"
13. Verify: AI returns structured security findings
```

---

## 12. ENVIRONMENT & CONFIGURATION

### Required Environment Variables
```env
# Anthropic API (REQUIRED — already in packages/ai)
ANTHROPIC_API_KEY=sk-ant-...

# Database (for conversation persistence — Phase 2)
DATABASE_URL=postgresql://...

# Redis (for job queue — Phase 3)
REDIS_URL=redis://...
```

### Development Setup
```bash
# Install new dependencies
cd apps/web && pnpm add react-markdown remark-gfm rehype-highlight react-resizable-panels

# Run the dev server
pnpm dev  # starts both web (Next.js) and api (tRPC server)

# Test the AI agent independently
cd packages/ai && npx ts-node src/agent.test.ts
```

### Package Versions (Pin These)
```
react-markdown: ^9.0.0
remark-gfm: ^4.0.0
rehype-highlight: ^7.0.0
react-resizable-panels: ^2.0.0
@anthropic-ai/sdk: ^0.39.0 (already installed)
```

---

## APPENDIX: QUICK REFERENCE FOR EACH AGENT

### Agent 1 Cheat Sheet
- You own: Chat UI + streaming backend
- Your output: Users can type messages and see streamed AI responses
- Stub the AI: Echo messages back until Agent 3 is ready
- Key files: ChatPanel, ChatInput, ChatMessage, chat-store, useChat, chat router

### Agent 2 Cheat Sheet
- You own: Preview panel + iframe sandbox
- Your output: Generated code renders live in an iframe
- Use mock data: Hardcode a sample React component for testing
- Key files: PreviewPanel, SandboxPreview, CodeViewer, preview-store, html-template

### Agent 3 Cheat Sheet
- You own: AI brain + all tool executors
- Your output: runAgent() function that the chat router calls
- Test independently: Create a test script that calls runAgent() directly
- Key files: agent.ts, tools/*, prompts/agent-system.ts

### Agent 4 Cheat Sheet
- You own: Integration + polish
- Your output: Everything works together seamlessly
- Run AFTER agents 1-3: You need their code
- Key files: useBuilderSync, builder layout, ErrorBoundary, TemplateSuggestions

---

*End of Implementation Plan*
*Version 1.0 — March 31, 2026*
