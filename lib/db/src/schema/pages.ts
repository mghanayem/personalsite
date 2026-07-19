import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const pagesTable = pgTable("pages", {
  id: serial("id").primaryKey(),
  titleAr: text("title_ar").notNull(),
  titleEn: text("title_en").notNull(),
  slug: text("slug").notNull().unique(),
  isPublished: boolean("is_published").notNull().default(false),
  showInNav: boolean("show_in_nav").notNull().default(false),
  isHomepage: boolean("is_homepage").notNull().default(false),
  // SEO fields (all nullable; fall back to page title when empty)
  seoTitleAr: text("seo_title_ar"),
  seoTitleEn: text("seo_title_en"),
  seoDescAr: text("seo_desc_ar"),
  seoDescEn: text("seo_desc_en"),
  seoImageUrl: text("seo_image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertPageSchema = createInsertSchema(pagesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPage = z.infer<typeof insertPageSchema>;
export type Page = typeof pagesTable.$inferSelect;
