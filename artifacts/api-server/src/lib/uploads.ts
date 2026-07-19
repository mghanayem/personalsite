import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve uploads directory relative to the project root
export const UPLOADS_DIR = path.resolve(__dirname, "..", "..", "..", "..", "artifacts", "personal-website", "dist", "public", "uploads");
export const UPLOADS_URL_PREFIX = "/api/uploads";

// Ensure uploads directory exists (dev-mode path: served via Vite proxy / public)
// In production the frontend is built; we serve from dist/public
// For dev, we write to a shared location readable by the frontend
const DEV_UPLOADS_DIR = path.resolve(__dirname, "..", "..", "..", "..", "public", "uploads");

export function getUploadsDir(): string {
  const dir = process.env.NODE_ENV === "production" ? UPLOADS_DIR : DEV_UPLOADS_DIR;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, getUploadsDir());
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

export const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only jpg, png, webp images are allowed"));
    }
  },
});

export function deleteUploadFile(filename: string): void {
  const filePath = path.join(getUploadsDir(), filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

export function imageUrl(filename: string): string {
  return `/api/uploads/${filename}`;
}
