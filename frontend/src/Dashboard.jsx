import React, { useState, useEffect } from 'react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const API = import.meta.env.VITE_API_URL || '';

const CLASS_KEYS = ['erklaerung', 'identitaet', 'macht', 'veraenderung', 'beziehung', 'erfolg'];

const CLASS_LABELS = {
  erklaerung: 'Erklärungsnarrative', identitaet: 'Identitätsnarrative', macht: 'Machtnarrative',
  veraenderung: 'Veränderungsnarrative', beziehung: 'Beziehungsnarrative', erfolg: 'Erfolgs-/Scheiternsnarr.',
};

const CLASS_COLORS = {
  erklaerung: '#BA7517', identitaet: '#378ADD', macht: '#534AB7',
  veraenderung: '#1D9E75', beziehung: '#D85A30', erfolg: '#888780',
};

// Benchmark: balanced reference organisation (Czarniawska/Boje)
const BENCHMARK = {
  erklaerung: 12, identitaet: 20, macht: 15,
  veraenderung: 18, beziehung: 18, erfolg: 17,
};

const CLASS_INFO = {
  erklaerung: {
    desc: 'Wie die Organisation erklärt, warum Dinge so sind.',
    high: 'Viel Erklärungsbedarf — möglicherweise unklare Strukturen oder hohe Komplexität.',
    low: 'Wenig Erklärungsmuster — Dinge werden als selbstverständlich betrachtet.',
    benchmark: 12,
    source: 'Czarniawska (1997): Narratives of organizing',
  },
  identitaet: {
    desc: 'Was die Organisation über sich selbst erzählt.',
    high: 'Starkes Wir-Gefühl — kann Stärke oder Abgrenzung bedeuten.',
    low: 'Schwache kollektive Identität — Orientierungsbedarf.',
    benchmark: 20,
    source: 'Boje (2001): Narrative methods for organizational research',
  },
  macht: {
    desc: 'Wer handelt, wer entscheidet, wer Objekt ist.',
    high: 'Zentralisierte Entscheidungsstrukturen — Hinweis auf hierarchische Erstarrung.',
    low: 'Wenig Machtbewusstsein — kann Klarheit oder blinde Flecken bedeuten.',
    benchmark: 15,
    source: 'Luhmann (2000): Organisation und Entscheidung',
  },
  veraenderung: {
    desc: 'Wie die Organisation mit Wandel umgeht.',
    high: 'Hohe Veränderungsdynamik oder -angst — Stabilisierung nötig.',
    low: 'Wenig Wandelnarrativ — möglicherweise Beharrungs- oder Zufriedenheitstendenz.',
    benchmark: 18,
    source: 'Czarniawska (1997): Narratives of organizing',
  },
  beziehung: {
    desc: 'Wie über interne und externe Beziehungen gesprochen wird.',
    high: 'Beziehungsthemen dominieren — Konflikte oder enge Vernetzung.',
    low: 'Wenig Beziehungsnarrativ — transaktionale Kultur.',
    benchmark: 18,
    source: 'Boje (2001): Narrative methods for organizational research',
  },
  erfolg: {
    desc: 'Wie Erfolge und Misserfolge erklärt werden.',
    high: 'Starke Ergebnisorientierung — oder ausgeprägte Schuldzuweisungskultur.',
    low: 'Wenig Erfolgs-/Scheiternsnarrativ — möglicherweise Reflexionslücke.',
    benchmark: 17,
    source: 'Weiner (1985): Attributionstheorie',
  },
};

const HIERARCHY_LABELS = {
  geschaeftsleitung: 'Geschäftsleitung',
  management: 'Mittleres Management',
  operativ: 'Operative Ebene',
};

