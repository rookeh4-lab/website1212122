import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Compass,
  Code2,
  Wrench,
  Zap,
  Box,
  Upload,
  Menu,
  X,
  ExternalLink,
  ShieldCheck,
  Search,
  Sparkles
} from 'lucide-react';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { name: 'Archive', path: '/', icon: Compass },
    { name: 'Clients', path: '/clients', icon: Zap },
    { name: 'Source Codes', path: '/sources', icon: Code2 },
    { name: 'Tools', path: '/tools', icon: Wrench },
    { name: 'Macros', path: '/macros', icon: Sparkles },
    { name: 'Launchers', path: '/launchers', icon: Box },
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: scrolled ? 'rgba(9, 10, 15, 0.94)' : 'rgba(9, 10, 15, 0.8)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        transition: 'all 0.25s ease',
      }}
    >
      <div
        style={{
          maxWidth: '1240px',
          margin: '0 auto',
          padding: '0 24px',
          height: '70px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Brand / Logo */}
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            textDecoration: 'none',
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(124, 58, 237, 0.4)',
              color: '#fff',
              fontWeight: '800',
              fontSize: '1.2rem',
              letterSpacing: '-0.02em',
            }}
          >
            S
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '1.15rem',
                  fontWeight: '800',
                  letterSpacing: '0.04em',
                  color: '#ffffff',
                }}
              >
                SYNDICATE
              </span>
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: '700',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: 'rgba(124, 58, 237, 0.2)',
                  color: '#c084fc',
                  border: '1px solid rgba(124, 58, 237, 0.35)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                ARCHIVE
              </span>
            </div>
            <span
              style={{
                fontSize: '0.7rem',
                color: '#64748b',
                fontWeight: '500',
                letterSpacing: '0.02em',
              }}
            >
              Minecraft Client & Source Repository
            </span>
          </div>
        </Link>

        {/* Desktop Nav Items */}
        <div
          style={{
            display: 'none',
            alignItems: 'center',
            gap: '4px',
          }}
          className="desktop-nav"
        >
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  fontSize: '0.88rem',
                  fontWeight: active ? '600' : '500',
                  color: active ? '#ffffff' : '#94a3b8',
                  backgroundColor: active ? 'rgba(124, 58, 237, 0.15)' : 'transparent',
                  border: active ? '1px solid rgba(124, 58, 237, 0.3)' : '1px solid transparent',
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
                    e.currentTarget.style.color = '#94a3b8';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <Icon size={15} style={{ color: active ? '#c084fc' : '#64748b' }} />
                {link.name}
              </Link>
            );
          })}
        </div>

        {/* Right Action Buttons */}
        <div
          style={{
            display: 'none',
            alignItems: 'center',
            gap: '10px',
          }}
          className="desktop-actions"
        >
          {/* Upload Button */}
          <Link
            to="/upload"
            className="syn-btn syn-btn-primary"
            style={{
              padding: '8px 16px',
              fontSize: '0.85rem',
            }}
          >
            <Upload size={15} />
            Publish Resource
          </Link>

          {/* Admin link */}
          <Link
            to="/admin"
            className="syn-btn syn-btn-secondary"
            style={{
              padding: '8px 12px',
              fontSize: '0.82rem',
            }}
            title="Admin Dashboard"
          >
            <ShieldCheck size={15} style={{ color: '#38bdf8' }} />
            Admin
          </Link>

          {/* Discord CTA */}
          <a
            href="https://discord.gg/syndicate"
            target="_blank"
            rel="noopener noreferrer"
            className="syn-btn syn-btn-outline"
            style={{
              padding: '8px 14px',
              fontSize: '0.85rem',
            }}
          >
            <span>Discord</span>
            <ExternalLink size={13} style={{ color: '#64748b' }} />
          </a>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#fff',
            cursor: 'pointer',
          }}
          className="mobile-hamburger"
          aria-label="Toggle Navigation"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          style={{
            backgroundColor: '#0c0e14',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '16px 24px 24px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  fontWeight: active ? '600' : '500',
                  color: active ? '#ffffff' : '#94a3b8',
                  backgroundColor: active ? 'rgba(124, 58, 237, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                  border: active ? '1px solid rgba(124, 58, 237, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)',
                  textDecoration: 'none',
                }}
              >
                <Icon size={18} style={{ color: active ? '#c084fc' : '#64748b' }} />
                {link.name}
              </Link>
            );
          })}

          <div
            style={{
              height: '1px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              margin: '8px 0',
            }}
          />

          <Link
            to="/upload"
            className="syn-btn syn-btn-primary"
            style={{ width: '100%', padding: '12px' }}
          >
            <Upload size={16} />
            Publish Resource
          </Link>

          <Link
            to="/admin"
            className="syn-btn syn-btn-secondary"
            style={{ width: '100%', padding: '12px' }}
          >
            <ShieldCheck size={16} style={{ color: '#38bdf8' }} />
            Admin Dashboard
          </Link>
        </div>
      )}

      {/* Responsive CSS for desktop vs mobile */}
      <style>{`
        @media (min-width: 900px) {
          .desktop-nav { display: flex !important; }
          .desktop-actions { display: flex !important; }
          .mobile-hamburger { display: none !important; }
        }
      `}</style>
    </nav>
  );
}
