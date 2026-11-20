import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer
      style={{
        marginTop: 'auto',
        borderTop: '1px solid #1a2438',
        backgroundColor: '#090e1a',
        padding: '32px 20px',
      }}
    >
      <div
        style={{
          maxWidth: '1180px',
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px',
          fontSize: '0.86rem',
        }}
      >
        {/* Left: Brand Copyright */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '0.74rem',
              fontWeight: '700',
              boxShadow: '0 1px 4px rgba(2, 132, 199, 0.3)',
            }}
          >
            S
          </div>
          <span style={{ color: '#ffffff', fontWeight: '700' }}>
            Syndicate
          </span>
          <span style={{ color: '#64748b' }}>© 2026 • Community Client & Source Archive</span>
        </div>

        {/* Right: Quick Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', color: '#94a3b8' }}>
          <Link
            to="/"
            style={{ color: '#94a3b8', textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
          >
            Archive
          </Link>
          <Link
            to="/clients"
            style={{ color: '#94a3b8', textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
          >
            Clients
          </Link>
          <Link
            to="/sources"
            style={{ color: '#94a3b8', textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
          >
            Source Codes
          </Link>
          <a
            href="https://discord.gg/syndicate"
            target="_blank"
            rel="noreferrer"
            style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: '500' }}
          >
            Discord
          </a>
          <Link
            to="/admin"
            style={{ color: '#64748b', textDecoration: 'none' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#cbd5e1')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
          >
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
