// Data-access abstraction. The entire UI talks to `repo` (a Repository) and never
// touches localStorage directly. To move persistence to Supabase later, implement this
// same interface against Postgres with row-level security and swap the export. No UI
// changes required. See the README "Supabase upgrade path".

import type { Note, NoteInput } from "../types";

export interface Repository {
  listNotes(): Note[];
  getNote(id: string): Note | undefined;
  addNote(input: NoteInput): Note;
  updateNote(id: string, patch: Partial<NoteInput>): void;
  deleteNote(id: string): void;

  // Reminders
  setRemind(id: string, remind: boolean): void;
  setDue(id: string, dueAt: string | null): void;
  markNotified(id: string): void;

  // Tags
  allTags(): string[];
}

const NOTES_KEY = "memonent.notes.v1";

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota / private-mode failures
  }
}

function cleanTags(tags: string[]): string[] {
  return Array.from(
    new Set((tags || []).map((t) => t.trim().toLowerCase()).filter(Boolean))
  );
}

class LocalStorageRepository implements Repository {
  private notes: Note[] = read<Note[]>(NOTES_KEY, []);

  private persist() {
    write(NOTES_KEY, this.notes);
  }

  listNotes() {
    return [...this.notes].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  }

  getNote(id: string) {
    return this.notes.find((n) => n.id === id);
  }

  addNote(input: NoteInput) {
    const now = new Date().toISOString();
    const note: Note = {
      id: uid(),
      title: (input.title || "").trim(),
      body: (input.body || "").trim(),
      tags: cleanTags(input.tags),
      createdAt: now,
      updatedAt: now,
      remind: false,
      dueAt: null,
      notifiedAt: null,
    };
    this.notes = [note, ...this.notes];
    this.persist();
    return note;
  }

  updateNote(id: string, patch: Partial<NoteInput>) {
    const n = this.getNote(id);
    if (!n) return;
    if (patch.title !== undefined) n.title = patch.title.trim();
    if (patch.body !== undefined) n.body = patch.body.trim();
    if (patch.tags !== undefined) n.tags = cleanTags(patch.tags);
    n.updatedAt = new Date().toISOString();
    this.persist();
  }

  deleteNote(id: string) {
    this.notes = this.notes.filter((n) => n.id !== id);
    this.persist();
  }

  setRemind(id: string, remind: boolean) {
    const n = this.getNote(id);
    if (!n) return;
    n.remind = remind;
    if (!remind) {
      n.dueAt = null;
      n.notifiedAt = null;
    }
    this.persist();
  }

  setDue(id: string, dueAt: string | null) {
    const n = this.getNote(id);
    if (!n) return;
    n.dueAt = dueAt;
    n.notifiedAt = null; // a new due time gets a fresh chance to notify
    if (dueAt) n.remind = true;
    this.persist();
  }

  markNotified(id: string) {
    const n = this.getNote(id);
    if (!n) return;
    n.notifiedAt = new Date().toISOString();
    this.persist();
  }

  allTags() {
    const set = new Set<string>();
    for (const n of this.notes) for (const t of n.tags) set.add(t);
    return [...set].sort((a, b) => a.localeCompare(b));
  }
}

// The single shared instance the UI imports.
export const repo: Repository = new LocalStorageRepository();
