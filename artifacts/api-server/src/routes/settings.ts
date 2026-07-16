import { Router, type IRouter } from "express";
import { db, settingsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/** Fetch current settings row, creating defaults on first call. */
async function getOrCreateSettings() {
  const rows = await db.select().from(settingsTable);
  if (rows[0]) return rows[0];
  const [created] = await db.insert(settingsTable).values({ id: 1 }).returning();
  return created;
}

// GET /settings/branding — public
router.get("/settings/branding", async (_req, res): Promise<void> => {
  const settings = await getOrCreateSettings();
  res.json({ primaryColor: settings.primaryColor, accentColor: settings.accentColor });
});

// PATCH /settings/branding — admin only
router.patch("/settings/branding", requireAuth, async (req, res): Promise<void> => {
  const { primaryColor, accentColor } = req.body as { primaryColor?: string; accentColor?: string };

  if (primaryColor !== undefined && !HEX_RE.test(primaryColor)) {
    res.status(400).json({ error: "primaryColor must be a valid 6-digit hex color (e.g. #0e1a2a)" });
    return;
  }
  if (accentColor !== undefined && !HEX_RE.test(accentColor)) {
    res.status(400).json({ error: "accentColor must be a valid 6-digit hex color (e.g. #f1f5f9)" });
    return;
  }

  const updates: Partial<{ primaryColor: string; accentColor: string }> = {};
  if (primaryColor) updates.primaryColor = primaryColor;
  if (accentColor) updates.accentColor = accentColor;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  await getOrCreateSettings(); // ensure row 1 exists
  const [updated] = await db.update(settingsTable).set(updates).returning();
  res.json({ primaryColor: updated.primaryColor, accentColor: updated.accentColor });
});

export default router;
