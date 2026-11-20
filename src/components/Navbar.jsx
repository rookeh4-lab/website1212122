import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Zap,
  Code2,
  Wrench,
  Sparkles,
  Box,
  Plus,
  ShieldCheck,
  Menu,
  X,
  ExternalLink,
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
          background: 'rgba(15, 19, 28, 0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '9999px',
          padding: '8px 16px 8px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.6)',
        }}
      >
        {/* Brand Logo & Name (Clean & Normal) */}
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '9px',
            textDecoration: 'none',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #ff6a2b 0%, #ff8a3d 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 2px 10px rgba(255, 106, 43, 0.35)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
            </svg>
          </div>

          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: '700',
              fontSize: '1.15rem',
              color: '#ffffff',
              letterSpacing: '-0.01em',
            }}
          >
            Syndicate
          </span>
        </Link>

        {/* Center Navigation Links (Clean small text matching Image 2) */}
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
                  fontWeight: active ? '600' : '400',
                  color: active ? '#ffffff' : '#8b949e',
                  backgroundColor: active ? 'rgba(255, 106, 43, 0.15)' : 'transparent',
                  border: active ? '1px solid rgba(255, 106, 43, 0.35)' : '1px solid transparent',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.color = '#ffffff';
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.color = '#8b949e';
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
              padding: '6px 12px',
              borderRadius: '9999px',
              fontSize: '0.82rem',
              fontWeight: '500',
              color: '#e2e8f0',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              textDecoration: 'none',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 106, 43, 0.4)';
              e.currentTarget.style.color = '#ff8a3d';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = '#e2e8f0';
            }}
          >
            <MessageSquare size={13} />
            <span>Discord</span>
          </a>

          <Link
            to="/upload"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '0.82rem',
              fontWeight: '600',
              color: '#ffffff',
              background: 'linear-gradient(135deg, #ff5e2b 0%, #ff8a3d 100%)',
              border: 'none',
              textDecoration: 'none',
              boxShadow: '0 2px 8px rgba(255, 94, 43, 0.3)',
              transition: 'opacity 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
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
              color: '#8b949e',
              textDecoration: 'none',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#8b949e')}
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
            background: 'rgba(15, 19, 28, 0.98)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.8)',
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
                color: isActive(item.path) ? '#ff8a3d' : '#d1d5db',
                fontWeight: isActive(item.path) ? '600' : '400',
                textDecoration: 'none',
                backgroundColor: isActive(item.path) ? 'rgba(255, 106, 43, 0.1)' : 'transparent',
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
