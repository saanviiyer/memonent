import { useCallback, useEffect, useMemo, useState } from "react";
import type { Note, NoteInput } from "./types";
import { repo } from "./lib/repository";
import { getHealth } from "./lib/api";
import Feed from "./components/Feed";
import Digests from "./components/Digests";
import Reminders from "./components/Reminders";
import Groups from "./components/Groups";
import ExpandModal, { type ExpandTarget } from "./components/ExpandModal";
import {
  NotesIcon,
  DigestIcon,
  BellIcon,
  GroupsIcon,
  SunIcon,
  MoonIcon,
} from "./components/Icons";

type Tab = "memos" | "digests" | "reminders" | "groups";

const TABS: { id: Tab; label: string; Icon: typeof NotesIcon }[] = [
  { id: "memos", label: "My Memos", Icon: NotesIcon },
  { id: "digests", label: "Digests", Icon: DigestIcon },
  { id: "reminders", label: "Reminders", Icon: BellIcon },
  { id: "groups", label: "Groups", Icon: GroupsIcon },
];

const THEME_KEY = "memonent.theme.v1";

function useTheme() {
  const [dark, setDark] = useState<boolean>(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "dark") return true;
    if (saved === "light") return false;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
  }, [dark]);
  return { dark, toggle: () => setDark((d) => !d) };
}

