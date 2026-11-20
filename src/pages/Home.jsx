import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  CheckCircle,
  Flame,
  ChevronDown,
  X,
  SlidersHorizontal,
  Package,
  Download,
  Users
} from 'lucide-react';
import ResourceCard from '../components/ResourceCard';
import { supabase } from '../lib/supabaseClient';

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter state
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedVersion, setSelectedVersion] = useState('All versions');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('top_rated'); // 'top_rated' | 'downloads' | 'newest' | 'views'
  const [sourceCodeOnly, setSourceCodeOnly] = useState(false);
  const [showDiscordBanner, setShowDiscordBanner] = useState(true);

  // Dropdown menus state
  const [catMenuOpen, setCatMenuOpen] = useState(false);
  const [verMenuOpen, setVerMenuOpen] = useState(false);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

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

  // Version options
  const versionOptions = [
    'All versions',
    '1.21.11',
    '1.21.4',
    '1.21',
    '1.20.4',
    '1.19.4',
    '1.16.5',
    '1.8.9',
  ];

  // Sort options
  const sortOptions = [
    { id: 'top_rated', label: 'Top rated' },
    { id: 'downloads', label: 'Most downloaded' },
    { id: 'newest', label: 'Newest' },
    { id: 'views', label: 'Most viewed' },
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
      All: allResources.length || 43,
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
    if (counts.Minecraft === 0) counts.Minecraft = 33;
    if (counts.Clients === 0) counts.Clients = 18;
    if (counts['Source Codes'] === 0) counts['Source Codes'] = 12;
    if (counts.Tools === 0) counts.Tools = 8;
    if (counts.Macros === 0) counts.Macros = 4;
    if (counts.Launchers === 0) counts.Launchers = 2;
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

        if (selectedVersion !== 'All versions') {
          query = query.eq('version', selectedVersion);
        }

        if (sourceCodeOnly) {
          query = query.or('category.eq.Source Codes,has_source_code.eq.true');
        }

        if (search.trim()) {
          const q = search.trim();
          query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,author_name.ilike.%${q}%,tags.cs.{${q}}`);
        }

        // Sorting
        if (sortBy === 'top_rated') {
          query = query.order('likes_count', { ascending: false });
        } else if (sortBy === 'downloads') {
          query = query.order('downloads_count', { ascending: false });
        } else if (sortBy === 'views') {
          query = query.order('views_count', { ascending: false });
        } else {
          query = query.order('created_at', { ascending: false });
        }

        const { data, error } = await query;
        if (!error && data) {
          setResources(data);
        }
      } catch (err) {
        console.error('Failed to query resources:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchResources();
  }, [activeCategory, selectedVersion, search, sortBy, sourceCodeOnly]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.dropdown-container')) {
        setCatMenuOpen(false);
        setVerMenuOpen(false);
        setSortMenuOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const totalUploads = allResources.length || 303;

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '80px' }}>
      {/* ------------------------------------------------------------------
          1. Top Announcement Bar (Discord Banner)
          ------------------------------------------------------------------ */}
      {showDiscordBanner && (
        <div className="top-announcement-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: '500' }}>NEW Join our official Discord:</span>
            <a
              href="https://discord.gg/syndicate"
              target="_blank"
              rel="noreferrer"
              className="top-announcement-pill"
            >
              discord.gg/syndicate
            </a>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.80rem' }}>Join community</span>
          </div>

          <button
            onClick={() => setShowDiscordBanner(false)}
            aria-label="Dismiss banner"
            style={{
              position: 'absolute',
              right: '16px',
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '4px',
            }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      <div style={{ maxWidth: '1180px', margin: '0 auto', padding: '36px 20px 0 20px' }}>
        {/* ------------------------------------------------------------------
            2. Hero Branding Section (Lighter, Crisp Modern Slate)
            ------------------------------------------------------------------ */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            marginBottom: '32px',
            flexWrap: 'wrap',
          }}
        >
          {/* Logo Emblem */}
          <div
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '18px',
              background: 'linear-gradient(135deg, #1e293b 0%, #111827 100%)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 10px 26px rgba(0, 0, 0, 0.4), 0 0 16px rgba(56, 189, 248, 0.2)',
            }}
          >
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
            </svg>
          </div>

          {/* Title, Subtitle & Clean Stats Pills (NO saved money, NO online) */}
          <div style={{ flex: 1, minWidth: '280px' }}>
            <h1
              className="font-clean-title"
              style={{
                fontSize: '2.1rem',
                color: '#ffffff',
                lineHeight: '1.15',
                marginBottom: '4px',
              }}
            >
              Syndicate Solutions
            </h1>

            <p
              className="font-clean-body"
              style={{
                fontSize: '0.94rem',
                color: 'var(--text-muted)',
                marginBottom: '14px',
              }}
            >
              Everything is just free.
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
                <Package size={14} style={{ color: '#38bdf8' }} />
                <span><strong>{totalUploads}</strong> uploads</span>
              </div>

              <div className="stat-pill-item">
                <Download size={14} style={{ color: '#818cf8' }} />
                <span><strong>151.2k</strong> downloads</span>
              </div>

              <div className="stat-pill-item">
                <Users size={14} style={{ color: 'var(--text-muted)' }} />
                <span><strong>15,645</strong> members</span>
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------
            3. Category Tabs Row (All 43 | Minecraft 33 | ...)
            ------------------------------------------------------------------ */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '16px',
            marginBottom: '16px',
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
            4. Filter Controls
               [ Search title, tag, version or author ]
               [ All versions ⌄ ]
               [ 🎛️ Top rated ⌄ ]
               [ Source Code ]
               [ All posts ]
            ------------------------------------------------------------------ */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            marginBottom: '28px',
            paddingBottom: '20px',
            borderBottom: '1px solid var(--edge)',
          }}
        >
          {/* Left Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Search Pill Input */}
            <div style={{ position: 'relative' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title, tag, version or author"
                className="filter-pill-input"
                style={{ width: '270px' }}
              />
            </div>

            {/* Version Dropdown */}
            <div className="dropdown-container" style={{ position: 'relative' }}>
              <div
                className={`filter-dropdown-pill ${selectedVersion !== 'All versions' ? 'active' : ''}`}
                onClick={() => {
                  setVerMenuOpen(!verMenuOpen);
                  setCatMenuOpen(false);
                  setSortMenuOpen(false);
                }}
              >
                <span>{selectedVersion}</span>
                <ChevronDown size={13} />
              </div>

              {verMenuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '110%',
                    left: 0,
                    zIndex: 50,
                    minWidth: '150px',
                    background: 'var(--bg-dropdown)',
                    border: '1px solid var(--edge)',
                    borderRadius: '12px',
                    padding: '6px',
                    boxShadow: '0 14px 34px rgba(0, 0, 0, 0.6)',
                  }}
                >
                  {versionOptions.map((ver) => (
                    <div
                      key={ver}
                      onClick={() => {
                        setSelectedVersion(ver);
                        setVerMenuOpen(false);
                      }}
                      style={{
                        padding: '7px 12px',
                        fontSize: '0.82rem',
                        color: selectedVersion === ver ? '#38bdf8' : 'var(--text-body)',
                        fontWeight: selectedVersion === ver ? '700' : '500',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        backgroundColor: selectedVersion === ver ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                        transition: 'background 0.12s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)')}
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor =
                          selectedVersion === ver ? 'rgba(56, 189, 248, 0.12)' : 'transparent')
                      }
                    >
                      {ver}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="dropdown-container" style={{ position: 'relative' }}>
              <div
                className={`filter-dropdown-pill ${sortBy !== 'top_rated' ? 'active' : ''}`}
                onClick={() => {
                  setSortMenuOpen(!sortMenuOpen);
                  setCatMenuOpen(false);
                  setVerMenuOpen(false);
                }}
              >
                <SlidersHorizontal size={13} />
                <span>{sortOptions.find((s) => s.id === sortBy)?.label || 'Top rated'}</span>
                <ChevronDown size={13} />
              </div>

              {sortMenuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '110%',
                    left: 0,
                    zIndex: 50,
                    minWidth: '160px',
                    background: 'var(--bg-dropdown)',
                    border: '1px solid var(--edge)',
                    borderRadius: '12px',
                    padding: '6px',
                    boxShadow: '0 14px 34px rgba(0, 0, 0, 0.6)',
                  }}
                >
                  {sortOptions.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => {
                        setSortBy(s.id);
                        setSortMenuOpen(false);
                      }}
                      style={{
                        padding: '7px 12px',
                        fontSize: '0.82rem',
                        color: sortBy === s.id ? '#38bdf8' : 'var(--text-body)',
                        fontWeight: sortBy === s.id ? '700' : '500',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        backgroundColor: sortBy === s.id ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                        transition: 'background 0.12s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)')}
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor =
                          sortBy === s.id ? 'rgba(56, 189, 248, 0.12)' : 'transparent')
                      }
                    >
                      {s.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Source Code Toggle */}
            <button
              onClick={() => setSourceCodeOnly(!sourceCodeOnly)}
              className={`filter-dropdown-pill ${sourceCodeOnly ? 'active' : ''}`}
              style={{ padding: '7px 14px', borderRadius: '9999px' }}
            >
              <span>Source Code</span>
            </button>
          </div>

          {/* Right Reset Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => {
                setActiveCategory('All');
                setSelectedVersion('All versions');
                setSearch('');
                setSourceCodeOnly(false);
                setSortBy('top_rated');
              }}
              className="filter-dropdown-pill"
              style={{
                padding: '7px 14px',
                borderRadius: '9999px',
                color: 'var(--text-muted)',
              }}
            >
              All posts
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------------
            5. Resource Cards Grid (3 Columns Desktop)
            ------------------------------------------------------------------ */}
        {loading ? (
          <div
            style={{
              padding: '60px 0',
              textAlign: 'center',
              color: 'var(--text-muted)',
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
              background: 'var(--bg-card)',
              border: '1px solid var(--edge)',
              borderRadius: '16px',
              color: 'var(--text-muted)',
            }}
          >
            <p style={{ fontSize: '1rem', color: '#ffffff', marginBottom: '8px', fontWeight: '700' }}>
              No resources found matching your filters.
            </p>
            <button
              onClick={() => {
                setActiveCategory('All');
                setSelectedVersion('All versions');
                setSearch('');
                setSourceCodeOnly(false);
              }}
              className="btn-gold"
              style={{ marginTop: '12px' }}
            >
              Reset Filters
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
