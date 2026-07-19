import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc } from "drizzle-orm";
import { db, postsTable, postGalleryImagesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { upload, deleteUploadFile, imageUrl } from "../lib/uploads";
import { sanitizeBlogHtml } from "../lib/sanitize";
import path from "path";

const router: IRouter = Router();

const MAX_GALLERY = 6;

type GalleryRow = typeof postGalleryImagesTable.$inferSelect;

function galleryShape(g: GalleryRow) {
  return { id: g.id, imageUrl: g.imageUrl, displayOrder: g.displayOrder };
}

async function fetchGallery(postId: number) {
  return db
    .select()
    .from(postGalleryImagesTable)
    .where(eq(postGalleryImagesTable.postId, postId))
    .orderBy(postGalleryImagesTable.displayOrder);
}

function postMeta(row: typeof postsTable.$inferSelect) {
  return {
    id: row.id,
    titleAr: row.titleAr,
    titleEn: row.titleEn,
    slugAr: row.slugAr,
    slugEn: row.slugEn,
    featuredImageUrl: row.featuredImageUrl ?? null,
    isPublished: row.isPublished,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

function postFull(
  row: typeof postsTable.$inferSelect,
  gallery: GalleryRow[],
) {
  return {
    id: row.id,
    titleAr: row.titleAr,
    titleEn: row.titleEn,
    slugAr: row.slugAr,
    slugEn: row.slugEn,
    excerptAr: row.excerptAr,
    excerptEn: row.excerptEn,
    contentAr: row.contentAr,
    contentEn: row.contentEn,
    featuredImageUrl: row.featuredImageUrl ?? null,
    featuredImagePosition: row.featuredImagePosition ?? "center",
    isPublished: row.isPublished,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    galleryImages: gallery.map(galleryShape),
  };
}

// GET /blog — list all posts (admin)
router.get("/blog", requireAuth, async (_req, res): Promise<void> => {
  const posts = await db
    .select()
    .from(postsTable)
    .orderBy(desc(postsTable.createdAt));
  res.json(posts.map(postMeta));
});

// POST /blog — create post
router.post("/blog", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const {
    titleAr = "", titleEn = "", slugAr, slugEn,
    excerptAr = "", excerptEn = "",
    contentAr = "", contentEn = "", isPublished = false,
  } = req.body as Record<string, string | boolean>;

  if (!slugAr || !slugEn) {
    res.status(400).json({ error: "slugAr and slugEn are required" });
    return;
  }

  const existing = await db.select({ id: postsTable.id }).from(postsTable).where(eq(postsTable.slugAr, slugAr as string));
  if (existing.length > 0) { res.status(400).json({ error: "slugAr is already taken" }); return; }
  const existingEn = await db.select({ id: postsTable.id }).from(postsTable).where(eq(postsTable.slugEn, slugEn as string));
  if (existingEn.length > 0) { res.status(400).json({ error: "slugEn is already taken" }); return; }

  const now = new Date();
  const [post] = await db
    .insert(postsTable)
    .values({
      titleAr: titleAr as string,
      titleEn: titleEn as string,
      slugAr: slugAr as string,
      slugEn: slugEn as string,
      excerptAr: excerptAr as string,
      excerptEn: excerptEn as string,
      contentAr: sanitizeBlogHtml(contentAr as string),
      contentEn: sanitizeBlogHtml(contentEn as string),
      isPublished: isPublished as boolean,
      publishedAt: isPublished ? now : null,
    })
    .returning();

  res.status(201).json(postFull(post, []));
});

// GET /blog/:id — get post by ID (admin)
router.get("/blog/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, id));
  if (!post) { res.status(404).json({ error: "Post not found" }); return; }

  const gallery = await fetchGallery(id);
  res.json(postFull(post, gallery));
});

// PATCH /blog/:id — update post
router.patch("/blog/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [existing] = await db.select().from(postsTable).where(eq(postsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Post not found" }); return; }

  const body = req.body as Record<string, unknown>;
  const updates: Partial<typeof postsTable.$inferInsert> = {};

  if (typeof body.titleAr === "string") updates.titleAr = body.titleAr;
  if (typeof body.titleEn === "string") updates.titleEn = body.titleEn;
  if (typeof body.excerptAr === "string") updates.excerptAr = body.excerptAr;
  if (typeof body.excerptEn === "string") updates.excerptEn = body.excerptEn;
  if (typeof body.contentAr === "string") updates.contentAr = sanitizeBlogHtml(body.contentAr);
  if (typeof body.contentEn === "string") updates.contentEn = sanitizeBlogHtml(body.contentEn);

  // featuredImagePosition — accepts "top" | "center" | "bottom"
  if (typeof body.featuredImagePosition === "string") {
    const validPositions = ["top", "center", "bottom"];
    if (validPositions.includes(body.featuredImagePosition)) {
      updates.featuredImagePosition = body.featuredImagePosition;
    }
  }

  if (typeof body.slugAr === "string" && body.slugAr !== existing.slugAr) {
    const clash = await db.select({ id: postsTable.id }).from(postsTable).where(eq(postsTable.slugAr, body.slugAr));
    if (clash.length > 0) { res.status(400).json({ error: "slugAr is already taken" }); return; }
    updates.slugAr = body.slugAr;
  }
  if (typeof body.slugEn === "string" && body.slugEn !== existing.slugEn) {
    const clash = await db.select({ id: postsTable.id }).from(postsTable).where(eq(postsTable.slugEn, body.slugEn));
    if (clash.length > 0) { res.status(400).json({ error: "slugEn is already taken" }); return; }
    updates.slugEn = body.slugEn;
  }

  if (typeof body.isPublished === "boolean") {
    updates.isPublished = body.isPublished;
    if (body.isPublished && !existing.publishedAt) {
      updates.publishedAt = new Date();
    } else if (!body.isPublished) {
      updates.publishedAt = null;
    }
  }

  const gallery = await fetchGallery(id);

  if (Object.keys(updates).length === 0) {
    res.json(postFull(existing, gallery));
    return;
  }

  const [updated] = await db.update(postsTable).set(updates).where(eq(postsTable.id, id)).returning();
  res.json(postFull(updated, gallery));
});

