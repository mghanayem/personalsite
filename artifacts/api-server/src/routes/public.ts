import { Router, type IRouter } from "express";
import { eq, and, asc } from "drizzle-orm";
import { db, pagesTable, sectionsTable, imagesTable, modulePlacementsTable, modulesTable } from "@workspace/db";
import { imageUrl } from "../lib/uploads";

const router: IRouter = Router();

async function getActiveModulePlacements(pageId: number) {
  const rows = await db
    .select({
      id: modulePlacementsTable.id,
      moduleId: modulePlacementsTable.moduleId,
      sectionPosition: modulePlacementsTable.sectionPosition,
    })
    .from(modulePlacementsTable)
    .innerJoin(modulesTable, eq(modulePlacementsTable.moduleId, modulesTable.id))
    .where(
      and(
        eq(modulePlacementsTable.pageId, pageId),
        eq(modulePlacementsTable.isAdminOnly, false),
        eq(modulesTable.isActive, true),
      ),
    );
  return rows;
}

async function getVisibleSections(pageId: number) {
  const sections = await db
    .select()
    .from(sectionsTable)
    .where(and(eq(sectionsTable.pageId, pageId), eq(sectionsTable.isVisible, true)))
    .orderBy(asc(sectionsTable.sortOrder));

  return Promise.all(
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
}

function seoFields(p: typeof pagesTable.$inferSelect) {
  return {
    seoTitleAr: p.seoTitleAr ?? null,
    seoTitleEn: p.seoTitleEn ?? null,
    seoDescAr: p.seoDescAr ?? null,
    seoDescEn: p.seoDescEn ?? null,
    seoImageUrl: p.seoImageUrl ?? null,
    updatedAt: p.updatedAt.toISOString(),
  };
}

// GET /public/nav
router.get("/public/nav", async (_req, res): Promise<void> => {
  const pages = await db
    .select()
    .from(pagesTable)
    .where(and(eq(pagesTable.isPublished, true), eq(pagesTable.showInNav, true)))
    .orderBy(asc(pagesTable.id));

  res.json(
    pages.map((p) => ({
      id: p.id,
      titleAr: p.titleAr,
      titleEn: p.titleEn,
      slug: p.slug,
      isHomepage: p.isHomepage,
      icon: p.icon ?? null,
    })),
  );
});

// GET /public/homepage
router.get("/public/homepage", async (_req, res): Promise<void> => {
  const [homepage] = await db
    .select()
    .from(pagesTable)
    .where(eq(pagesTable.isHomepage, true));

  if (!homepage) {
    res.status(404).json({ error: "Homepage not found" });
    return;
  }

  const [sections, modulePlacements] = await Promise.all([
    getVisibleSections(homepage.id),
    getActiveModulePlacements(homepage.id),
  ]);

  res.json({
    id: homepage.id,
    titleAr: homepage.titleAr,
    titleEn: homepage.titleEn,
    slug: homepage.slug,
    isHomepage: true,
    ...seoFields(homepage),
    sections,
    modulePlacements,
  });
});

// GET /public/pages/:slug
router.get("/public/pages/:slug", async (req, res): Promise<void> => {
  const rawSlug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  const slug = rawSlug ?? "";

  const [page] = await db
    .select()
    .from(pagesTable)
    .where(and(eq(pagesTable.slug, slug), eq(pagesTable.isPublished, true)));

  if (!page) {
    res.status(404).json({ error: "Page not found" });
    return;
  }

  const [sections, modulePlacements] = await Promise.all([
    getVisibleSections(page.id),
    getActiveModulePlacements(page.id),
  ]);

  res.json({
    id: page.id,
    titleAr: page.titleAr,
    titleEn: page.titleEn,
    slug: page.slug,
    isHomepage: page.isHomepage,
    ...seoFields(page),
    sections,
    modulePlacements,
  });
});

export default router;
