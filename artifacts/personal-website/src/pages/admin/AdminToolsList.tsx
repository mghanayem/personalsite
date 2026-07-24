import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Wrench, ExternalLink, Loader2, PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AdminTool {
  id: number;
  name: string;
  description: string | null;
}

export default function AdminToolsList() {
  const [, setLocation] = useLocation();
  const [tools, setTools] = useState<AdminTool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/tools")
      .then((r) => (r.ok ? (r.json() as Promise<AdminTool[]>) : []))
      .then((data) => {
        setTools(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <AdminLayout>
      <div className="max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <Wrench className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Tools</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Admin-only modules available to you</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : tools.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <PackageOpen className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground font-medium">No admin-only tools yet.</p>
            <p className="text-sm text-muted-foreground/70 mt-1 max-w-xs">
              Mark a module as <strong>Admin Only</strong> in the Modules page to have it appear here.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setLocation("/admin/modules")}
            >
              Go to Modules
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool) => (
              <Card
                key={tool.id}
                className="flex flex-col hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => setLocation(`/admin/tools/${tool.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <Wrench className="w-4 h-4 text-primary" />
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors mt-0.5" />
                  </div>
                  <CardTitle className="text-base mt-3">{tool.name}</CardTitle>
                  {tool.description && (
                    <CardDescription className="line-clamp-2 text-sm">
                      {tool.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pt-0 mt-auto">
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLocation(`/admin/tools/${tool.id}`);
                    }}
                  >
                    Open
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