function InfoPopup({ classKey }) {
  const [open, setOpen] = useState(false);
  const info = CLASS_INFO[classKey];
  if (!info) return null;
  return (
    <span style={{ position: 'relative', display: 'inline-block', verticalAlign: 'middle' }}>
      <button onClick={e => { e.stopPropagation(); setOpen(!open); }}
        style={{ width: '16px', height: '16px', borderRadius: '50%', border: '1px solid #ccc', background: '#f5f4f0', color: '#888', fontSize: '10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginLeft: '5px', fontFamily: 'inherit' }}>
        i
      </button>
      {open && (
        <div style={{ position: 'absolute', left: '22px', top: '-4px', zIndex: 30, background: '#fff', border: '1px solid #e5e5e0', borderRadius: '10px', padding: '14px', width: '240px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', fontSize: '12px', lineHeight: '1.6' }}>
          <div style={{ fontWeight: '600', marginBottom: '6px', fontSize: '13px' }}>{CLASS_LABELS[classKey]}</div>
          <div style={{ color: '#555', marginBottom: '8px' }}>{info.desc}</div>
          <div style={{ color: '#2a9d5c', marginBottom: '3px' }}>⬆ Hoch: {info.high}</div>
          <div style={{ color: '#e07b39', marginBottom: '8px' }}>⬇ Niedrig: {info.low}</div>
          <div style={{ color: '#888', fontSize: '11px', borderTop: '1px solid #f0f0f0', paddingTop: '7px' }}>
            Benchmark: {info.benchmark} % · {info.source}
          </div>
          <button onClick={() => setOpen(false)} style={{ position: 'absolute', top: '8px', right: '10px', background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: '16px' }}>×</button>
        </div>
      )}
    </span>
  );
}

function BenchmarkInfo() {
  const [open, setOpen] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={() => setOpen(!open)}
        style={{ padding: '3px 10px', background: '#f5f4f0', border: '1px solid #e5e5e0', borderRadius: '6px', fontSize: '11px', color: '#666', cursor: 'pointer', fontFamily: 'inherit' }}>
        ℹ Benchmark
      </button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: '28px', zIndex: 30, background: '#fff', border: '1px solid #e5e5e0', borderRadius: '10px', padding: '14px', width: '260px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', fontSize: '12px', lineHeight: '1.65' }}>
          <div style={{ fontWeight: '600', marginBottom: '8px', fontSize: '13px' }}>Referenzorganisation</div>
          <p style={{ color: '#555', marginBottom: '8px' }}>Die gestrichelte Fläche zeigt die Verteilung einer narrativ ausgeglichenen Organisation — weder Dominanz einer Klasse noch vollständiges Fehlen.</p>
          <p style={{ color: '#555', marginBottom: '8px' }}>Basierend auf: Czarniawska (1997), Boje (2001), Luhmann (2000), Weiner (1985).</p>
          <p style={{ color: '#888', fontSize: '11px' }}>Eine starke Abweichung ist selbst eine diagnostische Aussage — sie zeigt wo Handlungsbedarf besteht.</p>
          <button onClick={() => setOpen(false)} style={{ position: 'absolute', top: '8px', right: '10px', background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: '16px' }}>×</button>
        </div>
      )}
    </span>
  );
}

