import { pgTable, serial, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";

export const modulesTable = pgTable("modules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  filePath: text("file_path").notNull(), // GCS path, e.g. "uploads/modules/{uuid}.html"
  isActive: boolean("is_active").notNull().default(false),
  /** 'public' | 'admin_only' — determines where the module is mounted */
  visibility: text("visibility").notNull().default("public"),
  /** Optional sort order for the admin Tools nav; NULL sorts last */
  sortOrder: integer("sort_order"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Module = typeof modulesTable.$inferSelect;
export type InsertModule = typeof modulesTable.$inferInsert;
