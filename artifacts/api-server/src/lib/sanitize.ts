/**
 * Server-side HTML sanitization using the `xss` package.
 * Applied on the write path to prevent stored XSS.
 */
import xss, { IFilterXSSOptions } from "xss";

/** Restrictive allowlist for section data (no layout elements). */
const sectionOptions: IFilterXSSOptions = {
  whiteList: {
    a: ["href", "title", "target"],
    b: [], i: [], em: [], strong: [], u: [],
    p: [], br: [],
    ul: [], ol: [], li: [],
    h1: [], h2: [], h3: [], h4: [], h5: [], h6: [],
    blockquote: [], code: [], pre: [],
    span: [],
  },
  onIgnoreTagAttr: () => "",
  stripIgnoreTagBody: ["script", "style", "iframe", "object", "embed"],
};

/** Permissive allowlist for blog post HTML content (allows layout, images, tables).
 *
 * Security notes:
 * - We do NOT override `safeAttrValue` — the xss library's built-in default
 *   handles encoded/variant javascript: URLs, data: URIs, non-http(s) protocols,
 *   and style-based vectors far more robustly than any hand-rolled check.
 * - Dangerous tags (script, style, iframe, object, embed, form) are stripped,
 *   body content included.
 * - The `onTagAttr` hook forces rel="noopener noreferrer" on all links without
 *   weakening any attribute value checks.
 */
const blogOptions: IFilterXSSOptions = {
  whiteList: {
    a: ["href", "title", "target", "rel"],
    b: [], i: [], em: [], strong: [], u: [], s: [], mark: [], small: [],
    p: ["style"], div: ["style", "class"], section: ["class"], article: [],
    span: ["style", "class"], br: [], hr: [],
    ul: ["style"], ol: ["style"], li: [],
    h1: [], h2: [], h3: [], h4: [], h5: [], h6: [],
    blockquote: [], code: [], pre: [], kbd: [],
    img: ["src", "alt", "title", "width", "height", "style", "loading"],
    figure: ["class", "style"], figcaption: [],
    table: ["class", "style"], thead: [], tbody: [], tfoot: [],
    tr: [], th: ["scope", "style", "colspan", "rowspan"],
    td: ["style", "colspan", "rowspan"],
    sub: [], sup: [], abbr: ["title"],
  },
  // Force safe rel on all links to prevent tab-napping
  onTagAttr: (tag, name, value) => {
    if (tag === "a" && name === "rel") return `rel="noopener noreferrer"`;
    if (tag === "a" && name === "target") return `target="_blank"`;
    return undefined; // fall through to default handling (including safeAttrValue)
  },
  stripIgnoreTagBody: ["script", "style", "iframe", "object", "embed", "form"],
};

export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== "string") return "";
  return xss(html, sectionOptions);
}

export function sanitizeBlogHtml(html: string): string {
  if (!html || typeof html !== "string") return "";
  return xss(html, blogOptions);
}

/**
 * Recursively sanitize all string values in a plain object.
 * Used to sanitize section `data` payloads before persistence.
 */
export function sanitizeSectionData(data: unknown): unknown {
  if (typeof data === "string") return sanitizeHtml(data);
  if (Array.isArray(data)) return data.map(sanitizeSectionData);
  if (data !== null && typeof data === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      result[key] = sanitizeSectionData(value);
    }
    return result;
  }
  return data;
}
