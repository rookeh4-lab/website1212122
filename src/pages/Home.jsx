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
  X
} from 'lucide-react';
import ResourceCard from '../components/ResourceCard';
import { supabase } from '../lib/supabaseClient';

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [filterVerified, setFilterVerified] = useState(false);
  const [filterSourceOnly, setFilterSourceOnly] = useState(false);
  const [filter12111, setFilter12111] = useState(false);
  const [filterNative, setFilterNative] = useState(false);
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'downloads' | 'upvotes' | 'views'

  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load resources from Supabase
  useEffect(() => {
    async function fetchResources() {
      try {
        setLoading(true);
        let query = supabase.from('resources').select('*');

        if (activeCategory !== 'All') {
          query = query.eq('category', activeCategory);
        }

        if (filterSourceOnly) {
          query = query.eq('category', 'Source Codes');
        }

        if (filter12111) {
          query = query.eq('version', '1.21.11');
        }

        if (filterNative) {
          query = query.eq('loader', 'C++ / Native');
        }

        if (search.trim()) {
          const q = search.trim();
          query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,author_name.ilike.%${q}%`);
        }

        // Sorting
        if (sortBy === 'downloads') {
          query = query.order('downloads_count', { ascending: false });
        } else if (sortBy === 'upvotes') {
          query = query.order('likes_count', { ascending: false });
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
  }, [activeCategory, search, filterVerified, filterSourceOnly, filter12111, filterNative, sortBy]);

  // Categories config with icons
  const categoryTabs = [
    { name: 'All', icon: Layers, count: 8 },
    { name: 'Clients', icon: Zap, count: 3 },
    { name: 'Source Codes', icon: Code2, count: 2 },
    { name: 'Tools', icon: Wrench, count: 2 },
    { name: 'Macros', icon: Sparkles, count: 1 },
    { name: 'Launchers', icon: Box, count: 1 },
  ];

  const resetAllFilters = () => {
    setActiveCategory('All');
    setSearch('');
    setFilterVerified(false);
    setFilterSourceOnly(false);
    setFilter12111(false);
    setFilterNative(false);
    setSortBy('newest');
  };

  const hasAnyFilter =
    activeCategory !== 'All' ||
    search.trim().length > 0 ||
    filterVerified ||
    filterSourceOnly ||
    filter12111 ||
    filterNative;

  return (
    <div style={{ minHeight: '100vh', padding: '24px 20px 80px 20px' }}>
      <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
        {/* Ambient XenntSquad Announcement Banner with GTA 6 Styling */}
        <div
          className="gta-announcement"
          style={{
            maxWidth: '1000px',
            margin: '0 auto 48px auto',
            padding: '10px 14px 10px 22px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <span
              style={{
                background: 'linear-gradient(135deg, #ff2a85 0%, #ff7a00 100%)',
                color: '#ffffff',
                fontSize: '0.74rem',
                fontWeight: '900',
                padding: '3px 10px',
                borderRadius: '9999px',
                letterSpacing: '0.04em',
                boxShadow: '0 0 12px rgba(255, 42, 133, 0.5)',
              }}
            >
              VICE CITY
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e5e7eb', fontSize: '0.9rem' }}>
              <MessageSquare size={17} style={{ color: '#00f0ff' }} />
              <span>
                Join our official Discord community:{' '}
                <strong style={{ color: '#ff7a00' }}>discord.gg/syndicate</strong>
              </span>
            </div>
          </div>

          <a
            href="https://discord.gg/syndicate"
            target="_blank"
            rel="noreferrer"
            className="gta-pill-btn gta-pill-btn-gold"
            style={{ padding: '7px 18px', fontSize: '0.84rem' }}
          >
            <span>Join now</span>
            <ArrowRight size={14} />
          </a>
        </div>

        {/* Hero / Page Title Section */}
        <div style={{ maxWidth: '1000px', margin: '0 auto 40px auto' }}>
          <h1
            className="font-serif-title"
            style={{
              fontSize: 'clamp(2.6rem, 5.5vw, 4.2rem)',
              fontWeight: '700',
              color: '#ffffff',
              lineHeight: '1.1',
              marginBottom: '12px',
            }}
          >
            Cracks & Releases
          </h1>

          {/* 45px Neon Sunset Accent Bar */}
          <div
            style={{
              width: '56px',
              height: '4px',
              borderRadius: '2px',
              background: 'linear-gradient(90deg, #ff2a85 0%, #ff7a00 100%)',
              boxShadow: '0 0 16px rgba(255, 42, 133, 0.6)',
              marginBottom: '16px',
            }}
          />

          <p
            style={{
              fontSize: '1.05rem',
              color: '#9ca3af',
              maxWidth: '680px',
              lineHeight: '1.5',
            }}
          >
            Every verified client, source code, native C++ injector & macro in the syndicate. Filter by category, search or sort.
          </p>
        </div>

        {/* Two-Tier Filter & Category Bar */}
        <div style={{ maxWidth: '1000px', margin: '0 auto 40px auto' }}>
          {/* Tier 1: Horizontal Category Pill Tabs */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px',
              marginBottom: '18px',
            }}
          >
            {categoryTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeCategory === tab.name;
              return (
                <button
                  key={tab.name}
                  onClick={() => setActiveCategory(tab.name)}
                  className={`gta-cat-pill ${isActive ? 'active' : ''}`}
                >
                  <Icon size={15} />
                  <span>{tab.name}</span>
                  <span className="pill-count">{tab.count}</span>
                </button>
              );
            })}
          </div>

          {/* Tier 2: Search Input + Toggle Pills + Sort Dropdown */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            {/* Search Pill Input */}
            <div
              style={{
                position: 'relative',
                flex: 1,
                minWidth: '280px',
              }}
            >
              <Search
                size={17}
                style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#6b7280',
                }}
              />
              <input
                type="text"
                placeholder="Search title, tag, version or author..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '11px 40px 11px 44px',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#ffffff',
                  fontSize: '0.88rem',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#ff2a85';
                  e.currentTarget.style.boxShadow = '0 0 20px -3px rgba(255, 42, 133, 0.35)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{
                    position: 'absolute',
                    right: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#9ca3af',
                    cursor: 'pointer',
                  }}
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Filter Toggle: Verified Only */}
            <button
              onClick={() => setFilterVerified(!filterVerified)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                borderRadius: '9999px',
                border: '1px solid',
                borderColor: filterVerified ? 'rgba(16, 185, 129, 0.5)' : 'rgba(255, 255, 255, 0.08)',
                backgroundColor: filterVerified ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                color: filterVerified ? '#34d399' : '#9ca3af',
                fontSize: '0.84rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <CheckCircle size={14} />
              <span>Verified only</span>
            </button>

            {/* Filter Toggle: Source Code */}
            <button
              onClick={() => setFilterSourceOnly(!filterSourceOnly)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                borderRadius: '9999px',
                border: '1px solid',
                borderColor: filterSourceOnly ? 'rgba(56, 189, 248, 0.5)' : 'rgba(255, 255, 255, 0.08)',
                backgroundColor: filterSourceOnly ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                color: filterSourceOnly ? '#38bdf8' : '#9ca3af',
                fontSize: '0.84rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Code2 size={14} />
              <span>Source Code</span>
            </button>

            {/* Filter Toggle: 1.21.11 Only */}
            <button
              onClick={() => setFilter12111(!filter12111)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                borderRadius: '9999px',
                border: '1px solid',
                borderColor: filter12111 ? 'rgba(255, 42, 133, 0.5)' : 'rgba(255, 255, 255, 0.08)',
                backgroundColor: filter12111 ? 'rgba(255, 42, 133, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                color: filter12111 ? '#ff2a85' : '#9ca3af',
                fontSize: '0.84rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span>1.21.11 Only</span>
            </button>

            {/* Filter Toggle: Native C++ */}
            <button
              onClick={() => setFilterNative(!filterNative)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                borderRadius: '9999px',
                border: '1px solid',
                borderColor: filterNative ? 'rgba(255, 122, 0, 0.5)' : 'rgba(255, 255, 255, 0.08)',
                backgroundColor: filterNative ? 'rgba(255, 122, 0, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                color: filterNative ? '#ff7a00' : '#9ca3af',
                fontSize: '0.84rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span>Native C++</span>
            </button>

            {/* Sort Selector Pill */}
            <div style={{ position: 'relative' }}>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  padding: '9px 34px 9px 16px',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  fontSize: '0.84rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  appearance: 'none',
                  outline: 'none',
                }}
              >
                <option value="newest" style={{ backgroundColor: '#0e0c16' }}>Newest</option>
                <option value="downloads" style={{ backgroundColor: '#0e0c16' }}>Most Downloaded</option>
                <option value="upvotes" style={{ backgroundColor: '#0e0c16' }}>Top Upvoted</option>
                <option value="views" style={{ backgroundColor: '#0e0c16' }}>Most Viewed</option>
              </select>
              <ChevronDown
                size={14}
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: '#9ca3af',
                }}
              />
            </div>
          </div>
        </div>

        {/* Content Section: 3-Column Responsive Grid */}
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          {loading ? (
            <div
              style={{
                textAlign: 'center',
                padding: '80px 0',
                color: '#9ca3af',
                fontSize: '1rem',
              }}
            >
              Loading verified Syndicate releases...
            </div>
          ) : resources.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '24px',
              }}
            >
              {resources.map((res) => (
                <ResourceCard key={res.id} resource={res} />
              ))}
            </div>
          ) : (
            <div
              style={{
                backgroundColor: 'rgba(18, 16, 26, 0.7)',
                borderRadius: '20px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '60px 24px',
                textAlign: 'center',
                maxWidth: '460px',
                margin: '40px auto',
              }}
            >
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>
                No Releases Found
              </h3>
              <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '20px' }}>
                Try adjusting your search keywords or active category filters.
              </p>
              <button onClick={resetAllFilters} className="gta-pill-btn gta-pill-btn-secondary">
                Reset All Filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
