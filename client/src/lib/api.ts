// Thin fetch wrappers around the server API. All calls go through /api, which Vite
// proxies to the Express server in dev and the same origin in production.

import type { DigestPeriod, DigestResult, Note } from "../types";

async function jsonPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  return data as T;
}

export interface Health {
  ok: boolean;
  mockMode: boolean;
  model: string;
}

export function getHealth(): Promise<Health> {
  return fetch("/api/health").then((r) => r.json());
}

// Compact per-note shape sent to the server for synthesis (no ids or timestamps needed
// beyond what grounds the text).
interface DigestNote {
  title: string;
  body: string;
  tags: string[];
  createdAt: string;
}

function toDigestNote(n: Note): DigestNote {
  return { title: n.title, body: n.body, tags: n.tags, createdAt: n.createdAt };
}

export function requestDigest(period: DigestPeriod, notes: Note[]): Promise<DigestResult> {
  return jsonPost<DigestResult>("/api/digest", {
    period,
    notes: notes.map(toDigestNote),
  });
}

export interface LabelGroupsResult {
  mockMode: boolean;
  labels: string[];
}

export function requestGroupLabels(
  groups: { terms: string[]; titles: string[] }[]
): Promise<LabelGroupsResult> {
  return jsonPost<LabelGroupsResult>("/api/group-labels", { groups });
}

export interface ExpandResult {
  mockMode: boolean;
  prose: string;
}

export function requestExpand(title: string, bullets: string[]): Promise<ExpandResult> {
  return jsonPost<ExpandResult>("/api/expand", { title, bullets });
}
