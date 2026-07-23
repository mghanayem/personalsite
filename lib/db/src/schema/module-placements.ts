import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { modulesTable } from "./modules";
import { pagesTable } from "./pages";

export const modulePlacementsTable = pgTable("module_placements", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id")
    .notNull()
    .references(() => modulesTable.id, { onDelete: "cascade" }),
  pageId: integer("page_id")
    .notNull()
    .references(() => pagesTable.id, { onDelete: "cascade" }),
  // Position encoding: "before:N", "after:N" (N = section sortOrder), or "new_section"
  sectionPosition: text("section_position").notNull().default("new_section"),
  // When true, this placement never appears in public API responses
  isAdminOnly: boolean("is_admin_only").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ModulePlacement = typeof modulePlacementsTable.$inferSelect;
export type InsertModulePlacement = typeof modulePlacementsTable.$inferInsert;
