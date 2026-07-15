import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import rateLimit from "express-rate-limit";
import connectPgSimple from "connect-pg-simple";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes";
import { logger } from "./lib/logger";
import { pool } from "@workspace/db";
import { getUploadsDir } from "./lib/uploads";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app: Express = express();

// ── Allowed origins ───────────────────────────────────────────────────────
// Build the list from env vars.  In Replit dev the proxy domain is injected as
// REPLIT_DEV_DOMAIN (e.g. "abc-replit.replit.dev"); in production set ORIGIN.
const rawOrigins = [
  process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : undefined,
  process.env.ORIGIN,
].filter((o): o is string => Boolean(o));

// If no origin env var is present (e.g. bare local dev) fall back to allowing
// same-origin only (credentials: false, origin: false).
const hasConfiguredOrigin = rawOrigins.length > 0;

// ── Logging ───────────────────────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// ── CORS ──────────────────────────────────────────────────────────────────
// Only allow credentialed requests from known origins.
app.use(
  cors({
    origin: hasConfiguredOrigin ? rawOrigins : false,
    credentials: hasConfiguredOrigin,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Session ───────────────────────────────────────────────────────────────
const PgSession = connectPgSimple(session);
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error(
    "SESSION_SECRET environment variable is required. Set it in your environment secrets.",
  );
}

app.use(
  session({
    store: new PgSession({
      pool,
      tableName: "session",
      createTableIfMissing: true,
    }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      // sameSite: "lax" blocks cross-site POST/PATCH/DELETE cookies (CSRF mitigation)
      // while still allowing top-level GET navigations.
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  }),
);

// ── CSRF guard ────────────────────────────────────────────────────────────
// For every state-changing request to /api, verify the Origin header is one
// of our allowed origins. Requests with no Origin header are same-origin and
// are allowed. This is defense-in-depth on top of sameSite: lax.
app.use("/api", (req: Request, res: Response, next: NextFunction): void => {
  const stateChanging = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
  if (!stateChanging) { next(); return; }

  const originHeader = req.headers.origin;
  if (!originHeader) {
    // No Origin header → same-origin or server-to-server request; allow
    next(); return;
  }

  if (hasConfiguredOrigin && !rawOrigins.includes(originHeader)) {
    res.status(403).json({ error: "Forbidden: origin not allowed" });
    return;
  }

  next();
});

// ── Rate limiting on login ────────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: "Too many login attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/auth/login", loginLimiter);

// ── Static uploads ────────────────────────────────────────────────────────
const uploadsDir = getUploadsDir();
app.use("/uploads", express.static(uploadsDir));

// ── API routes ────────────────────────────────────────────────────────────
app.use("/api", router);

export default app;
