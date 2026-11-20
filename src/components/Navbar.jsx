import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Plus,
  Menu,
  X,
  MessageSquare,
  ShieldCheck,
  LogIn,
  LogOut,
  User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user, isAdmin, signOut } = useAuth();

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
          <img
            src="/logo.png"
            alt="Client Syndicate"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              objectFit: 'cover',
              border: '1px solid rgba(56, 189, 248, 0.3)',
            }}
          />

          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: '700',
              fontSize: '1.05rem',
              color: '#ffffff',
              letterSpacing: '-0.02em',
            }}
          >
            Client Syndicate
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

          {/* Admin Panel Button - ONLY shown to rookeh4@gmail.com */}
          {isAdmin && (
            <Link
              to="/admin"
              className="btn-gold"
              style={{
                padding: '6px 14px',
                fontSize: '0.80rem',
                gap: '5px',
              }}
            >
              <ShieldCheck size={13} />
              <span>Admin</span>
            </Link>
          )}

          {/* User Sign In / Account Button */}
          {user ? (
            <button
              onClick={signOut}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 10px',
                borderRadius: '9999px',
                background: '#131e36',
                border: '1px solid #1e2f4a',
                color: '#cbd5e1',
                fontSize: '0.78rem',
                cursor: 'pointer',
              }}
              title="Sign Out"
            >
              <User size={12} style={{ color: '#38bdf8' }} />
              <span>{user.email?.split('@')[0]}</span>
              <LogOut size={12} style={{ color: '#ef4444', marginLeft: '4px' }} />
            </button>
          ) : (
            <Link
              to="/login"
              className="btn-gold"
              style={{
                padding: '6px 14px',
                fontSize: '0.80rem',
                gap: '5px',
              }}
            >
              <LogIn size={13} />
              <span>Sign In</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
