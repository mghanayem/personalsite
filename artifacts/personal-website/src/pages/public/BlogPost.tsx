import {
  useGetPublicPost,
  useListPublicPosts,
  useGetBrandingSettings,
  getGetPublicPostQueryKey,
} from "@workspace/api-client-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { PageSeo } from "@/components/seo/PageSeo";
import { useLanguage } from "@/lib/i18n";
import { useParams, Link } from "wouter";
import { ArrowLeft, ArrowRight, Loader2, PenLine } from "lucide-react";
import { getReadingTime } from "@/lib/reading-time";

// ── Share helpers ─────────────────────────────────────────────────────────
function shareUrl(platform: "x" | "linkedin", url: string, title: string) {
  if (platform === "x") {
    return `https://x.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
  }
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
}

// ── Author card ───────────────────────────────────────────────────────────
function AuthorCard({
  name,
  jobTitle,
  isRtl,
}: {
  name: string;
  jobTitle: string;
  isRtl: boolean;
}) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      style={{
        display: "flex",
        gap: 20,
        alignItems: "center",
        marginTop: 56,
        padding: "24px 28px",
        background: "#F0EAE0",
        borderRadius: 4,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "hsl(var(--primary))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Newsreader', Georgia, serif",
          fontSize: 22,
          fontWeight: 600,
          color: "#F7F1E8",
          flexShrink: 0,
        }}
      >
        {initials}
      </div>
      <div>
        <div
          style={{
            fontFamily: "'Newsreader', Georgia, serif",
            fontWeight: 600,
            fontSize: 17,
            marginBottom: 4,
            color: "#201D1A",
          }}
        >
          {name}
        </div>
        <div style={{ fontSize: 14, color: "#6B655C", lineHeight: 1.5 }}>
          {jobTitle}
          {" · "}
          <Link
            href={isRtl ? "/blog" : "/en/blog"}
            style={{ color: "var(--blog-accent, #B15A2E)", textDecoration: "none" }}
          >
            {isRtl ? "المزيد من المقالات ←" : "More articles →"}
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Related post card ─────────────────────────────────────────────────────
function RelatedCard({
  post,
  isRtl,
}: {
  post: { id: number; titleAr: string; titleEn: string; slugAr: string; slugEn: string; featuredImageUrl?: string | null };
  isRtl: boolean;
}) {
  const title = isRtl ? post.titleAr : post.titleEn;
  const slug = isRtl ? post.slugAr : post.slugEn;
  const href = isRtl ? `/blog/${slug}` : `/en/blog/${slug}`;

  return (
    <Link href={href} style={{ textDecoration: "none", display: "block" }}>
      <div
        style={{ cursor: "pointer" }}
        onMouseEnter={(e) =>
          ((e.currentTarget.querySelector("h4") as HTMLElement | null)!.style.opacity = "0.7")
        }
        onMouseLeave={(e) =>
          ((e.currentTarget.querySelector("h4") as HTMLElement | null)!.style.opacity = "1")
        }
      >
        <div
          style={{
            width: "100%",
            aspectRatio: "16/9",
            borderRadius: 4,
            overflow: "hidden",
            marginBottom: 12,
            background: "#F0EAE0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {post.featuredImageUrl ? (
            <img
              src={post.featuredImageUrl}
              alt={title ?? ""}
              style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
            />
          ) : (
            <PenLine
              style={{ width: 24, height: 24, color: "var(--blog-accent, #B15A2E)", opacity: 0.3 }}
            />
          )}
        </div>
        <h4
          style={{
            fontFamily: "'Newsreader', Georgia, serif",
            fontSize: 16,
            fontWeight: 600,
            lineHeight: 1.3,
            color: "var(--blog-text, #201D1A)",
            margin: 0,
            transition: "opacity 0.15s",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {title || (isRtl ? "(بدون عنوان)" : "(Untitled)")}
        </h4>
      </div>
    </Link>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export default function BlogPost() {
  const { lang } = useLanguage();
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? "";
  const isRtl = lang === "ar";

  const { data: post, isLoading, isError } = useGetPublicPost(slug, {
    query: { enabled: !!slug, queryKey: getGetPublicPostQueryKey(slug) },
  });
  const { data: allPosts = [] } = useListPublicPosts();
  const { data: settings } = useGetBrandingSettings();

  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString(isRtl ? "ar-SA" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const backHref = isRtl ? "/blog" : "/en/blog";
  const backLabel = isRtl ? "كل المقالات" : "All posts";
  const authorName = isRtl ? "محمد غنايم" : "Mohammad Ghanayem";
  const jobTitle =
    settings?.seoPersonJobTitle ?? (isRtl ? "كاتب ومطوّر برمجيات" : "Developer & Writer");

  // ── Loading ────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <PublicLayout>
        <div
          style={{
            minHeight: "60vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "var(--blog-bg, #FAF6F0)",
          }}
        >
          <Loader2
            style={{ width: 32, height: 32, color: "var(--blog-accent, #B15A2E)" }}
            className="animate-spin"
          />
        </div>
      </PublicLayout>
    );
  }

  // ── Not found ──────────────────────────────────────────────────────────
  if (isError || !post) {
    return (
      <PublicLayout>
        <PageSeo
          title={isRtl ? "المقال غير موجود" : "Post not found"}
          lang={lang}
        />
        <div
          style={{
            minHeight: "60vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 24px",
            textAlign: "center",
            backgroundColor: "var(--blog-bg, #FAF6F0)",
            color: "var(--blog-text, #201D1A)",
          }}
        >
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>
            {isRtl ? "المقال غير موجود" : "Post not found"}
          </h1>
          <Link
            href={backHref}
            style={{
              color: "var(--blog-accent, #B15A2E)",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              textDecoration: "none",
            }}
          >
            {isRtl ? <ArrowRight style={{ width: 16, height: 16 }} /> : <ArrowLeft style={{ width: 16, height: 16 }} />}
            {backLabel}
          </Link>
        </div>
      </PublicLayout>
    );
  }

  const title = isRtl ? post.titleAr : post.titleEn;
  const excerpt = isRtl ? post.excerptAr : post.excerptEn;
  const content = isRtl ? post.contentAr : post.contentEn;
  const canonicalUrl = typeof window !== "undefined" ? window.location.href : "";

  const readingTime = content ? getReadingTime(content) : null;

  // Related posts — 3 most recent, excluding this one
  const relatedPosts = allPosts
    .filter((p) => p.id !== post.id)
    .slice(0, 3);

  return (
    <PublicLayout>
      <PageSeo
        title={title}
        description={excerpt}
        image={post.featuredImageUrl}
        url={canonicalUrl}
        type="article"
        publishedAt={post.publishedAt}
        lang={lang}
      />

      <div
        dir={isRtl ? "rtl" : "ltr"}
        style={{
          backgroundColor: "var(--blog-bg, #FAF6F0)",
          fontFamily: "'Public Sans', system-ui, sans-serif",
          color: "var(--blog-text, #201D1A)",
          minHeight: "100vh",
        }}
      >

        {/* ── Article body ─────────────────────────────────────────────── */}
        <article style={{ padding: "52px 32px 88px", maxWidth: 720, margin: "0 auto" }}>
          {/* Back link */}
          <Link
            href={backHref}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: "var(--blog-accent, #B15A2E)",
              fontSize: 15,
              textDecoration: "none",
              marginBottom: 28,
            }}
          >
            {isRtl ? (
              <ArrowRight style={{ width: 16, height: 16 }} />
            ) : (
              <ArrowLeft style={{ width: 16, height: 16 }} />
            )}
            {backLabel}
          </Link>

          {/* Category badge */}
          <div style={{ marginBottom: 16 }}>
            <span
              style={{
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--blog-accent, #B15A2E)",
                fontWeight: 600,
              }}
            >
              {isRtl ? "مقال" : "Article"}
            </span>
          </div>

          {/* Title */}
          <h1
            style={{
              fontFamily: "'Newsreader', Georgia, serif",
              fontSize: "clamp(28px, 4vw, 40px)",
              fontWeight: 600,
              lineHeight: 1.2,
              margin: "0 0 22px",
              color: "var(--blog-text, #201D1A)",
            }}
          >
            {title}
          </h1>

          {/* Meta bar — date · reading time · share */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "1px solid #E7E0D6",
              borderBottom: "1px solid #E7E0D6",
              padding: "14px 0",
              marginBottom: 40,
              fontSize: 14,
              color: "#948C7D",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <span>
              {formatDate(post.publishedAt)}
              {readingTime && (
                <>
                  {" · "}
                  {readingTime} {isRtl ? "دقائق قراءة" : "min read"}
                </>
              )}
            </span>

            {/* Share links */}
            <span style={{ display: "flex", gap: 16 }}>
              <a
                href={shareUrl("x", canonicalUrl, title ?? "")}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--blog-accent, #B15A2E)", textDecoration: "none" }}
              >
                {isRtl ? "شارك على X" : "Share on X"}
              </a>
              <a
                href={shareUrl("linkedin", canonicalUrl, title ?? "")}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--blog-accent, #B15A2E)", textDecoration: "none" }}
              >
                {isRtl ? "شارك على LinkedIn" : "Share on LinkedIn"}
              </a>
            </span>
          </div>

          {/* Featured image — inline, constrained to reading column */}
          {post.featuredImageUrl && (
            <div
              style={{
                margin: "0 0 40px",
                borderRadius: 10,
                overflow: "hidden",
                background: "#FAF6F0",
                lineHeight: 0,
              }}
            >
              <img
                src={post.featuredImageUrl}
                alt={title ?? ""}
                style={{
                  width: "100%",
                  maxHeight: "60vh",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            </div>
          )}

          {/* Post content */}
          {content ? (
            <div
              className="blog-prose"
              style={{ fontSize: 18, lineHeight: 1.85, color: "var(--blog-text, #201D1A)" }}
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            <p style={{ opacity: 0.45, fontSize: 18 }}>
              {isRtl ? "لا يوجد محتوى." : "No content."}
            </p>
          )}

          {/* Author card */}
          <AuthorCard name={authorName} jobTitle={jobTitle} isRtl={isRtl} />

          {/* Gallery images */}
          {post.galleryImages && post.galleryImages.length > 0 && (
            <div style={{ marginTop: 52 }}>
              <h2
                style={{
                  fontFamily: "'Newsreader', Georgia, serif",
                  fontSize: 20,
                  fontWeight: 600,
                  margin: "0 0 20px",
                  color: "var(--blog-text, #201D1A)",
                }}
              >
                {isRtl ? "صور المقال" : "Images"}
              </h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                  gap: 12,
                }}
              >
                {post.galleryImages.map((img) => (
                  <div
                    key={img.id}
                    style={{
                      aspectRatio: "4/3",
                      borderRadius: 4,
                      overflow: "hidden",
                      background: "#F0EAE0",
                    }}
                  >
                    <img
                      src={img.imageUrl}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: (img as { position?: string }).position ?? "center",
                        display: "block",
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related posts */}
          {relatedPosts.length > 0 && (
            <div style={{ marginTop: 64 }}>
              <h2
                style={{
                  fontFamily: "'Newsreader', Georgia, serif",
                  fontSize: 22,
                  fontWeight: 600,
                  margin: "0 0 24px",
                  color: "var(--blog-text, #201D1A)",
                }}
              >
                {isRtl ? "مقالات ذات صلة" : "Related posts"}
              </h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                  gap: 20,
                }}
              >
                {relatedPosts.map((rp) => (
                  <RelatedCard key={rp.id} post={rp} isRtl={isRtl} />
                ))}
              </div>
            </div>
          )}
        </article>
      </div>
    </PublicLayout>
  );
}
