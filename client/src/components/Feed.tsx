import { useMemo, useState } from "react";
import type { Note, NoteInput } from "../types";
import NoteEditor from "./NoteEditor";
import NoteCard from "./NoteCard";
import { SearchIcon, CloseIcon } from "./Icons";

interface Props {
  notes: Note[];
  allTags: string[];
  onAdd: (input: NoteInput) => void;
  onUpdate: (id: string, patch: Partial<NoteInput>) => void;
  onDelete: (id: string) => void;
  onToggleRemind: (id: string, remind: boolean) => void;
  onSetDue: (id: string, dueAt: string | null) => void;
  onExpand: (note: Note) => void;
  onExpandDraft: (input: NoteInput) => void;
}

function matches(note: Note, q: string): boolean {
  if (!q) return true;
  const hay = `${note.title} ${note.body} ${note.tags.join(" ")}`.toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => hay.includes(term));
}

export default function Feed({
  notes,
  allTags,
  onAdd,
  onUpdate,
  onDelete,
  onToggleRemind,
  onSetDue,
  onExpand,
  onExpandDraft,
}: Props) {
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const visible = useMemo(() => {
    return notes.filter((n) => {
      if (activeTag && !n.tags.includes(activeTag)) return false;
      return matches(n, query);
    });
  }, [notes, query, activeTag]);

  return (
    <div className="space-y-5">
      <NoteEditor onSave={onAdd} onExpand={onExpandDraft} />

      {notes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-full border border-sage-200 bg-white px-3.5 py-2 dark:border-sage-800 dark:bg-sage-900/40">
            <SearchIcon className="shrink-0 text-sage-400" width={17} height={17} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your memos"
              className="min-w-0 flex-1 bg-transparent text-sm placeholder:text-sage-400 focus:outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="text-sage-400 hover:text-sage-600"
              >
                <CloseIcon width={15} height={15} />
              </button>
            )}
          </div>

          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <TagChip
                label="all"
                active={activeTag === null}
                onClick={() => setActiveTag(null)}
              />
              {allTags.map((t) => (
                <TagChip
                  key={t}
                  label={t}
                  active={activeTag === t}
                  onClick={() => setActiveTag(activeTag === t ? null : t)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState hasNotes={notes.length > 0} />
      ) : (
        <div className="space-y-3">
          {visible.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onToggleRemind={onToggleRemind}
              onSetDue={onSetDue}
              onExpand={onExpand}
              onTagClick={(t) => setActiveTag(t)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TagChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs transition ${
        active
          ? "bg-sage-600 text-white"
          : "bg-sage-100 text-sage-700 hover:bg-sage-200 dark:bg-sage-800 dark:text-sage-300 dark:hover:bg-sage-700"
      }`}
    >
      {label}
    </button>
  );
}

function EmptyState({ hasNotes }: { hasNotes: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-sage-300 py-16 text-center text-sage-500 dark:border-sage-700">
      {hasNotes ? (
        <p>No memos match your search.</p>
      ) : (
        <div className="space-y-1">
          <p className="text-base">Your memos live here.</p>
          <p className="text-sm text-sage-400">
            Write your first one above. Everything stays on this device.
          </p>
        </div>
      )}
    </div>
  );
}
