import {
  pgTable,
  uuid,
  bigint,
  text,
  timestamp,
  index,
  check,
  pgEnum,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const creditTransactionTypeEnum = pgEnum("credit_transaction_type", [
  "deposit",
  "spend",
  "refund",
  "adjustment",
]);

// ---------------------------------------------------------------------------
// Credit balances — one row per user, updated on every transaction
// ---------------------------------------------------------------------------

export const creditBalances = pgTable(
  "credit_balances",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" })
      .unique(),
    /** Integer cents — $42.50 = 4250 */
    balance: bigint("balance", { mode: "number" }).notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("credit_balances_user_id_idx").on(table.userId),
    check("credit_balances_non_negative", sql`${table.balance} >= 0`),
  ],
);

// ---------------------------------------------------------------------------
// Credit transactions — append-only ledger
// ---------------------------------------------------------------------------

export const creditTransactions = pgTable(
  "credit_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: creditTransactionTypeEnum("type").notNull(),
    /** Signed amount in integer cents — positive for deposit/refund, negative for spend */
    amount: bigint("amount", { mode: "number" }).notNull(),
    /** Balance after this transaction was applied */
    balanceAfter: bigint("balance_after", { mode: "number" }).notNull(),
    /** Human-readable description */
    description: text("description"),
    /** Optional reference to an external entity (e.g. payment id, project id) */
    referenceId: text("reference_id"),
    referenceType: text("reference_type"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("credit_transactions_user_id_idx").on(table.userId),
    index("credit_transactions_type_idx").on(table.type),
    index("credit_transactions_created_at_idx").on(table.createdAt),
  ],
);
