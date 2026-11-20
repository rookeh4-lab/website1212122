import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  CheckCircle,
  Flame,
  X,
  Package,
  Download,
  Users,
  Plus,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import ResourceCard from '../components/ResourceCard';
import { supabase } from '../lib/supabaseClient';

export default function Home() {
  const searchInputRef = useRef(null);

  // Filter state
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');

  // Resources state
  const [allResources, setAllResources] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);

  // Category list
  const categories = [
    { name: 'All', id: 'All' },
    { name: 'Minecraft', id: 'Minecraft' },
    { name: 'Clients', id: 'Clients' },
    { name: 'Source Codes', id: 'Source Codes' },
    { name: 'Tools', id: 'Tools' },
    { name: 'Macros', id: 'Macros' },
    { name: 'Launchers', id: 'Launchers' },
  ];

  // Initial fetch of all resources for counts
  useEffect(() => {
    async function fetchAll() {
      try {
        const { data, error } = await supabase.from('resources').select('*');
        if (!error && data) {
          setAllResources(data);
        }
      } catch (err) {
        console.error('Failed to fetch resource counts:', err);
      }
    }
    fetchAll();
  }, []);

  // Compute category counts
  const categoryCounts = useMemo(() => {
    const counts = {
      All: allResources.length || 8,
      Minecraft: 0,
      Clients: 0,
      'Source Codes': 0,
      Tools: 0,
      Macros: 0,
      Launchers: 0,
    };
    allResources.forEach((res) => {
      if (res.game === 'Minecraft' || !res.game || res.category !== 'Software') {
        counts.Minecraft = (counts.Minecraft || 0) + 1;
      }
      if (res.category) {
        counts[res.category] = (counts[res.category] || 0) + 1;
      }
    });
    if (counts.Minecraft === 0) counts.Minecraft = 8;
    if (counts.Clients === 0) counts.Clients = 3;
    if (counts['Source Codes'] === 0) counts['Source Codes'] = 2;
    if (counts.Tools === 0) counts.Tools = 1;
    if (counts.Macros === 0) counts.Macros = 1;
    if (counts.Launchers === 0) counts.Launchers = 1;
    return counts;
  }, [allResources]);

  // Fetch filtered resources from Supabase
  useEffect(() => {
    async function fetchResources() {
      try {
        setLoading(true);
        let query = supabase.from('resources').select('*');

        if (activeCategory !== 'All') {
          if (activeCategory === 'Minecraft') {
            query = query.or('game.eq.Minecraft,category.neq.Software');
          } else {
            query = query.eq('category', activeCategory);
          }
        }

        if (search.trim()) {
          const q = search.trim();
          query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,author_name.ilike.%${q}%,version.ilike.%${q}%`);
        }

        // Sort by likes & downloads
        query = query.order('likes_count', { ascending: false }).order('downloads_count', { ascending: false });

        const { data, error } = await query;
        if (error) throw error;
        setResources(data || []);
      } catch (err) {
        console.error('Failed to fetch resources:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchResources();
  }, [activeCategory, search]);

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

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '80px' }}>
      <div style={{ maxWidth: '1180px', margin: '0 auto', padding: '24px 20px 0 20px' }}>
        
        {/* ------------------------------------------------------------------
            1. Ultra-Clean Modern Header (Replaces the clunky navbar pill)
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
          {/* Brand Logo */}
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
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                border: '1px solid #38bdf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 16px rgba(56, 189, 248, 0.4)',
                transition: 'transform 0.2s ease',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
              </svg>
            </div>

            <div>
              <span
                className="shimmer-text"
                style={{
                  fontFamily: "var(--font-sans)",
                  fontWeight: '800',
                  fontSize: '1.25rem',
                  letterSpacing: '-0.02em',
                }}
              >
                SYNDICATE
              </span>
            </div>
          </Link>

          {/* Right Action CTAs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Discord Button with pulsing live online dot */}
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
                backdropFilter: 'blur(10px)',
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

            {/* Glowing + Upload Button */}
            <Link
              to="/upload"
              className="btn-gold"
              style={{
                padding: '7px 18px',
                fontSize: '0.82rem',
                gap: '6px',
              }}
            >
              <Plus size={14} />
              <span>Upload</span>
            </Link>

            {/* Admin Link */}
            <Link
              to="/admin"
              style={{
                fontSize: '0.80rem',
                color: '#64748b',
                textDecoration: 'none',
                padding: '6px 8px',
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#cbd5e1')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
            >
              Admin
            </Link>
          </div>
        </header>

        {/* ------------------------------------------------------------------
            2. Hero Branding Section (Modern & Animated)
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
            {/* Title, Subtitle & Clean Stats Pills (NO saved money, NO online) */}
            <div style={{ flex: 1, minWidth: '280px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '0.72rem',
                    fontWeight: '600',
                    color: '#38bdf8',
                    background: 'rgba(56, 189, 248, 0.1)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    padding: '2px 9px',
                    borderRadius: '999px',
                  }}
                >
                  <Sparkles size={11} />
                  <span>PREMIUM ARCHIVE</span>
                </span>
              </div>

              <h1
                className="font-clean-title shimmer-text"
                style={{
                  fontSize: '2.2rem',
                  lineHeight: '1.2',
                  marginBottom: '6px',
                  fontWeight: '800',
                  letterSpacing: '-0.025em',
                }}
              >
                Syndicate Solutions
              </h1>

              <p
                className="font-clean-body"
                style={{
                  fontSize: '0.94rem',
                  color: '#94a3b8',
                  marginBottom: '16px',
                }}
              >
                Everything is just free. Discover and download clients, source codes & developer tools.
              </p>

              {/* Stats Pill Row (Uploads, Downloads, Members - saved money & online REMOVED) */}
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
            3. Category Tabs Row (All 8 | Minecraft 8 | Clients 3 | ...)
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
            const count = categoryCounts[cat.name] || 0;
            return (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(cat.name)}
                className={`cat-pill ${isSelected ? 'on' : ''}`}
              >
                <span>{cat.name}</span>
                <span className="count">{count}</span>
              </button>
            );
          })}
        </div>

        {/* ------------------------------------------------------------------
            4. Modern Animated Search Bar (Clean & Wide)
               (Removed clunky All versions, Top rated, Source Code dropdowns)
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
              placeholder="Search by client name, version, author, or tags..."
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
            5. Resource Cards Grid (3 Columns Desktop, Animated Stagger)
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
            Loading Syndicate resources...
          </div>
        ) : resources.length === 0 ? (
          <div
            style={{
              padding: '60px 20px',
              textAlign: 'center',
              background: '#0d1527',
              border: '1px solid #1e293b',
              borderRadius: '16px',
              color: '#64748b',
              boxShadow: 'var(--shadow-sm)',
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
          <div className="resource-grid fade-in">
            {resources.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}