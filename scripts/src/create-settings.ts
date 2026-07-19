import { pool } from "@workspace/db";

// Step 1: create base table if it doesn't exist
await pool.query(`
  CREATE TABLE IF NOT EXISTS settings (
    id serial PRIMARY KEY,
    primary_color text NOT NULL DEFAULT '#0e1a2a',
    accent_color text NOT NULL DEFAULT '#f1f5f9',
    updated_at timestamptz NOT NULL DEFAULT now()
  );
`);

// Step 2: add button-color columns if upgrading from an older schema
await pool.query(`
  ALTER TABLE settings ADD COLUMN IF NOT EXISTS cta1_bg_color text NOT NULL DEFAULT '#5b91c8';
  ALTER TABLE settings ADD COLUMN IF NOT EXISTS cta1_text_color text NOT NULL DEFAULT '#ffffff';
  ALTER TABLE settings ADD COLUMN IF NOT EXISTS cta2_bg_color text NOT NULL DEFAULT '#ffffff';
  ALTER TABLE settings ADD COLUMN IF NOT EXISTS cta2_text_color text NOT NULL DEFAULT '#0e1a2a';
`);

// Step 3: add default language column
await pool.query(`
  ALTER TABLE settings ADD COLUMN IF NOT EXISTS default_language text NOT NULL DEFAULT 'ar';
`);

// Step 4: add blog template color columns
await pool.query(`
  ALTER TABLE settings ADD COLUMN IF NOT EXISTS blog_bg_color text NOT NULL DEFAULT '#ffffff';
  ALTER TABLE settings ADD COLUMN IF NOT EXISTS blog_text_color text NOT NULL DEFAULT '#1e293b';
  ALTER TABLE settings ADD COLUMN IF NOT EXISTS blog_accent_color text NOT NULL DEFAULT '#5b91c8';
`);

// Step 5: ensure the singleton row exists
await pool.query(`
  INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
`);

// Step 6: create posts table if it doesn't exist yet
await pool.query(`
  CREATE TABLE IF NOT EXISTS posts (
    id serial PRIMARY KEY,
    title_ar text NOT NULL DEFAULT '',
    title_en text NOT NULL DEFAULT '',
    slug_ar text NOT NULL,
    slug_en text NOT NULL,
    excerpt_ar text NOT NULL DEFAULT '',
    excerpt_en text NOT NULL DEFAULT '',
    content_ar text NOT NULL DEFAULT '',
    content_en text NOT NULL DEFAULT '',
    featured_image_url text,
    is_published boolean NOT NULL DEFAULT false,
    published_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
`);
await pool.query(`
  CREATE UNIQUE INDEX IF NOT EXISTS posts_slug_ar_unique ON posts (slug_ar);
  CREATE UNIQUE INDEX IF NOT EXISTS posts_slug_en_unique ON posts (slug_en);
`);

// Step 7: add AEO / structured-data fields to settings
await pool.query(`
  ALTER TABLE settings ADD COLUMN IF NOT EXISTS seo_person_job_title text;
  ALTER TABLE settings ADD COLUMN IF NOT EXISTS seo_website_url text;
  ALTER TABLE settings ADD COLUMN IF NOT EXISTS seo_linkedin_url text;
  ALTER TABLE settings ADD COLUMN IF NOT EXISTS seo_twitter_url text;
  ALTER TABLE settings ADD COLUMN IF NOT EXISTS seo_github_url text;
`);

// Step 8: add SEO columns to pages table
await pool.query(`
  ALTER TABLE pages ADD COLUMN IF NOT EXISTS seo_title_ar text;
  ALTER TABLE pages ADD COLUMN IF NOT EXISTS seo_title_en text;
  ALTER TABLE pages ADD COLUMN IF NOT EXISTS seo_desc_ar text;
  ALTER TABLE pages ADD COLUMN IF NOT EXISTS seo_desc_en text;
  ALTER TABLE pages ADD COLUMN IF NOT EXISTS seo_image_url text;
`);

// Step 9: migrate posts.featured_image_url from /uploads/ to /api/uploads/
// Idempotent — the REPLACE only fires when the old prefix is still present.
// (The images table stores filename only; its URL is built at query time.)
await pool.query(`
  UPDATE posts
  SET featured_image_url = REPLACE(featured_image_url, '/uploads/', '/api/uploads/')
  WHERE featured_image_url LIKE '/uploads/%';
`);

// Step 10: migrate blog colors to editorial palette defaults
// Only updates if the row still has the old pre-editorial defaults.
await pool.query(`
  UPDATE settings
  SET
    blog_bg_color    = '#FAF6F0',
    blog_text_color  = '#201D1A',
    blog_accent_color = '#B15A2E'
  WHERE id = 1
    AND blog_bg_color     = '#ffffff'
    AND blog_text_color   = '#1e293b'
    AND blog_accent_color = '#5b91c8';
`);

console.log("✅ settings + posts + SEO tables + upload URL + editorial blog colors ready");
process.exit(0);
