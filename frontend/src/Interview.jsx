import React, { useState, useRef, useEffect } from 'react';

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

const HIERARCHY_OPTIONS = [
  { value: '', label: 'Nicht angegeben' },
  { value: 'geschaeftsleitung', label: 'Geschäftsleitung' },
  { value: 'management', label: 'Mittleres Management' },
  { value: 'operativ', label: 'Operative Ebene' },
];

function PhaseIndicator({ phase }) {
  const phases = ['Begrüssung', 'Erlebniskurve', 'Haupterzählung', 'Abschluss'];
  return (
    <div style={{ display: 'flex', marginBottom: '20px' }}>
      {phases.map((p, i) => (
        <div key={i} style={{
          flex: 1,
          padding: '8px 4px',
          fontSize: '11px',
          textAlign: 'center',
          color: i === phase ? '#534AB7' : i < phase ? '#888' : '#bbb',
          borderBottom: `2px solid ${i === phase ? '#534AB7' : i < phase ? '#ccc' : '#e5e5e0'}`,
          fontWeight: i === phase ? '500' : '400',
        }}>
          {i + 1} · {p}
        </div>
      ))}
    </div>
  );
}

function ChatBubble({ role, text }) {
  const isUser = role === 'user';
  return (
    <div style={{ display: 'flex', gap: '10px', flexDirection: isUser ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
      <div style={{
        width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
        background: isUser ? '#E6F1FB' : '#EEEDFE',
        color: isUser ? '#0C447C' : '#3C3489',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '10px', fontWeight: '500',
      }}>
        {isUser ? 'Sie' : 'KI'}
      </div>
      <div style={{
        maxWidth: '78%', padding: '10px 14px', borderRadius: '12px',
        fontSize: '14px', lineHeight: '1.6',
        background: isUser ? '#534AB7' : '#fff',
        color: isUser ? '#fff' : '#1a1a1a',
        border: isUser ? 'none' : '1px solid #e5e5e0',
        whiteSpace: 'pre-wrap',
      }}>
        {text}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#EEEDFE', color: '#3C3489', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '500', flexShrink: 0 }}>KI</div>
      <div style={{ padding: '12px 16px', background: '#fff', border: '1px solid #e5e5e0', borderRadius: '12px', display: 'flex', gap: '4px', alignItems: 'center' }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            width: '6px', height: '6px', borderRadius: '50%', background: '#bbb',
            animation: 'pulse 1.2s infinite', animationDelay: `${i * 0.2}s`,
          }} />
        ))}
      </div>
    </div>
  );
}

