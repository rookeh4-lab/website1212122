import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer
      style={{
        marginTop: 'auto',
        borderTop: '1px solid var(--edge)',
        backgroundColor: 'var(--bg)',
        padding: '36px 20px',
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
              background: 'linear-gradient(135deg, #38bdf8, #6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '0.74rem',
              fontWeight: '800',
              boxShadow: '0 2px 8px rgba(56, 189, 248, 0.3)',
            }}
          >
            S
          </div>
          <span style={{ color: '#ffffff', fontWeight: '700' }}>
            Syndicate
          </span>
          <span style={{ color: 'var(--text-dim)' }}>© 2026 • Community Client & Source Archive</span>
        </div>

        {/* Right: Quick Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', color: 'var(--text-muted)' }}>
          <Link
            to="/"
            style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            Archive
          </Link>
          <Link
            to="/clients"
            style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            Clients
          </Link>
          <Link
            to="/sources"
            style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            Source Codes
          </Link>
          <a
            href="https://discord.gg/syndicate"
            target="_blank"
            rel="noreferrer"
            style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: '600' }}
          >
            Discord
          </a>
          <Link
            to="/admin"
            style={{ color: 'var(--text-dim)', textDecoration: 'none' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
          >
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
