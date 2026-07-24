/**
 * Server for the personal website — development and production.
 *
 * In development: wraps Vite in Express middleware mode so hot-module
 * replacement works and per-page Open Graph / Twitter meta tags are
 * injected into the HTML before every response.
 *
 * In production (NODE_ENV=production): serves the pre-built static files
 * from dist/public and still injects per-page OG tags so social-media
 * crawlers (LinkedIn, WhatsApp, Twitter/X, Facebook) see correct metadata
 * in the raw HTML without executing JavaScript.
 *
 * Crawlers skip JavaScript, so react-helmet-async alone is insufficient —
 * the tags must exist in the server-sent HTML.
 */
import express from "express";
import { createServer as createHttpServer } from "node:http";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { db, pagesTable, postsTable, settingsTable } from "@workspace/db";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT ?? "3000", 10);
const IS_PROD = process.env.NODE_ENV === "production";
// BASE_PATH is e.g. "/personal-website" — strip trailing slash, keep leading slash
const BASE_PATH = (process.env.BASE_PATH ?? "/").replace(/\/$/, "");

// ── HTML entity escaping (for attribute values) ───────────────────────────
function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ── Per-page OG data shape ────────────────────────────────────────────────
interface OgMeta {
  title: string | null;
  description: string | null;
  image: string | null;
  type: "website" | "article";
  publishedAt?: string | null;
  lang: "ar" | "en";
  siteName: string;
}

// ── Fetch per-page OG data from the database ─────────────────────────────
async function fetchOgMeta(reqPath: string): Promise<OgMeta> {
  // Strip the BASE_PATH prefix to get the SPA route
  let route = reqPath;
  if (BASE_PATH && route.startsWith(BASE_PATH)) {
    route = route.slice(BASE_PATH.length) || "/";
  }
  if (!route.startsWith("/")) route = "/" + route;

  const isEnglish = route === "/en" || route.startsWith("/en/");
  const lang: "ar" | "en" = isEnglish ? "en" : "ar";
  // Strip /en prefix for pattern matching
  const cleanRoute = isEnglish ? route.slice(3) || "/" : route;

  // Fetch site-wide settings (single row)
  const [settings] = await db.select().from(settingsTable);
  const siteName =
    lang === "en"
      ? settings?.siteNameEn || "Mohammad Ghanayem"
      : settings?.siteNameAr || "محمد غنايم";
  const defaultDesc =
    lang === "en"
      ? settings?.defaultDescEn ?? null
      : settings?.defaultDescAr ?? null;
  const defaultImage = settings?.defaultOgImageUrl ?? null;

  // ── Homepage: / or /en/ ─────────────────────────────────────
  if (cleanRoute === "/" || cleanRoute === "") {
    const [homepage] = await db
      .select()
      .from(pagesTable)
      .where(eq(pagesTable.isHomepage, true));
    if (homepage) {
      return {
        title:
          lang === "en"
            ? homepage.seoTitleEn || homepage.titleEn
            : homepage.seoTitleAr || homepage.titleAr,
        description:
          lang === "en"
            ? homepage.seoDescEn || defaultDesc
            : homepage.seoDescAr || defaultDesc,
        image: homepage.seoImageUrl || defaultImage,
        type: "website",
        lang,
        siteName,
      };
    }
    return {
      title: null,
      description: defaultDesc,
      image: defaultImage,
      type: "website",
      lang,
      siteName,
    };
  }

  // ── Custom page: /p/:slug ────────────────────────────────────
  const pageMatch = cleanRoute.match(/^\/p\/([^/]+)\/?$/);
  if (pageMatch) {
    const slug = decodeURIComponent(pageMatch[1]!);
    const [page] = await db
      .select()
      .from(pagesTable)
      .where(eq(pagesTable.slug, slug));
    if (page) {
      return {
        title:
          lang === "en"
            ? page.seoTitleEn || page.titleEn
            : page.seoTitleAr || page.titleAr,
        description:
          lang === "en"
            ? page.seoDescEn || defaultDesc
            : page.seoDescAr || defaultDesc,
        image: page.seoImageUrl || defaultImage,
        type: "website",
        lang,
        siteName,
      };
    }
  }

  // ── Blog listing: /blog ──────────────────────────────────────
  if (cleanRoute === "/blog" || cleanRoute === "/blog/") {
    return {
      title: lang === "en" ? "Blog" : "المدونة",
      description: defaultDesc,
      image: defaultImage,
      type: "website",
      lang,
      siteName,
    };
  }

  // ── Blog post: /blog/:slug ───────────────────────────────────
  const blogMatch = cleanRoute.match(/^\/blog\/([^/]+)\/?$/);
  if (blogMatch) {
    const slug = decodeURIComponent(blogMatch[1]!);
    const col = lang === "en" ? postsTable.slugEn : postsTable.slugAr;
    const [post] = await db
      .select()
      .from(postsTable)
      .where(eq(col, slug));
    if (post?.isPublished) {
      return {
        title: lang === "en" ? post.titleEn : post.titleAr,
        description:
          lang === "en"
            ? post.excerptEn || defaultDesc
            : post.excerptAr || defaultDesc,
        image: post.featuredImageUrl || defaultImage,
        type: "article",
        publishedAt: post.publishedAt?.toISOString() ?? null,
        lang,
        siteName,
      };
    }
  }

  // ── Fallback to site defaults ────────────────────────────────
  return {
    title: null,
    description: defaultDesc,
    image: defaultImage,
    type: "website",
    lang,
    siteName,
  };
}

