import { pool } from "@workspace/db";

await pool.query(`
  CREATE TABLE IF NOT EXISTS settings (
    id serial PRIMARY KEY,
    primary_color text NOT NULL DEFAULT '#0e1a2a',
    accent_color text NOT NULL DEFAULT '#f1f5f9',
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  INSERT INTO settings (id, primary_color, accent_color)
  VALUES (1, '#0e1a2a', '#f1f5f9')
  ON CONFLICT (id) DO NOTHING;
`);
console.log("✅ settings table ready");
process.exit(0);
