import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { projectVersions } from "./projects";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const deploymentStatusEnum = pgEnum("deployment_status", [
  "pending",
  "deploying",
  "deployed",
  "failed",
  "verified",
]);

// ---------------------------------------------------------------------------
// Deployments
// ---------------------------------------------------------------------------

export const deployments = pgTable(
  "deployments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    versionId: uuid("version_id")
      .notNull()
      .references(() => projectVersions.id, { onDelete: "cascade" }),
    /** EIP-155 chain id (e.g. 1 = Ethereum mainnet, 137 = Polygon) */
    chainId: integer("chain_id").notNull(),
    /** ERC-1967 proxy address */
    proxyAddress: text("proxy_address"),
    /** Implementation contract address behind the proxy */
    implementationAddress: text("implementation_address"),
    /** Deployment transaction hash */
    transactionHash: text("transaction_hash"),
    /** Wallet that submitted the deploy tx */
    deployerAddress: text("deployer_address"),
    status: deploymentStatusEnum("status").notNull().default("pending"),
    /** URL for the auto-generated frontend (if hosted) */
    frontendUrl: text("frontend_url"),
    /** Block explorer verification URL */
    explorerUrl: text("explorer_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("deployments_project_id_idx").on(table.projectId),
    index("deployments_version_id_idx").on(table.versionId),
    index("deployments_chain_id_idx").on(table.chainId),
    index("deployments_status_idx").on(table.status),
  ],
);
