import { useState, useEffect } from "react";

/**
 * Applies document-level content protection:
 * - Disables text selection across the viewport (body class `select-none`).
 * - Suppresses the browser context menu on right-click, exempting
 *   <input>, <textarea>, and <select> so editing still works.
 *
 * Returns `showProtectedToast` so the caller can render a brief feedback toast.
 * Cleans up on unmount, so the admin panel is never affected.
 */
export function useContentProtection() {
  const [showProtectedToast, setShowProtectedToast] = useState(false);

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
      setShowProtectedToast(true);
      setTimeout(() => setShowProtectedToast(false), 2000);
    }

    document.addEventListener("contextmenu", handleContextMenu);

    return () => {
      document.body.classList.remove("select-none");
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);

  return { showProtectedToast };
}
