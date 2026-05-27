import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const API = import.meta.env.VITE_API_URL || '';

const CLASS_LABELS = {
  erklaerung: 'Erklärungsnarrative',
  identitaet: 'Identitätsnarrative',
  macht: 'Machtnarrative',
  veraenderung: 'Veränderungsnarrative',
  beziehung: 'Beziehungsnarrative',
  erfolg: 'Erfolgs-/Scheiternsnarrative',
};

const CLASS_COLORS = {
  erklaerung: '#BA7517', identitaet: '#378ADD', macht: '#534AB7',
  veraenderung: '#1D9E75', beziehung: '#D85A30', erfolg: '#888780',
};

const CLASS_INFO = {
  erklaerung: { desc: 'Wie die Organisation erklärt, warum Dinge so sind wie sie sind.', examples: ['"Das liegt am Markt"', '"Das hat historische Gründe"', '"Das kommt von oben"'] },
  identitaet: { desc: 'Was die Organisation über sich selbst erzählt.', examples: ['"Wir sind eine Familie"', '"Wir sind Pioniere"', '"Wir kämpfen gegen die Großen"'] },
  macht: { desc: 'Wer handelt, wer entscheidet, wer Objekt ist.', examples: ['"Bei uns entscheidet immer..."', '"Wir werden nie gefragt"', '"Das wird von oben bestimmt"'] },
  veraenderung: { desc: 'Wie die Organisation mit Wandel umgeht.', examples: ['"Das haben wir schon immer so gemacht"', '"Früher war alles besser"', '"Wir sind im Aufbruch"'] },
  beziehung: { desc: 'Wie über interne und externe Beziehungen gesprochen wird.', examples: ['"Wir gegen die anderen Abteilungen"', '"Unsere Kunden verstehen uns nicht"', '"Mit dem Team läuft alles"'] },
  erfolg: { desc: 'Wie Erfolge und Misserfolge erklärt werden.', examples: ['"Das haben wir erreicht weil wir..."', '"Das ist gescheitert weil die anderen..."', '"Wir hätten es besser wissen müssen"'] },
};

const HIERARCHY_LABELS = {
  geschaeftsleitung: 'Geschäftsleitung',
  management: 'Mittleres Management',
  operativ: 'Operative Ebene',
};

