import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Plus,
  Menu,
  X,
  MessageSquare
} from 'lucide-react';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Remove the navbar pill from Home page as requested
  if (location.pathname === '/') {
    return null;
  }

  return (
    <header
      style={{
        position: 'sticky',
        top: '12px',
        zIndex: 100,
        maxWidth: '1180px',
        margin: '0 auto',
        padding: '0 20px',
      }}
    >
      <div
        style={{
          background: 'rgba(13, 21, 39, 0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '9999px',
          padding: '8px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          border: '1px solid #1e293b',
          boxShadow: '0 4px 24px -2px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Brand Logo & Name */}
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            textDecoration: 'none',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0284c7, #0369a1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 0 12px rgba(56, 189, 248, 0.4)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
            </svg>
          </div>

          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: '700',
              fontSize: '1.1rem',
              color: '#ffffff',
              letterSpacing: '-0.02em',
            }}
          >
            Syndicate
          </span>
        </Link>

        {/* Center Back to Archive */}
        <Link
          to="/"
          style={{
            padding: '6px 14px',
            borderRadius: '9999px',
            fontSize: '0.84rem',
            fontWeight: '600',
            color: '#94a3b8',
            textDecoration: 'none',
            transition: 'all 0.16s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#ffffff';
            e.currentTarget.style.backgroundColor = '#131e36';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#94a3b8';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          ← Return to Archive
        </Link>

        {/* Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <a
            href="https://discord.gg/syndicate"
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '0.82rem',
              fontWeight: '500',
              color: '#cbd5e1',
              backgroundColor: '#0d1527',
              border: '1px solid #1e293b',
              textDecoration: 'none',
              transition: 'all 0.16s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#38bdf8';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#1e293b';
              e.currentTarget.style.color = '#cbd5e1';
            }}
          >
            <MessageSquare size={13} />
            <span>Discord</span>
          </a>

          <Link
            to="/upload"
            className="btn-gold"
            style={{
              padding: '6px 16px',
              fontSize: '0.82rem',
            }}
          >
            <Plus size={14} />
            <span>Upload</span>
          </Link>

          <Link
            to="/admin"
            style={{
              padding: '6px 10px',
              fontSize: '0.80rem',
              fontWeight: '500',
              color: '#64748b',
              textDecoration: 'none',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#cbd5e1')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
          >
            Admin
          </Link>
        </div>
      </div>
    </header>
  );
}
