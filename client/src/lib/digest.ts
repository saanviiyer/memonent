// Pure date-range logic for digests. The Digests view uses these to pick which notes
// fall in the daily or weekly window before sending them to the server for synthesis.
// Kept free of I/O so it is easy to unit test.

import type { DigestPeriod, Note } from "../types";

export interface Range {
  start: Date;
  end: Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// The window for a period, ending at `now`. Daily looks back 24 hours; weekly looks
// back 7 days. Rolling windows keep the behavior intuitive at any time of day.
export function rangeFor(period: DigestPeriod, now: Date = new Date()): Range {
  const span = period === "week" ? 7 * DAY_MS : DAY_MS;
  return { start: new Date(now.getTime() - span), end: new Date(now.getTime()) };
}

// True when a note was created within [start, end].
export function inRange(note: Pick<Note, "createdAt">, range: Range): boolean {
  const t = new Date(note.createdAt).getTime();
  if (Number.isNaN(t)) return false;
  return t >= range.start.getTime() && t <= range.end.getTime();
}

// The notes written within the period, newest first.
export function notesInRange(
  notes: Note[],
  period: DigestPeriod,
  now: Date = new Date()
): Note[] {
  const range = rangeFor(period, now);
  return notes
    .filter((n) => inRange(n, range))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}
