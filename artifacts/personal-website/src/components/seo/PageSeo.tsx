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
}

const SITE_NAME = "Mohammad Ghanayem";
const DEFAULT_TITLE = SITE_NAME;

export function PageSeo({
  title,
  description,
  image,
  url,
  type = "website",
  publishedAt,
  lang = "ar",
}: PageSeoProps) {
  const resolvedTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
  const resolvedDesc = description || "";
  const resolvedUrl = url || (typeof window !== "undefined" ? window.location.href : "");

  return (
    <Helmet>
      <html lang={lang} dir={lang === "ar" ? "rtl" : "ltr"} />
      <title>{resolvedTitle}</title>
      {resolvedDesc && <meta name="description" content={resolvedDesc} />}

      {/* Open Graph */}
      <meta property="og:site_name" content={SITE_NAME} />
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
