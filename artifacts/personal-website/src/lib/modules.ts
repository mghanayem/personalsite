import type { SectionWithImages, ModulePlacementPublic } from "@workspace/api-client-react";

type SectionItem = { kind: "section"; section: SectionWithImages };
type ModuleItem  = { kind: "module";  placement: ModulePlacementPublic };
type PageItem    = SectionItem | ModuleItem;

/**
 * Merges sections and module placements into a single ordered display list.
 *
 * Position encoding (sectionPosition field):
 *   "before:N"   → insert immediately before the section with sortOrder N
 *   "after:N"    → insert immediately after the section with sortOrder N
 *   "new_section"→ append at the end of the list
 *
 * Admin-only and inactive placements are never included (the public API
 * already filters them out, so this function operates on clean data).
 */
export function renderWithModules(
  sections: SectionWithImages[],
  placements: ModulePlacementPublic[],
): PageItem[] {
  // Start with visible sections sorted by sortOrder
  const sorted = [...sections]
    .filter((s) => s.isVisible)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const result: PageItem[] = sorted.map((s) => ({ kind: "section", section: s }));

  // Group placements by position type
  const beforeMap = new Map<number, ModulePlacementPublic[]>();
  const afterMap  = new Map<number, ModulePlacementPublic[]>();
  const tail: ModulePlacementPublic[] = [];

  for (const p of placements) {
    const pos = p.sectionPosition;
    if (pos.startsWith("before:")) {
      const n = parseInt(pos.slice(7), 10);
      if (!beforeMap.has(n)) beforeMap.set(n, []);
      beforeMap.get(n)!.push(p);
    } else if (pos.startsWith("after:")) {
      const n = parseInt(pos.slice(6), 10);
      if (!afterMap.has(n)) afterMap.set(n, []);
      afterMap.get(n)!.push(p);
    } else {
      // "new_section" and any unknown value → append at end
      tail.push(p);
    }
  }

  // Rebuild with insertions
  const merged: PageItem[] = [];
  for (const item of result) {
    if (item.kind === "section") {
      const so = item.section.sortOrder;
      // Insert "before:N" modules
      for (const p of beforeMap.get(so) ?? []) {
        merged.push({ kind: "module", placement: p });
      }
      merged.push(item);
      // Insert "after:N" modules
      for (const p of afterMap.get(so) ?? []) {
        merged.push({ kind: "module", placement: p });
      }
    } else {
      merged.push(item);
    }
  }

  // Append tail modules
  for (const p of tail) {
    merged.push({ kind: "module", placement: p });
  }

  return merged;
}
