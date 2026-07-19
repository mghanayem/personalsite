/**
 * Estimates reading time in minutes for HTML content.
 * Strips tags, counts words, divides by ~200 wpm. Returns minimum 1.
 */
export function getReadingTime(html: string): number {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const words = text.split(" ").filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}
