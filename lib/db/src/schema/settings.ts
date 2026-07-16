import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Single-row site settings table (id=1).
 * All colors stored as hex strings (#rrggbb).
 */
export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  primaryColor: text("primary_color").notNull().default("#0e1a2a"),
  accentColor: text("accent_color").notNull().default("#f1f5f9"),
  // Hero button colors
  cta1BgColor: text("cta1_bg_color").notNull().default("#5b91c8"),
  cta1TextColor: text("cta1_text_color").notNull().default("#ffffff"),
  cta2BgColor: text("cta2_bg_color").notNull().default("#ffffff"),
  cta2TextColor: text("cta2_text_color").notNull().default("#0e1a2a"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Settings = typeof settingsTable.$inferSelect;