export default function App() {
  const [tab, setTab] = useState<Tab>("memos");
  const [notes, setNotes] = useState<Note[]>(() => repo.listNotes());
  const [expandTarget, setExpandTarget] = useState<ExpandTarget | null>(null);
  const [mockMode, setMockMode] = useState<boolean | null>(null);
  const { dark, toggle } = useTheme();

  const reload = useCallback(() => setNotes(repo.listNotes()), []);
  const allTags = useMemo(() => repo.allTags(), [notes]);
  const reminderCount = useMemo(() => notes.filter((n) => n.remind).length, [notes]);

  useEffect(() => {
    getHealth()
      .then((h) => setMockMode(h.mockMode))
      .catch(() => setMockMode(null));
  }, []);

  // --- Note mutations (all go through the repository) ---
  const onAdd = useCallback(
    (input: NoteInput) => {
      repo.addNote(input);
      reload();
    },
    [reload]
  );
  const onUpdate = useCallback(
    (id: string, patch: Partial<NoteInput>) => {
      repo.updateNote(id, patch);
      reload();
    },
    [reload]
  );
  const onDelete = useCallback(
    (id: string) => {
      repo.deleteNote(id);
      reload();
    },
    [reload]
  );
  const onToggleRemind = useCallback(
    (id: string, remind: boolean) => {
      repo.setRemind(id, remind);
      reload();
    },
    [reload]
  );
  const onSetDue = useCallback(
    (id: string, dueAt: string | null) => {
      repo.setDue(id, dueAt);
      reload();
    },
    [reload]
  );

  // --- Bullet to prose ---
  const openExpandForNote = useCallback((note: Note) => {
    setExpandTarget({ noteId: note.id, title: note.title, body: note.body });
  }, []);
  const openExpandForDraft = useCallback((input: NoteInput) => {
    setExpandTarget({ noteId: null, title: input.title, body: input.body });
  }, []);
  const saveExpandedAsNew = useCallback(
    (title: string, prose: string) => {
      repo.addNote({ title: title || "Expanded memo", body: prose, tags: [] });
      reload();
      setExpandTarget(null);
      setTab("memos");
    },
    [reload]
  );
  const replaceWithExpanded = useCallback(
    (noteId: string, prose: string) => {
      repo.updateNote(noteId, { body: prose });
      reload();
      setExpandTarget(null);
    },
    [reload]
  );

  // --- Best-effort in-app reminder notifications while the tab is open ---
  useReminderNotifications(notes, reload);

  return (
    <div className="mx-auto flex min-h-full max-w-2xl flex-col px-4 pb-28 pt-6 sm:pb-8">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">memonent</h1>
          {mockMode && (
            <span className="rounded-full bg-sage-100 px-2 py-0.5 text-[11px] text-sage-600 dark:bg-sage-800 dark:text-sage-300">
              mock AI
            </span>
          )}
        </div>
        <button
          onClick={toggle}
          aria-label="Toggle theme"
          className="rounded-lg p-2 text-sage-500 transition hover:bg-sage-100 dark:hover:bg-sage-800"
        >
          {dark ? <SunIcon /> : <MoonIcon />}
        </button>
      </header>

      {/* Desktop / tablet tabs */}
      <nav className="mb-6 hidden gap-1 rounded-full border border-sage-200 p-1 dark:border-sage-800 sm:flex">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-2 text-sm transition ${
              tab === id
                ? "bg-sage-600 text-white"
                : "text-sage-600 hover:bg-sage-100 dark:text-sage-300 dark:hover:bg-sage-800"
            }`}
          >
            <Icon width={16} height={16} />
            {label}
            {id === "reminders" && reminderCount > 0 && (
              <span
                className={`rounded-full px-1.5 text-[11px] ${
                  tab === id ? "bg-white/25" : "bg-sage-200 dark:bg-sage-700"
                }`}
              >
                {reminderCount}
              </span>
            )}
          </button>
        ))}
      </nav>

      <main className="flex-1">
        {tab === "memos" && (
          <Feed
            notes={notes}
            allTags={allTags}
            onAdd={onAdd}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onToggleRemind={onToggleRemind}
            onSetDue={onSetDue}
            onExpand={openExpandForNote}
            onExpandDraft={openExpandForDraft}
          />
        )}
        {tab === "digests" && <Digests notes={notes} />}
        {tab === "reminders" && (
          <Reminders
            notes={notes}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onToggleRemind={onToggleRemind}
            onSetDue={onSetDue}
            onExpand={openExpandForNote}
          />
        )}
        {tab === "groups" && <Groups notes={notes} />}
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-sage-200 bg-white/90 backdrop-blur dark:border-sage-800 dark:bg-sage-900/90 sm:hidden">
        <div className="mx-auto flex max-w-2xl">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] transition ${
                tab === id ? "text-sage-700 dark:text-sage-200" : "text-sage-400"
              }`}
            >
              <Icon width={20} height={20} />
              {label}
              {id === "reminders" && reminderCount > 0 && (
                <span className="absolute right-1/4 top-1 h-1.5 w-1.5 rounded-full bg-amber-500" />
              )}
            </button>
          ))}
        </div>
      </nav>

      {expandTarget && (
        <ExpandModal
          target={expandTarget}
          onClose={() => setExpandTarget(null)}
          onSaveAsNew={saveExpandedAsNew}
          onReplace={replaceWithExpanded}
        />
      )}
    </div>
  );
}

// Poll for due reminders while the app is open and fire a browser notification once per
// note. Real push and offline reminders need a backend (see the README); this is the
// best-effort in-app version.
function useReminderNotifications(notes: Note[], reload: () => void) {
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      const anyDue = notes.some((n) => n.remind && n.dueAt && !n.notifiedAt);
      if (anyDue) Notification.requestPermission().catch(() => {});
    }
  }, [notes]);

  useEffect(() => {
    function check() {
      const now = Date.now();
      let fired = false;
      for (const n of repo.listNotes()) {
        if (!n.remind || !n.dueAt || n.notifiedAt) continue;
        if (new Date(n.dueAt).getTime() <= now) {
          repo.markNotified(n.id);
          fired = true;
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            try {
              new Notification("memonent reminder", {
                body: n.title || n.body.slice(0, 100) || "You wanted to revisit this memo.",
              });
            } catch {
              // notifications may be blocked; the badge still updates
            }
          }
        }
      }
      if (fired) reload();
    }
    check();
    const id = window.setInterval(check, 30000);
    return () => window.clearInterval(id);
  }, [reload]);
}
