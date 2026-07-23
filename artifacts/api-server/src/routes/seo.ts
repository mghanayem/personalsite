/**
 * SEO utility endpoints — served outside the /api prefix so crawlers find them.
 * - GET /sitemap.xml — XML sitemap of all published pages + blog posts
 * - GET /robots.txt — crawl instructions with Sitemap reference
 *
 * These are mounted directly on the Express app (not under /api) in app.ts.
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc } from "drizzle-orm";
import { db, pagesTable, postsTable } from "@workspace/db";

const seoRouter: IRouter = Router();

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Build a single <url> block with hreflang alternates.
 * @param arUrl  Canonical Arabic URL
 * @param enUrl  Canonical English URL
 * @param lastmod  ISO date string (YYYY-MM-DD)
 * @param changefreq  Sitemap changefreq value
 * @param priority  Sitemap priority value
 */
function urlEntry(
  arUrl: string,
  enUrl: string,
  lastmod: string,
  changefreq: string,
  priority: string,
): string {
  const arEscaped = escapeXml(arUrl);
  const enEscaped = escapeXml(enUrl);
  return [
    "  <url>",
    `    <loc>${arEscaped}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    `    <xhtml:link rel="alternate" hreflang="ar" href="${arEscaped}"/>`,
    `    <xhtml:link rel="alternate" hreflang="en" href="${enEscaped}"/>`,
    "  </url>",
  ].join("\n");
}

seoRouter.get("/sitemap.xml", async (req: Request, res: Response): Promise<void> => {
  const origin = `${req.protocol}://${req.get("host")}`;
  const base = (process.env.BASE_URL || "").replace(/\/$/, "");
  const prefix = `${origin}${base}`;

  // Fetch all published pages
  const pages = await db
    .select()
    .from(pagesTable)
    .where(eq(pagesTable.isPublished, true));

  // Fetch all published blog posts
  const posts = await db
    .select()
    .from(postsTable)
    .where(eq(postsTable.isPublished, true))
    .orderBy(desc(postsTable.publishedAt));

  const entries: string[] = [];

  // Pages — one <url> block per page, with ar + en alternates
  for (const p of pages) {
    const lastmod = p.updatedAt.toISOString().slice(0, 10);
    const priority = p.isHomepage ? "1.0" : "0.8";

    if (p.isHomepage) {
      entries.push(urlEntry(`${prefix}/`, `${prefix}/en/`, lastmod, "weekly", priority));
    } else {
      entries.push(
        urlEntry(
          `${prefix}/p/${escapeXml(p.slug)}`,
          `${prefix}/en/p/${escapeXml(p.slug)}`,
          lastmod,
          "monthly",
          priority,
        ),
      );
    }
  }

  // Blog index — one <url> block with ar + en alternates
  if (posts.length > 0) {
    const blogLastmod =
      posts[0]?.publishedAt?.toISOString().slice(0, 10) ?? new Date().toISOString().slice(0, 10);
    entries.push(
      urlEntry(`${prefix}/blog`, `${prefix}/en/blog`, blogLastmod, "weekly", "0.7"),
    );

    // Individual posts — one <url> block per post, ar slug → en slug
    for (const post of posts) {
      const lastmod = (post.publishedAt ?? post.createdAt).toISOString().slice(0, 10);
      entries.push(
        urlEntry(
          `${prefix}/blog/${escapeXml(post.slugAr)}`,
          `${prefix}/en/blog/${escapeXml(post.slugEn)}`,
          lastmod,
          "monthly",
          "0.6",
        ),
      );
    }
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...entries,
    "</urlset>",
  ].join("\n");

  res.set("Content-Type", "application/xml; charset=utf-8");
  res.set("Cache-Control", "public, max-age=60");
  res.send(xml);
});

seoRouter.get("/robots.txt", (req: Request, res: Response): void => {
  const origin = `${req.protocol}://${req.get("host")}`;
  const base = (process.env.BASE_URL || "").replace(/\/$/, "");
  const sitemapUrl = `${origin}${base}/sitemap.xml`;

  res.set("Content-Type", "text/plain; charset=utf-8");
  res.set("Cache-Control", "public, max-age=86400");
  res.send(`User-agent: *\nAllow: /\nSitemap: ${sitemapUrl}\n`);
});

export default seoRouter;
