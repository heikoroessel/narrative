import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';
import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS interviews (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL DEFAULT 'default',
      label TEXT NOT NULL,
      transcript JSONB NOT NULL DEFAULT '[]',
      narrative_classes JSONB,
      duration_minutes INTEGER,
      hierarchy_level TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('DB ready');
}

const SYSTEM_PROMPT = `Du führst ein narratives Interview mit einer Mitarbeitenden einer Organisation im Rahmen eines Diagnoseprozesses.

Deine Rolle: neutrale, aufmerksame Gesprächsbegleiterin. Kein Coach, kein Berater, kein Therapeut.

VERHALTENSREGELN:
- Stelle ausschließlich Fragen zu Themen, die die Person selbst angesprochen hat
- Vertiefe und konkretisiere, wenn etwas offen bleibt
- Halte den Erzählfluss mit kurzen, einladenden Fragen aufrecht
- KEINE Warum-Fragen (sie erzeugen Rechtfertigung statt Erzählung)
- NICHTS bewerten — auch nicht positiv
- Keine Hypothesen anbieten
- Keine Ratschläge, keine Interpretationen
- Nie nach vollständigen Namen fragen
- Falls die Person einen vollständigen Namen nennt: einmalig freundlich darauf hinweisen

ERLAUBTES FRAGEREPERTOIRE:
1. Erzählauffordernde Fragen: "Und dann?", "Wie ging das weiter?", "Können Sie das noch ausführen?"
2. Vertiefende Fragen: "Was war das für eine Phase?", "Was hat sich da verändert?", "Wie haben Sie das damals erlebt?"
3. Konkretisierende Fragen: "Haben Sie ein Beispiel dafür?", "Woran haben Sie das gemerkt?", "Was genau ist da passiert?"

GESPRÄCHSPHASEN:
Phase 1 — Begrüssung: Begrüsse herzlich. Kein Test, keine Bewertung. Vollständige Anonymität. Keine vollständigen Namen. Dauer 30–60 Min.
Phase 2 — Erlebniskurve: Leeres Blatt, Zeitachse, Hochs und Tiefs, Stichworte. Warten bis fertig.
Phase 3 — Haupterzählung: "Wie war der Anfang?" Dann der Erzählung folgen.
Phase 4 — Abschluss: Bedanken, ob noch etwas fehlt, anonyme Auswertung erklären.

Antworte ausschließlich auf Deutsch. Max. 3–4 Sätze pro Antwort.`;

const CLASSIFY_PROMPT = `Du bist Experte für narrative Organisationsforschung. Klassifiziere das Interview-Transkript in diese 6 Klassen:
1. erklaerung — Erklärungsnarrative
2. identitaet — Identitätsnarrative  
3. macht — Machtnarrative
4. veraenderung — Veränderungsnarrative
5. beziehung — Beziehungsnarrative
6. erfolg — Erfolgs-/Scheiternsnarrative

Antworte NUR mit JSON (kein Markdown):
{"classes":{"erklaerung":0,"identitaet":0,"macht":0,"veraenderung":0,"beziehung":0,"erfolg":0},"dominant":"key","key_phrases":["phrase1","phrase2","phrase3"],"summary":"2-3 Sätze"}
Die Werte müssen sich auf 100 summieren.`;

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true }));

// POST /api/chat
app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'messages required' });
  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: messages.length ? messages : [{ role: 'user', content: 'Beginne das Interview mit der Begrüssung.' }]
    });
    const reply = response.content.filter(b => b.type === 'text').map(b => b.text).join('');
    res.json({ reply });
  } catch (err) {
    console.error('Claude error:', err.message);
    res.status(500).json({ error: 'Claude API Fehler' });
  }
});

// POST /api/interviews
app.post('/api/interviews', async (req, res) => {
  const { transcript, duration_minutes, hierarchy_level, org_id } = req.body;
  if (!transcript) return res.status(400).json({ error: 'transcript required' });

  let narrative_classes = null;
  try {
    const transcriptText = transcript.filter(m => m.role === 'user').map(m => m.content).join('\n\n');
    const classifyRes = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 512,
      messages: [{ role: 'user', content: `${CLASSIFY_PROMPT}\n\nTRANSKRIPT:\n${transcriptText}` }]
    });
    narrative_classes = JSON.parse(classifyRes.content[0].text.trim());
  } catch (err) {
    console.error('Classification error:', err.message);
  }

  const countRes = await pool.query('SELECT COUNT(*) FROM interviews WHERE org_id = $1', [org_id || 'default']);
  const label = String.fromCharCode(65 + parseInt(countRes.rows[0].count));
  const id = uuidv4();

  await pool.query(
    'INSERT INTO interviews (id, org_id, label, transcript, narrative_classes, duration_minutes, hierarchy_level) VALUES ($1,$2,$3,$4,$5,$6,$7)',
    [id, org_id || 'default', label, JSON.stringify(transcript), JSON.stringify(narrative_classes), duration_minutes || null, hierarchy_level || null]
  );

  res.json({ id, label, narrative_classes });
});

// GET /api/dashboard
app.get('/api/dashboard', async (req, res) => {
  const org_id = req.query.org_id || 'default';
  const result = await pool.query(
    'SELECT id, label, narrative_classes, duration_minutes, hierarchy_level, created_at FROM interviews WHERE org_id = $1 ORDER BY created_at DESC',
    [org_id]
  );
  const rows = result.rows;
  const agg = { erklaerung: 0, identitaet: 0, macht: 0, veraenderung: 0, beziehung: 0, erfolg: 0 };
  let counted = 0;
  for (const row of rows) {
    if (row.narrative_classes?.classes) {
      for (const [k, v] of Object.entries(row.narrative_classes.classes)) agg[k] = (agg[k] || 0) + v;
      counted++;
    }
  }
  if (counted > 0) for (const k of Object.keys(agg)) agg[k] = Math.round(agg[k] / counted);
  const dominant = Object.entries(agg).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  res.json({
    total: rows.length, aggregate_classes: agg, dominant,
    interviews: rows.map(r => ({ id: r.id, label: r.label, dominant: r.narrative_classes?.dominant || null, key_phrases: r.narrative_classes?.key_phrases || [], duration_minutes: r.duration_minutes, hierarchy_level: r.hierarchy_level, created_at: r.created_at }))
  });
});

// GET /api/interviews/:id
app.get('/api/interviews/:id', async (req, res) => {
  const result = await pool.query('SELECT * FROM interviews WHERE id = $1', [req.params.id]);
  if (!result.rows.length) return res.status(404).json({ error: 'not found' });
  const row = result.rows[0];
  res.json({ id: row.id, label: row.label, transcript: row.transcript, narrative_classes: row.narrative_classes, duration_minutes: row.duration_minutes, hierarchy_level: row.hierarchy_level, created_at: row.created_at });
});

// Serve built frontend
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));
app.get('*', (req, res) => res.sendFile(path.join(publicPath, 'index.html')));

const PORT = process.env.PORT || 3001;
initDB().then(() => app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`)));
