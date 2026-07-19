import { useListPublicPosts } from "@workspace/api-client-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { PageSeo } from "@/components/seo/PageSeo";
import { useLanguage } from "@/lib/i18n";
import { Link } from "wouter";
import { Calendar, Loader2, PenLine } from "lucide-react";

export default function Blog() {
  const { lang } = useLanguage();
  const { data: posts = [], isLoading } = useListPublicPosts();

  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const canonicalUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <PublicLayout>
      <PageSeo
        title={lang === "ar" ? "المدونة" : "Blog"}
        description={
          lang === "ar"
            ? "أحدث المقالات والأفكار من محمد غنايم"
            : "Latest articles and insights from Mohammad Ghanayem"
        }
        url={canonicalUrl}
        type="website"
        lang={lang}
      />

      <div
        className="min-h-screen"
        style={{ backgroundColor: "var(--blog-bg, #ffffff)", color: "var(--blog-text, #1e293b)" }}
      >
        <div className="container mx-auto px-4 md:px-8 py-16">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold mb-3">
              {lang === "ar" ? "المدونة" : "Blog"}
            </h1>
            <p style={{ color: "var(--blog-text, #1e293b)", opacity: 0.6 }}>
              {lang === "ar" ? "أحدث المقالات والمستجدات" : "Latest articles and updates"}
            </p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-24">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-24">
              <PenLine className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--blog-accent, #5b91c8)", opacity: 0.4 }} />
              <p className="text-lg font-medium mb-1">
                {lang === "ar" ? "لا توجد مقالات بعد" : "No posts yet"}
              </p>
              <p style={{ opacity: 0.5 }}>
                {lang === "ar" ? "تابعنا قريباً." : "Check back soon."}
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map((post) => {
                const title = lang === "ar" ? post.titleAr : post.titleEn;
                const excerpt = lang === "ar" ? post.excerptAr : post.excerptEn;
                const slug = lang === "ar" ? post.slugAr : post.slugEn;
                const href = lang === "ar" ? `/blog/${slug}` : `/en/blog/${slug}`;

                return (
                  <Link key={post.id} href={href} className="group block">
                    <article
                      className="rounded-2xl overflow-hidden border transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
                      style={{
                        borderColor: "var(--blog-accent, #5b91c8)",
                        borderWidth: "1px",
                        borderStyle: "solid",
                      }}
                    >
                      {/* Featured image or placeholder */}
                      {post.featuredImageUrl ? (
                        <div className="aspect-video overflow-hidden">
                          <img
                            src={post.featuredImageUrl}
                            alt={title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      ) : (
                        <div
                          className="aspect-video flex items-center justify-center"
                          style={{ backgroundColor: "var(--blog-accent, #5b91c8)", opacity: 0.08 }}
                        >
                          <PenLine className="w-10 h-10" style={{ color: "var(--blog-accent, #5b91c8)" }} />
                        </div>
                      )}

                      <div className="p-5">
                        <h2
                          className="font-bold text-lg leading-snug mb-2 line-clamp-2 group-hover:opacity-75 transition-opacity"
                          style={{ color: "var(--blog-text, #1e293b)" }}
                        >
                          {title || (lang === "ar" ? "(بدون عنوان)" : "(Untitled)")}
                        </h2>
                        {excerpt && (
                          <p
                            className="text-sm line-clamp-3 mb-4"
                            style={{ color: "var(--blog-text, #1e293b)", opacity: 0.65 }}
                          >
                            {excerpt}
                          </p>
                        )}
                        <div
                          className="flex items-center gap-2 text-xs"
                          style={{ color: "var(--blog-accent, #5b91c8)" }}
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{formatDate(post.publishedAt)}</span>
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
