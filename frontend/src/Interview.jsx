import React, { useState, useRef, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL || '';

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

function RecordingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#E24B4A' }}>
      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#E24B4A', display: 'inline-block', animation: 'recpulse 1s infinite' }} />
      Aufnahme läuft — sprechen Sie in Ruhe, Pausen sind kein Problem
    </div>
  );
}

function ChatBubble({ role, text }) {
  const isUser = role === 'user';
  return (
    <div style={{ display: 'flex', gap: '10px', flexDirection: isUser ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
      <div style={{ width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0, background: isUser ? '#E6F1FB' : '#EEEDFE', color: isUser ? '#0C447C' : '#3C3489', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '500' }}>
        {isUser ? 'Sie' : 'KI'}
      </div>
      <div style={{ maxWidth: '78%', padding: '10px 14px', borderRadius: '12px', fontSize: '14px', lineHeight: '1.6', background: isUser ? '#534AB7' : '#fff', color: isUser ? '#fff' : '#1a1a1a', border: isUser ? 'none' : '1px solid #e5e5e0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
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

export default function Interview({ orgId }) {
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [ended, setEnded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hierarchyLevel, setHierarchyLevel] = useState('');
  const [startTime] = useState(Date.now());
  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef(null);
  const chatRef = useRef(null);
  const textareaRef = useRef(null);
  const browser = detectBrowser();

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) setSpeechSupported(true);
  }, []);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, busy]);

  // Auto-grow textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [input, interimText]);

  async function callAPI(msgs) {
    setBusy(true);
    try {
      const res = await fetch(`${API}/api/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: msgs, org_id: orgId }),
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
    setTimeout(() => textareaRef.current?.focus(), 100);
  }

  async function startInterview() {
    setStarted(true);
    await callAPI([]);
  }

  async function sendMsg() {
    const text = (input + (interimText ? ' ' + interimText : '')).trim();
    if (!text || busy || ended) return;
    if (listening) stopSpeech();
    setInput('');
    setInterimText('');
    const updated = [...messages, { role: 'user', content: text }];
    setMessages(updated);
    await callAPI(updated);
  }

  function toggleSpeech() {
    if (listening) { stopSpeech(); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = 'de-DE';
    rec.continuous = true;
    rec.interimResults = true;
    rec.onstart = () => setListening(true);
    rec.onresult = (e) => {
      let interim = '', final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + ' ';
        else interim += e.results[i][0].transcript;
      }
      if (final) setInput(prev => (prev + final).trimStart());
      setInterimText(interim);
    };
    rec.onerror = (e) => { if (e.error !== 'no-speech') { setListening(false); setInterimText(''); } };
    rec.onend = () => {
      if (recognitionRef.current?._shouldRestart) {
        try { rec.start(); } catch(e) {}
      } else { setListening(false); setInterimText(''); }
    };
    recognitionRef.current = rec;
    recognitionRef.current._shouldRestart = true;
    rec.start();
  }

  function stopSpeech() {
    if (recognitionRef.current) { recognitionRef.current._shouldRestart = false; recognitionRef.current.stop(); }
    setListening(false); setInterimText('');
  }

  function endInterview() {
    if (window.confirm('Interview jetzt beenden?')) { stopSpeech(); setEnded(true); }
  }

  async function saveInterview() {
    if (messages.length < 2) { alert('Das Interview ist zu kurz zum Speichern.'); return; }
    setSaving(true);
    try {
      const duration = Math.max(Math.round((Date.now() - startTime) / 60000), 1);
      await fetch(`${API}/api/interviews`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: messages, duration_minutes: duration, hierarchy_level: hierarchyLevel || null, org_id: orgId }),
      });
      setSaved(true);
    } catch (e) { alert('Fehler beim Speichern.'); }
    setSaving(false);
  }

  const displayText = input + (interimText ? (input ? ' ' : '') + interimText : '');

  const micBtn = {
    width: '40px', height: '40px', borderRadius: '50%', border: listening ? '2px solid #E24B4A' : '1px solid #e5e5e0',
    cursor: 'pointer', background: listening ? '#fff0f0' : '#fff', color: listening ? '#E24B4A' : '#534AB7',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s',
  };

  // Start screen
  if (!started) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <style>{`@keyframes pulse{0%,80%,100%{opacity:.3}40%{opacity:1}} @keyframes recpulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.3)}}`}</style>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
        </div>
        <h2 style={{ fontSize: '22px', fontWeight: '500', marginBottom: '12px' }}>Narratives Interview</h2>
        <p style={{ color: '#666', fontSize: '14px', maxWidth: '380px', margin: '0 auto 8px', lineHeight: '1.7' }}>
          Ein KI-Bot begleitet Sie durch ein Gespräch über Ihre Erfahrungen in der Organisation. Es gibt keine richtigen oder falschen Antworten.
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
        {speechSupported && browser !== 'firefox' && (
          <div style={{ background: '#f5f4f0', borderRadius: '10px', padding: '12px 16px', maxWidth: '380px', margin: '0 auto 24px', textAlign: 'left' }}>
            <div style={{ fontSize: '12px', fontWeight: '500', color: '#444', marginBottom: '4px' }}>Spracheingabe verfügbar</div>
            <div style={{ fontSize: '11px', color: '#888' }}>Mikrofon-Button klicken — der Browser fragt einmalig nach Erlaubnis. Sprechen Sie in Ruhe, Pausen sind kein Problem. Drücken Sie Senden wenn Sie fertig sind.</div>
          </div>
        )}
        <button onClick={startInterview} style={{ padding: '12px 32px', background: '#534AB7', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', cursor: 'pointer', fontFamily: 'inherit' }}>
          Interview starten
        </button>
      </div>
    );
  }

  // Thank you screen
  if (saved) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div style={{ fontSize: '40px', marginBottom: '20px' }}>🙏</div>
        <h2 style={{ fontSize: '22px', fontWeight: '500', marginBottom: '12px' }}>Vielen Dank!</h2>
        <p style={{ color: '#666', fontSize: '15px', maxWidth: '360px', margin: '0 auto', lineHeight: '1.7' }}>
          Schön, dass Sie sich die Zeit genommen und so offen erzählt haben. Ihre Erfahrungen fließen anonym in die Gesamtauswertung ein.
        </p>
      </div>
    );
  }

  // End/save screen
  if (ended) {
    return (
      <div style={{ maxWidth: '480px', margin: '60px auto', textAlign: 'center' }}>
        <style>{`@keyframes pulse{0%,80%,100%{opacity:.3}40%{opacity:1}}`}</style>
        <div style={{ fontSize: '32px', marginBottom: '16px' }}>✓</div>
        <div style={{ fontSize: '17px', fontWeight: '500', marginBottom: '8px' }}>Interview beendet</div>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '28px', lineHeight: '1.6' }}>
          {messages.filter(m => m.role === 'user').length} Beiträge · ca. {Math.max(Math.round((Date.now() - startTime) / 60000), 1)} Min.
        </p>
        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '8px' }}>Position bestätigen (optional)</label>
          <select value={hierarchyLevel} onChange={e => setHierarchyLevel(e.target.value)}
            style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #e5e5e0', fontSize: '13px', background: '#fff', color: '#1a1a1a', fontFamily: 'inherit', minWidth: '220px' }}>
            {HIERARCHY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <button onClick={saveInterview} disabled={saving}
          style={{ padding: '12px 32px', background: '#534AB7', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Wird gespeichert…' : 'Abschliessen'}
        </button>
      </div>
    );
  }

  // Interview screen
  return (
    <div>
      <style>{`@keyframes pulse{0%,80%,100%{opacity:.3}40%{opacity:1}} @keyframes recpulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.3)}}`}</style>

      {/* Chat */}
      <div ref={chatRef} style={{ background: '#f5f4f0', borderRadius: '12px', padding: '16px', minHeight: '300px', maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '14px' }}>
        {messages.map((m, i) => <ChatBubble key={i} role={m.role} text={m.content} />)}
        {busy && <TypingIndicator />}
      </div>

      {/* Input row */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', marginBottom: '8px' }}>
        {speechSupported && browser !== 'firefox' && (
          <button onClick={toggleSpeech} title={listening ? 'Stoppen' : 'Spracheingabe'} style={micBtn}>
            {listening
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="#E24B4A"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
              : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
            }
          </button>
        )}
        <textarea
          ref={textareaRef}
          value={displayText}
          onChange={e => { if (!listening) setInput(e.target.value); }}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
          placeholder={listening ? 'Sprechen Sie — Pausen sind kein Problem…' : 'Ihre Antwort… (Enter zum Senden, Shift+Enter für neue Zeile)'}
          disabled={busy}
          rows={1}
          style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: `1px solid ${listening ? '#E24B4A' : '#e5e5e0'}`, fontSize: '14px', background: listening ? '#fff8f8' : '#fff', color: '#1a1a1a', fontFamily: 'inherit', resize: 'none', minHeight: '42px', lineHeight: '1.5', overflow: 'hidden', transition: 'border-color 0.2s' }}
        />
        <button onClick={sendMsg} disabled={busy || !displayText.trim()}
          style={{ padding: '10px 18px', background: busy || !displayText.trim() ? '#e5e5e0' : '#534AB7', color: busy || !displayText.trim() ? '#999' : '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit', flexShrink: 0, height: '42px' }}>
          Senden
        </button>
      </div>

      {/* Recording hint */}
      <div style={{ minHeight: '20px', marginBottom: '20px', paddingLeft: '4px' }}>
        {listening && <RecordingIndicator />}
        {!listening && <div style={{ fontSize: '11px', color: '#ccc' }}>{speechSupported && browser !== 'firefox' ? 'Mikrofon für Spracheingabe · ' : ''}Shift+Enter für neue Zeile</div>}
      </div>

      {/* End button — centered, prominent */}
      <div style={{ textAlign: 'center', borderTop: '1px solid #f0f0f0', paddingTop: '20px' }}>
        <button onClick={endInterview}
          style={{ padding: '10px 28px', background: 'transparent', border: '1px solid #ccc', borderRadius: '8px', fontSize: '14px', color: '#888', cursor: 'pointer', fontFamily: 'inherit' }}>
          Interview beenden
        </button>
        <div style={{ fontSize: '11px', color: '#ccc', marginTop: '8px' }}>Wenn Sie alles erzählt haben, was Ihnen wichtig ist</div>
      </div>
    </div>
  );
}
