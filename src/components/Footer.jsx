import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Shield, Terminal, Heart, Sparkles } from 'lucide-react';
import GithubIcon from './GithubIcon';

export default function Footer() {
  return (
    <footer
      style={{
        backgroundColor: '#07080b',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        marginTop: 'auto',
        padding: '60px 0 30px 0',
      }}
    >
      <div
        style={{
          maxWidth: '1240px',
          margin: '0 auto',
          padding: '0 24px',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '40px',
            marginBottom: '48px',
          }}
        >
          {/* Brand info */}
          <div style={{ maxWidth: '320px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: '800',
                  fontSize: '1rem',
                }}
              >
                S
              </div>
              <span style={{ fontSize: '1.1rem', fontWeight: '800', letterSpacing: '0.04em', color: '#fff' }}>
                SYNDICATE
              </span>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.86rem', lineHeight: '1.6', marginBottom: '18px' }}>
              The premier community-driven archive for Minecraft Java clients, open-source modifications, native C++ injectors, and development utilities.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <a
                href="https://discord.gg/syndicate"
                target="_blank"
                rel="noreferrer"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94a3b8',
                  transition: 'all 0.2s',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#fff';
                  e.currentTarget.style.borderColor = '#8b5cf6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#94a3b8';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }}
              >
                <MessageSquare size={16} />
              </a>
              <a
                href="https://github.com/syndicate-archive"
                target="_blank"
                rel="noreferrer"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94a3b8',
                  transition: 'all 0.2s',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#fff';
                  e.currentTarget.style.borderColor = '#8b5cf6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#94a3b8';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }}
              >
                <GithubIcon size={16} />
              </a>
            </div>
          </div>

          {/* Quick Browse */}
          <div>
            <h4 style={{ color: '#fff', fontSize: '0.9rem', fontWeight: '700', marginBottom: '16px', letterSpacing: '0.04em' }}>
              ARCHIVE
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li>
                <Link to="/clients" style={{ color: '#94a3b8', fontSize: '0.85rem', textDecoration: 'none' }}>
                  Minecraft Clients
                </Link>
              </li>
              <li>
                <Link to="/sources" style={{ color: '#94a3b8', fontSize: '0.85rem', textDecoration: 'none' }}>
                  Client Source Codes
                </Link>
              </li>
              <li>
                <Link to="/tools" style={{ color: '#94a3b8', fontSize: '0.85rem', textDecoration: 'none' }}>
                  Injectors & Tools
                </Link>
              </li>
              <li>
                <Link to="/macros" style={{ color: '#94a3b8', fontSize: '0.85rem', textDecoration: 'none' }}>
                  PvP Macros & Configs
                </Link>
              </li>
              <li>
                <Link to="/launchers" style={{ color: '#94a3b8', fontSize: '0.85rem', textDecoration: 'none' }}>
                  Launchers
                </Link>
              </li>
            </ul>
          </div>

          {/* Loaders & Versions */}
          <div>
            <h4 style={{ color: '#fff', fontSize: '0.9rem', fontWeight: '700', marginBottom: '16px', letterSpacing: '0.04em' }}>
              MOD LOADERS
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li>
                <Link to="/clients?loader=Fabric" style={{ color: '#94a3b8', fontSize: '0.85rem', textDecoration: 'none' }}>
                  Fabric 1.21.11 / 1.20.4
                </Link>
              </li>
              <li>
                <Link to="/clients?loader=Forge" style={{ color: '#94a3b8', fontSize: '0.85rem', textDecoration: 'none' }}>
                  Minecraft Forge
                </Link>
              </li>
              <li>
                <Link to="/clients?loader=NeoForge" style={{ color: '#94a3b8', fontSize: '0.85rem', textDecoration: 'none' }}>
                  NeoForge Addons
                </Link>
              </li>
              <li>
                <Link to="/clients?loader=C%2B%2B+%2F+Native" style={{ color: '#94a3b8', fontSize: '0.85rem', textDecoration: 'none' }}>
                  Native C++ / DLL Injection
                </Link>
              </li>
              <li>
                <Link to="/clients?version=1.8.9" style={{ color: '#94a3b8', fontSize: '0.85rem', textDecoration: 'none' }}>
                  Legacy 1.8.9 Ghost Clients
                </Link>
              </li>
            </ul>
          </div>

          {/* Submission & Policy */}
          <div>
            <h4 style={{ color: '#fff', fontSize: '0.9rem', fontWeight: '700', marginBottom: '16px', letterSpacing: '0.04em' }}>
              COMMUNITY
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li>
                <Link to="/upload" style={{ color: '#94a3b8', fontSize: '0.85rem', textDecoration: 'none' }}>
                  Publish a Resource
                </Link>
              </li>
              <li>
                <Link to="/admin" style={{ color: '#94a3b8', fontSize: '0.85rem', textDecoration: 'none' }}>
                  Admin Portal
                </Link>
              </li>
              <li>
                <a href="https://discord.gg/syndicate" target="_blank" rel="noreferrer" style={{ color: '#94a3b8', fontSize: '0.85rem', textDecoration: 'none' }}>
                  Official Discord Server
                </a>
              </li>
              <li>
                <span style={{ color: '#64748b', fontSize: '0.82rem' }}>
                  Verified Safe & Scanned
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            paddingTop: '24px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            fontSize: '0.8rem',
            color: '#64748b',
          }}
        >
          <div>
            © 2026 Syndicate Archive. All resources provided for educational and single-player utility testing purposes.
          </div>
          <div>
            Minecraft is a registered trademark of Mojang AB / Microsoft. Syndicate is an independent archive not affiliated with Mojang Studios.
          </div>
        </div>
      </div>
    </footer>
  );
}
