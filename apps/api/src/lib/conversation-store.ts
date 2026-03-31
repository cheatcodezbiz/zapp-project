// ---------------------------------------------------------------------------
// In-Memory Conversation Store
// ---------------------------------------------------------------------------
// Keyed by projectId. Stores chat messages, generated artifacts, and project
// metadata for the current server lifetime. This is an MVP-only solution;
// a database-backed store will replace it once @zapp/db is wired up.
// ---------------------------------------------------------------------------

import type { ChatMessage, GeneratedArtifact } from "@zapp/shared-types";

interface ProjectConversation {
  messages: ChatMessage[];
  artifacts: GeneratedArtifact[];
  projectName: string;
  projectDescription: string;
  chain: string;
}

const store = new Map<string, ProjectConversation>();

/**
 * Retrieve (or lazily initialize) the conversation for a project.
 */
export function getConversation(projectId: string): ProjectConversation {
  if (!store.has(projectId)) {
    store.set(projectId, {
      messages: [],
      artifacts: [],
      projectName: "My Project",
      projectDescription: "",
      chain: "base",
    });
  }
  return store.get(projectId)!;
}

/**
 * Append a message (user or assistant) to a project's conversation history.
 */
export function addMessage(projectId: string, message: ChatMessage): void {
  const conv = getConversation(projectId);
  conv.messages.push(message);
}

/**
 * Upsert an artifact into a project's artifact list. If an artifact with
 * the same filename already exists it is replaced (newer version wins).
 */
export function addArtifact(
  projectId: string,
  artifact: GeneratedArtifact,
): void {
  const conv = getConversation(projectId);
  const idx = conv.artifacts.findIndex((a) => a.filename === artifact.filename);
  if (idx >= 0) {
    conv.artifacts[idx] = artifact;
  } else {
    conv.artifacts.push(artifact);
  }
}

/**
 * Build the ProjectContext object the AI agent needs — includes project
 * metadata and the current set of generated files.
 */
export function getProjectContext(projectId: string) {
  const conv = getConversation(projectId);
  return {
    id: projectId,
    name: conv.projectName,
    description: conv.projectDescription,
    chain: conv.chain,
    existingFiles: conv.artifacts,
  };
}

/**
 * Wipe all conversation state for a project.
 */
export function clearConversation(projectId: string): void {
  store.delete(projectId);
}
