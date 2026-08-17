import type { Note, NoteInput } from "../types";
import NoteCard from "./NoteCard";
import { BellIcon } from "./Icons";

interface Props {
  notes: Note[];
  onUpdate: (id: string, patch: Partial<NoteInput>) => void;
  onDelete: (id: string) => void;
  onToggleRemind: (id: string, remind: boolean) => void;
  onSetDue: (id: string, dueAt: string | null) => void;
  onExpand: (note: Note) => void;
}

// Flagged notes, ordered so that those with the soonest due date come first, then
// dateless flags, then anything already past.
function order(notes: Note[]): Note[] {
  const now = Date.now();
  return [...notes].sort((a, b) => {
    const bucket = (n: Note) => {
      if (!n.dueAt) return 1; // no date: middle
      return new Date(n.dueAt).getTime() >= now ? 0 : 2; // upcoming, then overdue
    };
    const ba = bucket(a);
    const bb = bucket(b);
    if (ba !== bb) return ba - bb;
    if (a.dueAt && b.dueAt) return a.dueAt < b.dueAt ? -1 : 1;
    return a.updatedAt < b.updatedAt ? 1 : -1;
  });
}

export default function Reminders({
  notes,
  onUpdate,
  onDelete,
  onToggleRemind,
  onSetDue,
  onExpand,
}: Props) {
  const flagged = order(notes.filter((n) => n.remind));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-medium">Reminders</h2>
        <p className="text-sm text-sage-500 dark:text-sage-400">
          Memos you flagged to come back to. Add a due time for a nudge while the app is
          open.
        </p>
      </div>

      {flagged.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-sage-300 py-16 text-center text-sage-500 dark:border-sage-700">
          <BellIcon className="mx-auto mb-2 text-sage-400" width={24} height={24} />
          <p>Nothing flagged yet.</p>
          <p className="mt-1 text-sm text-sage-400">
            Tap the bell on any memo to remind yourself later.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {flagged.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onToggleRemind={onToggleRemind}
              onSetDue={onSetDue}
              onExpand={onExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}
