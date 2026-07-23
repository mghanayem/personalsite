import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Single-row site settings table (id=1).
 * All colors stored as hex strings (#rrggbb).
 */
export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  primaryColor: text("primary_color").notNull().default("#0e1a2a"),
  accentColor: text("accent_color").notNull().default("#f1f5f9"),
  // Hero button colors
  cta1BgColor: text("cta1_bg_color").notNull().default("#5b91c8"),
  cta1TextColor: text("cta1_text_color").notNull().default("#ffffff"),
  cta2BgColor: text("cta2_bg_color").notNull().default("#ffffff"),
  cta2TextColor: text("cta2_text_color").notNull().default("#0e1a2a"),
  // Site language default for new visitors
  defaultLanguage: text("default_language").notNull().default("ar"),
  // Blog template colors
  blogBgColor: text("blog_bg_color").notNull().default("#ffffff"),
  blogTextColor: text("blog_text_color").notNull().default("#1e293b"),
  blogAccentColor: text("blog_accent_color").notNull().default("#5b91c8"),
  // AEO / structured-data Person fields
  seoPersonJobTitle: text("seo_person_job_title"),
  seoWebsiteUrl: text("seo_website_url"),
  seoLinkedinUrl: text("seo_linkedin_url"),
  seoTwitterUrl: text("seo_twitter_url"),
  seoGithubUrl: text("seo_github_url"),
  // Blog author profile photo — stored as a URL to GCS-backed upload
  blogProfilePhotoUrl: text("blog_profile_photo_url"),
  // Site identity — editable from the admin Branding page
  siteNameEn: text("site_name_en"),
  siteNameAr: text("site_name_ar"),
  defaultDescEn: text("default_desc_en"),
  defaultDescAr: text("default_desc_ar"),
  // AI assistant — stored server-side only, never returned to frontend
  anthropicApiKey: text("anthropic_api_key"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Settings = typeof settingsTable.$inferSelect;
