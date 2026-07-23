/**
 * PageSeo — injects bilingual <title>, <meta description>, Open Graph,
 * and Twitter/X card tags via react-helmet-async.
 *
 * All props are optional so callers can pass only what they have.
 */
import { Helmet } from "react-helmet-async";

interface PageSeoProps {
  /** Resolved title for the current language (already locale-selected). */
  title?: string | null;
  /** Resolved description for the current language. */
  description?: string | null;
  /** Absolute or relative URL for og:image. */
  image?: string | null;
  /** Canonical URL for this page. */
  url?: string | null;
  /** og:type — defaults to "website". Use "article" for blog posts. */
  type?: "website" | "article";
  /** Published date (ISO string) — used for article:published_time. */
  publishedAt?: string | null;
  /** Language of this page — sets <html lang>. */
  lang?: "ar" | "en";
  /**
   * Site name from branding settings (admin-configurable).
   * Falls back to the hardcoded constant if not provided.
   */
  siteName?: string | null;
  /**
   * Default description used when no page-specific description is set.
   * From branding settings (admin-configurable).
   */
  defaultDescription?: string | null;
}

const FALLBACK_SITE_NAME = "Mohammad Ghanayem";

export function PageSeo({
  title,
  description,
  image,
  url,
  type = "website",
  publishedAt,
  lang = "ar",
  siteName,
  defaultDescription,
}: PageSeoProps) {
  const resolvedSiteName = siteName || FALLBACK_SITE_NAME;
  const resolvedTitle = title ? `${title} | ${resolvedSiteName}` : resolvedSiteName;
  const resolvedDesc = description || defaultDescription || "";
  const resolvedUrl = url || (typeof window !== "undefined" ? window.location.href : "");

  return (
    <Helmet>
      <html lang={lang} dir={lang === "ar" ? "rtl" : "ltr"} />
      <title>{resolvedTitle}</title>
      {resolvedDesc && <meta name="description" content={resolvedDesc} />}

      {/* Open Graph */}
      <meta property="og:site_name" content={resolvedSiteName} />
      <meta property="og:title" content={resolvedTitle} />
      {resolvedDesc && <meta property="og:description" content={resolvedDesc} />}
      <meta property="og:type" content={type} />
      {resolvedUrl && <meta property="og:url" content={resolvedUrl} />}
      {image && <meta property="og:image" content={image} />}
      {type === "article" && publishedAt && (
        <meta property="article:published_time" content={publishedAt} />
      )}

      {/* Twitter / X Card */}
      <meta name="twitter:card" content={image ? "summary_large_image" : "summary"} />
      <meta name="twitter:title" content={resolvedTitle} />
      {resolvedDesc && <meta name="twitter:description" content={resolvedDesc} />}
      {image && <meta name="twitter:image" content={image} />}
    </Helmet>
  );
}
