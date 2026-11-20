import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  CheckCircle,
  Layers,
  Zap,
  Code2,
  Wrench,
  Sparkles,
  Box,
  MessageSquare,
  ArrowRight,
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
  const [showDiscordBanner, setShowDiscordBanner] = useState(true);

  // Dropdown menus state
  const [catMenuOpen, setCatMenuOpen] = useState(false);
  const [verMenuOpen, setVerMenuOpen] = useState(false);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  // Resources state
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);

  // Category options
  const categoryOptions = [
    'All',
    'Clients',
    'Source Codes',
    'Tools',
    'Macros',
    'Launchers',
  ];

  // Version options
  const versionOptions = [
    'All versions',
    '1.21.11',
    '1.21',
    '1.20.4',
    '1.19.4',
    '1.16.5',
    '1.8.9',
    'All Versions',
  ];

  // Sort options
  const sortOptions = [
    { id: 'top_rated', label: 'Top rated' },
    { id: 'downloads', label: 'Most downloaded' },
    { id: 'newest', label: 'Newest releases' },
    { id: 'views', label: 'Most viewed' },
  ];

  // Fetch resources from Supabase
  useEffect(() => {
    async function fetchResources() {
      try {
        setLoading(true);
        let query = supabase.from('resources').select('*');

        if (activeCategory !== 'All') {
          query = query.eq('category', activeCategory);
        }

        if (selectedVersion !== 'All versions') {
          query = query.eq('version', selectedVersion);
        }

        if (search.trim()) {
          const q = search.trim();
          query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,author_name.ilike.%${q}%`);
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
  }, [activeCategory, selectedVersion, search, sortBy]);

  // Close dropdowns when clicking outside
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

  const totalUploads = resources.length || 303;

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '80px' }}>
      {/* ------------------------------------------------------------------
          1. Top Announcement Bar (Image 2 Style: Join our new Discord server!)
          ------------------------------------------------------------------ */}
      {showDiscordBanner && (
        <div className="top-announcement-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span>Join our new Discord server!</span>
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
              color: '#8b949e',
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
            2. Hero Branding Section (Image 2 Trillium Solutions style)
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
          {/* Logo Icon */}
          <div
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #161c28 0%, #10141d 100%)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 8px 20px rgba(0, 0, 0, 0.4)',
            }}
          >
            {/* Clean Crescent Moon / Syndicate Emblem */}
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ff8533" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
            </svg>
          </div>

          {/* Title, Subtitle & Stats */}
          <div style={{ flex: 1, minWidth: '280px' }}>
            <h1
              className="font-clean-title"
              style={{
                fontSize: '2rem',
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
                fontSize: '0.92rem',
                color: '#8b949e',
                marginBottom: '14px',
              }}
            >
              Everything is just free.
            </p>

            {/* Stats Pill Row (Image 2 style) */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <div className="stat-pill-item">
                <Package size={13} style={{ color: '#8b949e' }} />
                <span><strong>{totalUploads}</strong> uploads</span>
              </div>

              <div className="stat-pill-item">
                <span style={{ color: '#ffc107', fontWeight: '700' }}>$1,893,768.72</span>
                <span>saved</span>
              </div>

              <div className="stat-pill-item">
                <Download size={13} style={{ color: '#38bdf8' }} />
                <span><strong>151.2k</strong> downloads</span>
              </div>

              <div className="stat-pill-item">
                <Users size={13} style={{ color: '#8b949e' }} />
                <span><strong>15,645</strong> members</span>
              </div>

              <div className="stat-pill-item">
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: '#4ade80',
                    boxShadow: '0 0 6px #4ade80',
                    display: 'inline-block',
                  }}
                />
                <span style={{ color: '#4ade80', fontWeight: '600' }}>24 online</span>
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------
            3. Filter Bar (Image 2 style: Search | All ⌄ | All versions ⌄ | Top rated ⌄ | Quick pills)
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
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          {/* Left: Search & Dropdowns */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Search Pill Input */}
            <div style={{ position: 'relative' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: '13px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#8b949e',
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

            {/* Category Dropdown */}
            <div className="dropdown-container" style={{ position: 'relative' }}>
              <div
                className={`filter-dropdown-pill ${activeCategory !== 'All' ? 'active' : ''}`}
                onClick={() => {
                  setCatMenuOpen(!catMenuOpen);
                  setVerMenuOpen(false);
                  setSortMenuOpen(false);
                }}
              >
                <span>{activeCategory === 'All' ? 'All' : activeCategory}</span>
                <ChevronDown size={13} />
              </div>

              {catMenuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '110%',
                    left: 0,
                    zIndex: 50,
                    minWidth: '150px',
                    background: '#111622',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '10px',
                    padding: '6px',
                    boxShadow: '0 12px 28px rgba(0, 0, 0, 0.6)',
                  }}
                >
                  {categoryOptions.map((cat) => (
                    <div
                      key={cat}
                      onClick={() => {
                        setActiveCategory(cat);
                        setCatMenuOpen(false);
                      }}
                      style={{
                        padding: '7px 12px',
                        fontSize: '0.82rem',
                        color: activeCategory === cat ? '#ff8533' : '#d1d5db',
                        fontWeight: activeCategory === cat ? '600' : '400',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        backgroundColor: activeCategory === cat ? 'rgba(255, 106, 43, 0.12)' : 'transparent',
                        transition: 'background 0.1s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)')}
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor =
                          activeCategory === cat ? 'rgba(255, 106, 43, 0.12)' : 'transparent')
                      }
                    >
                      {cat}
                    </div>
                  ))}
                </div>
              )}
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
                    background: '#111622',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '10px',
                    padding: '6px',
                    boxShadow: '0 12px 28px rgba(0, 0, 0, 0.6)',
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
                        color: selectedVersion === ver ? '#ff8533' : '#d1d5db',
                        fontWeight: selectedVersion === ver ? '600' : '400',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        backgroundColor: selectedVersion === ver ? 'rgba(255, 106, 43, 0.12)' : 'transparent',
                        transition: 'background 0.1s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)')}
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor =
                          selectedVersion === ver ? 'rgba(255, 106, 43, 0.12)' : 'transparent')
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
                className="filter-dropdown-pill"
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
                    background: '#111622',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '10px',
                    padding: '6px',
                    boxShadow: '0 12px 28px rgba(0, 0, 0, 0.6)',
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
                        color: sortBy === s.id ? '#ff8533' : '#d1d5db',
                        fontWeight: sortBy === s.id ? '600' : '400',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        backgroundColor: sortBy === s.id ? 'rgba(255, 106, 43, 0.12)' : 'transparent',
                        transition: 'background 0.1s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)')}
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor =
                          sortBy === s.id ? 'rgba(255, 106, 43, 0.12)' : 'transparent')
                      }
                    >
                      {s.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Quick Filter Pills (Image 2 style: Clients | All posts) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setActiveCategory(activeCategory === 'Clients' ? 'All' : 'Clients')}
              className={`filter-dropdown-pill ${activeCategory === 'Clients' ? 'active' : ''}`}
              style={{ padding: '6px 14px', borderRadius: '9999px' }}
            >
              Clients
            </button>

            <button
              onClick={() => {
                setActiveCategory('All');
                setSelectedVersion('All versions');
                setSearch('');
              }}
              className={`filter-dropdown-pill ${activeCategory === 'All' && !search ? 'active' : ''}`}
              style={{
                padding: '6px 14px',
                borderRadius: '9999px',
                background: activeCategory === 'All' && !search ? 'rgba(255, 106, 43, 0.15)' : 'rgba(17, 22, 32, 0.9)',
                borderColor: activeCategory === 'All' && !search ? 'rgba(255, 106, 43, 0.45)' : 'rgba(255, 255, 255, 0.1)',
                color: activeCategory === 'All' && !search ? '#ff9d66' : '#d1d5db',
              }}
            >
              All posts
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------------
            4. 3-Column Resource Cards Grid (Image 1 Format)
            ------------------------------------------------------------------ */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#8b949e', fontSize: '0.9rem' }}>
            Loading releases...
          </div>
        ) : resources.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '80px 20px',
              backgroundColor: 'rgba(16, 21, 31, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '14px',
            }}
          >
            <p style={{ color: '#e5e7eb', fontSize: '1rem', fontWeight: '500', marginBottom: '8px' }}>
              No resources found
            </p>
            <p style={{ color: '#8b949e', fontSize: '0.85rem', marginBottom: '16px' }}>
              Try clearing filters or search terms to see all available releases.
            </p>
            <button
              onClick={() => {
                setActiveCategory('All');
                setSelectedVersion('All versions');
                setSearch('');
              }}
              className="filter-dropdown-pill active"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '20px',
            }}
          >
            {resources.map((res) => (
              <ResourceCard key={res.id} resource={res} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
