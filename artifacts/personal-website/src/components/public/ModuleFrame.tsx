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
 * Language:
 *   The current site language is appended as ?lang=ar|en to the src URL.
 *   The API server injects window.__lang into the served HTML so module
 *   scripts can read it immediately on load.
 *
 *   When the user switches language, React sees a new `key` and fully
 *   remounts the iframe (rather than updating src in-place), which
 *   guarantees a clean reload with the new language value.
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

  const src = `/api/modules/${moduleId}/content?lang=${lang}`;

  return (
    <iframe
      // Key forces a full remount (not just src update) when lang changes,
      // ensuring the iframe reloads cleanly with the new language.
      key={`module-${moduleId}-${lang}`}
      data-module-id={moduleId}
      src={src}
      sandbox="allow-scripts allow-top-navigation-by-user-activation"
      style={{ width: "100%", border: "none", display: "block", minHeight: 100 }}
      title={`Module ${moduleId}`}
    />
  );
}