// ── Build the <head> meta tag block ──────────────────────────────────────
function buildMetaTags(meta: OgMeta, pageUrl: string): string {
  // Bug 2 fix (Option A): the admin writes complete SEO titles — use them
  // as-is. Only fall back to the site name when no per-page title exists.
  const resolvedTitle = meta.title ?? meta.siteName;

  // Bug 1 fix: social crawlers require absolute image URLs.
  // Resolve relative paths (e.g. "/api/uploads/...") against the request origin.
  let absImage: string | null = null;
  if (meta.image) {
    if (meta.image.startsWith("http://") || meta.image.startsWith("https://")) {
      absImage = meta.image;
    } else {
      try {
        const origin = new URL(pageUrl).origin;
        absImage = `${origin}${meta.image.startsWith("/") ? "" : "/"}${meta.image}`;
      } catch {
        absImage = meta.image; // keep as-is if pageUrl is unparseable
      }
    }
  }

  const lines: string[] = [
    `<title>${esc(resolvedTitle)}</title>`,
    `<meta property="og:site_name" content="${esc(meta.siteName)}" />`,
    `<meta property="og:title" content="${esc(resolvedTitle)}" />`,
    `<meta property="og:type" content="${meta.type}" />`,
    `<meta property="og:url" content="${esc(pageUrl)}" />`,
    `<meta name="twitter:card" content="${absImage ? "summary_large_image" : "summary"}" />`,
    `<meta name="twitter:title" content="${esc(resolvedTitle)}" />`,
  ];

  if (meta.description) {
    lines.push(
      `<meta name="description" content="${esc(meta.description)}" />`,
    );
    lines.push(
      `<meta property="og:description" content="${esc(meta.description)}" />`,
    );
    lines.push(
      `<meta name="twitter:description" content="${esc(meta.description)}" />`,
    );
  }

  if (absImage) {
    lines.push(`<meta property="og:image" content="${esc(absImage)}" />`);
    lines.push(`<meta name="twitter:image" content="${esc(absImage)}" />`);
  }

  if (meta.type === "article" && meta.publishedAt) {
    lines.push(
      `<meta property="article:published_time" content="${meta.publishedAt}" />`,
    );
  }

  return lines.join("\n    ");
}

// ── Google tag snippet builder ────────────────────────────────────────────
// Returns an empty string when id is blank — safe to embed as-is in <head>.
// The id is always passed through esc() before interpolation.
function buildGoogleTagSnippet(id: string | null | undefined): string {
  const trimmed = id?.trim();
  if (!trimmed) return "";
  const safeId = esc(trimmed);

  if (trimmed.toUpperCase().startsWith("GTM-")) {
    // Google Tag Manager — head <script> only (noscript body tag unnecessary in SPA context)
    return [
      `<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':`,
      `new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],`,
      `j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=`,
      `'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);`,
      `})(window,document,'script','dataLayer','${safeId}');</script>`,
    ].join("\n");
  }

  // GA4 Measurement ID — send_page_view:false because the SPA fires page_view itself
  return [
    `<script async src="https://www.googletagmanager.com/gtag/js?id=${safeId}"></script>`,
    `<script>window.dataLayer=window.dataLayer||[];`,
    `function gtag(){window.dataLayer.push(arguments);}`,
    `gtag('js',new Date());gtag('config','${safeId}',{send_page_view:false});</script>`,
  ].join("\n");
}

