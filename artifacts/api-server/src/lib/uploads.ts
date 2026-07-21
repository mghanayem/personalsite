import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { Storage } from "@google-cloud/storage";
import type { Request, Response, NextFunction } from "express";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

export const UPLOADS_URL_PREFIX = "/api/uploads";

// ── Legacy disk paths — fallback for images uploaded before GCS migration ────
const LEGACY_PROD_DIR = path.resolve(
  __dirname, "..", "..", "..", "..", "artifacts", "personal-website", "dist", "public", "uploads",
);
const LEGACY_DEV_DIR = path.resolve(
  __dirname, "..", "..", "..", "..", "public", "uploads",
);
function getLegacyDir(): string {
  return process.env.NODE_ENV === "production" ? LEGACY_PROD_DIR : LEGACY_DEV_DIR;
}

// ── GCS client (Replit sidecar auth) ─────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

async function uploadBufferToGCS(
  buffer: Buffer,
  filename: string,
  mimetype: string,
): Promise<void> {
  const bucket = gcsClient.bucket(getBucketId());
  await bucket.file(`uploads/${filename}`).save(buffer, { contentType: mimetype });
}

// ── Multer — memory storage, no disk writes ───────────────────────────────────
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

const multerInstance = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) cb(null, true);
    else cb(new Error("Only jpg, png, webp images are allowed"));
  },
});

/**
 * Drop-in replacement for the multer `upload` object.
 * Keeps the same API so existing routes need no changes.
 * After multer buffers the file, it is streamed to GCS and
 * req.file.filename is set to the generated UUID filename.
 */
export const upload = {
  single: (fieldname: string) => {
    const multerMiddleware = multerInstance.single(fieldname);
    return (req: Request, res: Response, next: NextFunction): void => {
      multerMiddleware(req, res, async (err: unknown) => {
        if (err) { next(err as Error); return; }
        if (!req.file) { next(); return; }

        const ext = path.extname(req.file.originalname).toLowerCase() || ".jpg";
        const filename = `${uuidv4()}${ext}`;

        try {
          await uploadBufferToGCS(req.file.buffer, filename, req.file.mimetype);
          req.file.filename = filename;
          next();
        } catch (uploadErr) {
          next(uploadErr as Error);
        }
      });
    };
  },
};

/**
 * Serve an upload: check GCS first, then fall back to the legacy
 * disk path for files uploaded before the GCS migration.
 */
export async function serveUpload(filename: string, res: Response): Promise<void> {
  // 1. Try GCS
  try {
    const bucket = gcsClient.bucket(getBucketId());
    const file = bucket.file(`uploads/${filename}`);
    const [exists] = await file.exists();

    if (exists) {
      const [meta] = await file.getMetadata();
      res.setHeader("Content-Type", (meta.contentType as string) || "application/octet-stream");
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      if (meta.size) res.setHeader("Content-Length", String(meta.size));
      file.createReadStream().pipe(res);
      return;
    }
  } catch { /* fall through */ }

  // 2. Legacy disk fallback (images uploaded before migration)
  const diskPath = path.join(getLegacyDir(), filename);
  if (fs.existsSync(diskPath)) {
    res.sendFile(diskPath);
    return;
  }

  res.status(404).json({ error: "File not found" });
}

/**
 * Delete a file from GCS. Fire-and-forget — does not throw.
 */
export function deleteUploadFile(filename: string): void {
  void (async () => {
    try {
      const bucket = gcsClient.bucket(getBucketId());
      await bucket.file(`uploads/${filename}`).delete({ ignoreNotFound: true } as Parameters<ReturnType<typeof bucket.file>["delete"]>[0]);
    } catch { /* ignore */ }
  })();
}

export function imageUrl(filename: string): string {
  return `/api/uploads/${filename}`;
}

/**
 * Migrate a single file from disk into GCS. Returns true on success.
 * Used for the one-time migration of legacy uploads.
 */
export async function migrateFileToBucket(filename: string, diskDir: string): Promise<boolean> {
  const diskPath = path.join(diskDir, filename);
  if (!fs.existsSync(diskPath)) return false;
  const buf = fs.readFileSync(diskPath);
  const ext = path.extname(filename).toLowerCase();
  const mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
  await uploadBufferToGCS(buf, filename, mime);
  return true;
}
