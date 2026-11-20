import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer
      style={{
        marginTop: 'auto',
        borderTop: '1px solid #1a2438',
        backgroundColor: '#090e1a',
        padding: '28px 20px',
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
        {/* Left: Brand Logo & Copyright */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img
            src="/logo.png"
            alt="Client Syndicate"
            style={{ width: '26px', height: '26px', borderRadius: '6px', objectFit: 'cover' }}
          />
          <span style={{ color: '#ffffff', fontWeight: '700' }}>
            Client Syndicate
          </span>
          <span style={{ color: '#64748b' }}>© 2026 • Minecraft Clients, Sources &amp; Tools</span>
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