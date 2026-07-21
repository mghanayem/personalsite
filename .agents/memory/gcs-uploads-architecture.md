---
name: GCS uploads architecture
description: How uploaded images are stored and served — Replit Object Storage (GCS sidecar), disk fallback for pre-migration files, migration script.
---

# GCS Uploads Architecture

## The rule
All new image uploads go to Replit Object Storage (GCS via sidecar at `http://127.0.0.1:1106`). Files are stored at key `uploads/{uuid}.{ext}` in bucket `DEFAULT_OBJECT_STORAGE_BUCKET_ID`.

**Why:** Files written to `dist/public/uploads/` on disk were wiped every redeploy. GCS persists across all deployments.

## How to apply
- `lib/uploads.ts` — single source of truth. Exports `upload` (multer memory storage + GCS upload), `serveUpload`, `deleteUploadFile`, `imageUrl`.
- `app.ts` — serves `/api/uploads/:filename` by calling `serveUpload()` (GCS first, disk fallback).
- All route files use `upload.single("file")` unchanged — API surface is identical to old multer disk storage.

## Disk fallback
`serveUpload()` tries GCS first; falls back to `public/uploads/` (dev) or `artifacts/personal-website/dist/public/uploads/` (prod). This keeps pre-migration files working until they are re-uploaded.

## Migration
`og-default.jpg` is already in GCS. `scripts/migrate-uploads-to-gcs.mjs` can fetch images from the deployed URL and upload to GCS — run it before each production deploy to catch any remaining disk-only files.

## GCS client credentials
Uses Replit sidecar external_account auth. Credentials object must be cast `as Record<string, unknown>` to satisfy TS types.
