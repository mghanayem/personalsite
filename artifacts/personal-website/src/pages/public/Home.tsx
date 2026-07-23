import { useGetPublicHomepage, useGetBrandingSettings } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { RenderSection } from "@/components/public/RenderSection";
import { ModuleFrame } from "@/components/public/ModuleFrame";
import { PageSeo } from "@/components/seo/PageSeo";
import { useLanguage } from "@/lib/i18n";
import { Helmet } from "react-helmet-async";
import { renderWithModules } from "@/lib/modules";

function buildPersonJsonLd(settings: {
  seoPersonJobTitle?: string | null;
  seoWebsiteUrl?: string | null;
  seoLinkedinUrl?: string | null;
  seoTwitterUrl?: string | null;
  seoGithubUrl?: string | null;
}) {
  const sameAs = [
    settings.seoLinkedinUrl,
    settings.seoTwitterUrl,
    settings.seoGithubUrl,
  ].filter(Boolean) as string[];

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": "Mohammad Ghanayem",
  };
  if (settings.seoPersonJobTitle) jsonLd["jobTitle"] = settings.seoPersonJobTitle;
  if (settings.seoWebsiteUrl) jsonLd["url"] = settings.seoWebsiteUrl;
  if (sameAs.length > 0) jsonLd["sameAs"] = sameAs;

  return JSON.stringify(jsonLd);
}

export default function Home() {
  const { lang } = useLanguage();
  const { data: page, isLoading } = useGetPublicHomepage();
  const { data: settings } = useGetBrandingSettings();

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
          <h1 className="text-3xl font-bold mb-4">No content found</h1>
          <p className="text-muted-foreground">The homepage has not been published yet.</p>
        </div>
      </PublicLayout>
    );
  }

  const seoTitle = lang === "ar" ? page.seoTitleAr : page.seoTitleEn;
  const seoDesc = lang === "ar" ? page.seoDescAr : page.seoDescEn;
  const canonicalUrl = typeof window !== "undefined" ? window.location.href : "";

  const siteName = lang === "ar" ? settings?.siteNameAr : settings?.siteNameEn;
  const defaultDesc = lang === "ar" ? settings?.defaultDescAr : settings?.defaultDescEn;

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

      {/* Person structured data (AEO) */}
      {settings && (
        <Helmet>
          <script type="application/ld+json">
            {buildPersonJsonLd(settings)}
          </script>
        </Helmet>
      )}

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
