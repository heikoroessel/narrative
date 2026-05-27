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
  erklaerung: '#BA7517', identitaet: '#378ADD', macht: '#534AB7',
  veraenderung: '#1D9E75', beziehung: '#D85A30', erfolg: '#888780',
};

const HIERARCHY_OPTIONS = [
  { value: '', label: 'Nicht angegeben' },
  { value: 'geschaeftsleitung', label: 'Geschäftsleitung' },
  { value: 'management', label: 'Mittleres Management' },
  { value: 'operativ', label: 'Operative Ebene' },
];

function detectBrowser() {
  const ua = navigator.userAgent;
  if (/Safari/.test(ua) && !/Chrome/.test(ua)) return 'safari';
  if (/Chrome/.test(ua)) return 'chrome';
  if (/Firefox/.test(ua)) return 'firefox';
  return 'other';
}

function ChatBubble({ role, text }) {
  const isUser = role === 'user';
  return (
    <div style={{ display: 'flex', gap: '10px', flexDirection: isUser ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
      <div style={{ width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0, background: isUser ? '#E6F1FB' : '#EEEDFE', color: isUser ? '#0C447C' : '#3C3489', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '500' }}>
        {isUser ? 'Sie' : 'KI'}
      </div>
      <div style={{ maxWidth: '78%', padding: '10px 14px', borderRadius: '12px', fontSize: '14px', lineHeight: '1.6', background: isUser ? '#534AB7' : '#fff', color: isUser ? '#fff' : '#1a1a1a', border: isUser ? 'none' : '1px solid #e5e5e0', whiteSpace: 'pre-wrap' }}>
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
        {[0,1,2].map(i => <span key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#bbb', animation: 'pulse 1.2s infinite', animationDelay: `${i*0.2}s` }} />)}
      </div>
    </div>
  );
}

function NarrativeResult({ data, label }) {
  const classes = data?.classes || {};
  const sorted = Object.entries(classes).sort((a, b) => b[1] - a[1]);
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e5e0', borderRadius: '12px', padding: '20px' }}>
      <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Interview {label} — gespeichert ✓</div>
      <div style={{ fontSize: '12px', color: '#999', marginBottom: '16px', lineHeight: '1.6' }}>{data?.summary}</div>
      {sorted.map(([key, val]) => (
        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <div style={{ width: '160px', fontSize: '12px', color: '#666', flexShrink: 0 }}>{CLASS_LABELS[key]}</div>
          <div style={{ flex: 1, background: '#f5f4f0', borderRadius: '3px', height: '7px' }}>
            <div style={{ width: `${val}%`, height: '7px', borderRadius: '3px', background: CLASS_COLORS[key] }} />
          </div>
          <div style={{ width: '36px', textAlign: 'right', fontSize: '11px', color: '#888' }}>{val} %</div>
        </div>
      ))}
      {data?.key_phrases?.length > 0 && (
        <div style={{ marginTop: '12px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {data.key_phrases.map((p, i) => <span key={i} style={{ background: '#EEEDFE', color: '#3C3489', fontSize: '11px', padding: '3px 8px', borderRadius: '6px' }}>{p}</span>)}
        </div>
      )}
      <div style={{ marginTop: '16px', fontSize: '13px', color: '#888' }}>Das Interview ist im Dashboard sichtbar.</div>
    </div>
  );
}

export default function Interview({ orgId }) {
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [ended, setEnded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [hierarchyLevel, setHierarchyLevel] = useState('');
  const [startTime] = useState(Date.now());
  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef(null);
  const chatRef = useRef(null);
  const inputRef = useRef(null);
  const browser = detectBrowser();

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) setSpeechSupported(true);
  }, []);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, busy, interimText]);

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
      }
    } catch (e) {
      setMessages(m => [...m, { role: 'assistant', content: 'Verbindungsfehler. Bitte versuchen Sie es erneut.' }]);
    }
    setBusy(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  async function startInterview() {
    setStarted(true);
    await callAPI([]);
  }

  async function sendMsg() {
    const text = (input + (interimText ? ' ' + interimText : '')).trim();
    if (!text || busy || ended) return;
    // stop recording if active
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
    }
    setInput('');
    setInterimText('');
    const updated = [...messages, { role: 'user', content: text }];
    setMessages(updated);
    await callAPI(updated);
  }

  function toggleSpeech() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = 'de-DE';
    rec.continuous = true;
    rec.interimResults = true;
    rec.onstart = () => setListening(true);
    rec.onresult = (e) => {
      let interim = '';
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + ' ';
        else interim += e.results[i][0].transcript;
      }
      if (final) setInput(prev => (prev + final).trimStart());
      setInterimText(interim);
    };
    rec.onerror = (e) => {
      if (e.error !== 'no-speech') { setListening(false); setInterimText(''); }
    };
    rec.onend = () => {
      // restart if still listening (browser auto-stops on silence)
      if (recognitionRef.current?._shouldRestart) {
        try { rec.start(); } catch(e) {}
      } else {
        setListening(false);
        setInterimText('');
      }
    };
    recognitionRef.current = rec;
    recognitionRef.current._shouldRestart = true;
    rec.start();
  }

  function stopSpeech() {
    if (recognitionRef.current) {
      recognitionRef.current._shouldRestart = false;
      recognitionRef.current.stop();
    }
    setListening(false);
    setInterimText('');
  }

  function endInterview() {
    if (window.confirm('Interview jetzt beenden?')) {
      stopSpeech();
      setEnded(true);
    }
  }

  async function saveInterview() {
    if (messages.length < 2) { alert('Das Interview ist zu kurz zum Speichern.'); return; }
    setSaving(true);
    try {
      const duration = Math.max(Math.round((Date.now() - startTime) / 60000), 1);
      const res = await fetch(`${API}/api/interviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: messages, duration_minutes: duration, hierarchy_level: hierarchyLevel || null, org_id: 'default' }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      alert('Fehler beim Speichern. Bitte versuchen Sie es erneut.');
    }
    setSaving(false);
  }

  const micBtnStyle = {
    width: '38px', height: '38px', borderRadius: '50%', border: listening ? '2px solid #E24B4A' : '1px solid #e5e5e0',
    cursor: 'pointer', background: listening ? '#fff0f0' : '#fff',
    color: listening ? '#E24B4A' : '#534AB7', fontSize: '17px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    transition: 'all 0.2s',
  };

  // Start screen
  if (!started) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
        </div>
        <h2 style={{ fontSize: '22px', fontWeight: '500', marginBottom: '12px' }}>Narratives Interview</h2>
        <p style={{ color: '#666', fontSize: '14px', maxWidth: '380px', margin: '0 auto 8px', lineHeight: '1.7' }}>
          Ein KI-Bot begleitet Sie durch ein Gespräch über Ihre Erfahrungen in der Organisation. Es gibt keine richtigen oder falschen Antworten — erzählen Sie einfach Ihre Geschichte.
        </p>
        <p style={{ color: '#999', fontSize: '13px', maxWidth: '380px', margin: '0 auto 28px', lineHeight: '1.6' }}>
          Dauer: 30–60 Minuten · Vollständig anonym · Sie können das Interview jederzeit über "Interview beenden" abschliessen.
        </p>
        <div style={{ marginBottom: '28px' }}>
          <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '8px' }}>Ihre Position (optional)</label>
          <select value={hierarchyLevel} onChange={e => setHierarchyLevel(e.target.value)}
            style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #e5e5e0', fontSize: '13px', background: '#fff', color: '#1a1a1a', fontFamily: 'inherit', minWidth: '220px' }}>
            {HIERARCHY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        {speechSupported && (
          <div style={{ background: '#f5f4f0', borderRadius: '10px', padding: '12px 16px', maxWidth: '380px', margin: '0 auto 24px', textAlign: 'left' }}>
            <div style={{ fontSize: '12px', fontWeight: '500', color: '#444', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
              Spracheingabe verfügbar
            </div>
            <div style={{ fontSize: '11px', color: '#888' }}>
              {browser === 'firefox' ? 'Firefox unterstützt Spracheingabe nur eingeschränkt — Chrome oder Safari empfohlen.' : 'Mikrofon-Button klicken — der Browser fragt einmalig nach Erlaubnis. Sprechen Sie in Ruhe, Pausen sind kein Problem. Drücken Sie Senden wenn Sie fertig sind.'}
            </div>
          </div>
        )}
        <button onClick={startInterview}
          style={{ padding: '12px 32px', background: '#534AB7', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', cursor: 'pointer', fontFamily: 'inherit' }}>
          Interview starten
        </button>
      </div>
    );
  }

  // Save/result screen
  if (ended) {
    return (
      <div style={{ maxWidth: '560px', margin: '40px auto' }}>
        <style>{`@keyframes pulse { 0%,80%,100%{opacity:0.3} 40%{opacity:1} }`}</style>
        {!result ? (
          <div style={{ background: '#fff', border: '1px solid #e5e5e0', borderRadius: '12px', padding: '28px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>✓</div>
            <div style={{ fontSize: '15px', fontWeight: '500', marginBottom: '8px' }}>Interview beendet</div>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px', lineHeight: '1.6' }}>
              {messages.filter(m => m.role === 'user').length} Beiträge · ca. {Math.max(Math.round((Date.now() - startTime) / 60000), 1)} Min.
            </p>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '8px' }}>Position bestätigen (optional)</label>
              <select value={hierarchyLevel} onChange={e => setHierarchyLevel(e.target.value)}
                style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #e5e5e0', fontSize: '13px', background: '#fff', color: '#1a1a1a', fontFamily: 'inherit', minWidth: '220px' }}>
                {HIERARCHY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <button onClick={saveInterview} disabled={saving}
              style={{ padding: '11px 28px', background: '#534AB7', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Wird analysiert…' : 'Speichern & analysieren'}
            </button>
          </div>
        ) : (
          <NarrativeResult data={result.narrative_classes} label={result.label} />
        )}
      </div>
    );
  }

  // Interview screen
  const displayText = input + (interimText ? (input ? ' ' : '') + interimText : '');

  return (
    <div>
      <style>{`@keyframes pulse { 0%,80%,100%{opacity:0.3} 40%{opacity:1} }`}</style>

      <div ref={chatRef} style={{ background: '#f5f4f0', borderRadius: '12px', padding: '16px', minHeight: '320px', maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '14px' }}>
        {messages.map((m, i) => <ChatBubble key={i} role={m.role} text={m.content} />)}
        {busy && <TypingIndicator />}
      </div>

      {/* Input area */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', marginBottom: '8px' }}>
        {speechSupported && (
          <button
            onClick={listening ? stopSpeech : toggleSpeech}
            title={listening ? 'Aufnahme stoppen' : 'Spracheingabe starten'}
            style={micBtnStyle}
          >
            {listening
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="#E24B4A"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
            }
          </button>
        )}
        <textarea
          ref={inputRef}
          value={displayText}
          onChange={e => { if (!listening) setInput(e.target.value); }}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
          placeholder={listening ? 'Sprechen Sie — Pausen sind kein Problem…' : 'Ihre Antwort… (Enter zum Senden, Shift+Enter für neue Zeile)'}
          disabled={busy}
          rows={3}
          style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: `1px solid ${listening ? '#E24B4A' : '#e5e5e0'}`, fontSize: '14px', background: listening ? '#fff8f8' : '#fff', color: '#1a1a1a', fontFamily: 'inherit', resize: 'vertical', minHeight: '70px', lineHeight: '1.5', transition: 'border-color 0.2s' }}
        />
        <button onClick={sendMsg}
          disabled={busy || !displayText.trim()}
          style={{ padding: '10px 18px', background: busy || !displayText.trim() ? '#e5e5e0' : '#534AB7', color: busy || !displayText.trim() ? '#999' : '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit', flexShrink: 0, alignSelf: 'flex-end', height: '40px' }}>
          Senden
        </button>
      </div>

      {/* Hints */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '11px', color: '#aaa' }}>
          {listening
            ? 'Wenn Sie fertig sind, drücken Sie Senden.'
            : speechSupported ? 'Mikrofon für Spracheingabe · Shift+Enter für neue Zeile' : 'Shift+Enter für neue Zeile'}
        </div>
        <button onClick={endInterview}
          style={{ padding: '5px 12px', background: 'transparent', border: '1px solid #e5e5e0', borderRadius: '6px', fontSize: '11px', color: '#aaa', cursor: 'pointer', fontFamily: 'inherit' }}>
          Interview beenden
        </button>
      </div>
    </div>
  );
}
