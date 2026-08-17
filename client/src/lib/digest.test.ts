import { describe, it, expect } from "vitest";
import { rangeFor, inRange, notesInRange } from "./digest";
import type { Note } from "../types";

const NOW = new Date("2026-08-16T12:00:00.000Z");

function note(id: string, hoursAgo: number): Note {
  return {
    id,
    title: `note ${id}`,
    body: "body",
    tags: [],
    createdAt: new Date(NOW.getTime() - hoursAgo * 3600 * 1000).toISOString(),
    updatedAt: new Date(NOW.getTime() - hoursAgo * 3600 * 1000).toISOString(),
    remind: false,
    dueAt: null,
    notifiedAt: null,
  };
}

describe("rangeFor", () => {
  it("daily window is the last 24 hours", () => {
    const r = rangeFor("day", NOW);
    expect(r.end.getTime()).toBe(NOW.getTime());
    expect(NOW.getTime() - r.start.getTime()).toBe(24 * 3600 * 1000);
  });
  it("weekly window is the last 7 days", () => {
    const r = rangeFor("week", NOW);
    expect(NOW.getTime() - r.start.getTime()).toBe(7 * 24 * 3600 * 1000);
  });
});

describe("inRange", () => {
  it("includes a note from 2 hours ago in the daily window", () => {
    expect(inRange(note("a", 2), rangeFor("day", NOW))).toBe(true);
  });
  it("excludes a note from 30 hours ago from the daily window", () => {
    expect(inRange(note("b", 30), rangeFor("day", NOW))).toBe(false);
  });
  it("rejects an unparseable timestamp", () => {
    expect(inRange({ createdAt: "not a date" }, rangeFor("week", NOW))).toBe(false);
  });
});

describe("notesInRange", () => {
  const notes = [
    note("recent", 1), // in day + week
    note("today", 10), // in day + week
    note("threeDays", 72), // in week only
    note("lastMonth", 24 * 40), // in neither
  ];

  it("daily keeps only notes from the last 24 hours", () => {
    const ids = notesInRange(notes, "day", NOW).map((n) => n.id);
    expect(ids).toEqual(["recent", "today"]);
  });

  it("weekly keeps notes from the last 7 days", () => {
    const ids = notesInRange(notes, "week", NOW).map((n) => n.id);
    expect(ids.sort()).toEqual(["recent", "threeDays", "today"]);
  });

  it("returns newest first", () => {
    const ids = notesInRange(notes, "week", NOW).map((n) => n.id);
    expect(ids[0]).toBe("recent");
  });

  it("returns nothing when no note is in range", () => {
    expect(notesInRange([note("old", 1000)], "day", NOW)).toEqual([]);
  });
});