function InfoTooltip({ classKey }) {
  const [open, setOpen] = useState(false);
  const info = CLASS_INFO[classKey];
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={() => setOpen(!open)}
        style={{ width: '16px', height: '16px', borderRadius: '50%', border: '1px solid #ccc', background: '#f5f4f0', color: '#888', fontSize: '10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginLeft: '5px', fontFamily: 'inherit', verticalAlign: 'middle', flexShrink: 0 }}>
        i
      </button>
      {open && (
        <div style={{ position: 'absolute', left: '20px', top: '-4px', zIndex: 10, background: '#fff', border: '1px solid #e5e5e0', borderRadius: '10px', padding: '12px 14px', width: '240px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', fontSize: '12px', lineHeight: '1.6' }}>
          <div style={{ fontWeight: '500', color: '#1a1a1a', marginBottom: '6px' }}>{CLASS_LABELS[classKey]}</div>
          <div style={{ color: '#666', marginBottom: '8px' }}>{info.desc}</div>
          <div style={{ color: '#999', fontSize: '11px' }}>Typische Aussagen:</div>
          {info.examples.map((ex, i) => <div key={i} style={{ color: '#534AB7', fontSize: '11px', marginTop: '3px' }}>{ex}</div>)}
          <button onClick={() => setOpen(false)} style={{ position: 'absolute', top: '8px', right: '10px', background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: '14px' }}>×</button>
        </div>
      )}
    </span>
  );
}

function BarChart({ classes }) {
  const sorted = Object.entries(classes).sort((a, b) => b[1] - a[1]);
  return (
    <div>
      {sorted.map(([key, val]) => (
        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '9px' }}>
          <div style={{ width: '170px', fontSize: '12px', color: '#666', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
            {CLASS_LABELS[key]} <InfoTooltip classKey={key} />
          </div>
          <div style={{ flex: 1, background: '#f5f4f0', borderRadius: '3px', height: '8px' }}>
            <div style={{ width: `${val}%`, height: '8px', borderRadius: '3px', background: CLASS_COLORS[key] }} />
          </div>
          <div style={{ width: '36px', textAlign: 'right', fontSize: '11px', color: '#888' }}>{val} %</div>
        </div>
      ))}
    </div>
  );
}

function TypicalNarratives({ interviews }) {
  // aggregate key_phrases per class from all interviews
  const byClass = {};
  for (const iv of interviews) {
    if (!iv.narrative_classes?.classes) continue;
    const dominant = iv.narrative_classes.dominant;
    const phrases = iv.narrative_classes.key_phrases || [];
    if (dominant && phrases.length) {
      if (!byClass[dominant]) byClass[dominant] = [];
      byClass[dominant].push(...phrases);
    }
  }
  const entries = Object.entries(byClass).sort((a, b) => b[1].length - a[1].length);
  if (!entries.length) return null;

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e5e0', borderRadius: '12px', padding: '18px', marginBottom: '16px' }}>
      <div style={{ fontSize: '11px', fontWeight: '500', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>Typische Narrative & Phrasen</div>
      {entries.map(([key, phrases]) => {
        const unique = [...new Set(phrases)];
        return (
          <div key={key} style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '7px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: CLASS_COLORS[key], flexShrink: 0, display: 'inline-block' }} />
              <span style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a' }}>{CLASS_LABELS[key]}</span>
              <InfoTooltip classKey={key} />
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', paddingLeft: '14px' }}>
              {unique.map((p, i) => (
                <span key={i} style={{ background: '#f5f4f0', color: '#555', fontSize: '12px', padding: '4px 10px', borderRadius: '6px', borderLeft: `3px solid ${CLASS_COLORS[key]}` }}>
                  {p}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function InterviewDetail({ id, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/interviews/${id}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ padding: '16px', color: '#888', fontSize: '13px' }}>Wird geladen…</div>;
  if (!data) return null;

  const classes = data.narrative_classes?.classes || {};
  const sorted = Object.entries(classes).sort((a, b) => b[1] - a[1]);
  const pieData = sorted.filter(([,v]) => v > 0).map(([k, v]) => ({ name: CLASS_LABELS[k], value: v, color: CLASS_COLORS[k] }));

  return (
    <div style={{ background: '#fafaf8', border: '1px solid #e5e5e0', borderRadius: '10px', padding: '16px', marginTop: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: '500' }}>Interview {data.label}</div>
          <div style={{ fontSize: '11px', color: '#999' }}>
            {data.hierarchy_level ? HIERARCHY_LABELS[data.hierarchy_level] || data.hierarchy_level : 'Ebene unbekannt'}
            {data.duration_minutes ? ` · ${data.duration_minutes} Min.` : ''}
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#aaa' }}>×</button>
      </div>

      {data.narrative_classes?.summary && (
        <p style={{ fontSize: '13px', color: '#666', marginBottom: '14px', lineHeight: '1.6', background: '#fff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e5e5e0' }}>
          {data.narrative_classes.summary}
        </p>
      )}

      <div style={{ height: '180px', marginBottom: '14px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={30}>
              {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Pie>
            <Tooltip formatter={(v) => `${v} %`} />
            <Legend iconSize={9} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {sorted.map(([key, val]) => (
        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '7px' }}>
          <div style={{ width: '160px', fontSize: '11px', color: '#666', flexShrink: 0 }}>{CLASS_LABELS[key]}</div>
          <div style={{ flex: 1, background: '#e5e5e0', borderRadius: '3px', height: '6px' }}>
            <div style={{ width: `${val}%`, height: '6px', borderRadius: '3px', background: CLASS_COLORS[key] }} />
          </div>
          <div style={{ width: '32px', textAlign: 'right', fontSize: '11px', color: '#888' }}>{val} %</div>
        </div>
      ))}

      {data.narrative_classes?.key_phrases?.length > 0 && (
        <div style={{ marginTop: '12px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
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
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ color: '#888', fontSize: '14px', padding: '40px 0' }}>Wird geladen…</div>;

  if (!data || data.total === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#888' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>📊</div>
        <p style={{ fontSize: '14px' }}>Noch keine Interviews vorhanden.</p>
        <p style={{ fontSize: '13px', marginTop: '8px' }}>Führen Sie das erste Interview durch und speichern Sie es.</p>
      </div>
    );
  }

  const dominant = data.dominant ? CLASS_LABELS[data.dominant] : '–';
  const pieData = Object.entries(data.aggregate_classes)
    .filter(([,v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => ({ name: CLASS_LABELS[k], value: v, color: CLASS_COLORS[k] }));

  return (
    <div>
      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        <div style={{ background: '#f5f4f0', borderRadius: '8px', padding: '14px 16px' }}>
          <div style={{ fontSize: '11px', color: '#888', marginBottom: '3px' }}>Interviews gesamt</div>
          <div style={{ fontSize: '22px', fontWeight: '500' }}>{data.total}</div>
          <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>5–10 empfohlen für KMU</div>
        </div>
        <div style={{ background: '#f5f4f0', borderRadius: '8px', padding: '14px 16px' }}>
          <div style={{ fontSize: '11px', color: '#888', marginBottom: '3px' }}>Dominante Klasse</div>
          <div style={{ fontSize: '15px', fontWeight: '500', paddingTop: '3px' }}>{dominant}</div>
          <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>{data.aggregate_classes[data.dominant] || 0} % aller Narrative</div>
        </div>
      </div>

      {/* Pie + Bar */}
      <div style={{ background: '#fff', border: '1px solid #e5e5e0', borderRadius: '12px', padding: '18px', marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', fontWeight: '500', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>Kommunikationsklassen (Durchschnitt)</div>
        <div style={{ height: '200px', marginBottom: '18px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={72} innerRadius={28}>
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v) => `${v} %`} />
              <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <BarChart classes={data.aggregate_classes} />
      </div>

      {/* Typical narratives */}
      <TypicalNarratives interviews={data.interviews.map(iv => ({ narrative_classes: { dominant: iv.dominant, key_phrases: iv.key_phrases, classes: {} } }))} />

      {/* Individual interviews */}
      <div style={{ fontSize: '11px', fontWeight: '500', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Einzelinterviews</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
        {data.interviews.map(iv => (
          <div key={iv.id}>
            <div onClick={() => setSelected(selected === iv.id ? null : iv.id)}
              style={{ background: '#fff', border: `1px solid ${selected === iv.id ? '#534AB7' : '#e5e5e0'}`, borderRadius: '10px', padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#EEEDFE', color: '#3C3489', fontSize: '12px', fontWeight: '500', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {iv.label}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '500' }}>
                  Interview {iv.label}
                  {iv.dominant && (
                    <span style={{ marginLeft: '8px', background: '#EEEDFE', color: '#3C3489', fontSize: '10px', padding: '2px 7px', borderRadius: '5px' }}>
                      {CLASS_LABELS[iv.dominant]}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: '#999' }}>
                  {iv.hierarchy_level ? HIERARCHY_LABELS[iv.hierarchy_level] || iv.hierarchy_level : 'Ebene unbekannt'}
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
