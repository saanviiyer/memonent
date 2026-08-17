// AI features for memonent. Uses the Anthropic SDK when ANTHROPIC_API_KEY is set;
// otherwise every feature returns a realistic result built from the user's own notes,
// so the whole app is fully usable with zero setup.
//
// Three features live here:
//   1. generateDigest(period, notes)  -> a daily or weekly digest of what you wrote
//   2. labelGroups(groups)            -> short, human labels for note clusters
//   3. expandBullets(title, bullets)  -> terse bullets rewritten as clean prose
import Anthropic from "@anthropic-ai/sdk";

const API_KEY = process.env.ANTHROPIC_API_KEY;
export const MOCK_MODE = !API_KEY;
export const MODEL = "claude-sonnet-5";

const client = MOCK_MODE ? null : new Anthropic({ apiKey: API_KEY });

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------
const STOP = new Set(
  ("a an the of and or to in for with on at as is are be by we our this that from into using also can new but not you your i it its their they them there here about over under out up down off then than so if when while do does did has have had will would should could may might must just really very more most some any all each every one two three".split(
    " "
  ))
);

function topTerms(texts, n = 6) {
  const freq = new Map();
  for (const t of texts) {
    const words = String(t || "").toLowerCase().match(/[a-z][a-z0-9+.#'-]{2,}/g) || [];
    const seen = new Set();
    for (const w of words) {
      if (STOP.has(w) || seen.has(w)) continue;
      seen.add(w);
      freq.set(w, (freq.get(w) || 0) + 1);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([t]) => t);
}

function firstSentence(body = "", max = 140) {
  const clean = String(body).replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const dot = clean.search(/[.!?]\s/);
  const s = dot > 0 ? clean.slice(0, dot + 1) : clean;
  return s.length > max ? s.slice(0, max).trim() + "..." : s;
}

function titleOf(note) {
  return (note.title && note.title.trim()) || firstSentence(note.body, 60) || "Untitled note";
}

// ---------------------------------------------------------------------------
// 1. DIGEST
// ---------------------------------------------------------------------------
const DIGEST_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    themes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          label: { type: "string" },
          note: { type: "string" },
        },
        required: ["label", "note"],
      },
    },
    highlights: { type: "array", items: { type: "string" } },
    thinkingAbout: { type: "array", items: { type: "string" } },
  },
  required: ["summary", "themes", "highlights", "thinkingAbout"],
};

const DIGEST_SYSTEM = `You are memonent's quiet daily companion. You are given a set of short notes and
memos a person wrote in a time window. Produce a calm, grounded digest that reflects back what they
were thinking about.

Rules:
- Ground every statement in the provided notes. Never invent notes, facts, or details.
- Refer to notes by their exact titles when useful.
- Be warm but concise. This is a gentle reflection, not a report.
- Do not use em dashes anywhere in your output.`;

function buildDigestContext(period, notes) {
  const lines = [];
  lines.push(`Window: ${period === "week" ? "the past week" : "the past day"}`);
  lines.push(`Notes written: ${notes.length}`);
  notes.forEach((n, i) => {
    lines.push(`\n[${i + 1}] ${titleOf(n)}`);
    if (n.tags && n.tags.length) lines.push(`Tags: ${n.tags.join(", ")}`);
    if (n.body) lines.push(`Body: ${String(n.body).slice(0, 900)}`);
  });
  return lines.join("\n");
}

function mockDigest(period, notes) {
  const label = period === "week" ? "week" : "day";
  if (!notes.length) {
    return {
      summary: `You did not write anything in the past ${label}. A blank page is a fine place to start whenever you are ready.`,
      themes: [],
      highlights: [],
      thinkingAbout: [],
    };
  }

  const terms = topTerms(notes.map((n) => `${n.title || ""} ${n.body || ""}`), 6);
  const tagCounts = new Map();
  for (const n of notes) for (const t of n.tags || []) tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
  const topTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);

  const summary =
    `Over the past ${label} you wrote ${notes.length} note${notes.length === 1 ? "" : "s"}. ` +
    (terms.length ? `Recurring words include ${terms.slice(0, 4).join(", ")}. ` : "") +
    (topTags.length ? `Most of it sits under ${topTags.slice(0, 3).join(", ")}. ` : "") +
    `The thread running through them is a mix of ideas you were holding onto and things you wanted to remember.`;

  // One theme per top tag, else per top term, each anchored to a real note.
  const themeKeys = (topTags.length ? topTags : terms).slice(0, 3);
  const themes = themeKeys.map((key) => {
    const match =
      notes.find((n) => (n.tags || []).includes(key)) ||
      notes.find((n) => `${n.title || ""} ${n.body || ""}`.toLowerCase().includes(key)) ||
      notes[0];
    return {
      label: key.charAt(0).toUpperCase() + key.slice(1),
      note: titleOf(match),
    };
  });

  const highlights = notes
    .slice(0, 3)
    .map((n) => {
      const s = firstSentence(n.body, 120);
      return s ? `${titleOf(n)}: ${s}` : titleOf(n);
    });

  const thinkingAbout = (terms.length ? terms : topTags).slice(0, 5);

  return { summary, themes, highlights, thinkingAbout };
}

