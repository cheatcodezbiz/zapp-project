// ---------------------------------------------------------------------------
// @zapp/shared-types — Chat & Agent type contracts
// ALL agents must use these types — this is the integration contract
// ---------------------------------------------------------------------------

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
  input: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'error';
  result?: unknown;
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
  toolInput?: Record<string, unknown>;
  toolResult?: unknown;
  artifact?: GeneratedArtifact;
  error?: string;
}

export interface ProjectContext {
  id: string;
  name: string;
  description: string;
  chain: string;
  /** Numeric template ID (1-45) if project was created from a template */
  templateId?: number;
  existingFiles: GeneratedArtifact[];
  simulationResults?: unknown;
  deploymentStatus?: string;
}

export interface AgentConfig {
  projectId: string;
  projectContext: ProjectContext;
  conversationHistory: ChatMessage[];
  onToken: (token: string) => void;
  onToolStart: (toolName: string, input: Record<string, unknown>) => void;
  onToolResult: (toolName: string, result: unknown) => void;
  onArtifact: (artifact: GeneratedArtifact) => void;
  onDone: () => void;
  onError: (error: Error) => void;
}
