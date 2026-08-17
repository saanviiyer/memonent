import { useState } from "react";
import type { Note, NoteInput } from "../types";
import { looksLikeBullets } from "../lib/bullets";
import { relativeTime, dueLabel, toLocalInput, fromLocalInput } from "../lib/format";
import { BellIcon, EditIcon, SparkIcon, TrashIcon } from "./Icons";
import NoteEditor from "./NoteEditor";

interface Props {
  note: Note;
  onUpdate: (id: string, patch: Partial<NoteInput>) => void;
  onDelete: (id: string) => void;
  onToggleRemind: (id: string, remind: boolean) => void;
  onSetDue: (id: string, dueAt: string | null) => void;
  onExpand: (note: Note) => void;
  onTagClick?: (tag: string) => void;
}

export default function NoteCard({
  note,
  onUpdate,
  onDelete,
  onToggleRemind,
  onSetDue,
  onExpand,
  onTagClick,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [showDue, setShowDue] = useState(false);
  const canExpand = looksLikeBullets(note.body);

  if (editing) {
    return (
      <NoteEditor
        initial={note}
        autoFocus
        onCancel={() => setEditing(false)}
        onSave={(input) => {
          onUpdate(note.id, input);
          setEditing(false);
        }}
        onExpand={() => onExpand(note)}
      />
    );
  }

  return (
    <article className="group rounded-2xl border border-sage-200 bg-white p-4 shadow-sm transition hover:border-sage-300 dark:border-sage-800 dark:bg-sage-900/40 dark:hover:border-sage-700">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {note.title && (
            <h3 className="truncate text-lg font-medium leading-snug">{note.title}</h3>
          )}
          <p className="mt-1 whitespace-pre-wrap break-words leading-relaxed text-sage-800 dark:text-sage-200">
            {note.body || <span className="italic text-sage-400">No body</span>}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
          {canExpand && (
            <IconBtn label="Expand bullets to prose" onClick={() => onExpand(note)}>
              <SparkIcon />
            </IconBtn>
          )}
          <IconBtn label="Edit" onClick={() => setEditing(true)}>
            <EditIcon />
          </IconBtn>
          <IconBtn
            label={note.remind ? "Unflag reminder" : "Remind me of this later"}
            active={note.remind}
            onClick={() => {
              const next = !note.remind;
              onToggleRemind(note.id, next);
              if (next) setShowDue(true);
            }}
          >
            <BellIcon />
          </IconBtn>
          <IconBtn label="Delete" onClick={() => setConfirming(true)}>
            <TrashIcon />
          </IconBtn>
        </div>
      </div>

      {note.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {note.tags.map((t) => (
            <button
              key={t}
              onClick={() => onTagClick?.(t)}
              className="rounded-full bg-sage-100 px-2.5 py-0.5 text-xs text-sage-700 transition hover:bg-sage-200 dark:bg-sage-800 dark:text-sage-300 dark:hover:bg-sage-700"
            >
              {t}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-sage-500 dark:text-sage-400">
        <span>{relativeTime(note.updatedAt)}</span>
        {note.remind && (
          <button
            onClick={() => setShowDue((s) => !s)}
            className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-amber-800 transition hover:bg-amber-200 dark:bg-amber-500/20 dark:text-amber-300"
          >
            <BellIcon width={12} height={12} />
            {note.dueAt ? dueLabel(note.dueAt) : "reminder set"}
          </button>
        )}
      </div>

      {showDue && note.remind && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-sage-50 p-3 text-sm dark:bg-sage-900/60">
          <label className="text-sage-600 dark:text-sage-300">Remind me at</label>
          <input
            type="datetime-local"
            value={toLocalInput(note.dueAt)}
            onChange={(e) => onSetDue(note.id, fromLocalInput(e.target.value))}
            className="rounded-lg border border-sage-200 bg-white px-2 py-1 dark:border-sage-700 dark:bg-sage-900"
          />
          {note.dueAt && (
            <button
              onClick={() => onSetDue(note.id, null)}
              className="text-sage-500 underline-offset-2 hover:underline"
            >
              clear
            </button>
          )}
        </div>
      )}

      {confirming && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm dark:bg-red-500/10">
          <span className="text-red-700 dark:text-red-300">Delete this memo?</span>
          <button
            onClick={() => onDelete(note.id)}
            className="rounded-full bg-red-600 px-3 py-1 text-white transition hover:bg-red-700"
          >
            Delete
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="rounded-full px-3 py-1 text-sage-600 hover:bg-sage-100 dark:text-sage-300 dark:hover:bg-sage-800"
          >
            Keep
          </button>
        </div>
      )}
    </article>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  active,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`rounded-lg p-1.5 transition hover:bg-sage-100 dark:hover:bg-sage-800 ${
        active
          ? "text-amber-600 dark:text-amber-400"
          : "text-sage-500 dark:text-sage-400"
      }`}
    >
      {children}
    </button>
  );
}
