/**
 * Idempotent migration: ensures the contact_messages table exists with the
 * correct schema. Handles the case where Task #11 created a "messages" table
 * that Task #12 renamed to "contact_messages".
 */
import { pool } from "@workspace/db";

await pool.query(`
  DO $$
  BEGIN
    -- Case 1: old 'messages' table exists and new 'contact_messages' does not → rename + patch
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages')
       AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'contact_messages')
    THEN
      ALTER TABLE messages RENAME TO contact_messages;
    END IF;

    -- Case 2: contact_messages still doesn't exist → create fresh
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'contact_messages')
    THEN
      CREATE TABLE contact_messages (
        id          serial      PRIMARY KEY,
        name        text        NOT NULL,
        email       text        NOT NULL,
        message     text        NOT NULL,
        is_read     boolean     NOT NULL DEFAULT false,
        is_archived boolean     NOT NULL DEFAULT false,
        received_at timestamptz NOT NULL DEFAULT now()
      );
    END IF;

    -- Ensure all columns exist (for upgrades from older schema)
    ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS is_read     boolean     NOT NULL DEFAULT false;
    ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS is_archived boolean     NOT NULL DEFAULT false;
    ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS received_at timestamptz NOT NULL DEFAULT now();
  END
  $$;
`);

console.log("✅ contact_messages table ready");
await pool.end();
