import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const API = import.meta.env.VITE_API_URL || '';

const CLASS_LABELS = {
  erklaerung: 'Erklärungsnarrative',
  identitaet: 'Identitätsnarrative',
  macht: 'Machtnarrative',
  veraenderung: 'Veränderungsnarrative',
  beziehung: 'Beziehungsnarrative',
  erfolg: 'Erfolgs-/Scheiternsnarr.',
};

const CLASS_COLORS = {
  erklaerung: '#BA7517',
  identitaet: '#378ADD',
  macht: '#534AB7',
  veraenderung: '#1D9E75',
  beziehung: '#D85A30',
  erfolg: '#888780',
};

const HIERARCHY_LABELS = {
  geschaeftsleitung: 'Geschäftsleitung',
  management: 'Mittleres Management',
  operativ: 'Operative Ebene',
};

function StatCard({ label, value, sub }) {
  return (
    <div style={{ background: '#f5f4f0', borderRadius: '8px', padding: '14px 16px' }}>
      <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '22px', fontWeight: '500', color: '#1a1a1a' }}>{value}</div>
      {sub && <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>{sub}</div>}
    </div>
  );
}

function BarChart({ classes }) {
  const sorted = Object.entries(classes).sort((a, b) => b[1] - a[1]);
  return (
    <div>
      {sorted.map(([key, val]) => (
        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '9px' }}>
          <div style={{ width: '160px', fontSize: '12px', color: '#666', flexShrink: 0 }}>{CLASS_LABELS[key]}</div>
          <div style={{ flex: 1, background: '#f5f4f0', borderRadius: '3px', height: '8px' }}>
            <div style={{ width: `${val}%`, height: '8px', borderRadius: '3px', background: CLASS_COLORS[key] }} />
          </div>
          <div style={{ width: '36px', textAlign: 'right', fontSize: '11px', color: '#888' }}>{val} %</div>
        </div>
      ))}
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

  if (loading) return <div style={{ padding: '20px', color: '#888', fontSize: '14px' }}>Wird geladen…</div>;
  if (!data) return null;

  const classes = data.narrative_classes?.classes || {};
  const pieData = Object.entries(classes).map(([k, v]) => ({ name: CLASS_LABELS[k], value: v, color: CLASS_COLORS[k] }));

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e5e0', borderRadius: '12px', padding: '20px', marginTop: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '15px', fontWeight: '500' }}>Interview {data.label}</div>
          <div style={{ fontSize: '12px', color: '#999' }}>
            {data.hierarchy_level ? HIERARCHY_LABELS[data.hierarchy_level] || data.hierarchy_level : 'Ebene unbekannt'}
            {data.duration_minutes ? ` · ${data.duration_minutes} Min.` : ''}
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#888' }}>✕</button>
      </div>

      {data.narrative_classes?.summary && (
        <p style={{ fontSize: '13px', color: '#666', marginBottom: '16px', lineHeight: '1.6', background: '#f5f4f0', padding: '12px', borderRadius: '8px' }}>
          {data.narrative_classes.summary}
        </p>
      )}

      {pieData.length > 0 && (
        <div style={{ height: '200px', marginBottom: '16px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${value}%`} labelLine={false}>
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v) => `${v} %`} />
              <Legend iconSize={10} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {data.narrative_classes?.key_phrases?.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {data.narrative_classes.key_phrases.map((p, i) => (
            <span key={i} style={{ background: '#EEEDFE', color: '#3C3489', fontSize: '11px', padding: '3px 8px', borderRadius: '6px' }}>{p}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/dashboard?org_id=default`)
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
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: CLASS_LABELS[k], value: v, color: CLASS_COLORS[k] }));

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
        <StatCard label="Interviews gesamt" value={data.total} sub="5–10 empfohlen für KMU" />
        <StatCard label="Dominante Klasse" value={dominant} sub={`${data.aggregate_classes[data.dominant] || 0} % aller Narrative`} />
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e5e0', borderRadius: '12px', padding: '18px', marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', fontWeight: '500', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>Kommunikationsklassen (Durchschnitt)</div>
        <div style={{ height: '200px', marginBottom: '16px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ value }) => `${value}%`} labelLine={false}>
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v) => `${v} %`} />
              <Legend iconSize={10} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <BarChart classes={data.aggregate_classes} />
      </div>

      <div style={{ fontSize: '11px', fontWeight: '500', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Einzelinterviews</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
        {data.interviews.map(iv => (
          <div key={iv.id}>
            <div
              onClick={() => setSelected(selected === iv.id ? null : iv.id)}
              style={{ background: '#fff', border: `1px solid ${selected === iv.id ? '#534AB7' : '#e5e5e0'}`, borderRadius: '10px', padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
            >
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
              <span style={{ color: '#aaa', fontSize: '16px' }}>{selected === iv.id ? '▲' : '▼'}</span>
            </div>
            {selected === iv.id && <InterviewDetail id={iv.id} onClose={() => setSelected(null)} />}
          </div>
        ))}
      </div>
    </div>
  );
}
