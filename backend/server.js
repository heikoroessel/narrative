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

// DB init
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

const SYSTEM_PROMPT = `Du führst ein narratives Interview mit einer Mitarbeitenden einer Organisation im Rahmen eines Diagnoseprozesses. Version: Vapi-Simulation (textbasiert).

Deine Rolle: neutrale, aufmerksame Gesprächsbegleiterin. Kein Coach, kein Berater, kein Therapeut.

VERHALTENSREGELN:
- Stelle ausschließlich Fragen zu Themen, die die Person selbst angesprochen hat
- Vertiefe und konkretisiere, wenn etwas offen bleibt
- Halte den Erzählfluss mit kurzen, einladenden Fragen aufrecht
- KEINE Warum-Fragen (sie erzeugen Rechtfertigung statt Erzählung)
- NICHTS bewerten — auch nicht positiv (z.B. "Das klingt toll!")
- Keine Hypothesen anbieten ("War das vielleicht weil...?")
- Keine Ratschläge, keine Einschätzungen, keine Interpretationen
- Nie nach vollständigen Namen, Kundennamen oder Unternehmensbezeichnungen fragen
- Falls die Person einen vollständigen Namen nennt: einmalig freundlich darauf hinweisen, dann nahtlos weitermachen

ERLAUBTES FRAGEREPERTOIRE — nur diese drei Typen:
1. Erzählauffordernde Fragen: "Und dann?", "Wie ging das weiter?", "Können Sie das noch ausführen?"
2. Vertiefende Fragen: "Was war das für eine Phase?", "Was hat sich da verändert?", "Wie haben Sie das damals erlebt?"
3. Konkretisierende Fragen: "Haben Sie ein Beispiel dafür?", "Woran haben Sie das gemerkt?", "Was genau ist da passiert?"

GESPRÄCHSPHASEN:
Phase 1 — Begrüssung & Einführung: Begrüsse herzlich. Erkläre: kein Test, keine Bewertung. Vollständige Anonymität. Bitte keine vollständigen Namen. Dauer 30–60 Min. Frage ob Fragen bestehen.
Phase 2 — Erlebniskurve: Bitte die Person ein leeres Blatt zu nehmen. Zeitachse zeichnen — links erster Tag, rechts heute. Kurve mit Hochs und Tiefs. An markanten Punkten Stichworte. Warte auf Signal dass die Kurve fertig ist.
Phase 3 — Haupterzählung: Einstieg: "Wie war der Anfang? Was haben Sie erlebt, als Sie hier angefangen haben?" Dann der Erzählung folgen, chronologisch von links nach rechts.
Phase 4 — Abschluss: Herzlich bedanken. Fragen ob noch etwas fehlt. Erklären dass die Erfahrungen anonym in Gesamtauswertung einfließen.

Antworte ausschließlich auf Deutsch. Halte Antworten kurz — max. 3–4 Sätze. Folge der Geschichte der Person, führe sie nicht.`;

const CLASSIFY_PROMPT = `Du bist ein Experte für narrative Organisationsforschung (Czarniawska, Boje, Luhmann).

Analysiere das folgende Interview-Transkript und klassifiziere die Narrative in diese 6 Klassen:

1. Erklärungsnarrative — Wie die Organisation erklärt, warum Dinge so sind (z.B. "Das liegt am Markt", "Das hat historische Gründe")
2. Identitätsnarrative — Was die Organisation über sich selbst erzählt (z.B. "Wir sind eine Familie", "Wir sind Pioniere")
3. Machtnarrative — Wer handelt, wer entscheidet, wer Objekt ist (z.B. "Bei uns entscheidet immer...", "Wir werden nie gefragt")
4. Veränderungsnarrative — Wie die Organisation mit Wandel umgeht (z.B. "Das haben wir schon immer so gemacht", "Wir sind im Aufbruch")
5. Beziehungsnarrative — Wie über interne/externe Beziehungen gesprochen wird (z.B. "Wir gegen die anderen Abteilungen")
6. Erfolgs-/Scheiternsnarrative — Wie Erfolge und Misserfolge erklärt werden

Antworte NUR mit einem JSON-Objekt (kein Markdown, keine Erklärungen):
{
  "classes": {
    "erklaerung": <0-100>,
    "identitaet": <0-100>,
    "macht": <0-100>,
    "veraenderung": <0-100>,
    "beziehung": <0-100>,
    "erfolg": <0-100>
  },
  "dominant": "<klasse-key>",
  "key_phrases": ["phrase1", "phrase2", "phrase3"],
  "summary": "<2-3 Sätze Gesamteinschätzung>"
}

Die Werte müssen sich auf 100 summieren.`;

