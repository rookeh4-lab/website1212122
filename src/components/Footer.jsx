import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import GithubIcon from './GithubIcon';

export default function Footer() {
  return (
    <footer
      style={{
        marginTop: 'auto',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        backgroundColor: '#050408',
        padding: '36px 20px',
      }}
    >
      <div
        style={{
          maxWidth: '1240px',
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
              background: 'linear-gradient(135deg, #ff2a85, #ff7a00)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '0.72rem',
              fontWeight: '900',
            }}
          >
            VI
          </div>
          <span style={{ color: '#ffffff', fontWeight: '700' }}>
            Syndicate <span style={{ color: '#ff2a85' }}>VI</span>
          </span>
          <span style={{ color: '#6b7280' }}>© 2026 • Vice City Archive</span>
        </div>

        {/* Right: Quick Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', color: '#9ca3af' }}>
          <Link
            to="/"
            style={{ color: '#9ca3af', textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#9ca3af')}
          >
            Releases
          </Link>
          <Link
            to="/clients"
            style={{ color: '#9ca3af', textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#9ca3af')}
          >
            Clients
          </Link>
          <Link
            to="/sources"
            style={{ color: '#9ca3af', textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#9ca3af')}
          >
            Source Codes
          </Link>
          <a
            href="https://discord.gg/syndicate"
            target="_blank"
            rel="noreferrer"
            style={{ color: '#ff7a00', textDecoration: 'none', fontWeight: '600' }}
          >
            Discord
          </a>
          <Link
            to="/admin"
            style={{ color: '#6b7280', textDecoration: 'none' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#00f0ff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#6b7280')}
          >
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
