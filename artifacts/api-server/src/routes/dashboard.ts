import { Router, type IRouter } from "express";
import { eq, count } from "drizzle-orm";
import { db, pagesTable, sectionsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// GET /dashboard/stats
router.get("/dashboard/stats", requireAuth, async (_req, res): Promise<void> => {
  const [totalPages] = await db.select({ count: count() }).from(pagesTable);
  const [publishedPages] = await db
    .select({ count: count() })
    .from(pagesTable)
    .where(eq(pagesTable.isPublished, true));
  const [totalSections] = await db.select({ count: count() }).from(sectionsTable);

  const total = Number(totalPages?.count ?? 0);
  const published = Number(publishedPages?.count ?? 0);

  res.json({
    totalPages: total,
    publishedPages: published,
    draftPages: total - published,
    totalSections: Number(totalSections?.count ?? 0),
  });
});

export default router;
