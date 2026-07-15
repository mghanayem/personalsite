/**
 * Server-side HTML sanitization using the `xss` package.
 * Applied on the write path (section create/update) to prevent stored XSS.
 *
 * Allowlist: common formatting tags only — no scripts, no event handlers,
 * no javascript: URLs, no iframes.
 */
import xss, { IFilterXSSOptions } from "xss";

const options: IFilterXSSOptions = {
  whiteList: {
    a: ["href", "title", "target"],
    b: [],
    i: [],
    em: [],
    strong: [],
    u: [],
    p: [],
    br: [],
    ul: [],
    ol: [],
    li: [],
    h1: [],
    h2: [],
    h3: [],
    h4: [],
    h5: [],
    h6: [],
    blockquote: [],
    code: [],
    pre: [],
    span: [],
  },
  // Strip attributes not in the whitelist
  onIgnoreTagAttr: () => "",
  // Strip tags not in the whitelist entirely
  stripIgnoreTagBody: ["script", "style", "iframe", "object", "embed"],
};

export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== "string") return "";
  return xss(html, options);
}

/**
 * Recursively sanitize all string values in a plain object that could
 * contain HTML. Used to sanitize section `data` payloads before persistence.
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
