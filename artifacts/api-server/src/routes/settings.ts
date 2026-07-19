import { Router, type IRouter } from "express";
import { db, settingsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const LANG_VALUES = ["ar", "en"] as const;
type LangValue = typeof LANG_VALUES[number];

type BrandingUpdate = {
  primaryColor?: string;
  accentColor?: string;
  cta1BgColor?: string;
  cta1TextColor?: string;
  cta2BgColor?: string;
  cta2TextColor?: string;
  defaultLanguage?: string;
  blogBgColor?: string;
  blogTextColor?: string;
  blogAccentColor?: string;
  // AEO fields
  seoPersonJobTitle?: string | null;
  seoWebsiteUrl?: string | null;
  seoLinkedinUrl?: string | null;
  seoTwitterUrl?: string | null;
  seoGithubUrl?: string | null;
};

const COLOR_FIELDS: (keyof Omit<BrandingUpdate, "defaultLanguage" | "seoPersonJobTitle" | "seoWebsiteUrl" | "seoLinkedinUrl" | "seoTwitterUrl" | "seoGithubUrl">)[] = [
  "primaryColor",
  "accentColor",
  "cta1BgColor",
  "cta1TextColor",
  "cta2BgColor",
  "cta2TextColor",
  "blogBgColor",
  "blogTextColor",
  "blogAccentColor",
];

const URL_FIELDS: (keyof Pick<BrandingUpdate, "seoWebsiteUrl" | "seoLinkedinUrl" | "seoTwitterUrl" | "seoGithubUrl">)[] = [
  "seoWebsiteUrl",
  "seoLinkedinUrl",
  "seoTwitterUrl",
  "seoGithubUrl",
];

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
    defaultLanguage: row.defaultLanguage as LangValue,
    blogBgColor: row.blogBgColor,
    blogTextColor: row.blogTextColor,
    blogAccentColor: row.blogAccentColor,
    seoPersonJobTitle: row.seoPersonJobTitle ?? null,
    seoWebsiteUrl: row.seoWebsiteUrl ?? null,
    seoLinkedinUrl: row.seoLinkedinUrl ?? null,
    seoTwitterUrl: row.seoTwitterUrl ?? null,
    seoGithubUrl: row.seoGithubUrl ?? null,
  };
}

// GET /settings/branding — public
router.get("/settings/branding", async (_req, res): Promise<void> => {
  const settings = await getOrCreateSettings();
  res.json(brandingResponse(settings));
});

// PATCH /settings/branding — admin only
router.patch("/settings/branding", requireAuth, async (req, res): Promise<void> => {
  const body = req.body as BrandingUpdate;
  const updates: Record<string, unknown> = {};

  // Validate and collect color fields
  for (const key of COLOR_FIELDS) {
    const val = body[key];
    if (val === undefined) continue;
    if (!HEX_RE.test(val as string)) {
      res.status(400).json({ error: `${key} must be a valid 6-digit hex color (e.g. #0e1a2a)` });
      return;
    }
    updates[key] = val;
  }

  // Validate defaultLanguage
  if (body.defaultLanguage !== undefined) {
    if (!LANG_VALUES.includes(body.defaultLanguage as LangValue)) {
      res.status(400).json({ error: "defaultLanguage must be 'ar' or 'en'" });
      return;
    }
    updates.defaultLanguage = body.defaultLanguage;
  }

  // AEO text fields (nullable strings — allow clearing with null or "")
  if ("seoPersonJobTitle" in body) updates.seoPersonJobTitle = body.seoPersonJobTitle || null;
  for (const key of URL_FIELDS) {
    if (key in body) updates[key] = body[key] || null;
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  await getOrCreateSettings(); // ensure row 1 exists
  const [updated] = await db.update(settingsTable).set(updates).returning();
  res.json(brandingResponse(updated));
});

// GET /settings/ai-status — admin only
router.get("/settings/ai-status", requireAuth, async (_req, res): Promise<void> => {
  const settings = await getOrCreateSettings();
  res.json({ isConfigured: Boolean(settings.anthropicApiKey?.trim()) });
});

// PATCH /settings/ai-key — admin only, write-only
router.patch("/settings/ai-key", requireAuth, async (req, res): Promise<void> => {
  const { apiKey } = req.body as { apiKey?: string };
  if (!apiKey?.trim()) {
    res.status(400).json({ error: "apiKey is required" });
    return;
  }
  await getOrCreateSettings();
  await db.update(settingsTable).set({ anthropicApiKey: apiKey.trim() });
  res.json({ isConfigured: true });
});

export default router;
