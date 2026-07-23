import { useEffect } from "react";

/**
 * Applies document-level content protection silently:
 * - Disables text selection across the viewport (body class `select-none`).
 * - Suppresses the browser context menu on right-click, exempting
 *   <input>, <textarea>, and <select> so editing still works.
 * Cleans up on unmount, so the admin panel is never affected.
 */
export function useContentProtection() {
  useEffect(() => {
    document.body.classList.add("select-none");

    function handleContextMenu(e: MouseEvent) {
      let node: HTMLElement | null = e.target as HTMLElement;
      while (node) {
        const tag = node.tagName?.toLowerCase();
        if (tag === "input" || tag === "textarea" || tag === "select") return;
        if (node === document.body) break;
        node = node.parentElement;
      }
      e.preventDefault();
    }

    document.addEventListener("contextmenu", handleContextMenu);

    return () => {
      document.body.classList.remove("select-none");
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);
}
