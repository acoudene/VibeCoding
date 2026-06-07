import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

/** Préfixes interdits (liste noire). */
export const prefixes = pgTable("prefixes", {
  id: uuid("id").primaryKey().defaultRandom(),
  value: text("value").notNull().unique(),
  label: text("label"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Journal des appels évalués. */
export const callLogs = pgTable("call_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  rawNumber: text("raw_number").notNull(),
  normalized: text("normalized"),
  decision: text("decision").notNull(),
  action: text("action").notNull(),
  matchedPrefix: text("matched_prefix"),
  spam: boolean("spam").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
