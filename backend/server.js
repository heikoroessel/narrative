import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';
import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import path from 'path';
import crypto from 'crypto';

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      interview_key TEXT UNIQUE NOT NULL,
      dashboard_key TEXT UNIQUE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS interviews (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL,
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

function generateKey(prefix) {
  return prefix + '-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

const SYSTEM_PROMPT = `Du führst ein narratives Interview mit einer Mitarbeitenden einer Organisation im Rahmen eines Diagnoseprozesses.

Deine Rolle: neutrale, aufmerksame Gesprächsbegleiterin. Kein Coach, kein Berater, kein Therapeut.

GESPRÄCHSSTRUKTUR — folge dieser Reihenfolge strikt:

1. BEGRÜSSUNG: Begrüsse herzlich. Erkläre: kein Test, kein Bewerbungsgespräch, vollständig anonym. Hinweis: Die Person kann das Interview jederzeit über "Interview beenden" abschliessen, wenn sie alles erzählt hat. Frage: "Ist das soweit verständlich?"

2. ERLEBNISKURVE (nach Bestätigung): Bitte die Person ein leeres Blatt zu nehmen und eine Zeitachse zu zeichnen — links der erste Arbeitstag, rechts das Heute. Hochs und Tiefs einzeichnen, an markanten Punkten Stichworte. Die Kurve bleibt bei der Person. Frage: "Sagen Sie mir, wenn Sie fertig sind."

3. HAUPTERZÄHLUNG (nach Fertig-Signal): Starte mit: "Sehr gut. Wie war der Anfang — was haben Sie erlebt, als Sie hier angefangen haben?" Lade explizit ein lange am Stück zu erzählen: "Sie können gerne zehn, zwanzig oder dreißig Minuten am Stück sprechen — ich warte und höre zu. Tipp- oder Sprachfehler spielen keine Rolle, ich verstehe den Sinn trotzdem."

4. ABSCHLUSS (wenn die Person signalisiert fertig zu sein): Danke herzlich. Frage ob noch etwas fehlt. Erkläre dass alles anonym in die Gesamtauswertung fliesst.

VERHALTENSREGELN:
- Ausschließlich Fragen zu Themen, die die Person selbst angesprochen hat
- KEINE Warum-Fragen
- NICHTS bewerten
- Keine Hypothesen, keine Interpretationen, keine Ratschläge
- Nie nach vollständigen Namen fragen
- Falls Namen genannt: einmalig freundlich darauf hinweisen

ERLAUBTES FRAGEREPERTOIRE:
1. "Und dann?", "Wie ging das weiter?"
2. "Was war das für eine Phase?", "Was hat sich da verändert?"
3. "Haben Sie ein Beispiel dafür?", "Woran haben Sie das gemerkt?"

Antworte auf Deutsch. Max. 3–4 Sätze.`;

const CLASSIFY_PROMPT = `Klassifiziere das Interview-Transkript in diese 6 Klassen. Antworte NUR mit JSON (kein Markdown):
{"classes":{"erklaerung":0,"identitaet":0,"macht":0,"veraenderung":0,"beziehung":0,"erfolg":0},"dominant":"key","key_phrases":["phrase1","phrase2","phrase3"],"summary":"2-3 Sätze"}
Werte summieren sich auf 100. Klassen: erklaerung=Erklärungsnarrative, identitaet=Identitätsnarrative, macht=Machtnarrative, veraenderung=Veränderungsnarrative, beziehung=Beziehungsnarrative, erfolg=Erfolgs-/Scheiternsnarrative.`;

// Health
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Validate key — returns org info and role
app.post('/api/auth/validate', async (req, res) => {
  const { key } = req.body;
  if (!key) return res.status(400).json({ error: 'key required' });
  const k = key.trim().toUpperCase();
  const result = await pool.query(
    'SELECT id, name, interview_key, dashboard_key FROM organizations WHERE interview_key = $1 OR dashboard_key = $1',
    [k]
  );
  if (!result.rows.length) return res.status(401).json({ error: 'Ungültiger Key' });
  const org = result.rows[0];
  const role = org.dashboard_key === k ? 'dashboard' : 'interview';
  res.json({ org_id: org.id, org_name: org.name, role });
});

// Admin auth
app.post('/api/admin/auth', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) res.json({ ok: true });
  else res.status(401).json({ error: 'Falsches Passwort' });
});

