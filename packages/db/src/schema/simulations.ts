import {
  pgTable,
  uuid,
  text,
  jsonb,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";

// ---------------------------------------------------------------------------
// Simulations — fork-based test runs against generated contracts
// ---------------------------------------------------------------------------

export const simulations = pgTable(
  "simulations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    /** Config snapshot used for this simulation run */
    config: jsonb("config"),
    /** Full result payload (gas estimates, traces, etc.) */
    result: jsonb("result"),
    /** High-level risk classification: low | medium | high | critical */
    riskClassification: text("risk_classification"),
    /** Wall-clock duration of the simulation in milliseconds */
    durationMs: integer("duration_ms"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("simulations_project_id_idx").on(table.projectId),
    index("simulations_risk_classification_idx").on(table.riskClassification),
  ],
);