function NarrativeResult({ data, label }) {
  const classes = data?.classes || {};
  const sorted = Object.entries(classes).sort((a, b) => b[1] - a[1]);
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e5e0', borderRadius: '12px', padding: '20px', marginTop: '16px' }}>
      <div style={{ fontSize: '13px', fontWeight: '500', color: '#666', marginBottom: '4px' }}>Interview {label} — Narrativ-Analyse</div>
      <div style={{ fontSize: '12px', color: '#999', marginBottom: '16px' }}>{data?.summary}</div>
      {sorted.map(([key, val]) => (
        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <div style={{ width: '160px', fontSize: '12px', color: '#666', flexShrink: 0 }}>{CLASS_LABELS[key]}</div>
          <div style={{ flex: 1, background: '#f5f4f0', borderRadius: '3px', height: '7px' }}>
            <div style={{ width: `${val}%`, height: '7px', borderRadius: '3px', background: CLASS_COLORS[key], transition: 'width 0.6s' }} />
          </div>
          <div style={{ width: '36px', textAlign: 'right', fontSize: '11px', color: '#888' }}>{val} %</div>
        </div>
      ))}
      {data?.key_phrases?.length > 0 && (
        <div style={{ marginTop: '12px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {data.key_phrases.map((p, i) => (
            <span key={i} style={{ background: '#EEEDFE', color: '#3C3489', fontSize: '11px', padding: '3px 8px', borderRadius: '6px' }}>{p}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Interview() {
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState(0);
  const [done, setDone] = useState(false);
  const [hierarchyLevel, setHierarchyLevel] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [startTime] = useState(Date.now());
  const chatRef = useRef(null);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, busy]);

  function detectPhase(text) {
    const t = text.toLowerCase();
    if (t.includes('erlebniskurve') || t.includes('zeitachse')) setPhase(1);
    else if ((t.includes('erzählen sie') || t.includes('erzählen sie mir')) && t.includes('anfang')) setPhase(2);
    if (t.includes('herzlich bedanken') || t.includes('am ende angelangt')) setPhase(3);
  }

  async function callAPI(msgs) {
    setBusy(true);
    try {
      const res = await fetch(`${API}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: msgs }),
      });
      const data = await res.json();
      if (data.reply) {
        const updated = [...msgs, { role: 'assistant', content: data.reply }];
        setMessages(updated);
        detectPhase(data.reply);
        if (data.reply.toLowerCase().includes('auf wiederhören') || data.reply.toLowerCase().includes('gespräch ist hiermit beendet')) {
          setDone(true);
        }
      }
    } catch (e) {
      setMessages(m => [...m, { role: 'assistant', content: 'Verbindungsfehler. Bitte versuchen Sie es erneut.' }]);
    }
    setBusy(false);
  }

  async function startInterview() {
    setStarted(true);
    await callAPI([]);
  }

  async function sendMsg() {
    if (!input.trim() || busy) return;
    const text = input.trim();
    setInput('');
    const updated = [...messages, { role: 'user', content: text }];
    setMessages(updated);
    await callAPI(updated);
  }

  async function saveInterview() {
    setSaving(true);
    try {
      const duration = Math.round((Date.now() - startTime) / 60000);
      const res = await fetch(`${API}/api/interviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: messages,
          duration_minutes: duration,
          hierarchy_level: hierarchyLevel || null,
          org_id: 'default',
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      alert('Fehler beim Speichern.');
    }
    setSaving(false);
  }

  if (!started) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '24px' }}>🎙️</div>
        <h2 style={{ fontSize: '22px', fontWeight: '500', marginBottom: '12px' }}>Narratives Interview</h2>
        <p style={{ color: '#666', fontSize: '14px', maxWidth: '360px', margin: '0 auto 8px', lineHeight: '1.6' }}>
          Ein KI-Bot begleitet Sie durch ein Gespräch über Ihre Erfahrungen in der Organisation.
        </p>
        <p style={{ color: '#999', fontSize: '13px', maxWidth: '360px', margin: '0 auto 32px', lineHeight: '1.6' }}>
          Dauer: 30–60 Minuten · Vollständig anonym · Keine richtigen oder falschen Antworten
        </p>
        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '8px' }}>Ihre Position (optional)</label>
          <select
            value={hierarchyLevel}
            onChange={e => setHierarchyLevel(e.target.value)}
            style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #e5e5e0', fontSize: '13px', background: '#fff', color: '#1a1a1a', fontFamily: 'inherit', minWidth: '220px' }}
          >
            {HIERARCHY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <button
          onClick={startInterview}
          style={{ padding: '12px 32px', background: '#534AB7', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Interview starten
        </button>
      </div>
    );
  }

  return (
    <div>
      <style>{`@keyframes pulse { 0%,80%,100%{opacity:0.3} 40%{opacity:1} }`}</style>
      <PhaseIndicator phase={phase} />
      <div ref={chatRef} style={{ background: '#f5f4f0', borderRadius: '12px', padding: '16px', minHeight: '320px', maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '12px' }}>
        {messages.map((m, i) => <ChatBubble key={i} role={m.role} text={m.content} />)}
        {busy && <TypingIndicator />}
      </div>

      {!done ? (
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMsg()}
            placeholder="Ihre Antwort..."
            disabled={busy}
            style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #e5e5e0', fontSize: '14px', background: '#fff', color: '#1a1a1a', fontFamily: 'inherit' }}
          />
          <button
            onClick={sendMsg}
            disabled={busy || !input.trim()}
            style={{ padding: '10px 18px', background: busy || !input.trim() ? '#e5e5e0' : '#534AB7', color: busy || !input.trim() ? '#999' : '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
          >
            Senden
          </button>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e5e5e0', borderRadius: '12px', padding: '20px' }}>
          {!result ? (
            <>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
                Das Interview ist beendet. Möchten Sie es speichern und analysieren?
              </p>
              <button
                onClick={saveInterview}
                disabled={saving}
                style={{ padding: '10px 24px', background: '#534AB7', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {saving ? 'Wird analysiert…' : 'Speichern & analysieren'}
              </button>
            </>
          ) : (
            <NarrativeResult data={result.narrative_classes} label={result.label} />
          )}
        </div>
      )}
    </div>
  );
}
