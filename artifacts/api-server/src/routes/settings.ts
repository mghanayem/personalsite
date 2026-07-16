import { Router, type IRouter } from "express";
import { db, settingsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

type BrandingFields = {
  primaryColor?: string;
  accentColor?: string;
  cta1BgColor?: string;
  cta1TextColor?: string;
  cta2BgColor?: string;
  cta2TextColor?: string;
};

const BRANDING_FIELD_LABELS: Record<keyof BrandingFields, string> = {
  primaryColor: "primaryColor",
  accentColor: "accentColor",
  cta1BgColor: "cta1BgColor",
  cta1TextColor: "cta1TextColor",
  cta2BgColor: "cta2BgColor",
  cta2TextColor: "cta2TextColor",
};

/** Fetch current settings row, creating defaults on first call. */
async function getOrCreateSettings() {
  const rows = await db.select().from(settingsTable);
  if (rows[0]) return rows[0];
  const [created] = await db.insert(settingsTable).values({ id: 1 }).returning();
  return created;
}

function brandingResponse(row: typeof settingsTable.$inferSelect) {
  return {
    primaryColor: row.primaryColor,
    accentColor: row.accentColor,
    cta1BgColor: row.cta1BgColor,
    cta1TextColor: row.cta1TextColor,
    cta2BgColor: row.cta2BgColor,
    cta2TextColor: row.cta2TextColor,
  };
}

// GET /settings/branding — public
router.get("/settings/branding", async (_req, res): Promise<void> => {
  const settings = await getOrCreateSettings();
  res.json(brandingResponse(settings));
});

// PATCH /settings/branding — admin only
router.patch("/settings/branding", requireAuth, async (req, res): Promise<void> => {
  const body = req.body as BrandingFields;
  const updates: Partial<BrandingFields> = {};

  for (const key of Object.keys(BRANDING_FIELD_LABELS) as (keyof BrandingFields)[]) {
    const val = body[key];
    if (val === undefined) continue;
    if (!HEX_RE.test(val)) {
      res.status(400).json({ error: `${key} must be a valid 6-digit hex color (e.g. #0e1a2a)` });
      return;
    }
    updates[key] = val;
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  await getOrCreateSettings(); // ensure row 1 exists
  const [updated] = await db.update(settingsTable).set(updates).returning();
  res.json(brandingResponse(updated));
});

export default router;
