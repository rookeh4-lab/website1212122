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
          background: 'rgba(20, 28, 42, 0.88)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '9999px',
          padding: '8px 16px 8px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.5), 0 0 1px 1px rgba(255, 255, 255, 0.08)',
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
              background: 'linear-gradient(135deg, #38bdf8 0%, #6366f1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 2px 10px rgba(56, 189, 248, 0.4)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
            </svg>
          </div>

          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: '800',
              fontSize: '1.15rem',
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
                  color: active ? '#ffffff' : 'var(--text-muted)',
                  backgroundColor: active ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                  border: active ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
                  textDecoration: 'none',
                  transition: 'all 0.18s var(--ease-out)',
                  boxShadow: active ? '0 0 12px rgba(56, 189, 248, 0.2)' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.color = '#ffffff';
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.color = 'var(--text-muted)';
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
              color: 'var(--text-muted)',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--edge)',
              textDecoration: 'none',
              transition: 'all 0.18s var(--ease-out)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.4)';
              e.currentTarget.style.color = 'var(--accent-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--edge)';
              e.currentTarget.style.color = 'var(--text-muted)';
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
              color: 'var(--text-dim)',
              textDecoration: 'none',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
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
              color: 'var(--text)',
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
            background: 'rgba(20, 28, 42, 0.96)',
            border: '1px solid var(--edge)',
            borderRadius: '16px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.7)',
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
                color: isActive(item.path) ? 'var(--accent-primary)' : 'var(--text-muted)',
                fontWeight: isActive(item.path) ? '600' : '400',
                textDecoration: 'none',
                backgroundColor: isActive(item.path) ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
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
