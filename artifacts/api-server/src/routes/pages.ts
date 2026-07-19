import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, pagesTable, sectionsTable, imagesTable } from "@workspace/db";
import {
  CreatePageBody,
  UpdatePageBody,
  GetPageParams,
  UpdatePageParams,
  DeletePageParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { imageUrl } from "../lib/uploads";

const router: IRouter = Router();

function formatPage(p: typeof pagesTable.$inferSelect) {
  return {
    id: p.id,
    titleAr: p.titleAr,
    titleEn: p.titleEn,
    slug: p.slug,
    isPublished: p.isPublished,
    showInNav: p.showInNav,
    isHomepage: p.isHomepage,
    seoTitleAr: p.seoTitleAr ?? null,
    seoTitleEn: p.seoTitleEn ?? null,
    seoDescAr: p.seoDescAr ?? null,
    seoDescEn: p.seoDescEn ?? null,
    seoImageUrl: p.seoImageUrl ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

async function getPageWithSections(pageId: number) {
  const sections = await db
    .select()
    .from(sectionsTable)
    .where(eq(sectionsTable.pageId, pageId))
    .orderBy(asc(sectionsTable.sortOrder));

  const sectionsWithImages = await Promise.all(
    sections.map(async (s) => {
      const images = await db
        .select()
        .from(imagesTable)
        .where(eq(imagesTable.sectionId, s.id))
        .orderBy(asc(imagesTable.sortOrder));

      return {
        id: s.id,
        pageId: s.pageId,
        type: s.type,
        sortOrder: s.sortOrder,
        isVisible: s.isVisible,
        data: s.data,
        images: images.map((img) => ({
          id: img.id,
          sectionId: img.sectionId,
          filename: img.filename,
          captionAr: img.captionAr,
          captionEn: img.captionEn,
          sortOrder: img.sortOrder,
          url: imageUrl(img.filename),
        })),
      };
    }),
  );

  return sectionsWithImages;
}

// GET /pages
router.get("/pages", requireAuth, async (_req, res): Promise<void> => {
  const pages = await db.select().from(pagesTable).orderBy(asc(pagesTable.id));
  res.json(pages.map(formatPage));
});

// POST /pages
router.post("/pages", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreatePageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [page] = await db
    .insert(pagesTable)
    .values({
      titleAr: parsed.data.titleAr,
      titleEn: parsed.data.titleEn,
      slug: parsed.data.slug,
      isPublished: parsed.data.isPublished ?? false,
      showInNav: parsed.data.showInNav ?? false,
      isHomepage: false,
    })
    .returning();

  res.status(201).json(formatPage(page!));
});

// GET /pages/:id
router.get("/pages/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetPageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [page] = await db.select().from(pagesTable).where(eq(pagesTable.id, params.data.id));
  if (!page) {
    res.status(404).json({ error: "Page not found" });
    return;
  }

  const sections = await getPageWithSections(page.id);

  res.json({ ...formatPage(page), sections });
});

// PATCH /pages/:id
router.patch("/pages/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdatePageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdatePageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Partial<typeof pagesTable.$inferInsert> = {};
  if (parsed.data.titleAr != null) updateData.titleAr = parsed.data.titleAr;
  if (parsed.data.titleEn != null) updateData.titleEn = parsed.data.titleEn;
  if (parsed.data.slug != null) updateData.slug = parsed.data.slug;
  if (parsed.data.isPublished != null) updateData.isPublished = parsed.data.isPublished;
  if (parsed.data.showInNav != null) updateData.showInNav = parsed.data.showInNav;

  // SEO fields — allow explicit null to clear
  const body = req.body as Record<string, unknown>;
  if ("seoTitleAr" in body) updateData.seoTitleAr = body.seoTitleAr as string | null ?? null;
  if ("seoTitleEn" in body) updateData.seoTitleEn = body.seoTitleEn as string | null ?? null;
  if ("seoDescAr" in body) updateData.seoDescAr = body.seoDescAr as string | null ?? null;
  if ("seoDescEn" in body) updateData.seoDescEn = body.seoDescEn as string | null ?? null;
  if ("seoImageUrl" in body) updateData.seoImageUrl = body.seoImageUrl as string | null ?? null;

  const [page] = await db
    .update(pagesTable)
    .set(updateData)
    .where(eq(pagesTable.id, params.data.id))
    .returning();

  if (!page) {
    res.status(404).json({ error: "Page not found" });
    return;
  }

  res.json(formatPage(page));
});

// DELETE /pages/:id
router.delete("/pages/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeletePageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [page] = await db.select().from(pagesTable).where(eq(pagesTable.id, params.data.id));
  if (!page) {
    res.status(404).json({ error: "Page not found" });
    return;
  }

  if (page.isHomepage) {
    res.status(403).json({ error: "Cannot delete the homepage" });
    return;
  }

  await db.delete(pagesTable).where(eq(pagesTable.id, params.data.id));
  res.sendStatus(204);
});

export { getPageWithSections };
export default router;
