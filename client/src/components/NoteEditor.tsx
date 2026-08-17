import { useEffect, useRef, useState } from "react";
import type { Note, NoteInput } from "../types";
import { looksLikeBullets } from "../lib/bullets";
import { SparkIcon } from "./Icons";

interface Props {
  initial?: Note;
  onSave: (input: NoteInput) => void;
  onCancel?: () => void;
  onExpand?: (input: NoteInput) => void; // offer bullet-to-prose from the editor
  autoFocus?: boolean;
}

function parseTagInput(s: string): string[] {
  return s
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

// A calm composer used both for the "new note" box on the feed and for editing.
export default function NoteEditor({
  initial,
  onSave,
  onCancel,
  onExpand,
  autoFocus,
}: Props) {
  const [title, setTitle] = useState(initial?.title || "");
  const [body, setBody] = useState(initial?.body || "");
  const [tags, setTags] = useState((initial?.tags || []).join(", "));
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus) bodyRef.current?.focus();
  }, [autoFocus]);

  const canSave = body.trim().length > 0 || title.trim().length > 0;
  const showExpand = onExpand && looksLikeBullets(body);

  function collect(): NoteInput {
    return { title: title.trim(), body: body.trim(), tags: parseTagInput(tags) };
  }

  function save() {
    if (!canSave) return;
    onSave(collect());
    if (!initial) {
      setTitle("");
      setBody("");
      setTags("");
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      save();
    }
  }

  return (
    <div className="rounded-2xl border border-sage-200 bg-white p-4 shadow-sm dark:border-sage-800 dark:bg-sage-900/40">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Title (optional)"
        className="w-full bg-transparent text-lg font-medium placeholder:text-sage-400 focus:outline-none dark:placeholder:text-sage-500"
      />
      <textarea
        ref={bodyRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Write a memo. Terse bullets are welcome, you can expand them later."
        rows={initial ? 6 : 3}
        className="mt-2 w-full resize-y bg-transparent leading-relaxed placeholder:text-sage-400 focus:outline-none dark:placeholder:text-sage-500"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="tags, comma separated"
          className="min-w-0 flex-1 bg-transparent text-sm text-sage-600 placeholder:text-sage-400 focus:outline-none dark:text-sage-300 dark:placeholder:text-sage-500"
        />
        <div className="flex items-center gap-2">
          {showExpand && (
            <button
              type="button"
              onClick={() => onExpand?.(collect())}
              className="flex items-center gap-1.5 rounded-full border border-sage-300 px-3 py-1.5 text-sm text-sage-700 transition hover:bg-sage-100 dark:border-sage-700 dark:text-sage-200 dark:hover:bg-sage-800"
            >
              <SparkIcon width={15} height={15} />
              Expand
            </button>
          )}
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full px-3 py-1.5 text-sm text-sage-600 transition hover:bg-sage-100 dark:text-sage-300 dark:hover:bg-sage-800"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={save}
            disabled={!canSave}
            className="rounded-full bg-sage-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-sage-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {initial ? "Save" : "Add memo"}
          </button>
        </div>
      </div>
    </div>
  );
}
