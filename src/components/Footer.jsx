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
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'var(--gold-foil)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#07060a',
              fontSize: '0.72rem',
              fontWeight: '700',
            }}
          >
            S
          </div>
          <span style={{ color: 'var(--text)', fontWeight: '600' }}>
            Syndicate
          </span>
          <span style={{ color: 'var(--dim)' }}>© 2026 • Community Client & Source Archive</span>
        </div>

        {/* Right: Quick Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', color: 'var(--muted)' }}>
          <Link
            to="/"
            style={{ color: 'var(--muted)', textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted)')}
          >
            Archive
          </Link>
          <Link
            to="/clients"
            style={{ color: 'var(--muted)', textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted)')}
          >
            Clients
          </Link>
          <Link
            to="/sources"
            style={{ color: 'var(--muted)', textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted)')}
          >
            Source Codes
          </Link>
          <a
            href="https://discord.gg/syndicate"
            target="_blank"
            rel="noreferrer"
            style={{ color: 'var(--gold)', textDecoration: 'none', fontWeight: '600' }}
          >
            Discord
          </a>
          <Link
            to="/admin"
            style={{ color: 'var(--dim)', textDecoration: 'none' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--gold)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--dim)')}
          >
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
