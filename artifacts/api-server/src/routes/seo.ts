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

function urlEntry(loc: string, lastmod: string, changefreq: string, priority: string): string {
  return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
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

  // Pages — both Arabic and English URLs
  for (const p of pages) {
    const lastmod = p.updatedAt.toISOString().slice(0, 10);
    const priority = p.isHomepage ? "1.0" : "0.8";

    if (p.isHomepage) {
      entries.push(urlEntry(`${prefix}/`, lastmod, "weekly", priority));
      entries.push(urlEntry(`${prefix}/en/`, lastmod, "weekly", priority));
    } else {
      entries.push(urlEntry(`${prefix}/p/${escapeXml(p.slug)}`, lastmod, "monthly", priority));
      entries.push(urlEntry(`${prefix}/en/p/${escapeXml(p.slug)}`, lastmod, "monthly", priority));
    }
  }

  // Blog index pages (once we have posts)
  if (posts.length > 0) {
    const blogLastmod = posts[0]?.publishedAt?.toISOString().slice(0, 10) ?? new Date().toISOString().slice(0, 10);
    entries.push(urlEntry(`${prefix}/blog`, blogLastmod, "weekly", "0.7"));
    entries.push(urlEntry(`${prefix}/en/blog`, blogLastmod, "weekly", "0.7"));

    // Individual posts — both slugs
    for (const post of posts) {
      const lastmod = (post.publishedAt ?? post.createdAt).toISOString().slice(0, 10);
      entries.push(urlEntry(`${prefix}/blog/${escapeXml(post.slugAr)}`, lastmod, "monthly", "0.6"));
      entries.push(urlEntry(`${prefix}/en/blog/${escapeXml(post.slugEn)}`, lastmod, "monthly", "0.6"));
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>`;

  res.set("Content-Type", "application/xml; charset=utf-8");
  res.set("Cache-Control", "public, max-age=3600");
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
