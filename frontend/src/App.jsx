import React, { useState } from 'react';
import Interview from './Interview.jsx';
import Dashboard from './Dashboard.jsx';

const NAV_STYLE = {
  display: 'flex',
  alignItems: 'center',
  gap: '0',
  background: '#fff',
  borderBottom: '1px solid #e5e5e0',
  padding: '0 24px',
  position: 'sticky',
  top: 0,
  zIndex: 100,
};

const LOGO_STYLE = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#1a1a1a',
  marginRight: '32px',
  padding: '16px 0',
  letterSpacing: '-0.01em',
};

const BTN = (active) => ({
  padding: '16px 16px',
  background: 'transparent',
  border: 'none',
  borderBottom: `2px solid ${active ? '#534AB7' : 'transparent'}`,
  color: active ? '#534AB7' : '#666',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: active ? '500' : '400',
  fontFamily: 'inherit',
  transition: 'all 0.15s',
});

export default function App() {
  const [page, setPage] = useState('interview');

  return (
    <div>
      <nav style={NAV_STYLE}>
        <div style={LOGO_STYLE}>Narratives Diagnose</div>
        <button style={BTN(page === 'interview')} onClick={() => setPage('interview')}>
          Interview
        </button>
        <button style={BTN(page === 'dashboard')} onClick={() => setPage('dashboard')}>
          Dashboard
        </button>
      </nav>
      <main style={{ maxWidth: '780px', margin: '0 auto', padding: '32px 24px' }}>
        {page === 'interview' ? <Interview /> : <Dashboard />}
      </main>
    </div>
  );
}
