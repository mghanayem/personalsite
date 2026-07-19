import { useGetPublicPost, getGetPublicPostQueryKey } from "@workspace/api-client-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { useLanguage } from "@/lib/i18n";
import { useParams, Link } from "wouter";
import { Calendar, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";

export default function BlogPost() {
  const { lang } = useLanguage();
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? "";

  const { data: post, isLoading, isError } = useGetPublicPost(slug, {
    query: { enabled: !!slug, queryKey: getGetPublicPostQueryKey(slug) },
  });

  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const backHref = lang === "ar" ? "/blog" : "/en/blog";
  const backLabel = lang === "ar" ? "العودة إلى المدونة" : "Back to Blog";

  if (isLoading) {
    return (
      <PublicLayout>
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ backgroundColor: "var(--blog-bg, #ffffff)" }}
        >
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </PublicLayout>
    );
  }

  if (isError || !post) {
    return (
      <PublicLayout>
        <div
          className="min-h-screen flex flex-col items-center justify-center px-4 text-center"
          style={{ backgroundColor: "var(--blog-bg, #ffffff)", color: "var(--blog-text, #1e293b)" }}
        >
          <h1 className="text-2xl font-bold mb-4">
            {lang === "ar" ? "المقال غير موجود" : "Post not found"}
          </h1>
          <Link href={backHref} className="text-primary hover:underline flex items-center gap-2">
            {lang === "ar" ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            {backLabel}
          </Link>
        </div>
      </PublicLayout>
    );
  }

  const title = lang === "ar" ? post.titleAr : post.titleEn;
  const content = lang === "ar" ? post.contentAr : post.contentEn;

  return (
    <PublicLayout>
      <div style={{ backgroundColor: "var(--blog-bg, #ffffff)", color: "var(--blog-text, #1e293b)" }}>
        {/* Featured image */}
        {post.featuredImageUrl && (
          <div className="w-full" style={{ maxHeight: 480, overflow: "hidden" }}>
            <img
              src={post.featuredImageUrl}
              alt={title}
              className="w-full object-cover"
              style={{ maxHeight: 480 }}
            />
          </div>
        )}

        <div className="container mx-auto px-4 md:px-8 py-12 max-w-3xl">
          {/* Back link */}
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm mb-8 transition-opacity hover:opacity-70"
            style={{ color: "var(--blog-accent, #5b91c8)" }}
          >
            {lang === "ar" ? (
              <ArrowRight className="w-4 h-4" />
            ) : (
              <ArrowLeft className="w-4 h-4" />
            )}
            {backLabel}
          </Link>

          {/* Title */}
          <h1
            className="text-3xl md:text-4xl font-bold leading-tight mb-4"
            style={{ color: "var(--blog-text, #1e293b)" }}
          >
            {title}
          </h1>

          {/* Date */}
          <div
            className="flex items-center gap-2 text-sm mb-12 pb-8 border-b"
            style={{ color: "var(--blog-accent, #5b91c8)", borderColor: "var(--blog-accent, #5b91c8)" }}
          >
            <Calendar className="w-4 h-4" />
            <span>{formatDate(post.publishedAt)}</span>
          </div>

          {/* HTML content — sanitized server-side before storage */}
          {content ? (
            <div
              className="blog-prose leading-relaxed"
              style={{ color: "var(--blog-text, #1e293b)" }}
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            <p style={{ color: "var(--blog-text, #1e293b)", opacity: 0.5 }}>
              {lang === "ar" ? "لا يوجد محتوى." : "No content."}
            </p>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
