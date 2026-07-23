import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and } from "drizzle-orm";
import { db, modulesTable, modulePlacementsTable, pagesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { Storage } from "@google-cloud/storage";
import path from "path";

const router: IRouter = Router();

// ── GCS client (reuse same sidecar pattern) ──────────────────────────────────
const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";
const gcsClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: { type: "json", subject_token_field_name: "access_token" },
    },
    universe_domain: "googleapis.com",
  } as Record<string, unknown>,
  projectId: "",
});

function getBucketId(): string {
  const id = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  if (!id) throw new Error("DEFAULT_OBJECT_STORAGE_BUCKET_ID not set");
  return id;
}

// ── Module-specific multer (html only, 2 MB limit) ───────────────────────────
const HTML_MAX_SIZE = 2 * 1024 * 1024; // 2 MB

const moduleMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: HTML_MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== ".html") {
      cb(new Error("Only .html files are accepted"));
      return;
    }
    cb(null, true);
  },
});

async function uploadHtmlToGCS(buffer: Buffer, filename: string): Promise<void> {
  const bucket = gcsClient.bucket(getBucketId());
  await bucket.file(`uploads/modules/${filename}`).save(buffer, {
    contentType: "text/html; charset=utf-8",
  });
}

async function deleteHtmlFromGCS(filename: string): Promise<void> {
  try {
    const bucket = gcsClient.bucket(getBucketId());
    await bucket.file(`uploads/modules/${filename}`).delete({ ignoreNotFound: true } as Parameters<ReturnType<typeof bucket.file>["delete"]>[0]);
  } catch { /* ignore */ }
}

function moduleShape(row: typeof modulesTable.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    filePath: row.filePath,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function placementShape(row: typeof modulePlacementsTable.$inferSelect) {
  return {
    id: row.id,
    moduleId: row.moduleId,
    pageId: row.pageId,
    sectionPosition: row.sectionPosition,
    isAdminOnly: row.isAdminOnly,
    createdAt: row.createdAt.toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ROUTES (all require auth)
// ─────────────────────────────────────────────────────────────────────────────

// POST /modules/upload — upload a new .html module
router.post(
  "/modules/upload",
  requireAuth,
  (req: Request, res: Response, next): void => {
    moduleMulter.single("file")(req, res, (err) => {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        res.status(400).json({ error: "File exceeds the 2 MB limit" });
        return;
      }
      if (err) {
        res.status(400).json({ error: (err as Error).message || "Upload failed" });
        return;
      }
      next();
    });
  },
  async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }

    const { name, description } = req.body as { name?: string; description?: string };
    if (!name?.trim()) {
      res.status(400).json({ error: "name is required" });
      return;
    }

    // Basic HTML sanity check — must contain at least one HTML tag
    const content = req.file.buffer.toString("utf-8");
    if (!/<[a-zA-Z]/.test(content)) {
      res.status(400).json({ error: "File does not appear to be valid HTML" });
      return;
    }

    const filename = `${uuidv4()}.html`;
    const filePath = filename; // stored as bare filename; GCS prefix: uploads/modules/

    await uploadHtmlToGCS(req.file.buffer, filename);

    const [module] = await db
      .insert(modulesTable)
      .values({ name: name.trim(), description: description?.trim() || null, filePath })
      .returning();

    res.status(201).json(moduleShape(module));
  },
);

// GET /modules — list all modules (admin)
router.get("/modules", requireAuth, async (_req, res): Promise<void> => {
  const modules = await db
    .select()
    .from(modulesTable)
    .orderBy(modulesTable.createdAt);
  res.json(modules.map(moduleShape));
});

// GET /modules/:id — get one module
router.get("/modules/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [module] = await db.select().from(modulesTable).where(eq(modulesTable.id, id));
  if (!module) { res.status(404).json({ error: "Module not found" }); return; }

  res.json(moduleShape(module));
});

// PATCH /modules/:id — update name / description
router.patch("/modules/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [existing] = await db.select().from(modulesTable).where(eq(modulesTable.id, id));
  if (!existing) { res.status(404).json({ error: "Module not found" }); return; }

  const body = req.body as { name?: string; description?: string };
  const updates: Partial<typeof modulesTable.$inferInsert> = {};
  if (typeof body.name === "string" && body.name.trim()) updates.name = body.name.trim();
  if (typeof body.description === "string") updates.description = body.description.trim() || null;

  if (Object.keys(updates).length === 0) { res.json(moduleShape(existing)); return; }

  const [updated] = await db.update(modulesTable).set(updates).where(eq(modulesTable.id, id)).returning();
  res.json(moduleShape(updated));
});

// PATCH /modules/:id/active — toggle active state
router.patch("/modules/:id/active", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [existing] = await db.select().from(modulesTable).where(eq(modulesTable.id, id));
  if (!existing) { res.status(404).json({ error: "Module not found" }); return; }

  const body = req.body as { isActive?: boolean };
  const newActive = typeof body.isActive === "boolean" ? body.isActive : !existing.isActive;

  const [updated] = await db
    .update(modulesTable)
    .set({ isActive: newActive })
    .where(eq(modulesTable.id, id))
    .returning();
  res.json(moduleShape(updated));
});

