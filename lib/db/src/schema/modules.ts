import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const modulesTable = pgTable("modules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  filePath: text("file_path").notNull(), // GCS path, e.g. "uploads/modules/{uuid}.html"
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Module = typeof modulesTable.$inferSelect;
export type InsertModule = typeof modulesTable.$inferInsert;