// POST /api/chat — main interview endpoint
app.post('/api/chat', async (req, res) => {
  const { messages, interviewId } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages required' });
  }
  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages
    });
    const reply = response.content.filter(b => b.type === 'text').map(b => b.text).join('');
    res.json({ reply });
  } catch (err) {
    console.error('Claude error:', err);
    res.status(500).json({ error: 'Claude API Fehler' });
  }
});

// POST /api/interviews — save completed interview
app.post('/api/interviews', async (req, res) => {
  const { transcript, duration_minutes, hierarchy_level, org_id } = req.body;
  if (!transcript) return res.status(400).json({ error: 'transcript required' });

  // classify narratives
  let narrative_classes = null;
  try {
    const transcriptText = transcript
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join('\n\n');

    const classifyRes = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: `${CLASSIFY_PROMPT}\n\nTRANSKRIPT:\n${transcriptText}`
      }]
    });
    const raw = classifyRes.content[0].text.trim();
    narrative_classes = JSON.parse(raw);
  } catch (err) {
    console.error('Classification error:', err);
  }

  // count existing interviews to generate label
  const countRes = await pool.query('SELECT COUNT(*) FROM interviews WHERE org_id = $1', [org_id || 'default']);
  const idx = parseInt(countRes.rows[0].count);
  const label = String.fromCharCode(65 + idx); // A, B, C...

  const id = uuidv4();
  await pool.query(
    'INSERT INTO interviews (id, org_id, label, transcript, narrative_classes, duration_minutes, hierarchy_level) VALUES ($1,$2,$3,$4,$5,$6,$7)',
    [id, org_id || 'default', label, JSON.stringify(transcript), JSON.stringify(narrative_classes), duration_minutes || null, hierarchy_level || null]
  );

  res.json({ id, label, narrative_classes });
});

// GET /api/dashboard — aggregated dashboard data
app.get('/api/dashboard', async (req, res) => {
  const org_id = req.query.org_id || 'default';
  const interviews = await pool.query(
    'SELECT id, label, narrative_classes, duration_minutes, hierarchy_level, created_at FROM interviews WHERE org_id = $1 ORDER BY created_at DESC',
    [org_id]
  );

  const rows = interviews.rows;
  const total = rows.length;

  // aggregate class percentages
  const agg = { erklaerung: 0, identitaet: 0, macht: 0, veraenderung: 0, beziehung: 0, erfolg: 0 };
  let counted = 0;
  for (const row of rows) {
    if (row.narrative_classes?.classes) {
      for (const [k, v] of Object.entries(row.narrative_classes.classes)) {
        agg[k] = (agg[k] || 0) + v;
      }
      counted++;
    }
  }
  if (counted > 0) {
    for (const k of Object.keys(agg)) agg[k] = Math.round(agg[k] / counted);
  }

  const dominant = Object.entries(agg).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  res.json({
    total,
    aggregate_classes: agg,
    dominant,
    interviews: rows.map(r => ({
      id: r.id,
      label: r.label,
      dominant: r.narrative_classes?.dominant || null,
      key_phrases: r.narrative_classes?.key_phrases || [],
      duration_minutes: r.duration_minutes,
      hierarchy_level: r.hierarchy_level,
      created_at: r.created_at
    }))
  });
});

// GET /api/interviews/:id — single interview detail
app.get('/api/interviews/:id', async (req, res) => {
  const result = await pool.query('SELECT * FROM interviews WHERE id = $1', [req.params.id]);
  if (!result.rows.length) return res.status(404).json({ error: 'not found' });
  const row = result.rows[0];
  res.json({
    id: row.id,
    label: row.label,
    transcript: row.transcript,
    narrative_classes: row.narrative_classes,
    duration_minutes: row.duration_minutes,
    hierarchy_level: row.hierarchy_level,
    created_at: row.created_at
  });
});

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Serve built frontend
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;
initDB().then(() => {
  app.listen(PORT, () => console.log(`Narratives Diagnose API läuft auf Port ${PORT}`));
});