// DELETE /blog/:id — delete post + all gallery images
router.delete("/blog/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, id));
  if (!post) { res.status(404).json({ error: "Post not found" }); return; }

  // Delete featured image
  if (post.featuredImageUrl) {
    deleteUploadFile(path.basename(post.featuredImageUrl));
  }

  // Delete gallery image files (cascade deletes DB rows via FK)
  const gallery = await fetchGallery(id);
  for (const img of gallery) {
    deleteUploadFile(path.basename(img.imageUrl));
  }

  await db.delete(postsTable).where(eq(postsTable.id, id));
  res.status(204).send();
});

// POST /blog/:id/featured-image — upload featured image (multipart, outside OpenAPI spec)
router.post(
  "/blog/:id/featured-image",
  requireAuth,
  upload.single("file"),
  async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const [post] = await db.select().from(postsTable).where(eq(postsTable.id, id));
    if (!post) { res.status(404).json({ error: "Post not found" }); return; }
    if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }

    if (post.featuredImageUrl) {
      deleteUploadFile(path.basename(post.featuredImageUrl));
    }

    const url = imageUrl(req.file.filename);
    const [updated] = await db
      .update(postsTable)
      .set({ featuredImageUrl: url })
      .where(eq(postsTable.id, id))
      .returning();

    const gallery = await fetchGallery(id);
    res.json(postFull(updated, gallery));
  },
);

// DELETE /blog/:id/featured-image — remove featured image
router.delete(
  "/blog/:id/featured-image",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const [post] = await db.select().from(postsTable).where(eq(postsTable.id, id));
    if (!post) { res.status(404).json({ error: "Post not found" }); return; }

    if (post.featuredImageUrl) {
      deleteUploadFile(path.basename(post.featuredImageUrl));
      await db.update(postsTable).set({ featuredImageUrl: null }).where(eq(postsTable.id, id));
    }

    res.json({ message: "Featured image removed" });
  },
);

// POST /blog/:id/gallery-image — upload a gallery image (multipart, outside OpenAPI spec)
router.post(
  "/blog/:id/gallery-image",
  requireAuth,
  upload.single("file"),
  async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const [post] = await db.select().from(postsTable).where(eq(postsTable.id, id));
    if (!post) { res.status(404).json({ error: "Post not found" }); return; }
    if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }

    const existing = await fetchGallery(id);
    if (existing.length >= MAX_GALLERY) {
      // Delete the just-uploaded file and reject
      deleteUploadFile(req.file.filename);
      res.status(400).json({ error: `Maximum of ${MAX_GALLERY} gallery images allowed` });
      return;
    }

    const url = imageUrl(req.file.filename);
    const [newImg] = await db
      .insert(postGalleryImagesTable)
      .values({ postId: id, imageUrl: url, displayOrder: existing.length })
      .returning();

    res.status(201).json(galleryShape(newImg));
  },
);

// DELETE /blog/:id/gallery-image/:imageId — remove a gallery image
router.delete(
  "/blog/:id/gallery-image/:imageId",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const postId = parseInt(req.params.id as string, 10);
    const imageId = parseInt(req.params.imageId as string, 10);
    if (isNaN(postId) || isNaN(imageId)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const [img] = await db
      .select()
      .from(postGalleryImagesTable)
      .where(eq(postGalleryImagesTable.id, imageId));

    if (!img || img.postId !== postId) {
      res.status(404).json({ error: "Gallery image not found" });
      return;
    }

    deleteUploadFile(path.basename(img.imageUrl));
    await db.delete(postGalleryImagesTable).where(eq(postGalleryImagesTable.id, imageId));
    res.status(204).send();
  },
);

export default router;
