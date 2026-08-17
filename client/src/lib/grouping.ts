// Pure similarity clustering for notes. No embeddings API: we tokenize each note,
// score pairwise similarity with Jaccard over content words plus a tag-overlap boost,
// and greedily assign notes to clusters above a threshold. The Groups view may then ask
// the LLM to refine each cluster's label, but the clustering itself is deterministic and
// fully testable here.

import type { Group, Note } from "../types";

const STOP = new Set(
  "a an the of and or to in for with on at as is are be by we our this that from into also can new but not you your it its their they them there here about over under out up down off then than so if when while do does did has have had will would should could may might must just really very more most some any all each every one".split(
    " "
  )
);

// Content tokens for a note: unique, lowercased, stopword-free words of length >= 3.
export function tokenize(note: Pick<Note, "title" | "body">): Set<string> {
  const text = `${note.title || ""} ${note.body || ""}`.toLowerCase();
  const words = text.match(/[a-z][a-z0-9+.#'-]{2,}/g) || [];
  const out = new Set<string>();
  for (const w of words) {
    if (!STOP.has(w)) out.add(w);
  }
  return out;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function sharedTags(a: string[], b: string[]): number {
  const setB = new Set(b);
  let n = 0;
  for (const t of a) if (setB.has(t)) n++;
  return n;
}

interface Prepared {
  note: Note;
  tokens: Set<string>;
}

// Similarity between two notes: word Jaccard, lifted when they share tags. Sharing a
// tag is a strong intent signal, so it guarantees at least a moderate similarity.
export function similarity(a: Prepared, b: Prepared): number {
  const j = jaccard(a.tokens, b.tokens);
  const tags = sharedTags(a.note.tags, b.note.tags);
  if (tags > 0) return Math.max(j, 0.5 + 0.1 * Math.min(tags, 3));
  return j;
}

// The most common content words across a set of notes, for a fallback label and to
// hand to the LLM as grouping context.
export function clusterTerms(prepared: Prepared[], n = 4): string[] {
  const freq = new Map<string, number>();
  for (const p of prepared) {
    for (const t of p.tokens) freq.set(t, (freq.get(t) || 0) + 1);
  }
  return [...freq.entries()]
    .filter(([, c]) => (prepared.length > 1 ? c >= 2 : true))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([t]) => t);
}

function fallbackLabel(terms: string[], prepared: Prepared[]): string {
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  if (terms.length >= 2) return `${cap(terms[0])} and ${cap(terms[1])}`;
  if (terms.length === 1) return cap(terms[0]);
  const title = prepared[0]?.note.title?.trim();
  if (title) return title.split(/\s+/).slice(0, 4).map(cap).join(" ");
  return "Assorted notes";
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export interface GroupResult extends Group {
  // Extra context the caller can send to the LLM to refine the label.
  titles: string[];
}

// Cluster notes by similarity. Greedy single-pass: each note joins the existing cluster
// it is most similar to (above `threshold`), else it opens a new cluster.
export function groupNotes(notes: Note[], threshold = 0.2): GroupResult[] {
  const prepared: Prepared[] = notes.map((note) => ({ note, tokens: tokenize(note) }));

  const clusters: Prepared[][] = [];
  for (const p of prepared) {
    let bestIdx = -1;
    let bestScore = threshold;
    for (let i = 0; i < clusters.length; i++) {
      // Similarity to a cluster = the best similarity to any of its members.
      let score = 0;
      for (const member of clusters[i]) {
        const s = similarity(p, member);
        if (s > score) score = s;
      }
      if (score >= bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0) clusters[bestIdx].push(p);
    else clusters.push([p]);
  }

  return clusters
    .map((members) => {
      const terms = clusterTerms(members);
      return {
        id: uid(),
        label: fallbackLabel(terms, members),
        terms,
        noteIds: members.map((m) => m.note.id),
        titles: members.map((m) => (m.note.title || "").trim()).filter(Boolean),
      };
    })
    // Larger, more meaningful clusters first.
    .sort((a, b) => b.noteIds.length - a.noteIds.length);
}
