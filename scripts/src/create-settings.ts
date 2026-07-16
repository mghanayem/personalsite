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

// Step 2: add new button-color columns if upgrading from an older schema
await pool.query(`
  ALTER TABLE settings ADD COLUMN IF NOT EXISTS cta1_bg_color text NOT NULL DEFAULT '#5b91c8';
  ALTER TABLE settings ADD COLUMN IF NOT EXISTS cta1_text_color text NOT NULL DEFAULT '#ffffff';
  ALTER TABLE settings ADD COLUMN IF NOT EXISTS cta2_bg_color text NOT NULL DEFAULT '#ffffff';
  ALTER TABLE settings ADD COLUMN IF NOT EXISTS cta2_text_color text NOT NULL DEFAULT '#0e1a2a';
`);

// Step 3: ensure the singleton row exists (columns already have defaults so no need to list them)
await pool.query(`
  INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
`);

console.log("✅ settings table ready (with button color columns)");
process.exit(0);
