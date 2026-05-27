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

const ONBOARDING_STEPS = [
  {
    icon: '👋',
    title: 'Willkommen',
    text: 'Dieses Gespräch ist kein Test und keine Bewertung. Es geht ausschließlich um Ihre persönlichen Erfahrungen in der Organisation. Alles wird vollständig anonym behandelt — kein Name, keine Abteilung, keine identifizierenden Angaben werden gespeichert. Sie können das Interview jederzeit über "Interview beenden" abschliessen.',
    btn: 'Verstanden',
  },
  {
    icon: '📈',
    title: 'Erlebniskurve',
    text: 'Bevor wir beginnen: Nehmen Sie ein leeres Blatt und einen Stift. Zeichnen Sie eine waagerechte Linie — links Ihr erster Tag, rechts das Heute. Zeichnen Sie eine Kurve, die zeigt wie Sie Ihre Zeit hier erlebt haben — mit Hochs und Tiefs. An markanten Punkten ein kurzes Stichwort. Diese Kurve bleibt bei Ihnen, sie dient nur als roter Faden.',
    btn: 'Kurve ist fertig',
  },
  {
    icon: '🎙️',
    title: 'Einfach erzählen',
    text: 'Sie können gerne zehn, zwanzig oder dreißig Minuten am Stück sprechen — der Bot wartet und hört zu. Tipp- oder Sprachfehler spielen keine Rolle. Sie müssen nicht auf Fragen warten. Erzählen Sie einfach Ihre Geschichte, so wie sie sich anfühlt.',
    btn: 'Ich bin bereit — Interview starten',
  },
];

