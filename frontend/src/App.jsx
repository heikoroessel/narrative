import React, { useState } from 'react';
import Interview from './Interview.jsx';
import Dashboard from './Dashboard.jsx';
import Admin from './Admin.jsx';

const API = import.meta.env.VITE_API_URL || '';

function KeyEntry({ onAuth }) {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!key.trim()) return;
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/auth/validate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: key.trim() })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Ungültiger Key'); setLoading(false); return; }
      onAuth(data);
    } catch (e) { setError('Verbindungsfehler'); }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', letterSpacing: '0.08em', color: '#888', textTransform: 'uppercase', marginBottom: '8px' }}>Narratives Diagnose</div>
          <h1 style={{ fontSize: '26px', fontWeight: '500', color: '#1a1a1a', margin: 0 }}>Willkommen</h1>
          <p style={{ fontSize: '14px', color: '#888', marginTop: '10px', lineHeight: '1.6' }}>Bitte geben Sie Ihren Zugangscode ein, den Sie von Ihrem Berater erhalten haben.</p>
        </div>
        <div style={{ marginBottom: '12px' }}>
          <input
            value={key}
            onChange={e => setKey(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="Zugangscode eingeben…"
            autoFocus
            style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: `1px solid ${error ? '#E24B4A' : '#e5e5e0'}`, fontSize: '15px', background: '#fff', color: '#1a1a1a', fontFamily: 'inherit', letterSpacing: '0.05em', textTransform: 'uppercase' }}
          />
          {error && <div style={{ fontSize: '12px', color: '#E24B4A', marginTop: '6px', paddingLeft: '4px' }}>{error}</div>}
        </div>
        <button onClick={submit} disabled={loading || !key.trim()}
          style={{ width: '100%', padding: '12px', background: loading || !key.trim() ? '#e5e5e0' : '#534AB7', color: loading || !key.trim() ? '#999' : '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontWeight: '500' }}>
          {loading ? 'Wird geprüft…' : 'Weiter'}
        </button>
        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <a href="/admin" style={{ fontSize: '12px', color: '#ccc', textDecoration: 'none' }}>Admin</a>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [auth, setAuth] = useState(null);
  const [page, setPage] = useState('interview');

  // Admin route
  if (window.location.pathname === '/admin') return <Admin />;

  if (!auth) return <KeyEntry onAuth={(data) => { setAuth(data); setPage(data.role === 'dashboard' ? 'dashboard' : 'interview'); }} />;

  const showDashboard = auth.role === 'dashboard';

  return (
    <div>
      <nav style={{ display: 'flex', alignItems: 'center', background: '#fff', borderBottom: '1px solid #e5e5e0', padding: '0 24px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ fontSize: '13px', fontWeight: '600', letterSpacing: '0.06em', color: '#888', textTransform: 'uppercase', marginRight: '24px', padding: '16px 0' }}>Narratives Diagnose</div>
        <div style={{ fontSize: '13px', color: '#534AB7', fontWeight: '500', marginRight: 'auto' }}>{auth.org_name}</div>
        {showDashboard && (
          <>
            <button style={{ padding: '16px 16px', background: 'transparent', border: 'none', borderBottom: `2px solid ${page === 'interview' ? '#534AB7' : 'transparent'}`, color: page === 'interview' ? '#534AB7' : '#888', cursor: 'pointer', fontSize: '14px', fontFamily: 'inherit', fontWeight: page === 'interview' ? '500' : '400' }} onClick={() => setPage('interview')}>Interview</button>
            <button style={{ padding: '16px 16px', background: 'transparent', border: 'none', borderBottom: `2px solid ${page === 'dashboard' ? '#534AB7' : 'transparent'}`, color: page === 'dashboard' ? '#534AB7' : '#888', cursor: 'pointer', fontSize: '14px', fontFamily: 'inherit', fontWeight: page === 'dashboard' ? '500' : '400' }} onClick={() => setPage('dashboard')}>Dashboard</button>
          </>
        )}
        <button onClick={() => setAuth(null)} style={{ marginLeft: '16px', padding: '6px 12px', background: 'transparent', border: '1px solid #e5e5e0', borderRadius: '6px', fontSize: '12px', color: '#aaa', cursor: 'pointer', fontFamily: 'inherit' }}>Abmelden</button>
      </nav>
      <main style={{ maxWidth: '780px', margin: '0 auto', padding: '32px 24px' }}>
        {page === 'interview' ? <Interview orgId={auth.org_id} /> : <Dashboard orgId={auth.org_id} />}
      </main>
    </div>
  );
}
