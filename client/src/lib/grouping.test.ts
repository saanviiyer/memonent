import { describe, it, expect } from "vitest";
import { tokenize, groupNotes } from "./grouping";
import type { Note } from "../types";

function note(id: string, title: string, body: string, tags: string[] = []): Note {
  return {
    id,
    title,
    body,
    tags,
    createdAt: "2026-08-16T12:00:00.000Z",
    updatedAt: "2026-08-16T12:00:00.000Z",
    remind: false,
    dueAt: null,
    notifiedAt: null,
  };
}

// Which group an id landed in, as a set of its fellow member ids.
function groupOf(groups: ReturnType<typeof groupNotes>, id: string): Set<string> {
  const g = groups.find((x) => x.noteIds.includes(id));
  return new Set(g ? g.noteIds : []);
}

describe("tokenize", () => {
  it("drops stopwords and short words, lowercases, dedupes", () => {
    const t = tokenize({ title: "The Coffee", body: "coffee is a good Bean bean" });
    expect(t.has("coffee")).toBe(true);
    expect(t.has("bean")).toBe(true);
    expect(t.has("the")).toBe(false); // stopword
    expect(t.has("is")).toBe(false); // stopword + short
  });
});

describe("groupNotes: content similarity", () => {
  const notes = [
    note("coffeeA", "Espresso dialing in", "espresso grind coffee ratio dose extraction"),
    note("coffeeB", "Coffee grinder", "grinder burr coffee espresso grind setting"),
    note("reactA", "React hooks", "react hooks usestate useeffect component render"),
    note("reactB", "TypeScript with React", "react typescript component props hooks types"),
    note("grocery", "Grocery list", "milk eggs bread butter"),
  ];
  const groups = groupNotes(notes);

  it("forms three clusters", () => {
    expect(groups.length).toBe(3);
  });

  it("clusters the two coffee notes together", () => {
    expect(groupOf(groups, "coffeeA")).toEqual(new Set(["coffeeA", "coffeeB"]));
  });

  it("clusters the two react notes together", () => {
    expect(groupOf(groups, "reactA")).toEqual(new Set(["reactA", "reactB"]));
  });

  it("keeps the unrelated grocery note on its own", () => {
    expect(groupOf(groups, "grocery")).toEqual(new Set(["grocery"]));
  });

  it("does not mix coffee and react into one cluster", () => {
    expect(groupOf(groups, "coffeeA").has("reactA")).toBe(false);
  });

  it("gives each cluster a non-empty label", () => {
    for (const g of groups) expect(g.label.length).toBeGreaterThan(0);
  });
});

describe("groupNotes: tag boost", () => {
  it("groups notes that share a tag even with little word overlap", () => {
    const notes = [
      note("x", "Launch idea", "ship the thing soon", ["work"]),
      note("y", "Quiet reflection", "a calm evening walk", ["work"]),
      note("z", "Dinner", "pasta tomatoes basil garlic", ["food"]),
    ];
    const groups = groupNotes(notes);
    expect(groupOf(groups, "x")).toEqual(new Set(["x", "y"]));
    expect(groupOf(groups, "z")).toEqual(new Set(["z"]));
  });
});

describe("groupNotes: edge cases", () => {
  it("returns no groups for no notes", () => {
    expect(groupNotes([])).toEqual([]);
  });
  it("returns a single group for a single note", () => {
    const groups = groupNotes([note("solo", "Alone", "just me here")]);
    expect(groups.length).toBe(1);
    expect(groups[0].noteIds).toEqual(["solo"]);
  });
});
