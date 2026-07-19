import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

/**
 * Blog posts table — bilingual (AR + EN) content stored as HTML.
 * Featured image URL stored directly (no FK to images table).
 */
export const postsTable = pgTable("posts", {
  id: serial("id").primaryKey(),
  titleAr: text("title_ar").notNull().default(""),
  titleEn: text("title_en").notNull().default(""),
  slugAr: text("slug_ar").notNull().unique(),
  slugEn: text("slug_en").notNull().unique(),
  excerptAr: text("excerpt_ar").notNull().default(""),
  excerptEn: text("excerpt_en").notNull().default(""),
  contentAr: text("content_ar").notNull().default(""),
  contentEn: text("content_en").notNull().default(""),
  featuredImageUrl: text("featured_image_url"),
  isPublished: boolean("is_published").notNull().default(false),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Post = typeof postsTable.$inferSelect;
