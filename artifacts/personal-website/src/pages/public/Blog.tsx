import { useListPublicPosts, useGetBrandingSettings } from "@workspace/api-client-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { PageSeo } from "@/components/seo/PageSeo";
import { useLanguage } from "@/lib/i18n";
import { Link } from "wouter";
import { Loader2, PenLine } from "lucide-react";

// ── Author initials avatar ────────────────────────────────────────────────
function AuthorAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      style={{
        width: 120,
        height: 120,
        borderRadius: "50%",
        background: "rgba(247,241,232,0.12)",
        border: "3px solid rgba(247,241,232,0.25)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Newsreader', Georgia, serif",
        fontSize: 40,
        fontWeight: 600,
        color: "#F7F1E8",
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export default function Blog() {
  const { lang } = useLanguage();
  const { data: posts = [], isLoading } = useListPublicPosts();
  const { data: settings } = useGetBrandingSettings();

  const isRtl = lang === "ar";

  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString(isRtl ? "ar-SA" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const authorName = isRtl ? "محمد غنايم" : "Mohammad Ghanayem";
  const jobTitle =
    settings?.seoPersonJobTitle ??
    (isRtl ? "كاتب ومطوّر برمجيات" : "Developer & Writer");

  const canonicalUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <PublicLayout>
      <PageSeo
        title={isRtl ? "المدونة" : "Blog"}
        description={
          isRtl
            ? "أحدث المقالات والأفكار من محمد غنايم"
            : "Latest articles and insights from Mohammad Ghanayem"
        }
        url={canonicalUrl}
        type="website"
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
        {/* ── Author hero ─────────────────────────────────────────────── */}
        <div style={{ backgroundColor: "hsl(var(--primary))", color: "#F7F1E8" }}>
          <div
            style={{
              maxWidth: 780,
              margin: "0 auto",
              padding: "44px 32px 72px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: 20,
            }}
          >
            <AuthorAvatar name={authorName} />

            <h1
              style={{
                fontFamily: "'Newsreader', Georgia, serif",
                fontSize: "clamp(34px, 5vw, 52px)",
                fontWeight: 600,
                margin: 0,
                lineHeight: 1.1,
                color: "#F7F1E8",
              }}
            >
              {authorName}
            </h1>

            <p
              style={{
                fontSize: 18,
                color: "rgba(247,241,232,0.72)",
                margin: 0,
                maxWidth: 500,
                lineHeight: 1.6,
              }}
            >
              {jobTitle}
            </p>

            {/* Social links */}
            {(settings?.seoGithubUrl ||
              settings?.seoLinkedinUrl ||
              settings?.seoTwitterUrl) && (
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  alignItems: "center",
                  marginTop: 4,
                  flexWrap: "wrap",
                  justifyContent: "center",
                }}
              >
                {settings.seoGithubUrl && (
                  <>
                    <a
                      href={settings.seoGithubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#E9C9A8", fontSize: 15, textDecoration: "none" }}
                    >
                      GitHub
                    </a>
                    {(settings.seoLinkedinUrl || settings.seoTwitterUrl) && (
                      <span style={{ color: "rgba(247,241,232,0.2)" }}>·</span>
                    )}
                  </>
                )}
                {settings.seoLinkedinUrl && (
                  <>
                    <a
                      href={settings.seoLinkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#E9C9A8", fontSize: 15, textDecoration: "none" }}
                    >
                      LinkedIn
                    </a>
                    {settings.seoTwitterUrl && (
                      <span style={{ color: "rgba(247,241,232,0.2)" }}>·</span>
                    )}
                  </>
                )}
                {settings.seoTwitterUrl && (
                  <a
                    href={settings.seoTwitterUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#E9C9A8", fontSize: 15, textDecoration: "none" }}
                  >
                    Twitter / X
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Writing section ──────────────────────────────────────────── */}
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "52px 32px 80px" }}>
          <h2
            style={{
              fontFamily: "'Newsreader', Georgia, serif",
              fontSize: 28,
              fontWeight: 600,
              margin: "0 0 32px",
              color: "var(--blog-text, #201D1A)",
            }}
          >
            {isRtl ? "المقالات" : "Writing"}
          </h2>

          {isLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
              <Loader2
                style={{ width: 32, height: 32, color: "var(--blog-accent, #B15A2E)" }}
                className="animate-spin"
              />
            </div>
          ) : posts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 0" }}>
              <PenLine
                style={{
                  width: 48,
                  height: 48,
                  margin: "0 auto 16px",
                  color: "var(--blog-accent, #B15A2E)",
                  opacity: 0.35,
                  display: "block",
                }}
              />
              <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>
                {isRtl ? "لا توجد مقالات بعد" : "No posts yet"}
              </p>
              <p style={{ opacity: 0.5 }}>
                {isRtl ? "تابعنا قريباً." : "Check back soon."}
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: 28,
              }}
            >
              {posts.map((post) => {
                const title = isRtl ? post.titleAr : post.titleEn;
                const excerpt = isRtl ? post.excerptAr : post.excerptEn;
                const slug = isRtl ? post.slugAr : post.slugEn;
                const href = isRtl ? `/blog/${slug}` : `/en/blog/${slug}`;

                return (
                  <Link key={post.id} href={href} style={{ textDecoration: "none" }}>
                    <article
                      style={{
                        background: "#fff",
                        border: "1px solid #E7E0D6",
                        borderRadius: 4,
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                        cursor: "pointer",
                        transition: "box-shadow 0.18s",
                        height: "100%",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.boxShadow =
                          "0 8px 28px rgba(32,29,26,0.12)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.boxShadow = "none")
                      }
                    >
                      {/* 16:10 cover image */}
                      <div
                        style={{
                          width: "100%",
                          aspectRatio: "16/10",
                          overflow: "hidden",
                          background: "#F0EAE0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {post.featuredImageUrl ? (
                          <img
                            src={post.featuredImageUrl}
                            alt={title ?? ""}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              display: "block",
                            }}
                          />
                        ) : (
                          <PenLine
                            style={{
                              width: 32,
                              height: 32,
                              color: "var(--blog-accent, #B15A2E)",
                              opacity: 0.28,
                            }}
                          />
                        )}
                      </div>

                      {/* Card body */}
                      <div
                        style={{
                          padding: "22px 22px 24px",
                          display: "flex",
                          flexDirection: "column",
                          gap: 10,
                          flex: 1,
                        }}
                      >
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

                        <h3
                          style={{
                            fontFamily: "'Newsreader', Georgia, serif",
                            fontSize: 21,
                            fontWeight: 600,
                            margin: 0,
                            lineHeight: 1.3,
                            color: "var(--blog-text, #201D1A)",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {title || (isRtl ? "(بدون عنوان)" : "(Untitled)")}
                        </h3>

                        {excerpt && (
                          <p
                            style={{
                              fontSize: 15,
                              color: "#6B655C",
                              lineHeight: 1.55,
                              margin: 0,
                              flex: 1,
                              display: "-webkit-box",
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {excerpt}
                          </p>
                        )}

                        <div style={{ fontSize: 13, color: "#948C7D", marginTop: 4 }}>
                          {formatDate(post.publishedAt)}
                        </div>
                      </div>
                    </article>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