function OnboardingStep({ step, onNext, total }) {
  const s = ONBOARDING_STEPS[step];
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '24px 20px', maxWidth: '480px', margin: '0 auto', boxSizing: 'border-box' }}>
      <div style={{ fontSize: '11px', color: '#bbb', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '32px', textAlign: 'center' }}>
        Schritt {step + 1} von {total}
      </div>
      <div style={{ fontSize: '40px', textAlign: 'center', marginBottom: '20px' }}>{s.icon}</div>
      <h2 style={{ fontSize: '22px', fontWeight: '600', textAlign: 'center', marginBottom: '16px', color: '#1a1a1a' }}>{s.title}</h2>
      <p style={{ fontSize: '15px', lineHeight: '1.75', color: '#555', textAlign: 'center', marginBottom: '40px' }}>{s.text}</p>
      <button onClick={onNext}
        style={{ width: '100%', padding: '16px', background: '#534AB7', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit' }}>
        {s.btn}
      </button>
      {/* Step dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '24px' }}>
        {ONBOARDING_STEPS.map((_, i) => (
          <span key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: i === step ? '#534AB7' : '#ddd' }} />
        ))}
      </div>
    </div>
  );
}

function ChatBubble({ role, text }) {
  const isUser = role === 'user';
  return (
    <div style={{ display: 'flex', gap: '8px', flexDirection: isUser ? 'row-reverse' : 'row', alignItems: 'flex-start', marginBottom: '10px' }}>
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
    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '10px' }}>
      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#EEEDFE', color: '#3C3489', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '600', flexShrink: 0 }}>KI</div>
      <div style={{ padding: '12px 16px', background: '#fff', border: '1px solid #e5e5e0', borderRadius: '12px', display: 'flex', gap: '5px', alignItems: 'center' }}>
        {[0,1,2].map(i => <span key={i} style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#bbb', animation: 'pulse 1.2s infinite', animationDelay: `${i*0.2}s` }} />)}
      </div>
    </div>
  );
}

export default function Interview({ orgId }) {
  const [onboardingStep, setOnboardingStep] = useState(0); // 0,1,2 = onboarding; 3 = interview
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
    setOnboardingStep(3);
    await callAPI([]);
  }

  async function sendMsg() {
    const text = (input + (interimText ? ' ' + interimText : '')).trim();
    if (!text || busy) return;
    if (listening) stopSpeech();
    setInput(''); setInterimText('');
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

  const CSS = `
    @keyframes pulse { 0%,80%,100%{opacity:.3} 40%{opacity:1} }
    @keyframes recdot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.3;transform:scale(1.5)} }
    @keyframes recwave { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(2.2);opacity:0} }
    * { box-sizing: border-box; }
    .iv-shell {
      position: fixed; inset: 0;
      display: flex; flex-direction: column;
      background: #f5f4f0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .iv-recbar {
      flex-shrink: 0;
      display: flex; align-items: center; gap: 10px;
      padding: 10px 14px;
      background: #fff0f0; border-bottom: 1px solid #fdd;
      font-size: 13px; color: #c0392b;
    }
    .iv-recdot {
      position: relative; width: 12px; height: 12px; flex-shrink: 0;
    }
    .iv-recdot-inner {
      position: absolute; inset: 0; border-radius: 50%; background: #E24B4A;
      animation: recdot 1s infinite;
    }
    .iv-recdot-wave {
      position: absolute; inset: -4px; border-radius: 50%;
      border: 2px solid #E24B4A; animation: recwave 1.2s infinite;
    }
    .iv-chat {
      flex: 1; overflow-y: auto;
      padding: 14px 12px;
    }
    .iv-bottom {
      flex-shrink: 0;
      background: #fff;
      border-top: 1px solid #e5e5e0;
      padding: 10px 12px 12px;
    }
    .iv-input-row {
      display: flex; gap: 6px; align-items: flex-end; margin-bottom: 8px;
    }
    .iv-textarea {
      flex: 1; min-width: 0;
      padding: 10px 12px;
      border-radius: 10px;
      font-size: 15px; font-family: inherit; line-height: 1.5;
      resize: none; min-height: 44px; max-height: 140px; overflow-y: auto;
      outline: none;
      transition: border-color .15s;
    }
    .iv-send {
      flex-shrink: 0; height: 44px; padding: 0 16px;
      border: none; border-radius: 10px;
      font-size: 15px; font-weight: 500; font-family: inherit;
      cursor: pointer; transition: background .15s;
      white-space: nowrap;
    }
    .iv-mic {
      flex-shrink: 0; width: 44px; height: 44px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all .15s;
    }
    .iv-hint { font-size: 11px; color: #bbb; text-align: center; margin-bottom: 6px; }
    .iv-end-wrap { text-align: center; padding-top: 6px; border-top: 1px solid #f0f0f0; }
    .iv-end-btn {
      padding: 9px 24px; background: transparent;
      border: 1px solid #ddd; border-radius: 8px;
      font-size: 14px; color: #888; cursor: pointer; font-family: inherit;
    }
    .iv-end-sub { font-size: 11px; color: #ccc; margin-top: 4px; }
  `;

  // ── Onboarding ──
  if (onboardingStep < 3) {
    if (onboardingStep === 0) {
      return (
        <div>
          <style>{CSS}</style>
          <div style={{ padding: '16px', background: '#fff', borderBottom: '1px solid #e5e5e0', marginBottom: '0' }}>
            <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '6px' }}>Ihre Position (optional)</label>
            <select value={hierarchyLevel} onChange={e => setHierarchyLevel(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e5e5e0', fontSize: '14px', background: '#fff', color: '#1a1a1a', fontFamily: 'inherit' }}>
              {HIERARCHY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <OnboardingStep step={0} total={3} onNext={() => setOnboardingStep(1)} />
        </div>
      );
    }
    return (
      <div><style>{CSS}</style>
        <OnboardingStep step={onboardingStep} total={3}
          onNext={onboardingStep === 2 ? startInterview : () => setOnboardingStep(s => s + 1)} />
      </div>
    );
  }

  // ── Thank you ──
  if (saved) return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: '48px', marginBottom: '20px' }}>🙏</div>
      <h2 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '12px' }}>Vielen Dank!</h2>
      <p style={{ color: '#666', fontSize: '15px', maxWidth: '320px', lineHeight: '1.75' }}>
        Schön, dass Sie sich die Zeit genommen und so offen erzählt haben. Ihre Erfahrungen fließen anonym in die Auswertung ein.
      </p>
    </div>
  );

  // ── End / save ──
  if (ended) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
      <style>{CSS}</style>
      <div style={{ width: '100%', maxWidth: '400px', background: '#fff', border: '1px solid #e5e5e0', borderRadius: '16px', padding: '28px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: '36px', marginBottom: '12px' }}>✓</div>
        <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '6px' }}>Interview beendet</div>
        <p style={{ fontSize: '13px', color: '#888', marginBottom: '24px' }}>
          {messages.filter(m => m.role === 'user').length} Beiträge · ca. {Math.max(Math.round((Date.now() - startTime) / 60000), 1)} Min.
        </p>
        <div style={{ marginBottom: '20px', textAlign: 'left' }}>
          <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '8px' }}>Position bestätigen (optional)</label>
          <select value={hierarchyLevel} onChange={e => setHierarchyLevel(e.target.value)}
            style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid #e5e5e0', fontSize: '15px', background: '#fff', color: '#1a1a1a', fontFamily: 'inherit' }}>
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

  // ── Interview ──
  return (
    <>
      <style>{CSS}</style>
      <div className="iv-shell">
        {/* Recording banner */}
        {listening && (
          <div className="iv-recbar">
            <div className="iv-recdot">
              <div className="iv-recdot-wave" />
              <div className="iv-recdot-inner" />
            </div>
            <span>Aufnahme läuft — sprechen Sie in Ruhe. Wenn fertig: <strong>Senden</strong> drücken.</span>
          </div>
        )}

        {/* Chat */}
        <div ref={chatRef} className="iv-chat">
          {messages.map((m, i) => <ChatBubble key={i} role={m.role} text={m.content} />)}
          {busy && <TypingIndicator />}
          {/* Spacer so last message not hidden behind bottom bar */}
          <div style={{ height: '8px' }} />
        </div>

        {/* Bottom input area */}
        <div className="iv-bottom">
          <div className="iv-input-row">
            {canSpeak && (
              <button onClick={toggleSpeech} className="iv-mic"
                style={{ border: listening ? '2px solid #E24B4A' : '1px solid #e5e5e0', background: listening ? '#fff0f0' : '#f5f4f0' }}>
                {listening
                  ? <svg width="14" height="14" viewBox="0 0 24 24" fill="#E24B4A"><rect x="5" y="5" width="14" height="14" rx="3"/></svg>
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
                }
              </button>
            )}
            <textarea ref={textareaRef} className="iv-textarea"
              value={displayText}
              onChange={e => { if (!listening) setInput(e.target.value); }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
              placeholder={listening ? 'Sprechen Sie…' : 'Ihre Antwort…'}
              disabled={busy}
              rows={1}
              style={{ border: `1px solid ${listening ? '#E24B4A' : '#e5e5e0'}`, background: listening ? '#fff8f8' : '#fff' }}
            />
            <button onClick={sendMsg} disabled={busy || !displayText.trim()} className="iv-send"
              style={{ background: busy || !displayText.trim() ? '#e5e5e0' : '#534AB7', color: busy || !displayText.trim() ? '#999' : '#fff' }}>
              Senden
            </button>
          </div>

          {!listening && canSpeak && (
            <div className="iv-hint">Mikrofon-Button für Spracheingabe · Shift+Enter für neue Zeile</div>
          )}

          <div className="iv-end-wrap">
            <button onClick={() => { stopSpeech(); setEnded(true); }} className="iv-end-btn">
              Interview beenden
            </button>
            <div className="iv-end-sub">Wenn Sie alles erzählt haben</div>
          </div>
        </div>
      </div>
    </>
  );
}
