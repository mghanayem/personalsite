import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, sectionsTable, imagesTable } from "@workspace/db";
import {
  UpdateImageParams,
  UpdateImageBody,
  DeleteImageParams,
  ReorderImagesParams,
  ReorderImagesBody,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { upload, deleteUploadFile, imageUrl } from "../lib/uploads";

const router: IRouter = Router();

// POST /sections/:sectionId/images — multipart upload (not in OpenAPI spec)
router.post(
  "/sections/:sectionId/images",
  requireAuth,
  upload.single("file"),
  async (req, res): Promise<void> => {
    const rawId = Array.isArray(req.params.sectionId)
      ? req.params.sectionId[0]
      : req.params.sectionId;
    const sectionId = parseInt(rawId!, 10);

    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const [section] = await db
      .select()
      .from(sectionsTable)
      .where(eq(sectionsTable.id, sectionId));

    if (!section) {
      res.status(404).json({ error: "Section not found" });
      return;
    }

    const existing = await db
      .select()
      .from(imagesTable)
      .where(eq(imagesTable.sectionId, sectionId))
      .orderBy(asc(imagesTable.sortOrder));

    const maxOrder = existing.length > 0 ? Math.max(...existing.map((i) => i.sortOrder)) : -1;

    const [image] = await db
      .insert(imagesTable)
      .values({
        sectionId,
        filename: req.file.filename,
        captionAr: (req.body.caption_ar as string) ?? "",
        captionEn: (req.body.caption_en as string) ?? "",
        sortOrder: maxOrder + 1,
      })
      .returning();

    res.status(201).json({
      id: image!.id,
      sectionId: image!.sectionId,
      filename: image!.filename,
      captionAr: image!.captionAr,
      captionEn: image!.captionEn,
      sortOrder: image!.sortOrder,
      url: imageUrl(image!.filename),
    });
  },
);

// PATCH /images/:id
router.patch("/images/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateImageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateImageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Partial<typeof imagesTable.$inferInsert> = {};
  if (parsed.data.captionAr != null) updateData.captionAr = parsed.data.captionAr;
  if (parsed.data.captionEn != null) updateData.captionEn = parsed.data.captionEn;

  const [image] = await db
    .update(imagesTable)
    .set(updateData)
    .where(eq(imagesTable.id, params.data.id))
    .returning();

  if (!image) {
    res.status(404).json({ error: "Image not found" });
    return;
  }

  res.json({
    id: image.id,
    sectionId: image.sectionId,
    filename: image.filename,
    captionAr: image.captionAr,
    captionEn: image.captionEn,
    sortOrder: image.sortOrder,
    url: imageUrl(image.filename),
  });
});

// DELETE /images/:id
router.delete("/images/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteImageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [image] = await db
    .select()
    .from(imagesTable)
    .where(eq(imagesTable.id, params.data.id));

  if (!image) {
    res.status(404).json({ error: "Image not found" });
    return;
  }

  deleteUploadFile(image.filename);
  await db.delete(imagesTable).where(eq(imagesTable.id, params.data.id));
  res.sendStatus(204);
});

// POST /sections/:sectionId/images/reorder
router.post("/sections/:sectionId/images/reorder", requireAuth, async (req, res): Promise<void> => {
  const params = ReorderImagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = ReorderImagesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await Promise.all(
    parsed.data.ids.map((id, index) =>
      db.update(imagesTable).set({ sortOrder: index }).where(eq(imagesTable.id, id)),
    ),
  );

  res.json({ message: "Reordered" });
});

export default router;
