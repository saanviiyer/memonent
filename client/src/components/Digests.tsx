import { useEffect, useState } from "react";
import type { DigestPeriod, DigestResult, Note } from "../types";
import { notesInRange } from "../lib/digest";
import { requestDigest } from "../lib/api";

interface Props {
  notes: Note[];
}

export default function Digests({ notes }: Props) {
  const [period, setPeriod] = useState<DigestPeriod>("day");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<DigestResult | null>(null);

  const inRange = notesInRange(notes, period);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    setResult(null);
    requestDigest(period, inRange)
      .then((r) => alive && setResult(r))
      .catch((e) => alive && setError(e.message || "Could not build a digest."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // Re-run when the period changes or the number of in-range notes changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, inRange.length]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-medium">Digests</h2>
          <p className="text-sm text-sage-500 dark:text-sage-400">
            A calm read of what you have been writing.
          </p>
        </div>
        <div className="flex rounded-full border border-sage-200 p-0.5 dark:border-sage-800">
          <Toggle label="Daily" active={period === "day"} onClick={() => setPeriod("day")} />
          <Toggle label="Weekly" active={period === "week"} onClick={() => setPeriod("week")} />
        </div>
      </div>

      {loading && (
        <div className="space-y-3 py-12 text-center text-sage-500">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-sage-300 border-t-sage-600" />
          <p>Gathering your {period === "week" ? "week" : "day"}...</p>
        </div>
      )}

      {error && !loading && (
        <p className="rounded-xl bg-red-50 p-4 text-red-700 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </p>
      )}

      {result && !loading && (
        <div className="mn-fade space-y-5">
          <p className="text-xs text-sage-500 dark:text-sage-400">
            {result.count} memo{result.count === 1 ? "" : "s"} in the past{" "}
            {period === "week" ? "7 days" : "24 hours"}
            {result.mockMode ? " . mock digest" : ""}
          </p>

          <section className="rounded-2xl border border-sage-200 bg-white p-5 dark:border-sage-800 dark:bg-sage-900/40">
            <p className="leading-relaxed text-sage-800 dark:text-sage-100">
              {result.digest.summary}
            </p>
          </section>

          {result.digest.thinkingAbout.length > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-medium text-sage-600 dark:text-sage-300">
                What you were thinking about
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {result.digest.thinkingAbout.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-sage-100 px-3 py-1 text-sm text-sage-700 dark:bg-sage-800 dark:text-sage-300"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </section>
          )}

          {result.digest.themes.length > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-medium text-sage-600 dark:text-sage-300">
                Themes
              </h3>
              <div className="space-y-2">
                {result.digest.themes.map((th, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-sage-200 bg-white p-3 dark:border-sage-800 dark:bg-sage-900/40"
                  >
                    <div className="font-medium">{th.label}</div>
                    <div className="text-sm text-sage-500 dark:text-sage-400">{th.note}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {result.digest.highlights.length > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-medium text-sage-600 dark:text-sage-300">
                Highlights
              </h3>
              <ul className="space-y-1.5">
                {result.digest.highlights.map((h, i) => (
                  <li
                    key={i}
                    className="flex gap-2 leading-relaxed text-sage-800 dark:text-sage-200"
                  >
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sage-400" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {result.count === 0 && (
            <p className="rounded-2xl border border-dashed border-sage-300 py-12 text-center text-sage-500 dark:border-sage-700">
              Nothing written in this window yet.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Toggle({
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
      className={`rounded-full px-4 py-1.5 text-sm transition ${
        active
          ? "bg-sage-600 text-white"
          : "text-sage-600 hover:bg-sage-100 dark:text-sage-300 dark:hover:bg-sage-800"
      }`}
    >
      {label}
    </button>
  );
}
