import { useEffect, useState } from "react";
import { parseBullets } from "../lib/bullets";
import { requestExpand } from "../lib/api";
import { CloseIcon, CopyIcon, CheckIcon } from "./Icons";

export interface ExpandTarget {
  noteId: string | null; // present when expanding an existing note (enables Replace)
  title: string;
  body: string;
}

interface Props {
  target: ExpandTarget;
  onClose: () => void;
  onSaveAsNew: (title: string, prose: string) => void;
  onReplace: (noteId: string, prose: string) => void;
}

export default function ExpandModal({ target, onClose, onSaveAsNew, onReplace }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [prose, setProse] = useState("");
  const [mock, setMock] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    const bullets = parseBullets(target.body);
    setLoading(true);
    setError("");
    requestExpand(target.title, bullets)
      .then((r) => {
        if (!alive) return;
        setProse(r.prose);
        setMock(r.mockMode);
      })
      .catch((e) => alive && setError(e.message || "Could not expand these notes."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [target]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(prose);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard may be unavailable; ignore
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/30 p-0 backdrop-blur-sm sm:items-center sm:p-6 mn-fade"
      onClick={onClose}
    >
      <div
        className="mn-rise flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-xl dark:bg-sage-900 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-sage-200 px-5 py-4 dark:border-sage-800">
          <div>
            <h2 className="text-lg font-medium">Expanded memo</h2>
            <p className="text-sm text-sage-500 dark:text-sage-400">
              {target.title ? target.title : "Your bullets, written out in full"}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-sage-500 transition hover:bg-sage-100 dark:hover:bg-sage-800"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && (
            <div className="space-y-3 py-8 text-center text-sage-500">
              <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-sage-300 border-t-sage-600" />
              <p>Writing it out...</p>
            </div>
          )}
          {error && !loading && (
            <p className="rounded-xl bg-red-50 p-4 text-red-700 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </p>
          )}
          {!loading && !error && (
            <>
              {mock && (
                <p className="mb-3 rounded-lg bg-sage-100 px-3 py-2 text-xs text-sage-600 dark:bg-sage-800 dark:text-sage-300">
                  Mock mode. Set ANTHROPIC_API_KEY for a live expansion.
                </p>
              )}
              <div className="whitespace-pre-wrap leading-relaxed text-sage-800 dark:text-sage-100">
                {prose}
              </div>
            </>
          )}
        </div>

        {!loading && !error && (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-sage-200 px-5 py-4 dark:border-sage-800">
            <button
              onClick={copy}
              className="flex items-center gap-1.5 rounded-full border border-sage-300 px-3.5 py-1.5 text-sm text-sage-700 transition hover:bg-sage-100 dark:border-sage-700 dark:text-sage-200 dark:hover:bg-sage-800"
            >
              {copied ? <CheckIcon width={15} height={15} /> : <CopyIcon width={15} height={15} />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              onClick={() => onSaveAsNew(target.title, prose)}
              className="rounded-full border border-sage-300 px-3.5 py-1.5 text-sm text-sage-700 transition hover:bg-sage-100 dark:border-sage-700 dark:text-sage-200 dark:hover:bg-sage-800"
            >
              Save as new memo
            </button>
            {target.noteId && (
              <button
                onClick={() => onReplace(target.noteId as string, prose)}
                className="rounded-full bg-sage-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-sage-700"
              >
                Replace bullets
              </button>
            )}
          </footer>
        )}
      </div>
    </div>
  );
}
