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
  ExternalLink
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
        top: '16px',
        zIndex: 100,
        maxWidth: '1240px',
        margin: '0 auto',
        padding: '0 20px',
      }}
    >
      <div
        className="gta-glass-panel"
        style={{
          borderRadius: '9999px',
          padding: '8px 16px 8px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 12px 32px -8px rgba(0, 0, 0, 0.8), 0 0 20px -5px rgba(255, 42, 133, 0.15)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
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
          {/* GTA 6 Style Emblem */}
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #ff2a85 0%, #ff7a00 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(255, 42, 133, 0.5)',
              color: '#ffffff',
              fontWeight: '900',
              fontSize: '1rem',
              letterSpacing: '-0.02em',
            }}
          >
            VI
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontWeight: '900',
                fontSize: '1.25rem',
                color: '#ffffff',
                letterSpacing: '-0.01em',
              }}
            >
              Syndicate
            </span>
            <span
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontWeight: '900',
                fontSize: '0.85rem',
                background: 'linear-gradient(135deg, #ff2a85, #ff7a00)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '0.04em',
              }}
            >
              VI
            </span>
          </div>
        </Link>

        {/* Center Desktop Navigation Links */}
        <nav
          style={{
            display: 'none',
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
                  padding: '7px 16px',
                  borderRadius: '9999px',
                  fontSize: '0.86rem',
                  fontWeight: active ? '700' : '500',
                  color: active ? '#ffffff' : '#9ca3af',
                  backgroundColor: active ? 'rgba(255, 42, 133, 0.15)' : 'transparent',
                  border: active ? '1px solid rgba(255, 42, 133, 0.35)' : '1px solid transparent',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.color = '#ffffff';
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.color = '#9ca3af';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Right Action Buttons */}
        <div
          style={{
            display: 'none',
            alignItems: 'center',
            gap: '10px',
          }}
          className="desktop-nav-actions"
        >
          {/* Publish Button */}
          <Link
            to="/upload"
            className="gta-pill-btn gta-pill-btn-primary"
            style={{ padding: '7px 16px', fontSize: '0.82rem' }}
          >
            <Plus size={15} />
            <span>Publish</span>
          </Link>

          {/* Admin link */}
          <Link
            to="/admin"
            className="gta-pill-btn gta-pill-btn-secondary"
            style={{ padding: '7px 14px', fontSize: '0.82rem' }}
            title="Admin Dashboard"
          >
            <ShieldCheck size={14} style={{ color: '#00f0ff' }} />
            <span>Admin</span>
          </Link>

          {/* Discord Pill */}
          <a
            href="https://discord.gg/syndicate"
            target="_blank"
            rel="noopener noreferrer"
            className="gta-pill-btn gta-pill-btn-secondary"
            style={{ padding: '7px 14px', fontSize: '0.82rem' }}
          >
            <span>Discord</span>
            <ExternalLink size={12} style={{ color: '#9ca3af' }} />
          </a>
        </div>

        {/* Mobile Hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#fff',
            cursor: 'pointer',
          }}
          className="mobile-nav-toggle"
          aria-label="Toggle Navigation"
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div
          className="gta-glass-panel"
          style={{
            marginTop: '10px',
            borderRadius: '20px',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {navLinks.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                padding: '10px 16px',
                borderRadius: '12px',
                color: isActive(item.path) ? '#fff' : '#9ca3af',
                backgroundColor: isActive(item.path) ? 'rgba(255, 42, 133, 0.18)' : 'transparent',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '0.9rem',
              }}
            >
              {item.name}
            </Link>
          ))}
          <div style={{ height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.08)', margin: '6px 0' }} />
          <Link to="/upload" className="gta-pill-btn gta-pill-btn-primary" style={{ justifyContent: 'center' }}>
            <Plus size={16} /> Publish Resource
          </Link>
          <Link to="/admin" className="gta-pill-btn gta-pill-btn-secondary" style={{ justifyContent: 'center' }}>
            <ShieldCheck size={16} style={{ color: '#00f0ff' }} /> Admin Dashboard
          </Link>
        </div>
      )}

      <style>{`
        @media (min-width: 900px) {
          .desktop-nav-menu { display: flex !important; }
          .desktop-nav-actions { display: flex !important; }
          .mobile-nav-toggle { display: none !important; }
        }
      `}</style>
    </header>
  );
}