function OrgRadarChart({ classes }) {
  const data = CLASS_KEYS.map(k => ({
    subject: CLASS_LABELS[k].replace('narrative', '').replace('narr.', '').trim(),
    key: k,
    Organisation: classes[k] || 0,
    Benchmark: BENCHMARK[k],
  }));

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e5e0', borderRadius: '12px', padding: '18px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ fontSize: '11px', fontWeight: '500', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Kommunikationsklassen
        </div>
        <BenchmarkInfo />
      </div>
      <div style={{ height: '280px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
            <PolarGrid gridType="polygon" />
            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#666' }}
              tickFormatter={(val, i) => val} />
            <Radar name="Benchmark" dataKey="Benchmark" stroke="#bbb" fill="#e5e5e0" fillOpacity={0.3} strokeDasharray="4 3" strokeWidth={1.5} />
            <Radar name="Organisation" dataKey="Organisation" stroke="#534AB7" fill="#534AB7" fillOpacity={0.25} strokeWidth={2} />
            <Tooltip formatter={(v, name) => [`${v} %`, name]} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: '12px' }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      {/* Bar list with i buttons */}
      <div style={{ marginTop: '8px' }}>
        {CLASS_KEYS.map(k => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <div style={{ width: '150px', fontSize: '12px', color: '#666', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
              {CLASS_LABELS[k]}<InfoPopup classKey={k} />
            </div>
            <div style={{ flex: 1, background: '#f5f4f0', borderRadius: '3px', height: '7px', position: 'relative' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, height: '7px', borderRadius: '3px', background: CLASS_COLORS[k], width: `${classes[k] || 0}%` }} />
              {/* Benchmark marker */}
              <div style={{ position: 'absolute', top: '-3px', left: `${BENCHMARK[k]}%`, width: '2px', height: '13px', background: '#bbb', borderRadius: '1px' }} />
            </div>
            <div style={{ width: '36px', textAlign: 'right', fontSize: '11px', color: '#888' }}>{classes[k] || 0} %</div>
          </div>
        ))}
        <div style={{ fontSize: '10px', color: '#bbb', marginTop: '4px' }}>| = Benchmark</div>
      </div>
    </div>
  );
}

function ClusteredPhrases({ clustered }) {
  if (!clustered) return null;
  const allPhrases = Object.values(clustered).flat();
  if (!allPhrases.length) return null;
  const maxCount = Math.max(...allPhrases.map(p => p.count || 1), 1);

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e5e0', borderRadius: '12px', padding: '18px', marginBottom: '16px' }}>
      <div style={{ fontSize: '11px', fontWeight: '500', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
        Typische Narrative & Phrasen
      </div>
      {CLASS_KEYS.map(key => {
        const phrases = clustered[key];
        if (!phrases || !phrases.length) return null;
        const color = CLASS_COLORS[key];
        return (
          <div key={key} style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
              <span style={{ fontSize: '13px', fontWeight: '500' }}>{CLASS_LABELS[key]}</span>
              <InfoPopup classKey={key} />
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', paddingLeft: '14px' }}>
              {phrases.map((p, i) => {
                const intensity = maxCount > 1 ? (p.count - 1) / (maxCount - 1) : 0;
                const alpha = Math.round((0.18 + intensity * 0.65) * 255).toString(16).padStart(2, '0');
                return (
                  <span key={i} style={{ background: color + alpha, color: intensity > 0.55 ? '#fff' : '#333', fontSize: '12px', padding: '4px 10px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '5px', border: `1px solid ${color}30` }}>
                    {p.count > 1 && <span style={{ fontSize: '10px', fontWeight: '600', opacity: 0.85 }}>{p.count}×</span>}
                    {p.label}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function InterviewDetail({ id, onClose }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch(`${API}/api/interviews/${id}`).then(r => r.json()).then(setData).catch(() => {});
  }, [id]);
  if (!data) return <div style={{ padding: '14px', color: '#aaa', fontSize: '13px' }}>Wird geladen…</div>;
  const classes = data.narrative_classes?.classes || {};
  return (
    <div style={{ background: '#fafaf8', border: '1px solid #e5e5e0', borderRadius: '10px', padding: '16px', marginTop: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: '500' }}>Interview {data.label}</div>
          <div style={{ fontSize: '11px', color: '#999' }}>
            {data.hierarchy_level ? HIERARCHY_LABELS[data.hierarchy_level] : 'Ebene unbekannt'}
            {data.duration_minutes ? ` · ${data.duration_minutes} Min.` : ''}
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: '18px' }}>×</button>
      </div>
      {data.narrative_classes?.summary && (
        <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px', lineHeight: '1.6', background: '#fff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e5e5e0' }}>
          {data.narrative_classes.summary}
        </p>
      )}
      {CLASS_KEYS.map(k => (
        <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '7px' }}>
          <div style={{ width: '150px', fontSize: '11px', color: '#666', flexShrink: 0 }}>{CLASS_LABELS[k]}</div>
          <div style={{ flex: 1, background: '#e5e5e0', borderRadius: '3px', height: '6px' }}>
            <div style={{ width: `${classes[k] || 0}%`, height: '6px', borderRadius: '3px', background: CLASS_COLORS[k] }} />
          </div>
          <div style={{ width: '32px', textAlign: 'right', fontSize: '11px', color: '#888' }}>{classes[k] || 0} %</div>
        </div>
      ))}
      {data.narrative_classes?.key_phrases?.length > 0 && (
        <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {data.narrative_classes.key_phrases.map((p, i) => (
            <span key={i} style={{ background: '#EEEDFE', color: '#3C3489', fontSize: '11px', padding: '3px 8px', borderRadius: '6px' }}>{p}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Dashboard({ orgId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/dashboard?org_id=${orgId}`)
      .then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [orgId]);

  if (loading) return <div style={{ color: '#aaa', fontSize: '14px', padding: '40px 0' }}>Wird geladen…</div>;

  if (!data || data.total === 0) return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#aaa' }}>
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>📊</div>
      <p style={{ fontSize: '14px' }}>Noch keine Interviews vorhanden.</p>
      <p style={{ fontSize: '13px', marginTop: '8px' }}>Führen Sie das erste Interview durch und speichern Sie es.</p>
    </div>
  );

  const dominant = data.dominant ? CLASS_LABELS[data.dominant] : '–';

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        <div style={{ background: '#f5f4f0', borderRadius: '8px', padding: '14px 16px' }}>
          <div style={{ fontSize: '11px', color: '#888', marginBottom: '3px' }}>Interviews gesamt</div>
          <div style={{ fontSize: '22px', fontWeight: '500' }}>{data.total}</div>
          <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>5–10 empfohlen für KMU</div>
        </div>
        <div style={{ background: '#f5f4f0', borderRadius: '8px', padding: '14px 16px' }}>
          <div style={{ fontSize: '11px', color: '#888', marginBottom: '3px' }}>Dominante Klasse</div>
          <div style={{ fontSize: '14px', fontWeight: '500', paddingTop: '3px' }}>{dominant}</div>
          <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>{data.aggregate_classes[data.dominant] || 0} % aller Narrative</div>
        </div>
      </div>

      {/* Radar chart with benchmark */}
      <OrgRadarChart classes={data.aggregate_classes} />

      {/* Clustered phrases */}
      <ClusteredPhrases clustered={data.clustered_phrases} />

      {/* Individual interviews */}
      <div style={{ fontSize: '11px', fontWeight: '500', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Einzelinterviews</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
        {data.interviews.map(iv => (
          <div key={iv.id}>
            <div onClick={() => setSelected(selected === iv.id ? null : iv.id)}
              style={{ background: '#fff', border: `1px solid ${selected === iv.id ? '#534AB7' : '#e5e5e0'}`, borderRadius: '10px', padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#EEEDFE', color: '#3C3489', fontSize: '12px', fontWeight: '500', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{iv.label}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '500' }}>
                  Interview {iv.label}
                  {iv.dominant && <span style={{ marginLeft: '8px', background: '#EEEDFE', color: '#3C3489', fontSize: '10px', padding: '2px 7px', borderRadius: '5px' }}>{CLASS_LABELS[iv.dominant]}</span>}
                </div>
                <div style={{ fontSize: '11px', color: '#999' }}>
                  {iv.hierarchy_level ? HIERARCHY_LABELS[iv.hierarchy_level] : 'Ebene unbekannt'}
                  {iv.duration_minutes ? ` · ${iv.duration_minutes} Min.` : ''}
                </div>
              </div>
              <span style={{ color: '#ccc', fontSize: '12px' }}>{selected === iv.id ? '▲' : '▼'}</span>
            </div>
            {selected === iv.id && <InterviewDetail id={iv.id} onClose={() => setSelected(null)} />}
          </div>
        ))}
      </div>
    </div>
  );
}