// ── Shared HTML handler ───────────────────────────────────────────────────
function makeHtmlHandler(
  getRawHtml: (url: string, rawHtml: string) => Promise<string>,
  getIndexSource: () => string,
) {
  return async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    // Skip requests that look like static asset files
    if (/\.[a-zA-Z0-9]{1,6}$/.test(req.path) && !req.path.endsWith(".html")) {
      return next();
    }

    try {
      // In Express 5, req.path inside app.use("/{*path}", ...) is stripped
      // to just "/". Use originalUrl and strip the query string to get the
      // real path for OG lookups and the canonical URL.
      const pathname = (req.originalUrl.split("?")[0]) ?? "/";

      const rawHtml = getIndexSource();
      const transformed = await getRawHtml(pathname, rawHtml);

      // Build canonical og:url from forwarded headers (Replit proxy)
      const proto =
        (req.headers["x-forwarded-proto"] as string | undefined)
          ?.split(",")[0]
          ?.trim() ??
        req.protocol ??
        "https";
      const host =
        (req.headers["x-forwarded-host"] as string | undefined) ??
        req.headers.host ??
        "localhost";
      const pageUrl = `${proto}://${host}${pathname}`;

      // Fetch per-page OG data — fall back gracefully if DB is unavailable
      const meta = await fetchOgMeta(pathname).catch(
        (): OgMeta => ({
          title: null,
          description: null,
          image: null,
          type: "website",
          lang: "ar",
          siteName: "Mohammad Ghanayem",
        }),
      );

      const metaTags = buildMetaTags(meta, pageUrl);

      // Determine whether this request is for an admin route.
      // Strip BASE_PATH first so the check works in both dev and production.
      let spaRoute = pathname;
      if (BASE_PATH && spaRoute.startsWith(BASE_PATH)) {
        spaRoute = spaRoute.slice(BASE_PATH.length) || "/";
      }
      if (!spaRoute.startsWith("/")) spaRoute = "/" + spaRoute;
      const isAdminRoute = spaRoute === "/admin" || spaRoute.startsWith("/admin/");

      // Fetch the Google Tag ID from the settings row (lightweight single-column select).
      // Falls back silently to null on any DB error.
      const tagRow = await db
        .select({ googleTagId: settingsTable.googleTagId })
        .from(settingsTable)
        .then((rows) => rows[0] ?? { googleTagId: null })
        .catch(() => ({ googleTagId: null }));

      const googleTagHtml = isAdminRoute ? "" : buildGoogleTagSnippet(tagRow.googleTagId);

      const html = transformed
        .replace("<!-- OG_META_PLACEHOLDER -->", metaTags)
        .replace("<!-- GOOGLE_TAG_PLACEHOLDER -->", googleTagHtml);

      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (e) {
      next(e);
    }
  };
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
  const app = express();
  const httpServer = createHttpServer(app);

  if (IS_PROD) {
    // ── Production: serve pre-built static files ─────────────────────────
    const distDir = path.resolve(__dirname, "dist/public");

    // Static assets (JS, CSS, images) — skip index.html so our handler runs
    app.use(express.static(distDir, { index: false }));

    // Catch-all: inject OG tags and serve the built index.html
    app.use(
      "/{*path}",
      makeHtmlHandler(
        // No Vite transform in production — return as-is
        async (_url, html) => html,
        () =>
          fs.readFileSync(path.resolve(distDir, "index.html"), "utf-8"),
      ),
    );
  } else {
    // ── Development: Vite middleware + HMR ───────────────────────────────
    const { createServer: createViteServer } = await import("vite");

    const vite = await createViteServer({
      configFile: path.resolve(__dirname, "vite.config.ts"),
      server: {
        middlewareMode: true,
        // Attach Vite's HMR WebSocket to our HTTP server
        hmr: { server: httpServer },
      },
      appType: "custom", // we serve index.html ourselves
    });

    // Vite handles: static assets, JS transforms, CSS, HMR endpoint
    app.use(vite.middlewares);

    // Catch-all: Vite-transform the HTML, inject OG tags, send
    app.use(
      "/{*path}",
      makeHtmlHandler(
        (url, rawHtml) => vite.transformIndexHtml(url, rawHtml),
        () =>
          fs.readFileSync(path.resolve(__dirname, "index.html"), "utf-8"),
      ),
    );

    // Clean up Vite on shutdown
    process.on("SIGTERM", () => {
      void vite.close().finally(() => process.exit(0));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    const mode = IS_PROD ? "production" : "development";
    console.log(`[personal-website] Server running on port ${PORT} (${mode})`);
  });
}

main().catch((err) => {
  console.error("[personal-website] Fatal startup error:", err);
  process.exit(1);
});
