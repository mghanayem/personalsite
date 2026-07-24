import { useState, useEffect, useRef } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

interface ModuleMeta {
  id: number;
  name: string;
  visibility: string;
}

export default function AdminTool({ params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10);
  const [, setLocation] = useLocation();
  const [mod, setMod] = useState<ModuleMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<"en" | "ar">("en");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Fetch module metadata and verify it is admin_only
  useEffect(() => {
    if (isNaN(id)) { setLocation("/admin/modules"); return; }
    fetch(`/api/modules/${id}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("not found");
        return r.json() as Promise<ModuleMeta>;
      })
      .then((m) => {
        if (m.visibility !== "admin_only") {
          setLocation("/admin/modules");
          return;
        }
        setMod(m);
      })
      .catch(() => setLocation("/admin/modules"))
      .finally(() => setLoading(false));
  }, [id, setLocation]);

  // Resize listener — mirrors PublicLayout's global listener, scoped to this page
  useEffect(() => {
    const ownOrigin = window.location.origin;

    function onMessage(e: MessageEvent) {
      if (e.origin !== ownOrigin) return;
      const data = e.data as { type?: unknown; height?: unknown };
      const isResizeMsg =
        (data?.type === "module-resize" || data?.type === "resize") &&
        typeof data.height === "number" &&
        data.height > 0;
      if (!isResizeMsg) return;
      if (iframeRef.current && iframeRef.current.contentWindow === e.source) {
        iframeRef.current.style.height = `${Math.ceil(data.height as number)}px`;
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-24">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!mod) return null; // redirecting

  const src = `/api/modules/${id}/content?lang=${lang}&admin=1`;

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Page heading + language toggle */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-bold">{mod.name}</h1>
          <div className="flex items-center gap-1 text-sm">
            <button
              onClick={() => setLang("en")}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                lang === "en"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLang("ar")}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                lang === "ar"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              AR
            </button>
          </div>
        </div>

        {/* Module iframe */}
        <div className="rounded-xl border border-border overflow-hidden">
          <iframe
            key={`admin-tool-${id}-${lang}`}
            ref={iframeRef}
            data-module-id={id}
            src={src}
            sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-downloads allow-popups"
            style={{ width: "100%", border: "none", display: "block", minHeight: 200 }}
            title={mod.name}
          />
        </div>
      </div>
    </AdminLayout>
  );
}
