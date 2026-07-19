import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc } from "drizzle-orm";
import { db, postsTable, postGalleryImagesTable } from "@workspace/db";

const router: IRouter = Router();

async function fetchGallery(postId: number) {
  return db
    .select()
    .from(postGalleryImagesTable)
    .where(eq(postGalleryImagesTable.postId, postId))
    .orderBy(postGalleryImagesTable.displayOrder);
}

function postSummary(row: typeof postsTable.$inferSelect) {
  return {
    id: row.id,
    titleAr: row.titleAr,
    titleEn: row.titleEn,
    slugAr: row.slugAr,
    slugEn: row.slugEn,
    excerptAr: row.excerptAr,
    excerptEn: row.excerptEn,
    featuredImageUrl: row.featuredImageUrl ?? null,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
  };
}

// GET /public/blog/has-posts — lightweight check for blog nav visibility
// Defined BEFORE /public/blog/:slug to avoid slug collision
router.get("/public/blog/has-posts", async (_req, res): Promise<void> => {
  const rows = await db
    .select({ id: postsTable.id })
    .from(postsTable)
    .where(eq(postsTable.isPublished, true))
    .limit(1);
  res.json({ hasPosts: rows.length > 0 });
});

// GET /public/blog — list published posts (newest first)
router.get("/public/blog", async (_req, res): Promise<void> => {
  const posts = await db
    .select()
    .from(postsTable)
    .where(eq(postsTable.isPublished, true))
    .orderBy(desc(postsTable.publishedAt));
  res.json(posts.map(postSummary));
});

// GET /public/blog/:slug — get a published post by slugAr or slugEn
router.get("/public/blog/:slug", async (req: Request, res: Response): Promise<void> => {
  const rawSlug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  const slug = rawSlug ?? "";

  const [bySlugAr] = await db
    .select()
    .from(postsTable)
    .where(eq(postsTable.slugAr, slug))
    .limit(1);

  const [bySlugEn] = await db
    .select()
    .from(postsTable)
    .where(eq(postsTable.slugEn, slug))
    .limit(1);

  const found = bySlugAr ?? bySlugEn;

  if (!found || !found.isPublished) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  const gallery = await fetchGallery(found.id);

  res.json({
    id: found.id,
    titleAr: found.titleAr,
    titleEn: found.titleEn,
    slugAr: found.slugAr,
    slugEn: found.slugEn,
    excerptAr: found.excerptAr,
    excerptEn: found.excerptEn,
    contentAr: found.contentAr,
    contentEn: found.contentEn,
    featuredImageUrl: found.featuredImageUrl ?? null,
    featuredImagePosition: found.featuredImagePosition ?? "center",
    publishedAt: found.publishedAt ? found.publishedAt.toISOString() : null,
    galleryImages: gallery.map((g) => ({
      id: g.id,
      imageUrl: g.imageUrl,
      displayOrder: g.displayOrder,
    })),
  });
});

export default router;
