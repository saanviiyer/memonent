import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  generateDigest,
  labelGroups,
  expandBullets,
  MOCK_MODE,
  MODEL,
} from "./ai.js";

dotenv.config();

const PORT = process.env.PORT || 3001;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIST = path.resolve(__dirname, "../client/dist");

const app = express();
app.use(cors());
app.use(express.json({ limit: "4mb" }));
app.use(express.static(CLIENT_DIST));

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, mockMode: MOCK_MODE, model: MODEL });
});

// ---------------------------------------------------------------------------
// Digest: synthesize a daily or weekly reflection of the notes in range.
// The client filters notes to the range (pure, tested logic) and sends them here.
// Body: { period: "day" | "week", notes: [{ title, body, tags, createdAt }] }
// ---------------------------------------------------------------------------
app.post("/api/digest", async (req, res) => {
  const { period = "day", notes = [] } = req.body || {};
  try {
    const result = await generateDigest(period, notes);
    res.json(result);
  } catch (err) {
    console.error("digest error:", err.message);
    res.status(500).json({ error: err.message || "Digest failed." });
  }
});

// ---------------------------------------------------------------------------
// Group labels: name clusters that the client computed in pure code.
// Body: { groups: [{ terms: string[], titles: string[] }] }
// ---------------------------------------------------------------------------
app.post("/api/group-labels", async (req, res) => {
  const { groups = [] } = req.body || {};
  try {
    const result = await labelGroups(groups);
    res.json(result);
  } catch (err) {
    console.error("group-labels error:", err.message);
    res.status(500).json({ error: err.message || "Labeling failed." });
  }
});

// ---------------------------------------------------------------------------
// Bullet to prose: expand terse bullets into a clean explanation.
// Body: { title?: string, bullets: string[] }
// ---------------------------------------------------------------------------
app.post("/api/expand", async (req, res) => {
  const { title = "", bullets = [] } = req.body || {};
  if (!Array.isArray(bullets) || bullets.length === 0) {
    return res.status(400).json({ error: "Provide at least one bullet point to expand." });
  }
  try {
    const result = await expandBullets(title, bullets);
    res.json(result);
  } catch (err) {
    console.error("expand error:", err.message);
    res.status(500).json({ error: err.message || "Expansion failed." });
  }
});

// SPA catch-all.
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(CLIENT_DIST, "index.html"), (err) => {
    if (err) next();
  });
});

app.listen(PORT, () => {
  const aiMode = MOCK_MODE ? "MOCK MODE, no API key" : `LIVE, ${MODEL}`;
  console.log(`memonent server on http://localhost:${PORT}  [AI: ${aiMode}]`);
});
