import { useGetPublicPage, useGetBrandingSettings } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { RenderSection } from "@/components/public/RenderSection";
import { ModuleFrame } from "@/components/public/ModuleFrame";
import { PageSeo } from "@/components/seo/PageSeo";
import { useParams } from "wouter";
import { useLanguage } from "@/lib/i18n";
import { renderWithModules } from "@/lib/modules";

export default function Page() {
  const { slug } = useParams<{ slug: string }>();
  const { lang } = useLanguage();

  const { data: page, isLoading } = useGetPublicPage(slug || "", {
    query: {
      enabled: !!slug,
      queryKey: ["getGetPublicPage", slug],
    }
  });
  const { data: brandingSettings } = useGetBrandingSettings();

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </PublicLayout>
    );
  }

  if (!page) {
    return (
      <PublicLayout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-3xl font-bold mb-4">Page not found</h1>
          <p className="text-muted-foreground">The page you are looking for does not exist.</p>
        </div>
      </PublicLayout>
    );
  }

  const seoTitle = lang === "ar" ? page.seoTitleAr : page.seoTitleEn;
  const seoDesc = lang === "ar" ? page.seoDescAr : page.seoDescEn;
  const canonicalUrl = typeof window !== "undefined" ? window.location.href : "";

  const siteName = lang === "ar" ? brandingSettings?.siteNameAr : brandingSettings?.siteNameEn;
  const defaultDesc = lang === "ar" ? brandingSettings?.defaultDescAr : brandingSettings?.defaultDescEn;

  return (
    <PublicLayout>
      <PageSeo
        title={seoTitle || (lang === "ar" ? page.titleAr : page.titleEn)}
        description={seoDesc}
        image={page.seoImageUrl}
        url={canonicalUrl}
        type="website"
        lang={lang}
        siteName={siteName}
        defaultDescription={defaultDesc}
      />
      <div className="flex flex-col w-full">
        {renderWithModules(page.sections, page.modulePlacements ?? []).map((item) =>
          item.kind === "section" ? (
            <RenderSection key={`s-${item.section.id}`} section={item.section} />
          ) : (
            <ModuleFrame key={`m-${item.placement.id}`} moduleId={item.placement.moduleId} />
          )
        )}
      </div>
    </PublicLayout>
  );
}
