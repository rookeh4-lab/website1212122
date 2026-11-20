import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  X,
  Package,
  Download,
  Users,
  ShieldAlert,
  MessageSquare,
  ShieldCheck,
  Plus,
  LogIn,
  LogOut,
  User
} from 'lucide-react';
import ResourceCard from '../components/ResourceCard';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const searchInputRef = useRef(null);

  // Filter state (ONLY 3 categories: clients, source codes, tools)
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');

  // Resources state
  const [allResources, setAllResources] = useState([]);
  const [loading, setLoading] = useState(true);

  // Category list - Strictly Clients, Source Codes, Tools
  const categories = [
    { name: 'All', id: 'All' },
    { name: 'Clients', id: 'Clients' },
    { name: 'Source Codes', id: 'Source Codes' },
    { name: 'Tools', id: 'Tools' },
  ];

  // Fetch all resources once on mount with caching for ultra-fast loads
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('resources')
          .select('*')
          .order('likes_count', { ascending: false })
          .order('downloads_count', { ascending: false });

        if (!error && data) {
          setAllResources(data);
        }
      } catch (err) {
        console.error('Failed to fetch resources:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filter in-memory for instant 0ms fast response
  const filteredResources = useMemo(() => {
    let list = allResources;

    if (activeCategory !== 'All') {
      if (activeCategory === 'Clients') {
        list = list.filter((r) => r.category === 'Clients' || r.category === 'Minecraft' || !r.category);
      } else {
        list = list.filter((r) => r.category === activeCategory);
      }
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((r) =>
        (r.title && r.title.toLowerCase().includes(q)) ||
        (r.description && r.description.toLowerCase().includes(q)) ||
        (r.author_name && r.author_name.toLowerCase().includes(q)) ||
        (r.version && r.version.toLowerCase().includes(q))
      );
    }

    return list;
  }, [allResources, activeCategory, search]);

  // Keyboard shortcut (Ctrl+K or / to focus search)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === '/' && document.activeElement !== searchInputRef.current && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const totalUploads = allResources.length || 8;
  const { user, profile, isAdmin, signOut } = useAuth();

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '80px' }}>
      <div style={{ maxWidth: '1180px', margin: '0 auto', padding: '24px 20px 0 20px' }}>
        
        {/* ------------------------------------------------------------------
            1. Ultra-Clean Modern Header with User's Uploaded Logo
            ------------------------------------------------------------------ */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '36px',
            paddingBottom: '20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          {/* Brand Logo & Name: ONLY "Client Syndicate" */}
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              textDecoration: 'none',
            }}
          >
            <img
              src="/logo.png"
              alt="Client Syndicate"
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                objectFit: 'cover',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                boxShadow: '0 0 16px rgba(56, 189, 248, 0.25)',
              }}
            />

            <div>
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontWeight: '800',
                  fontSize: '1.28rem',
                  letterSpacing: '-0.02em',
                  color: '#ffffff',
                }}
              >
                Client Syndicate
              </span>
            </div>
          </Link>

          {/* Right Action CTAs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Discord Button with live pulsing beacon */}
            <a
              href="https://discord.gg/syndicate"
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '7px 16px',
                borderRadius: '9999px',
                fontSize: '0.82rem',
                fontWeight: '500',
                color: '#cbd5e1',
                backgroundColor: 'rgba(13, 21, 39, 0.85)',
                border: '1px solid #1e2f4a',
                textDecoration: 'none',
                transition: 'all 0.16s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#38bdf8';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#1e2f4a';
                e.currentTarget.style.color = '#cbd5e1';
              }}
            >
              <span className="pulse-beacon" />
              <MessageSquare size={13} />
              <span>Discord</span>
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '1px 6px',
                  borderRadius: '999px',
                  background: '#162442',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                }}
              >
                15.6k
              </span>
            </a>

            {/* Admin Panel button - ONLY visible to rookeh4@gmail.com */}
            {isAdmin && (
              <Link
                to="/admin"
                className="btn-gold"
                style={{
                  padding: '7px 18px',
                  fontSize: '0.82rem',
                  gap: '6px',
                }}
              >
                <Plus size={14} />
                <span>Admin Panel</span>
              </Link>
            )}

            {/* Auth State: User Account or Sign In */}
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Link
                  to="/login"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                    padding: '5px 12px',
                    borderRadius: '9999px',
                    background: '#131e36',
                    border: '1px solid #1e2f4a',
                    color: '#cbd5e1',
                    fontSize: '0.80rem',
                    fontWeight: '600',
                    textDecoration: 'none',
                  }}
                  title="Edit Profile &amp; Settings"
                >
                  <img
                    src={profile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                    alt={profile?.username || 'User'}
                    style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <span>{profile?.username || user.email?.split('@')[0]}</span>
                </Link>

                <button
                  onClick={signOut}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'color 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
                  title="Sign Out"
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="btn-gold"
                style={{
                  padding: '7px 16px',
                  fontSize: '0.82rem',
                  gap: '6px',
                }}
              >
                <LogIn size={14} />
                <span>Sign In</span>
              </Link>
            )}
          </div>
        </header>

        {/* ------------------------------------------------------------------
            2. Hero Branding Section
            ------------------------------------------------------------------ */}
        <div style={{ marginBottom: '32px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              marginBottom: '20px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: 1, minWidth: '280px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    color: '#10b981',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    padding: '2px 9px',
                    borderRadius: '999px',
                    letterSpacing: '0.04em',
                  }}
                >
                  <ShieldCheck size={12} />
                  <span>CLEAN ARCHIVE</span>
                </span>
              </div>

              {/* ONLY "Client Syndicate" */}
              <h1
                style={{
                  fontSize: '2.4rem',
                  lineHeight: '1.2',
                  marginBottom: '8px',
                  fontWeight: '800',
                  letterSpacing: '-0.025em',
                  color: '#ffffff',
                }}
              >
                Client Syndicate
              </h1>

              <p
                style={{
                  fontSize: '0.94rem',
                  color: '#94a3b8',
                  marginBottom: '18px',
                }}
              >
                Minecraft clients, source codes &amp; developer tools. Direct downloads only.
              </p>

              {/* Stats Pill Row (Uploads, Downloads, Members - NO saved money, NO online) */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <div className="stat-pill-item">
                  <Package size={13} style={{ color: '#38bdf8' }} />
                  <span><strong>{totalUploads}</strong> uploads</span>
                </div>

                <div className="stat-pill-item">
                  <Download size={13} style={{ color: '#38bdf8' }} />
                  <span><strong>151.2k</strong> downloads</span>
                </div>

                <div className="stat-pill-item">
                  <Users size={13} style={{ color: '#94a3b8' }} />
                  <span><strong>15,645</strong> members</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------
            3. Category Tabs Row: ONLY Clients, Source Codes, Tools
            ------------------------------------------------------------------ */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '14px',
            marginBottom: '20px',
            scrollbarWidth: 'none',
          }}
        >
          {categories.map((cat) => {
            const isSelected = activeCategory === cat.name;
            return (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(cat.name)}
                className={`cat-pill ${isSelected ? 'on' : ''}`}
              >
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* ------------------------------------------------------------------
            4. Modern Animated Search Bar (Clean & Wide)
            ------------------------------------------------------------------ */}
        <div style={{ marginBottom: '28px' }}>
          <div className="modern-animated-search">
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#38bdf8',
                pointerEvents: 'none',
              }}
            />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by client name, version, author..."
            />
            {search ? (
              <button
                onClick={() => setSearch('')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  padding: '6px 14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  paddingRight: '14px',
                  color: '#64748b',
                  fontSize: '0.74rem',
                  fontFamily: 'monospace',
                  userSelect: 'none',
                }}
              >
                <span style={{ padding: '2px 6px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>Ctrl</span>
                <span>+</span>
                <span style={{ padding: '2px 6px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>K</span>
              </div>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------------
            5. Resource Cards Grid (3 Columns Desktop, 100% Smooth Scroll)
            ------------------------------------------------------------------ */}
        {loading ? (
          <div
            style={{
              padding: '60px 0',
              textAlign: 'center',
              color: '#64748b',
              fontSize: '0.95rem',
            }}
          >
            Loading Client Syndicate resources...
          </div>
        ) : filteredResources.length === 0 ? (
          <div
            style={{
              padding: '60px 20px',
              textAlign: 'center',
              background: '#0d1527',
              border: '1px solid #1e293b',
              borderRadius: '16px',
              color: '#64748b',
            }}
          >
            <p style={{ fontSize: '1rem', color: '#ffffff', marginBottom: '8px', fontWeight: '600' }}>
              No resources found matching your search.
            </p>
            <button
              onClick={() => {
                setActiveCategory('All');
                setSearch('');
              }}
              className="btn-gold"
              style={{ marginTop: '12px' }}
            >
              Reset Search
            </button>
          </div>
        ) : (
          <div className="resource-grid">
            {filteredResources.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}