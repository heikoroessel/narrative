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

function ChatBubble({ role, text }) {
  const isUser = role === 'user';
  return (
    <div style={{ display: 'flex', gap: '8px', flexDirection: isUser ? 'row-reverse' : 'row', alignItems: 'flex-start', marginBottom: '12px' }}>
      <div style={{ width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0, background: isUser ? '#E6F1FB' : '#EEEDFE', color: isUser ? '#0C447C' : '#3C3489', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '600' }}>
        {isUser ? 'Sie' : 'KI'}
      </div>
      <div style={{ maxWidth: '80%', padding: '10px 14px', borderRadius: '12px', fontSize: '15px', lineHeight: '1.65', background: isUser ? '#534AB7' : '#fff', color: isUser ? '#fff' : '#1a1a1a', border: isUser ? 'none' : '1px solid #e5e5e0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {text}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '12px' }}>
      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#EEEDFE', color: '#3C3489', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '600', flexShrink: 0 }}>KI</div>
      <div style={{ padding: '12px 16px', background: '#fff', border: '1px solid #e5e5e0', borderRadius: '12px', display: 'flex', gap: '5px', alignItems: 'center' }}>
        {[0,1,2].map(i => <span key={i} style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#bbb', animation: 'pulse 1.2s infinite', animationDelay: `${i*0.2}s` }} />)}
      </div>
    </div>
  );
}

const ONBOARDING_STEPS = [
    {
      icon: '👋',
      title: 'Willkommen',
      text: 'Dieses Gespräch ist kein Test und keine Bewerbung. Alles, was Sie erzählen, wird vollständig anonym behandelt — niemand erfährt, wer was gesagt hat. Sie können das Interview jederzeit über "Interview beenden" abschliessen, wenn Sie das Gefühl haben, alles erzählt zu haben.',
      btn: 'Verstanden',
    },
    {
      icon: '📈',
      title: 'Erlebniskurve',
      text: 'Nehmen Sie ein leeres Blatt und einen Stift. Zeichnen Sie eine waagerechte Linie — links Ihr erster Tag, rechts das Heute. Zeichnen Sie eine Kurve mit Hochs und Tiefs. An markanten Punkten ein kurzes Stichwort. Die Kurve bleibt bei Ihnen.',
      btn: 'Kurve ist fertig',
    },
    {
      icon: '🎙️',
      title: 'Einfach erzählen',
      text: 'Sie können zehn, zwanzig oder dreißig Minuten am Stück sprechen — der Bot wartet und hört zu. Tipp- oder Sprachfehler spielen keine Rolle. Erzählen Sie einfach Ihre Geschichte.',
      btn: 'Ich bin bereit — Interview starten',
    },
];


export default function Interview({ orgId }) {
  const [started, setStarted] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [hierarchyLevel, setHierarchyLevel] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [ended, setEnded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [startTime] = useState(Date.now());
  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef(null);
  const chatRef = useRef(null);
  const textareaRef = useRef(null);
  const browser = detectBrowser();
  const canSpeak = speechSupported && browser !== 'firefox';

  useEffect(() => {
    if (window.SpeechRecognition || window.webkitSpeechRecognition) setSpeechSupported(true);
  }, []);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, busy, interimText]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 140) + 'px';
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
      setMessages(m => [...m, { role: 'assistant', content: 'Verbindungsfehler. Bitte erneut versuchen.' }]);
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
    if (!text || busy) return;
    if (listening) stopSpeech();
    setInput('');
    setInterimText('');
    if (textareaRef.current) textareaRef.current.value = '';
    const updated = [...messages, { role: 'user', content: text }];
    setMessages(updated);
    await callAPI(updated);
  }

  function toggleSpeech() {
    if (listening) { stopSpeech(); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = 'de-DE'; rec.continuous = true; rec.interimResults = true;
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
      if (recognitionRef.current?._shouldRestart) { try { rec.start(); } catch(e) {} }
      else { setListening(false); setInterimText(''); }
    };
    recognitionRef.current = rec;
    recognitionRef.current._shouldRestart = true;
    rec.start();
  }

  function stopSpeech() {
    if (recognitionRef.current) { recognitionRef.current._shouldRestart = false; recognitionRef.current.stop(); }
    setListening(false); setInterimText('');
  }

  async function saveInterview() {
    if (messages.length < 2) { alert('Das Interview ist zu kurz.'); return; }
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

  // ── Onboarding ──

  if (!started) {
    const step = onboardingStep;
    const s = ONBOARDING_STEPS[step];
    return (
      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '48px 20px', textAlign: 'center' }}>
        <style>{`@keyframes pulse{0%,80%,100%{opacity:.3}40%{opacity:1}}`}</style>
        {step === 0 && (
          <div style={{ marginBottom: '24px', textAlign: 'left' }}>
            <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '8px' }}>Ihre Position (optional)</label>
            <select value={hierarchyLevel} onChange={e => setHierarchyLevel(e.target.value)}
              style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid #e5e5e0', fontSize: '14px', background: '#fff', color: '#1a1a1a', fontFamily: 'inherit' }}>
              {HIERARCHY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        )}
        <div style={{ fontSize: '11px', color: '#bbb', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '24px' }}>
          Schritt {step + 1} von {ONBOARDING_STEPS.length}
        </div>
        <div style={{ fontSize: '44px', marginBottom: '16px' }}>{s.icon}</div>
        <h2 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '14px', color: '#1a1a1a' }}>{s.title}</h2>
        <p style={{ fontSize: '15px', lineHeight: '1.75', color: '#555', marginBottom: '36px' }}>{s.text}</p>
        <button
          onClick={step < ONBOARDING_STEPS.length - 1 ? () => setOnboardingStep(step + 1) : startInterview}
          style={{ width: '100%', maxWidth: '340px', padding: '15px', background: '#534AB7', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit' }}>
          {s.btn}
        </button>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '20px' }}>
          {ONBOARDING_STEPS.map((_, i) => (
            <span key={i} style={{ width: '7px', height: '7px', borderRadius: '50%', background: i === step ? '#534AB7' : '#ddd' }} />
          ))}
        </div>
      </div>
    );
  }

  // ── Thank you ──
  if (saved) return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <div style={{ fontSize: '48px', marginBottom: '20px' }}>🙏</div>
      <h2 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '12px' }}>Vielen Dank!</h2>
      <p style={{ color: '#666', fontSize: '15px', maxWidth: '320px', margin: '0 auto', lineHeight: '1.75' }}>
        Schön, dass Sie sich die Zeit genommen und so offen erzählt haben. Ihre Erfahrungen fließen anonym in die Auswertung ein.
      </p>
    </div>
  );

  // ── End / save ──
  if (ended) return (
    <div style={{ maxWidth: '400px', margin: '40px auto', padding: '0 20px' }}>
      <style>{`@keyframes pulse{0%,80%,100%{opacity:.3}40%{opacity:1}}`}</style>
      <div style={{ background: '#fff', border: '1px solid #e5e5e0', borderRadius: '16px', padding: '28px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: '36px', marginBottom: '12px' }}>✓</div>
        <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '6px' }}>Interview beendet</div>
        <p style={{ fontSize: '13px', color: '#888', marginBottom: '24px' }}>
          {messages.filter(m => m.role === 'user').length} Beiträge · ca. {Math.max(Math.round((Date.now() - startTime) / 60000), 1)} Min.
        </p>
        <div style={{ marginBottom: '20px', textAlign: 'left' }}>
          <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '8px' }}>Position bestätigen (optional)</label>
          <select value={hierarchyLevel} onChange={e => setHierarchyLevel(e.target.value)}
            style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid #e5e5e0', fontSize: '14px', background: '#fff', color: '#1a1a1a', fontFamily: 'inherit' }}>
            {HIERARCHY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <button onClick={saveInterview} disabled={saving}
          style={{ width: '100%', padding: '14px', background: '#534AB7', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: '500', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginBottom: '10px', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Wird gespeichert…' : 'Speichern & abschliessen'}
        </button>
        <button onClick={() => setEnded(false)}
          style={{ width: '100%', padding: '13px', background: 'transparent', border: '1px solid #e5e5e0', borderRadius: '10px', fontSize: '15px', cursor: 'pointer', fontFamily: 'inherit', color: '#666' }}>
          Zurück zum Interview
        </button>
      </div>
    </div>
  );

  // ── Interview — full height flex layout ──
  const NAVBAR_H = 49;
  return (
    <div style={{ position: 'fixed', top: `${NAVBAR_H}px`, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', background: '#f5f4f0' }}>
      <style>{`
        @keyframes pulse{0%,80%,100%{opacity:.3}40%{opacity:1}}
        @keyframes recdot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(1.5)}}
        @keyframes recwave{0%{transform:scale(1);opacity:.5}100%{transform:scale(2.4);opacity:0}}
      `}</style>

      {/* Recording banner */}
      {listening && (
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: '#fff0f0', borderBottom: '1px solid #fdd', fontSize: '13px', color: '#c0392b' }}>
          <div style={{ position: 'relative', width: '14px', height: '14px', flexShrink: 0 }}>
            <div style={{ position: 'absolute', inset: '-4px', borderRadius: '50%', border: '2px solid #E24B4A', animation: 'recwave 1.3s infinite' }} />
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#E24B4A', animation: 'recdot 1s infinite' }} />
          </div>
          Aufnahme läuft — sprechen Sie in Ruhe. Wenn fertig: <strong style={{ marginLeft: '3px' }}>Senden</strong> drücken.
        </div>
      )}

      {/* Chat — scrollable */}
      <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
        {messages.map((m, i) => <ChatBubble key={i} role={m.role} text={m.content} />)}
        {busy && <TypingIndicator />}
        <div style={{ height: '4px' }} />
      </div>

      {/* Bottom bar */}
      <div style={{ flexShrink: 0, background: '#fff', borderTop: '1px solid #e5e5e0', padding: '10px 12px 14px' }}>
        {/* Input row */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', marginBottom: '8px' }}>
          {canSpeak && (
            <button onClick={toggleSpeech}
              style={{ width: '44px', height: '44px', borderRadius: '50%', border: listening ? '2px solid #E24B4A' : '1px solid #e5e5e0', background: listening ? '#fff0f0' : '#f5f4f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s' }}>
              {listening
                ? <svg width="14" height="14" viewBox="0 0 24 24" fill="#E24B4A"><rect x="5" y="5" width="14" height="14" rx="3"/></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
              }
            </button>
          )}
          <textarea ref={textareaRef}
            value={displayText}
            onChange={e => { if (!listening) setInput(e.target.value); }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
            placeholder={listening ? 'Sprechen Sie…' : 'Ihre Antwort…'}
            disabled={busy}
            rows={1}
            style={{ flex: 1, minWidth: 0, padding: '11px 13px', borderRadius: '10px', border: `1px solid ${listening ? '#E24B4A' : '#e5e5e0'}`, fontSize: '15px', fontFamily: 'inherit', lineHeight: '1.5', resize: 'none', minHeight: '44px', maxHeight: '140px', overflowY: 'auto', background: listening ? '#fff8f8' : '#fff', outline: 'none', transition: 'border-color .15s' }}
          />
          <button onClick={sendMsg} disabled={busy || !displayText.trim()}
            style={{ height: '44px', padding: '0 16px', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '500', fontFamily: 'inherit', cursor: busy || !displayText.trim() ? 'not-allowed' : 'pointer', background: busy || !displayText.trim() ? '#e5e5e0' : '#534AB7', color: busy || !displayText.trim() ? '#999' : '#fff', flexShrink: 0, whiteSpace: 'nowrap', transition: 'background .15s' }}>
            Senden
          </button>
        </div>

        {/* Hint */}
        {canSpeak && !listening && (
          <div style={{ fontSize: '11px', color: '#bbb', textAlign: 'center', marginBottom: '8px' }}>
            Mikrofon für Spracheingabe · Shift+Enter für neue Zeile
          </div>
        )}

        {/* End button — prominent */}
        <div style={{ paddingTop: '10px', borderTop: '1px solid #f0f0f0' }}>
          <button onClick={() => { stopSpeech(); setEnded(true); }}
            style={{ width: '100%', padding: '13px', background: '#f5f4f0', border: '1.5px solid #ddd', borderRadius: '10px', fontSize: '15px', fontWeight: '500', color: '#666', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.01em' }}>
            Interview beenden
          </button>
          <div style={{ fontSize: '11px', color: '#bbb', marginTop: '5px', textAlign: 'center' }}>Wenn Sie alles erzählt haben, was Ihnen wichtig ist</div>
        </div>
      </div>
    </div>
  );
}
