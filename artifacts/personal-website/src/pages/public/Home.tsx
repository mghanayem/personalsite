import { useGetPublicHomepage } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { RenderSection } from "@/components/public/RenderSection";

export default function Home() {
  const { data: page, isLoading } = useGetPublicHomepage();

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
