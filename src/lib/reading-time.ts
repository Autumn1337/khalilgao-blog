/**
 * Estimate reading time for mixed Chinese/English prose.
 * Figures derived from ACM CHI 2004 — native readers hit
 * ~500 chars/min for Simplified Chinese and ~250 wpm for English.
 */
export function readingTime(body: string): number {
  if (!body) return 1;
  const zh = (body.match(/[一-鿿]/g) || []).length;
  const latin = body
    .replace(/[一-鿿]/g, ' ')
    .replace(/[^a-zA-Z0-9'\s-]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
  const minutes = zh / 500 + latin / 250;
  return Math.max(1, Math.round(minutes));
}
