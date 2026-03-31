// ---------------------------------------------------------------------------
// Database-backed Conversation Store
// ---------------------------------------------------------------------------
// Persists chat messages, generated artifacts, and project metadata to
// PostgreSQL via Drizzle ORM. Replaces the previous in-memory Map store.
// ---------------------------------------------------------------------------

import type { ChatMessage, GeneratedArtifact } from "@zapp/shared-types";
import {
  getDb,
  conversations,
  messages as messagesTable,
  projects,
  users,
  eq,
  and,
  asc,
} from "@zapp/db";

// Well-known anonymous user for pre-auth MVP
const ANON_USER_ID = "00000000-0000-0000-0000-000000000000";

let anonUserEnsured = false;

/**
 * Ensure the anonymous placeholder user exists in the DB.
 * Called lazily on first store access.
 */
async function ensureAnonymousUser(): Promise<void> {
  if (anonUserEnsured) return;

  const db = getDb();
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, ANON_USER_ID))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(users).values({
      id: ANON_USER_ID,
      walletAddress: "anonymous",
    });
  }

  anonUserEnsured = true;
}

/**
 * Ensure a project row exists for the given projectId.
 * Auto-creates with default metadata if missing.
 */
async function ensureProject(projectId: string): Promise<void> {
  const db = getDb();
  const existing = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(projects).values({
      id: projectId,
      userId: ANON_USER_ID,
      name: "My Project",
      description: "",
      config: { chain: "base", artifacts: [] },
    });
  }
}

/**
 * Get or create the conversation for a project. Returns the conversation ID.
 */
async function ensureConversation(projectId: string): Promise<string> {
  await ensureAnonymousUser();
  await ensureProject(projectId);

  const db = getDb();
  const existing = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(eq(conversations.projectId, projectId))
    .limit(1);

  const first = existing[0];
  if (first) {
    return first.id;
  }

  const rows = await db
    .insert(conversations)
    .values({
      projectId,
      userId: ANON_USER_ID,
    })
    .returning({ id: conversations.id });

  return rows[0]!.id;
}

// ---------------------------------------------------------------------------
// Public API — same function signatures as the old in-memory store, now async
// ---------------------------------------------------------------------------

/**
 * Retrieve conversation data for a project: messages and artifacts.
 */
export async function getConversation(projectId: string): Promise<{
  messages: ChatMessage[];
  artifacts: GeneratedArtifact[];
  projectName: string;
  projectDescription: string;
  chain: string;
}> {
  const conversationId = await ensureConversation(projectId);
  const db = getDb();

  // Fetch messages ordered by creation time
  const rows = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, conversationId))
    .orderBy(asc(messagesTable.createdAt));

  const chatMessages: ChatMessage[] = rows.map((row) => ({
    id: row.id,
    role: row.role as ChatMessage["role"],
    content: row.content,
    timestamp: row.createdAt.toISOString(),
    toolCalls: (row.toolCalls as ChatMessage["toolCalls"]) ?? undefined,
    artifacts: (row.artifacts as ChatMessage["artifacts"]) ?? undefined,
  }));

  // Fetch project metadata + artifacts from config
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  const config = (project?.config ?? {}) as Record<string, unknown>;

  return {
    messages: chatMessages,
    artifacts: (config.artifacts as GeneratedArtifact[]) ?? [],
    projectName: project?.name ?? "My Project",
    projectDescription: project?.description ?? "",
    chain: (config.chain as string) ?? "base",
  };
}

/**
 * Append a message to a project's conversation history.
 */
export async function addMessage(
  projectId: string,
  message: ChatMessage,
): Promise<void> {
  const conversationId = await ensureConversation(projectId);
  const db = getDb();

  await db.insert(messagesTable).values({
    id: message.id,
    conversationId,
    role: message.role,
    content: message.content,
    toolCalls: message.toolCalls ?? null,
    artifacts: message.artifacts ?? null,
  });
}

/**
 * Upsert an artifact into a project's artifact list (stored in projects.config).
 * If an artifact with the same filename exists, it is replaced.
 */
export async function addArtifact(
  projectId: string,
  artifact: GeneratedArtifact,
): Promise<void> {
  await ensureProject(projectId);
  const db = getDb();

  // Read current config
  const [project] = await db
    .select({ config: projects.config })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  const config = (project?.config ?? {}) as Record<string, unknown>;
  const existingArtifacts = (config.artifacts as GeneratedArtifact[]) ?? [];

  // Upsert by filename
  const idx = existingArtifacts.findIndex(
    (a) => a.filename === artifact.filename,
  );
  if (idx >= 0) {
    existingArtifacts[idx] = artifact;
  } else {
    existingArtifacts.push(artifact);
  }

  // Write back
  await db
    .update(projects)
    .set({ config: { ...config, artifacts: existingArtifacts } })
    .where(eq(projects.id, projectId));
}

/**
 * Build the ProjectContext object the AI agent needs.
 */
export async function getProjectContext(projectId: string) {
  const conv = await getConversation(projectId);
  return {
    id: projectId,
    name: conv.projectName,
    description: conv.projectDescription,
    chain: conv.chain,
    existingFiles: conv.artifacts,
  };
}

/**
 * Wipe all conversation messages for a project.
 */
export async function clearConversation(projectId: string): Promise<void> {
  const db = getDb();

  // Find the conversation
  const existing = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(eq(conversations.projectId, projectId))
    .limit(1);

  const conv = existing[0];
  if (conv) {
    // Delete messages (cascade would handle this, but be explicit)
    await db
      .delete(messagesTable)
      .where(eq(messagesTable.conversationId, conv.id));
  }

  // Also clear artifacts from project config
  const [project] = await db
    .select({ config: projects.config })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (project) {
    const config = (project.config ?? {}) as Record<string, unknown>;
    await db
      .update(projects)
      .set({ config: { ...config, artifacts: [] } })
      .where(eq(projects.id, projectId));
  }
}
