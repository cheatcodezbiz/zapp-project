import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  integer,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { templates } from "./templates";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const projectStatusEnum = pgEnum("project_status", [
  "draft",
  "simulated",
  "generating",
  "compiled",
  "testing",
  "deploying",
  "deployed",
  "failed",
]);

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    templateId: uuid("template_id").references(() => templates.id, {
      onDelete: "set null",
    }),
    status: projectStatusEnum("status").notNull().default("draft"),
    /** User-supplied configuration for this project */
    config: jsonb("config"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    /** Soft-delete timestamp — null means active, set means trashed */
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("projects_user_id_idx").on(table.userId),
    index("projects_template_id_idx").on(table.templateId),
    index("projects_status_idx").on(table.status),
    index("projects_deleted_at_idx").on(table.deletedAt),
  ],
);

// ---------------------------------------------------------------------------
// Project versions — immutable snapshots of generated output
// ---------------------------------------------------------------------------

export const projectVersions = pgTable(
  "project_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    /** Snapshot of config at the time of generation */
    config: jsonb("config"),
    /** Generated Solidity source or compiled artifacts */
    artifacts: jsonb("artifacts"),
    /** AI-generated changelog / summary */
    changelog: text("changelog"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("project_versions_project_id_idx").on(table.projectId),
    index("project_versions_project_version_idx").on(
      table.projectId,
      table.version,
    ),
  ],
);
