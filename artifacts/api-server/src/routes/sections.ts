import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, sectionsTable, imagesTable } from "@workspace/db";
import {
  CreateSectionParams,
  CreateSectionBody,
  GetSectionParams,
  UpdateSectionParams,
  UpdateSectionBody,
  DeleteSectionParams,
  ToggleSectionVisibilityParams,
  ToggleSectionVisibilityBody,
  ReorderSectionsParams,
  ReorderSectionsBody,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { imageUrl } from "../lib/uploads";
import { sanitizeSectionData } from "../lib/sanitize";

const router: IRouter = Router();

async function formatSectionWithImages(s: typeof sectionsTable.$inferSelect) {
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
}

// GET /pages/:pageId/sections
router.get("/pages/:pageId/sections", requireAuth, async (req, res): Promise<void> => {
  const params = CreateSectionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const sections = await db
    .select()
    .from(sectionsTable)
    .where(eq(sectionsTable.pageId, params.data.pageId))
    .orderBy(asc(sectionsTable.sortOrder));

  const result = await Promise.all(sections.map(formatSectionWithImages));
  res.json(result);
});

// POST /pages/:pageId/sections
router.post("/pages/:pageId/sections", requireAuth, async (req, res): Promise<void> => {
  const params = CreateSectionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreateSectionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Find next sort order
  const existing = await db
    .select()
    .from(sectionsTable)
    .where(eq(sectionsTable.pageId, params.data.pageId))
    .orderBy(asc(sectionsTable.sortOrder));

  const maxOrder = existing.length > 0 ? Math.max(...existing.map((s) => s.sortOrder)) : -1;

  const [section] = await db
    .insert(sectionsTable)
    .values({
      pageId: params.data.pageId,
      type: parsed.data.type,
      sortOrder: maxOrder + 1,
      isVisible: true,
      data: sanitizeSectionData(parsed.data.data ?? {}) as Record<string, unknown>,
    })
    .returning();

  res.status(201).json(await formatSectionWithImages(section!));
});

// GET /sections/:id
router.get("/sections/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetSectionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [section] = await db
    .select()
    .from(sectionsTable)
    .where(eq(sectionsTable.id, params.data.id));

  if (!section) {
    res.status(404).json({ error: "Section not found" });
    return;
  }

  res.json(await formatSectionWithImages(section));
});

// PATCH /sections/:id
router.patch("/sections/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateSectionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateSectionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [section] = await db
    .update(sectionsTable)
    .set({ data: sanitizeSectionData(parsed.data.data) as Record<string, unknown> })
    .where(eq(sectionsTable.id, params.data.id))
    .returning();

  if (!section) {
    res.status(404).json({ error: "Section not found" });
    return;
  }

  res.json(await formatSectionWithImages(section));
});

// DELETE /sections/:id
router.delete("/sections/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteSectionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [section] = await db
    .select()
    .from(sectionsTable)
    .where(eq(sectionsTable.id, params.data.id));

  if (!section) {
    res.status(404).json({ error: "Section not found" });
    return;
  }

  await db.delete(sectionsTable).where(eq(sectionsTable.id, params.data.id));
  res.sendStatus(204);
});

// PATCH /sections/:id/visibility
router.patch("/sections/:id/visibility", requireAuth, async (req, res): Promise<void> => {
  const params = ToggleSectionVisibilityParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = ToggleSectionVisibilityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [section] = await db
    .update(sectionsTable)
    .set({ isVisible: parsed.data.isVisible })
    .where(eq(sectionsTable.id, params.data.id))
    .returning();

  if (!section) {
    res.status(404).json({ error: "Section not found" });
    return;
  }

  res.json(await formatSectionWithImages(section));
});

// POST /pages/:pageId/sections/reorder
router.post("/pages/:pageId/sections/reorder", requireAuth, async (req, res): Promise<void> => {
  const params = ReorderSectionsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = ReorderSectionsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await Promise.all(
    parsed.data.ids.map((id, index) =>
      db
        .update(sectionsTable)
        .set({ sortOrder: index })
        .where(eq(sectionsTable.id, id)),
    ),
  );

  res.json({ message: "Reordered" });
});

export { formatSectionWithImages };
export default router;
