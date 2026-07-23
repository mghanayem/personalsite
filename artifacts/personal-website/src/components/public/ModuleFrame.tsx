import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/lib/i18n";

interface ModuleFrameProps {
  moduleId: number;
  /**
   * Ignored — kept for call-site compatibility.
   * The iframe's minimum height is always 100 px; dynamic height is
   * driven by the global module-resize listener in PublicLayout.
   */
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
 * Resize handling:
 *   Height is NOT managed here. PublicLayout registers a single global
 *   window.message listener that handles { type: "module-resize", height: number }
 *   for all module iframes at once, writing directly to each iframe's style.height.
 *   The `data-module-id` attribute is required so that listener can identify this
 *   iframe by its contentWindow.
 */
export function ModuleFrame({ moduleId }: ModuleFrameProps) {
  const { lang } = useLanguage();
  const [srcdoc, setSrcdoc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch the module HTML content, inject the current language, then set as srcDoc.
  //
  // Why inject rather than use a query param?
  // The iframe renders via srcDoc, so its document URL is "about:srcdoc" — query
  // params on the fetch URL are never visible inside the iframe. Instead, we prepend
  // a one-line bootstrap <script> that sets window.__lang before any module code runs.
  // Modules read the language with: const lang = window.__lang; // "ar" | "en"
  //
  // Adding lang to the dependency array means a language switch re-fetches and
  // re-injects with the updated value automatically — no per-module setup needed.
  useEffect(() => {
    setSrcdoc(null);
    setError(null);

    const controller = new AbortController();
    fetch(`/api/modules/${moduleId}/content`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((html) => {
        // Prepend bootstrap before any module HTML so window.__lang is always set
        // before any inline scripts in the module body execute.
        const bootstrap = `<script>window.__lang="${lang}";</script>`;
        setSrcdoc(bootstrap + html);
      })
      .catch((err: Error) => {
        if (err.name !== "AbortError") setError(err.message);
      });

    return () => controller.abort();
  }, [moduleId, lang]);

  if (error) {
    return (
      <div className="w-full py-6 flex items-center justify-center text-sm text-muted-foreground border border-dashed rounded-lg">
        Module failed to load ({error})
      </div>
    );
  }

  if (!srcdoc) {
    // Skeleton placeholder — min-height keeps it from collapsing to 0 while loading
    return (
      <div
        style={{ minHeight: 100 }}
        className="w-full animate-pulse bg-muted/30 rounded-lg"
      />
    );
  }

  return (
    <iframe
      data-module-id={moduleId}
      srcDoc={srcdoc}
      sandbox="allow-scripts"
      style={{ width: "100%", border: "none", display: "block", minHeight: 100 }}
      title={`Module ${moduleId}`}
    />
  );
}
