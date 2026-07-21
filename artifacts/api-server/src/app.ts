import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import rateLimit from "express-rate-limit";
import connectPgSimple from "connect-pg-simple";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes";
import seoRouter from "./routes/seo";
import { logger } from "./lib/logger";
import { pool } from "@workspace/db";
import { serveUpload } from "./lib/uploads";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app: Express = express();

// Replit (and most PaaS) sits behind a proxy that sets X-Forwarded-For.
// Without this, express-rate-limit throws ERR_ERL_UNEXPECTED_X_FORWARDED_FOR.
app.set("trust proxy", 1);

// ── Allowed origins ───────────────────────────────────────────────────────
// Build the list from env vars.  In Replit dev the proxy domain is injected as
// REPLIT_DEV_DOMAIN (e.g. "abc-replit.replit.dev"); in production set ORIGIN.
const replitDevDomain = process.env.REPLIT_DEV_DOMAIN;

// Expo web preview runs from PREFIX.expo.SUFFIX where PREFIX.SUFFIX == REPLIT_DEV_DOMAIN
const expoDevOrigin = replitDevDomain
  ? `https://${replitDevDomain.replace(/^([^.]+)\./, "$1.expo.")}`
  : undefined;

const rawOrigins = [
  replitDevDomain ? `https://${replitDevDomain}` : undefined,
  expoDevOrigin,
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
      // Table is created manually at startup in index.ts — esbuild does not
      // bundle the table.sql asset that createTableIfMissing relies on.
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
// For every state-changing request, verify the Origin is trusted.
// "Trusted" means: no Origin header (same-origin in older browsers / curl),
// OR Origin matches a configured allowed origin,
// OR Origin matches the request's own host (same-origin in production where
// the frontend and API share one domain behind Replit's proxy).
app.use("/api", (req: Request, res: Response, next: NextFunction): void => {
  const stateChanging = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
  if (!stateChanging) { next(); return; }

  const originHeader = req.headers.origin;
  if (!originHeader) { next(); return; }

  // Allow same-origin: Origin matches the host this request arrived on.
  const selfOrigin = `${req.protocol}://${req.hostname}`;
  if (originHeader === selfOrigin) { next(); return; }

  // Allow explicitly configured origins (dev domain, custom ORIGIN env var).
  if (hasConfiguredOrigin && rawOrigins.includes(originHeader)) { next(); return; }

  res.status(403).json({ error: "Forbidden: origin not allowed" });
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

// ── Rate limiting on contact form ─────────────────────────────────────────
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { error: "Too many messages sent. Please wait before trying again." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/public/contact", contactLimiter);

// ── Upload serving — proxied from GCS, disk fallback for pre-migration files ──
app.get("/api/uploads/:filename", async (req: Request, res: Response): Promise<void> => {
  const filename = Array.isArray(req.params.filename)
    ? req.params.filename[0]
    : req.params.filename;
  await serveUpload(filename!, res);
});

// ── SEO utility routes (served at root, outside /api prefix) ─────────────
app.use(seoRouter);

// ── API routes ────────────────────────────────────────────────────────────
app.use("/api", router);

export default app;
