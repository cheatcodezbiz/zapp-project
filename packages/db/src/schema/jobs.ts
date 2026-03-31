import {
  pgTable,
  uuid,
  text,
  jsonb,
  integer,
  timestamp,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const jobTypeEnum = pgEnum("job_type", [
  "generate",
  "compile",
  "test",
  "deploy",
  "host",
]);

export const jobStatusEnum = pgEnum("job_status", [
  "pending",
  "running",
  "completed",
  "failed",
]);

// ---------------------------------------------------------------------------
// Jobs — BullMQ job tracking mirror
// ---------------------------------------------------------------------------

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    /** Maps to BullMQ queue / job name */
    type: jobTypeEnum("type").notNull(),
    status: jobStatusEnum("status").notNull().default("pending"),
    /** 0-100 progress indicator */
    progress: integer("progress").notNull().default(0),
    /** Structured result payload on completion */
    result: jsonb("result"),
    /** Error message / stack trace on failure */
    error: text("error"),
    /** BullMQ job id for cross-reference */
    bullmqJobId: text("bullmq_job_id"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("jobs_project_id_idx").on(table.projectId),
    index("jobs_type_idx").on(table.type),
    index("jobs_status_idx").on(table.status),
    index("jobs_bullmq_job_id_idx").on(table.bullmqJobId),
  ],
);
