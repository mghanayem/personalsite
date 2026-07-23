import { useEffect, useRef, useState } from "react";

interface ModuleFrameProps {
  moduleId: number;
  /** Minimum height in px before content loads */
  minHeight?: number;
}

/**
 * Renders a self-contained HTML module inside a sandboxed iframe.
 *
 * Security properties:
 *   sandbox="allow-scripts"   — module JS runs, but the module cannot:
 *     - read cookies or sessionStorage (no allow-same-origin)
 *     - submit forms that navigate the parent (no allow-forms)
 *     - open popups (no allow-popups)
 *     - navigate the parent page (no allow-top-navigation)
 *
 * postMessage listener:
 *   Accepts ONLY { type: "resize", height: number } from the module iframe.
 *   All other message types are silently ignored.
 *   To extend: add additional `type` cases inside the listener below,
 *   keeping the origin check (`e.source !== iframeEl.contentWindow`) in place.
 */
export function ModuleFrame({ moduleId, minHeight = 100 }: ModuleFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(minHeight);
  const [srcdoc, setSrcdoc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch the module HTML content and set it as srcdoc
  useEffect(() => {
    setSrcdoc(null);
    setError(null);
    setHeight(minHeight);

    const controller = new AbortController();
    fetch(`/api/modules/${moduleId}/content`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then(setSrcdoc)
      .catch((err: Error) => {
        if (err.name !== "AbortError") setError(err.message);
      });

    return () => controller.abort();
  }, [moduleId, minHeight]);

  // postMessage resize listener
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const iframeEl = iframeRef.current;
      if (!iframeEl) return;
      // Only accept messages from our specific iframe
      if (e.source !== iframeEl.contentWindow) return;

      const data = e.data as { type?: string; height?: number };

      // ── Handled message types ──────────────────────────────────────────────
      if (data?.type === "resize" && typeof data.height === "number" && data.height > 0) {
        setHeight(Math.ceil(data.height));
        return;
      }

      // ── EXTENSION POINT ───────────────────────────────────────────────────
      // Add more cases here when a specific module needs to send data out,
      // for example: if (data?.type === "navigate") { ... }
      // Keep the `e.source` check above so only this module's iframe is handled.
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  if (error) {
    return (
      <div className="w-full py-6 flex items-center justify-center text-sm text-muted-foreground border border-dashed rounded-lg">
        Module failed to load ({error})
      </div>
    );
  }

  if (!srcdoc) {
    return <div style={{ height }} className="w-full animate-pulse bg-muted/30 rounded-lg" />;
  }

  return (
    <iframe
      ref={iframeRef}
      srcDoc={srcdoc}
      sandbox="allow-scripts"
      style={{ width: "100%", height, border: "none", display: "block" }}
      title={`Module ${moduleId}`}
    />
  );
}
