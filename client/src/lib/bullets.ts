// Pure bullet parsing and detection. Powers the "expand bullets to prose" action:
// we detect whether a note reads like a bullet list, and split it into clean points.

// A line is a bullet if it starts with a common list marker: -, *, +, a middot,
// an en/em dash, or a number/letter followed by . or ).
const MARKER = /^\s*(?:[-*+•·–—]|\d{1,3}[.)]|[a-z][.)])\s+/i;

export function splitLines(text: string): string[] {
  return String(text || "").split(/\r?\n/);
}

// Does this single line look like a bullet?
export function isBulletLine(line: string): boolean {
  return MARKER.test(line);
}

// Strip the leading marker (and surrounding whitespace) from one line.
export function stripMarker(line: string): string {
  return String(line || "").replace(MARKER, "").trim();
}

// Extract the content of each bullet line, dropping blank and non-bullet lines.
// If the text has no markers at all, fall back to treating each non-empty line as a
// point, so a plain newline-separated list still expands sensibly.
export function parseBullets(text: string): string[] {
  const lines = splitLines(text);
  const marked = lines.filter(isBulletLine);
  if (marked.length > 0) {
    return marked.map(stripMarker).filter(Boolean);
  }
  return lines.map((l) => l.trim()).filter(Boolean);
}

// Heuristic: does this note read like a bullet list worth expanding?
// True when there are at least two marked bullet lines, or when a clear majority of the
// non-empty lines are bullets.
export function looksLikeBullets(text: string): boolean {
  const lines = splitLines(text);
  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  if (nonEmpty.length < 2) {
    // A single marked line still counts as a bullet list.
    return nonEmpty.length === 1 && isBulletLine(nonEmpty[0]);
  }
  const marked = nonEmpty.filter(isBulletLine).length;
  if (marked >= 2) return true;
  return marked / nonEmpty.length >= 0.6;
}
