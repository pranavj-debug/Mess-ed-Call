/* ═══════════════════════════════════════════════════════════════
   MESS'ED CALL — server.js
   Express backend · Local college dataset search API
   Partial-word match engine · CORS enabled for frontend dev
═══════════════════════════════════════════════════════════════ */

const express = require('express');
const fs      = require('fs');
const path    = require('path');

const app  = express();
const PORT = 3000;

// ─── LOAD & PARSE DATASET ONCE AT STARTUP ────────────────────────────────────
// The colleges.json root structure is: { source, meta, data: [...] }
let collegeData = [];

try {
  const raw   = fs.readFileSync(path.join(__dirname, 'colleges.json'), 'utf8');
  collegeData = JSON.parse(raw).data;
  console.log(`✅  College dataset loaded — ${collegeData.length.toLocaleString()} institutions indexed.`);
} catch (err) {
  console.error('❌  Failed to load colleges.json:', err.message);
  process.exit(1);
}

// ─── CORS — Allow the frontend (any origin) to reach the API ─────────────────
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ─── STATIC FILE SERVING — Serve the frontend from the project root ──────────
app.use(express.static(__dirname));

// ─── GET /api/institutions/search?q=<query> ──────────────────────────────────
// Partial-match engine: a college matches if EVERY query word appears
// anywhere in its institute_name OR district (case-insensitive).
// Returns the top 15 matches as a JSON array.
app.get('/api/institutions/search', (req, res) => {
  const q = (req.query.q || '').trim();

  // Reject empty or very short queries early
  if (q.length < 2) {
    return res.json([]);
  }

  // Split the query into individual words; discard empty tokens
  const queryWords = q.toLowerCase().split(/\s+/).filter(w => w.length > 0);

  if (queryWords.length === 0) {
    return res.json([]);
  }

  // Filter: every word must appear in name OR district
  const matches = collegeData.filter(item => {
    const nameStr = (item.institute_name || '').toLowerCase();
    const distStr = (item.district       || '').toLowerCase();
    return queryWords.every(word => nameStr.includes(word) || distStr.includes(word));
  });

  // Return top 15 results
  return res.json(matches.slice(0, 15));
});

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', records: collegeData.length });
});

// ─── START ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀  Mess'ed Call server running at http://localhost:${PORT}`);
  console.log(`🔍  College search API: http://localhost:${PORT}/api/institutions/search?q=IIT`);
});
