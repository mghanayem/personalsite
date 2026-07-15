import { useGetPublicPage } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { RenderSection } from "@/components/public/RenderSection";
import { useParams } from "wouter";

export default function Page() {
  const { slug } = useParams<{ slug: string }>();
  
  // Guard for safety, though wouter route ensures slug exists
  const { data: page, isLoading } = useGetPublicPage(slug || "", {
    query: {
      enabled: !!slug,
      queryKey: ["getGetPublicPage", slug] // Orval specific requirement for enabled queries sometimes
    }
  });

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

  return (
    <PublicLayout>
      <div className="flex flex-col w-full">
        {page.sections
          .filter(s => s.isVisible)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map(section => (
            <RenderSection key={section.id} section={section} />
          ))}
      </div>
    </PublicLayout>
  );
}
