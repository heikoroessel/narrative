import React, { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL || '';

export default function Admin() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [orgs, setOrgs] = useState([]);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [newOrg, setNewOrg] = useState(null);

  async function login() {
    const res = await fetch(`${API}/api/admin/auth`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    if (res.ok) { setAuthed(true); loadOrgs(); }
    else setError('Falsches Passwort');
  }

  async function loadOrgs() {
    const res = await fetch(`${API}/api/admin/organizations?password=${password}`);
    const data = await res.json();
    setOrgs(data);
  }

  async function createOrg() {
    if (!newName.trim()) return;
    setCreating(true);
    const res = await fetch(`${API}/api/admin/organizations`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), password })
    });
    const data = await res.json();
    setNewOrg(data);
    setNewName('');
    loadOrgs();
    setCreating(false);
  }

  async function deleteOrg(id, name) {
    if (!window.confirm(`Organisation "${name}" und alle Interviews löschen?`)) return;
    await fetch(`${API}/api/admin/organizations/${id}`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    loadOrgs();
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
  }

  const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e5e5e0', fontSize: '14px', background: '#fff', color: '#1a1a1a', fontFamily: 'inherit' };
  const btnStyle = (color) => ({ padding: '10px 20px', background: color, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' });

  if (!authed) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '320px' }}>
        <div style={{ fontSize: '13px', fontWeight: '600', letterSpacing: '0.08em', color: '#888', textTransform: 'uppercase', marginBottom: '24px', textAlign: 'center' }}>Admin — Narratives Diagnose</div>
        <input value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()}
          type="password" placeholder="Admin-Passwort" style={{ ...inputStyle, marginBottom: '10px' }} autoFocus />
        {error && <div style={{ fontSize: '12px', color: '#E24B4A', marginBottom: '10px' }}>{error}</div>}
        <button onClick={login} style={{ ...btnStyle('#534AB7'), width: '100%' }}>Anmelden</button>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '40px 24px', fontFamily: 'inherit' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', color: '#888', textTransform: 'uppercase' }}>Narratives Diagnose</div>
          <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '4px 0 0' }}>Organisationen</h1>
        </div>
        <a href="/" style={{ fontSize: '13px', color: '#888', textDecoration: 'none' }}>← Zurück</a>
      </div>

      {/* New org */}
      <div style={{ background: '#fff', border: '1px solid #e5e5e0', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
        <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '12px' }}>Neue Organisation anlegen</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createOrg()}
            placeholder="Organisationsname (z.B. Firma ABC)" style={{ ...inputStyle, flex: 1 }} />
          <button onClick={createOrg} disabled={creating || !newName.trim()} style={btnStyle('#534AB7')}>
            {creating ? '…' : 'Anlegen'}
          </button>
        </div>
      </div>

      {/* Newly created org — show keys prominently */}
      {newOrg && (
        <div style={{ background: '#EEEDFE', border: '1px solid #AFA9EC', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
          <div style={{ fontSize: '14px', fontWeight: '500', color: '#3C3489', marginBottom: '16px' }}>✓ {newOrg.name} angelegt — Keys kopieren und versenden:</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ background: '#fff', borderRadius: '8px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#888', marginBottom: '3px' }}>Interview-Key (für Interviewpartner)</div>
                <div style={{ fontSize: '15px', fontWeight: '500', letterSpacing: '0.05em', color: '#1a1a1a' }}>{newOrg.interview_key}</div>
              </div>
              <button onClick={() => copyToClipboard(newOrg.interview_key)} style={{ padding: '6px 12px', background: '#534AB7', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>Kopieren</button>
            </div>
            <div style={{ background: '#fff', borderRadius: '8px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#888', marginBottom: '3px' }}>Dashboard-Key (für Diagnostiker)</div>
                <div style={{ fontSize: '15px', fontWeight: '500', letterSpacing: '0.05em', color: '#1a1a1a' }}>{newOrg.dashboard_key}</div>
              </div>
              <button onClick={() => copyToClipboard(newOrg.dashboard_key)} style={{ padding: '6px 12px', background: '#534AB7', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>Kopieren</button>
            </div>
          </div>
          <button onClick={() => setNewOrg(null)} style={{ marginTop: '12px', padding: '6px 12px', background: 'transparent', border: '1px solid #AFA9EC', borderRadius: '6px', fontSize: '12px', color: '#3C3489', cursor: 'pointer', fontFamily: 'inherit' }}>Schliessen</button>
        </div>
      )}

      {/* Org list */}
      {orgs.length === 0 ? (
        <div style={{ color: '#aaa', fontSize: '14px', textAlign: 'center', padding: '40px 0' }}>Noch keine Organisationen angelegt.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {orgs.map(org => (
            <div key={org.id} style={{ background: '#fff', border: '1px solid #e5e5e0', borderRadius: '12px', padding: '16px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '500' }}>{org.name}</div>
                  <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>{org.interview_count} Interview{org.interview_count !== '1' ? 's' : ''}</div>
                </div>
                <button onClick={() => deleteOrg(org.id, org.name)} style={{ padding: '5px 10px', background: 'transparent', border: '1px solid #f0c0c0', borderRadius: '6px', fontSize: '11px', color: '#E24B4A', cursor: 'pointer', fontFamily: 'inherit' }}>Löschen</button>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ background: '#f5f4f0', borderRadius: '6px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '10px', color: '#aaa' }}>Interview-Key</div>
                    <div style={{ fontSize: '13px', fontWeight: '500', letterSpacing: '0.04em' }}>{org.interview_key}</div>
                  </div>
                  <button onClick={() => copyToClipboard(org.interview_key)} style={{ padding: '4px 8px', background: '#fff', border: '1px solid #e5e5e0', borderRadius: '5px', fontSize: '11px', cursor: 'pointer', color: '#666', fontFamily: 'inherit' }}>↗</button>
                </div>
                <div style={{ background: '#f5f4f0', borderRadius: '6px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '10px', color: '#aaa' }}>Dashboard-Key</div>
                    <div style={{ fontSize: '13px', fontWeight: '500', letterSpacing: '0.04em' }}>{org.dashboard_key}</div>
                  </div>
                  <button onClick={() => copyToClipboard(org.dashboard_key)} style={{ padding: '4px 8px', background: '#fff', border: '1px solid #e5e5e0', borderRadius: '5px', fontSize: '11px', cursor: 'pointer', color: '#666', fontFamily: 'inherit' }}>↗</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