// DELETE /modules/:id — delete module + GCS file + all placements (cascade)
router.delete("/modules/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [existing] = await db.select().from(modulesTable).where(eq(modulesTable.id, id));
  if (!existing) { res.status(404).json({ error: "Module not found" }); return; }

  // Delete from DB (cascade removes placements)
  await db.delete(modulesTable).where(eq(modulesTable.id, id));

  // Delete from GCS (fire-and-forget)
  void deleteHtmlFromGCS(existing.filePath);

  res.status(204).send();
});

// ── Placements ────────────────────────────────────────────────────────────────

// GET /modules/:id/placements — list placements for a module
router.get("/modules/:id/placements", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const placements = await db
    .select()
    .from(modulePlacementsTable)
    .where(eq(modulePlacementsTable.moduleId, id));
  res.json(placements.map(placementShape));
});

// POST /modules/:id/placements — add placement
router.post("/modules/:id/placements", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const moduleId = parseInt(req.params.id as string, 10);
  if (isNaN(moduleId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [module] = await db.select().from(modulesTable).where(eq(modulesTable.id, moduleId));
  if (!module) { res.status(404).json({ error: "Module not found" }); return; }

  const { pageId, sectionPosition = "new_section", isAdminOnly = false } =
    req.body as { pageId?: number; sectionPosition?: string; isAdminOnly?: boolean };

  if (!pageId || isNaN(Number(pageId))) { res.status(400).json({ error: "pageId is required" }); return; }

  const [page] = await db.select({ id: pagesTable.id }).from(pagesTable).where(eq(pagesTable.id, Number(pageId)));
  if (!page) { res.status(404).json({ error: "Page not found" }); return; }

  const [placement] = await db
    .insert(modulePlacementsTable)
    .values({
      moduleId,
      pageId: Number(pageId),
      sectionPosition,
      isAdminOnly: Boolean(isAdminOnly),
    })
    .returning();

  res.status(201).json(placementShape(placement));
});

// DELETE /module-placements/:id — remove a placement
router.delete("/module-placements/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [existing] = await db.select().from(modulePlacementsTable).where(eq(modulePlacementsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Placement not found" }); return; }

  await db.delete(modulePlacementsTable).where(eq(modulePlacementsTable.id, id));
  res.status(204).send();
});

// ─────────────────────────────────────────────────────────────────────────────
// CONTENT ENDPOINT
//
// Access matrix:
//   Authenticated admin           → always allowed (preview / editing)
//   Unauthenticated + inactive    → 403
//   Unauthenticated + active, no public placement → 403
//   Unauthenticated + active, ≥1 non-admin-only placement → 200
//
// This ensures a module that is only placed as "admin only" (or not placed at
// all) cannot be fetched by guessing its numeric ID.
// ─────────────────────────────────────────────────────────────────────────────

// GET /modules/:id/content — return raw HTML
router.get("/modules/:id/content", async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [module] = await db.select().from(modulesTable).where(eq(modulesTable.id, id));
  if (!module) { res.status(404).json({ error: "Module not found" }); return; }

  const isAdmin = Boolean(req.session?.adminId);

  if (!isAdmin) {
    // Inactive modules are never public
    if (!module.isActive) {
      res.status(403).json({ error: "Module is inactive" });
      return;
    }

    // Active module must have at least one non-admin-only placement to be
    // publicly accessible. Without this check, anyone could enumerate IDs and
    // fetch HTML for modules that admins placed as admin-only.
    const [publicPlacement] = await db
      .select({ id: modulePlacementsTable.id })
      .from(modulePlacementsTable)
      .where(
        and(
          eq(modulePlacementsTable.moduleId, id),
          eq(modulePlacementsTable.isAdminOnly, false),
        ),
      )
      .limit(1);

    if (!publicPlacement) {
      res.status(403).json({ error: "No public placement for this module" });
      return;
    }
  }

  // Inject the active language so module scripts can read window.__lang
  // without needing to inspect the parent URL.
  const rawLang = typeof req.query.lang === "string" ? req.query.lang : "";
  const lang = rawLang === "en" ? "en" : "ar"; // default to Arabic

  try {
    const bucket = gcsClient.bucket(getBucketId());
    const file = bucket.file(`uploads/modules/${module.filePath}`);
    const [exists] = await file.exists();

    if (!exists) {
      res.status(404).json({ error: "Module file not found in storage" });
      return;
    }

    const [data] = await file.download();
    const html = data.toString("utf-8");

    // Prepend a bootstrap <script> so window.__lang is available before any
    // module code runs. Using a server-side injection means the value is baked
    // into the served document rather than relying on postMessage or srcdoc tricks.
    const bootstrap = `<script>window.__lang="${lang}";</script>\n`;
    const finalHtml = bootstrap + html;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    // Override the global helmet CSP for this endpoint only.
    // Module HTML is admin-uploaded and may load arbitrary CDN scripts (Chart.js,
    // Google Fonts, etc.) — a strict CSP would break those resources.
    // The iframe is already sandboxed in the browser (allow-scripts only), so
    // loosening CSP here does not weaken the parent-page security posture.
    res.setHeader(
      "Content-Security-Policy",
      [
        "default-src *",
        "script-src * 'unsafe-inline' 'unsafe-eval'",
        "style-src * 'unsafe-inline'",
        "font-src *",
        "img-src * data: blob:",
        "connect-src *",
      ].join("; "),
    );
    res.send(finalHtml);
  } catch {
    res.status(500).json({ error: "Failed to retrieve module content" });
  }
});

export default router;
