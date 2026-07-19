import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { postsTable } from "./posts";

/**
 * Gallery images for a blog post — up to 6 per post.
 * imageUrl stores the full /api/uploads/<filename> path.
 */
export const postGalleryImagesTable = pgTable("post_gallery_images", {
  id: serial("id").primaryKey(),
  postId: integer("post_id")
    .notNull()
    .references(() => postsTable.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  displayOrder: integer("display_order").notNull().default(0),
  position: text("position").default("center"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PostGalleryImage = typeof postGalleryImagesTable.$inferSelect;
