import { useEffect, useMemo, useState } from "react";
import type { Note } from "../types";
import { groupNotes } from "../lib/grouping";
import { requestGroupLabels } from "../lib/api";
import { relativeTime } from "../lib/format";
import { GroupsIcon } from "./Icons";

interface Props {
  notes: Note[];
  onOpenNote?: (id: string) => void;
}

export default function Groups({ notes }: Props) {
  // Clustering is deterministic pure code; recompute when notes change.
  const clusters = useMemo(() => groupNotes(notes), [notes]);
  const byId = useMemo(() => {
    const m = new Map<string, Note>();
    for (const n of notes) m.set(n.id, n);
    return m;
  }, [notes]);

  // Optional LLM label refinement, keyed by cluster signature so it re-runs when the
  // clustering changes but not on every render.
  const [labels, setLabels] = useState<string[] | null>(null);
  const signature = clusters.map((c) => `${c.noteIds.length}:${c.terms.join(",")}`).join("|");

  useEffect(() => {
    let alive = true;
    setLabels(null);
    if (clusters.length === 0) return;
    requestGroupLabels(clusters.map((c) => ({ terms: c.terms, titles: c.titles })))
      .then((r) => alive && setLabels(r.labels))
      .catch(() => {
        // Keep the deterministic fallback labels on any failure.
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-medium">Groups</h2>
        <p className="text-sm text-sage-500 dark:text-sage-400">
          Similar memos gathered into topics, automatically.
        </p>
      </div>

      {clusters.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-sage-300 py-16 text-center text-sage-500 dark:border-sage-700">
          <GroupsIcon className="mx-auto mb-2 text-sage-400" width={24} height={24} />
          <p>No memos to group yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {clusters.map((c, i) => {
            const label = labels && labels[i] ? labels[i] : c.label;
            const members = c.noteIds.map((id) => byId.get(id)).filter(Boolean) as Note[];
            return (
              <section
                key={c.id}
                className="rounded-2xl border border-sage-200 bg-white p-4 dark:border-sage-800 dark:bg-sage-900/40"
              >
                <div className="mb-3 flex items-baseline justify-between gap-3">
                  <h3 className="text-lg font-medium">{label}</h3>
                  <span className="shrink-0 text-xs text-sage-500 dark:text-sage-400">
                    {members.length} memo{members.length === 1 ? "" : "s"}
                  </span>
                </div>
                <ul className="space-y-2">
                  {members.map((n) => (
                    <li
                      key={n.id}
                      className="rounded-xl bg-sage-50 px-3 py-2 dark:bg-sage-900/60"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="min-w-0 truncate font-medium">
                          {n.title || n.body.slice(0, 60) || "Untitled"}
                        </span>
                        <span className="shrink-0 text-xs text-sage-500 dark:text-sage-400">
                          {relativeTime(n.updatedAt)}
                        </span>
                      </div>
                      {n.title && n.body && (
                        <p className="mt-0.5 truncate text-sm text-sage-500 dark:text-sage-400">
                          {n.body}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
