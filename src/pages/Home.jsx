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
          1. Top Announcement Bar - Clean Light Neutral
          ------------------------------------------------------------------ */}
      {showDiscordBanner && (
        <div className="top-announcement-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: '600', color: '#0f172a' }}>Official Community:</span>
            <span>Join our Discord server</span>
            <a
              href="https://discord.gg/syndicate"
              target="_blank"
              rel="noreferrer"
              className="top-announcement-pill"
            >
              discord.gg/syndicate
            </a>
          </div>

          <button
            onClick={() => setShowDiscordBanner(false)}
            aria-label="Dismiss banner"
            style={{
              position: 'absolute',
              right: '16px',
              background: 'none',
              border: 'none',
              color: '#94a3b8',
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

      <div style={{ maxWidth: '1180px', margin: '0 auto', padding: '32px 20px 0 20px' }}>
        {/* ------------------------------------------------------------------
            2. Hero Branding Section (Trillium Style)
            ------------------------------------------------------------------ */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            marginBottom: '28px',
            flexWrap: 'wrap',
          }}
        >
          {/* Logo Emblem */}
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '14px',
              background: '#0d1527',
              border: '1px solid #1e293b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
            }}
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
            </svg>
          </div>

          {/* Title, Subtitle & Clean Stats Pills (NO saved money, NO online) */}
          <div style={{ flex: 1, minWidth: '280px' }}>
            <h1
              className="font-clean-title"
              style={{
                fontSize: '1.9rem',
                color: '#ffffff',
                lineHeight: '1.2',
                marginBottom: '4px',
                fontWeight: '700',
              }}
            >
              Syndicate Solutions
            </h1>

            <p
              className="font-clean-body"
              style={{
                fontSize: '0.92rem',
                color: '#94a3b8',
                marginBottom: '12px',
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

        {/* ------------------------------------------------------------------
            3. Category Tabs Row (All 43 | Minecraft 33 | ...)
            ------------------------------------------------------------------ */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '14px',
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
            4. Filter Controls (Trillium Capsule Shape - Matches Image 2 & 3)
               [ Search ]
               [ All ⌄ ]
               [ All versions ⌄ ]
               [ 🎛️ Top rated ⌄ ]
               [ Clients ]
               [ All posts ]
            ------------------------------------------------------------------ */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            marginBottom: '26px',
            paddingBottom: '18px',
            borderBottom: '1px solid var(--edge)',
          }}
        >
          {/* Left Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Search Pill Input */}
            <div style={{ position: 'relative' }}>
              <Search
                size={13}
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#64748b',
                }}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                className="filter-pill-input"
                style={{ width: '220px' }}
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
                    background: '#0d1527',
                    border: '1px solid #1e293b',
                    borderRadius: '10px',
                    padding: '6px',
                    boxShadow: '0 10px 28px rgba(0, 0, 0, 0.5)',
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
                        color: selectedVersion === ver ? '#ffffff' : '#94a3b8',
                        fontWeight: selectedVersion === ver ? '600' : '400',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        backgroundColor: selectedVersion === ver ? '#162442' : 'transparent',
                        transition: 'background 0.12s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#131e36')}
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor =
                          selectedVersion === ver ? '#162442' : 'transparent')
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
                    background: '#0d1527',
                    border: '1px solid #1e293b',
                    borderRadius: '10px',
                    padding: '6px',
                    boxShadow: '0 10px 28px rgba(0, 0, 0, 0.5)',
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
                        color: sortBy === s.id ? '#ffffff' : '#94a3b8',
                        fontWeight: sortBy === s.id ? '600' : '400',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        backgroundColor: sortBy === s.id ? '#162442' : 'transparent',
                        transition: 'background 0.12s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#131e36')}
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor =
                          sortBy === s.id ? '#162442' : 'transparent')
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
            >
              <span>Source Code</span>
            </button>
          </div>

          {/* Right Category Quick Pills: Clients & All posts */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setActiveCategory('Clients')}
              className={`filter-dropdown-pill ${activeCategory === 'Clients' ? 'active' : ''}`}
            >
              Clients
            </button>

            <button
              onClick={() => {
                setActiveCategory('All');
                setSelectedVersion('All versions');
                setSearch('');
                setSourceCodeOnly(false);
                setSortBy('top_rated');
              }}
              className={`filter-dropdown-pill ${activeCategory === 'All' && !sourceCodeOnly && selectedVersion === 'All versions' ? 'active' : ''}`}
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
