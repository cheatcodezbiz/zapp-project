import {
  pgTable,
  uuid,
  text,
  boolean,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const templateCategoryEnum = pgEnum("template_category", [
  "defi",
  "nft",
  "dao",
  "token",
  "gaming",
  "social",
  "utility",
  "other",
]);

// ---------------------------------------------------------------------------
// Templates — reusable protocol blueprints
// ---------------------------------------------------------------------------

export const templates = pgTable(
  "templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    category: templateCategoryEnum("category").notNull(),
    /** JSON Schema that describes the config shape for this template */
    configSchema: jsonb("config_schema"),
    /** Default config values applied when a user selects this template */
    defaultConfig: jsonb("default_config"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("templates_slug_idx").on(table.slug),
    index("templates_category_idx").on(table.category),
    index("templates_is_active_idx").on(table.isActive),
  ],
);