// Admin: list orgs
app.get('/api/admin/organizations', async (req, res) => {
  const { password } = req.query;
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });
  const result = await pool.query('SELECT o.*, COUNT(i.id) as interview_count FROM organizations o LEFT JOIN interviews i ON i.org_id = o.id GROUP BY o.id ORDER BY o.created_at DESC');
  res.json(result.rows);
});

// Admin: create org
app.post('/api/admin/organizations', async (req, res) => {
  const { name, password } = req.body;
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = uuidv4();
  const interview_key = generateKey('INT');
  const dashboard_key = generateKey('DASH');
  await pool.query(
    'INSERT INTO organizations (id, name, interview_key, dashboard_key) VALUES ($1,$2,$3,$4)',
    [id, name, interview_key, dashboard_key]
  );
  res.json({ id, name, interview_key, dashboard_key });
});

// Admin: delete org
app.delete('/api/admin/organizations/:id', async (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });
  await pool.query('DELETE FROM interviews WHERE org_id = $1', [req.params.id]);
  await pool.query('DELETE FROM organizations WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

// Chat
app.post('/api/chat', async (req, res) => {
  const { messages, org_id } = req.body;
  if (!messages) return res.status(400).json({ error: 'messages required' });
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

// Save interview
app.post('/api/interviews', async (req, res) => {
  const { transcript, duration_minutes, hierarchy_level, org_id } = req.body;
  if (!transcript || !org_id) return res.status(400).json({ error: 'transcript and org_id required' });
  let narrative_classes = null;
  try {
    const text = transcript.filter(m => m.role === 'user').map(m => m.content).join('\n\n');
    const r = await anthropic.messages.create({
      model: 'claude-opus-4-5', max_tokens: 512,
      messages: [{ role: 'user', content: `${CLASSIFY_PROMPT}\n\nTRANSKRIPT:\n${text}` }]
    });
    narrative_classes = JSON.parse(r.content[0].text.trim());
  } catch (err) { console.error('Classification error:', err.message); }
  const countRes = await pool.query('SELECT COUNT(*) FROM interviews WHERE org_id = $1', [org_id]);
  const label = String.fromCharCode(65 + parseInt(countRes.rows[0].count));
  const id = uuidv4();
  await pool.query(
    'INSERT INTO interviews (id, org_id, label, transcript, narrative_classes, duration_minutes, hierarchy_level) VALUES ($1,$2,$3,$4,$5,$6,$7)',
    [id, org_id, label, JSON.stringify(transcript), JSON.stringify(narrative_classes), duration_minutes || null, hierarchy_level || null]
  );
  res.json({ id, label, narrative_classes });
});

// Dashboard data
app.get('/api/dashboard', async (req, res) => {
  const { org_id } = req.query;
  if (!org_id) return res.status(400).json({ error: 'org_id required' });
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

// Single interview
app.get('/api/interviews/:id', async (req, res) => {
  const result = await pool.query('SELECT * FROM interviews WHERE id = $1', [req.params.id]);
  if (!result.rows.length) return res.status(404).json({ error: 'not found' });
  const row = result.rows[0];
  res.json({ id: row.id, label: row.label, transcript: row.transcript, narrative_classes: row.narrative_classes, duration_minutes: row.duration_minutes, hierarchy_level: row.hierarchy_level });
});

// Serve frontend
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));
app.get('*', (req, res) => res.sendFile(path.join(publicPath, 'index.html')));

const PORT = process.env.PORT || 3001;
initDB().then(() => app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`)));
