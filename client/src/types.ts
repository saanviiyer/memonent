// Shared types for memonent.

// A single note / memo. Title is optional; body is the substance.
export interface Note {
  id: string;
  title: string;
  body: string;
  tags: string[];
  createdAt: string; // ISO
  updatedAt: string; // ISO
  remind: boolean; // flagged "remind me of this later"
  dueAt: string | null; // optional in-app due date (ISO), for reminders
  notifiedAt: string | null; // set once a due reminder has fired, to avoid repeats
}

// The fields a caller supplies when creating or editing a note.
export interface NoteInput {
  title: string;
  body: string;
  tags: string[];
}

export type DigestPeriod = "day" | "week";

// The structured digest returned by the server (or its mock).
export interface Digest {
  summary: string;
  themes: { label: string; note: string }[];
  highlights: string[];
  thinkingAbout: string[];
}

export interface DigestResult {
  mockMode: boolean;
  period: DigestPeriod;
  count: number;
  digest: Digest;
}

// A cluster of similar notes, computed in pure client code.
export interface Group {
  id: string;
  label: string; // may be refined by the LLM
  terms: string[]; // shared keywords that define the cluster
  noteIds: string[];
}
