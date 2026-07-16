import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Single-row site settings table.
 * Always upsert with id=1. primaryColor and accentColor stored as hex strings.
 */
export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  primaryColor: text("primary_color").notNull().default("#0e1a2a"),
  accentColor: text("accent_color").notNull().default("#f1f5f9"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Settings = typeof settingsTable.$inferSelect;
