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

  const navLinks = [
    { name: 'Archive', path: '/' },
    { name: 'Clients', path: '/clients' },
    { name: 'Source Codes', path: '/sources' },
    { name: 'Tools', path: '/tools' },
    { name: 'Macros', path: '/macros' },
    { name: 'Launchers', path: '/launchers' },
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

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
          background: 'rgba(13, 21, 39, 0.90)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '9999px',
          padding: '8px 16px 8px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          border: '1px solid #1e293b',
          boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.4)',
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
              background: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)',
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
              fontSize: '1.12rem',
              color: '#ffffff',
              letterSpacing: '-0.02em',
            }}
          >
            Syndicate
          </span>
        </Link>

        {/* Center Navigation Links */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
          className="desktop-nav-menu"
        >
          {navLinks.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  fontSize: '0.84rem',
                  fontWeight: active ? '600' : '500',
                  color: active ? '#ffffff' : '#94a3b8',
                  backgroundColor: active ? '#162442' : 'transparent',
                  border: active ? '1px solid #38bdf8' : '1px solid transparent',
                  textDecoration: 'none',
                  transition: 'all 0.16s var(--ease-out)',
                  boxShadow: active ? '0 0 12px rgba(56, 189, 248, 0.15)' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.color = '#ffffff';
                    e.currentTarget.style.backgroundColor = '#131e36';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.color = '#94a3b8';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <a
            href="https://discord.gg/syndicate"
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 13px',
              borderRadius: '9999px',
              fontSize: '0.82rem',
              fontWeight: '500',
              color: '#cbd5e1',
              backgroundColor: '#0d1527',
              border: '1px solid #1e293b',
              textDecoration: 'none',
              transition: 'all 0.16s var(--ease-out)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#334155';
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.backgroundColor = '#131e36';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#1e293b';
              e.currentTarget.style.color = '#cbd5e1';
              e.currentTarget.style.backgroundColor = '#0d1527';
            }}
          >
            <MessageSquare size={13} />
            <span>Discord</span>
          </a>

          <Link
            to="/upload"
            className="btn-gold"
            style={{
              padding: '6px 15px',
              fontSize: '0.82rem',
            }}
          >
            <Plus size={14} />
            <span>Upload</span>
          </Link>

          <Link
            to="/admin"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '6px 10px',
              borderRadius: '9999px',
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

          {/* Mobile Menu Hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle mobile menu"
            className="mobile-nav-toggle"
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              color: '#ffffff',
              padding: '6px',
              cursor: 'pointer',
            }}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div
          style={{
            marginTop: '8px',
            background: '#0d1527',
            border: '1px solid #1e293b',
            borderRadius: '16px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5)',
          }}
        >
          {navLinks.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '0.88rem',
                color: isActive(item.path) ? '#ffffff' : '#94a3b8',
                fontWeight: isActive(item.path) ? '600' : '500',
                textDecoration: 'none',
                backgroundColor: isActive(item.path) ? '#162442' : 'transparent',
              }}
            >
              {item.name}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