export async function generateDigest(period, notes) {
  const list = Array.isArray(notes) ? notes : [];
  const norm = period === "week" ? "week" : "day";

  if (MOCK_MODE) {
    return { mockMode: true, period: norm, count: list.length, digest: mockDigest(norm, list) };
  }
  if (!list.length) {
    return { mockMode: false, period: norm, count: 0, digest: mockDigest(norm, list) };
  }

  const context = buildDigestContext(norm, list);
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: DIGEST_SYSTEM,
    thinking: { type: "disabled" },
    output_config: { format: { type: "json_schema", schema: DIGEST_SCHEMA } },
    messages: [
      {
        role: "user",
        content: `Write a ${norm === "week" ? "weekly" : "daily"} digest of these notes and return the structured result.\n\n${context}`,
      },
    ],
  });

  const text = message.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  let digest;
  try {
    digest = JSON.parse(text);
  } catch {
    // Fall back to a grounded mock rather than failing the request.
    digest = mockDigest(norm, list);
  }
  return { mockMode: false, period: norm, count: list.length, digest };
}

// ---------------------------------------------------------------------------
// 2. GROUP LABELS
// Clustering itself is done in pure client code. Here the model (or the mock)
// only turns each cluster's shared terms + sample titles into a short label.
// ---------------------------------------------------------------------------
const LABELS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    labels: { type: "array", items: { type: "string" } },
  },
  required: ["labels"],
};

const LABELS_SYSTEM = `You name clusters of a person's notes. For each group you are given its shared
keywords and a few sample note titles. Return one short label per group (two to four words,
Title Case). Ground each label in the group's content. Do not use em dashes.`;

function mockLabel(group) {
  const terms = (group.terms || []).filter(Boolean);
  if (terms.length >= 2) {
    return `${cap(terms[0])} and ${cap(terms[1])}`;
  }
  if (terms.length === 1) return cap(terms[0]);
  const t = (group.titles || [])[0];
  return t ? shortenTitle(t) : "Assorted Notes";
}

function cap(s) {
  return String(s || "").charAt(0).toUpperCase() + String(s || "").slice(1);
}
function shortenTitle(t) {
  const words = String(t).split(/\s+/).slice(0, 4);
  return words.map(cap).join(" ");
}

export async function labelGroups(groups) {
  const list = Array.isArray(groups) ? groups : [];
  if (MOCK_MODE || !list.length) {
    return { mockMode: MOCK_MODE, labels: list.map(mockLabel) };
  }

  const context = list
    .map(
      (g, i) =>
        `Group ${i + 1}: keywords [${(g.terms || []).join(", ")}]; sample titles [${(g.titles || [])
          .slice(0, 4)
          .join(" | ")}]`
    )
    .join("\n");

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    system: LABELS_SYSTEM,
    thinking: { type: "disabled" },
    output_config: { format: { type: "json_schema", schema: LABELS_SCHEMA } },
    messages: [
      {
        role: "user",
        content: `Return one short label per group, in order.\n\n${context}`,
      },
    ],
  });

  const text = message.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  let labels;
  try {
    labels = JSON.parse(text).labels;
  } catch {
    labels = list.map(mockLabel);
  }
  if (!Array.isArray(labels) || labels.length !== list.length) {
    labels = list.map(mockLabel);
  }
  return { mockMode: false, labels };
}

// ---------------------------------------------------------------------------
// 3. BULLET TO PROSE
// ---------------------------------------------------------------------------
const EXPAND_SYSTEM = `You expand a person's terse bullet notes into a thorough, clean, well-structured
explanation in plain prose. Keep every point they made, add the connective tissue and reasoning that
makes it read well, and organize it into clear paragraphs. Do not invent facts beyond a reasonable
reading of the bullets. Do not use em dashes. Return only the prose, with no preamble.`;

function mockExpand(title, bullets) {
  const points = (bullets || []).map((b) => String(b).trim()).filter(Boolean);
  if (!points.length) {
    return "There were no bullet points to expand. Add a few terse lines and try again.";
  }

  const heading = title && title.trim() ? title.trim() : "these notes";
  const intro =
    `The following expands ${heading} into a fuller explanation. ` +
    `You jotted down ${points.length} point${points.length === 1 ? "" : "s"}, and each one is drawn out below into a complete thought.`;

  const paras = points.map((p) => {
    const clean = p.replace(/\s+/g, " ").trim();
    const sentence = clean.charAt(0).toUpperCase() + clean.slice(1);
    const withStop = /[.!?]$/.test(sentence) ? sentence : sentence + ".";
    return `${withStop} This is worth keeping in view because it shapes how the rest of the picture fits together, and it is the kind of detail that is easy to lose if it stays a single line in a list.`;
  });

  const close =
    points.length > 1
      ? `Taken together, these points form a coherent whole: each one supports the others, and reading them as prose makes the connections between them clearer than the original list could.`
      : `Read on its own, this point is simple, but writing it out in full makes it easier to act on later.`;

  return [intro, ...paras, close].join("\n\n");
}

export async function expandBullets(title, bullets) {
  const points = (Array.isArray(bullets) ? bullets : []).map((b) => String(b).trim()).filter(Boolean);
  if (!points.length) {
    throw new Error("Provide at least one bullet point to expand.");
  }

  if (MOCK_MODE) {
    return { mockMode: true, prose: mockExpand(title, points) };
  }

  const listText = points.map((p) => `- ${p}`).join("\n");
  const header = title && title.trim() ? `Title: ${title.trim()}\n\n` : "";
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: EXPAND_SYSTEM,
    thinking: { type: "disabled" },
    messages: [
      {
        role: "user",
        content: `Expand these bullet notes into clean prose.\n\n${header}${listText}`,
      },
    ],
  });

  const prose = message.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  return { mockMode: false, prose: prose || mockExpand(title, points) };
}
