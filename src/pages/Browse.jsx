import React, { useState, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  SlidersHorizontal,
  X,
  Zap,
  Code2,
  Wrench,
  Sparkles,
  Box,
  Layers,
  ArrowUpDown,
  Download
} from 'lucide-react';
import ResourceCard from '../components/ResourceCard';
import { supabase } from '../lib/supabaseClient';

export default function Browse({ defaultCategory = 'All' }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  // Determine initial category from props or pathname
  const getInitialCategory = () => {
    if (defaultCategory && defaultCategory !== 'All') return defaultCategory;
    const path = location.pathname.toLowerCase();
    if (path.includes('client')) return 'Clients';
    if (path.includes('source')) return 'Source Codes';
    if (path.includes('tool')) return 'Tools';
    if (path.includes('macro')) return 'Macros';
    if (path.includes('launcher')) return 'Launchers';
    return searchParams.get('category') || 'All';
  };

  const [category, setCategory] = useState(getInitialCategory());
  const [version, setVersion] = useState(searchParams.get('version') || 'All');
  const [loader, setLoader] = useState(searchParams.get('loader') || 'All');
  const [sort, setSort] = useState(searchParams.get('sort') || 'downloads');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);

  // Sync category when path changes
  useEffect(() => {
    setCategory(getInitialCategory());
  }, [location.pathname]);

  // Fetch filtered resources
  useEffect(() => {
    async function fetchFiltered() {
      try {
        setLoading(true);
        let query = supabase.from('resources').select('*');

        if (category && category !== 'All') {
          query = query.eq('category', category);
        }

        if (version && version !== 'All') {
          query = query.eq('version', version);
        }

        if (loader && loader !== 'All') {
          query = query.eq('loader', loader);
        }

        if (search.trim()) {
          const q = search.trim();
          query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,author_name.ilike.%${q}%`);
        }

        // Sorting
        if (sort === 'downloads') {
          query = query.order('downloads_count', { ascending: false });
        } else if (sort === 'likes') {
          query = query.order('likes_count', { ascending: false });
        } else if (sort === 'views') {
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

    fetchFiltered();
  }, [category, version, loader, sort, search]);

  const categories = [
    { label: 'All Resources', value: 'All' },
    { label: 'Clients', value: 'Clients' },
    { label: 'Source Codes', value: 'Source Codes' },
    { label: 'Tools', value: 'Tools' },
    { label: 'Macros', value: 'Macros' },
    { label: 'Launchers', value: 'Launchers' },
  ];

  const versions = ['All', '1.21.11', '1.21.4', '1.20.4', '1.20.1', '1.19.4', '1.8.9', 'All Versions'];
  const loaders = ['All', 'Fabric', 'Forge', 'NeoForge', 'C++ / Native', 'Vanilla'];
  const sortOptions = [
    { label: 'Most Downloaded', value: 'downloads' },
    { label: 'Newest Uploads', value: 'newest' },
    { label: 'Most Liked', value: 'likes' },
    { label: 'Most Viewed', value: 'views' },
  ];

  const hasActiveFilters = category !== 'All' || version !== 'All' || loader !== 'All' || search.trim().length > 0;

  const resetFilters = () => {
    setCategory('All');
    setVersion('All');
    setLoader('All');
    setSearch('');
    setSort('downloads');
  };

  return (
    <div style={{ minHeight: '100vh', padding: '40px 24px 80px 24px' }}>
      <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
        {/* Header Title & Description */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '2.2rem', fontWeight: '800', color: '#fff', marginBottom: '8px' }}>
            {category === 'All' ? 'Minecraft Resource Archive' : category}
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
            Browse through community verified Minecraft clients, source codes, injection payloads, and development tools.
          </p>
        </div>

        {/* Filter & Search Bar Controls */}
        <div
          style={{
            backgroundColor: '#0c0e15',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* Top Row: Search + Sort */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {/* Search Input */}
            <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
              <Search
                size={18}
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
                placeholder="Search by title, description, or author..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 42px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  color: '#fff',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Sort Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                Sort by:
              </span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                style={{
                  padding: '9px 14px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  color: '#fff',
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} style={{ backgroundColor: '#0e1017' }}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Middle Row: Category Pills */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              paddingTop: '8px',
              borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: category === cat.value ? 'rgba(124, 58, 237, 0.5)' : 'rgba(255, 255, 255, 0.08)',
                  backgroundColor: category === cat.value ? 'rgba(124, 58, 237, 0.2)' : 'rgba(255, 255, 255, 0.02)',
                  color: category === cat.value ? '#c084fc' : '#94a3b8',
                  fontSize: '0.82rem',
                  fontWeight: category === cat.value ? '600' : '500',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Bottom Row: Version & Loader Dropdowns */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            {/* Version Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.82rem', color: '#64748b' }}>MC Version:</span>
              <select
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  color: '#e2e8f0',
                  fontSize: '0.82rem',
                  outline: 'none',
                }}
              >
                {versions.map((v) => (
                  <option key={v} value={v} style={{ backgroundColor: '#0e1017' }}>
                    {v === 'All' ? 'All Versions' : v}
                  </option>
                ))}
              </select>
            </div>

            {/* Loader Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Loader:</span>
              <select
                value={loader}
                onChange={(e) => setLoader(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  color: '#e2e8f0',
                  fontSize: '0.82rem',
                  outline: 'none',
                }}
              >
                {loaders.map((l) => (
                  <option key={l} value={l} style={{ backgroundColor: '#0e1017' }}>
                    {l === 'All' ? 'All Loaders' : l}
                  </option>
                ))}
              </select>
            </div>

            {/* Reset Filters Button */}
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'none',
                  border: 'none',
                  color: '#ef4444',
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginLeft: 'auto',
                }}
              >
                <X size={14} />
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Resources Grid or Empty State */}
        {loading ? (
          <div
            style={{
              padding: '80px 0',
              textAlign: 'center',
              color: '#94a3b8',
              fontSize: '1rem',
            }}
          >
            Loading Syndicate resources...
          </div>
        ) : resources.length > 0 ? (
          <div>
            <div
              style={{
                fontSize: '0.85rem',
                color: '#64748b',
                marginBottom: '20px',
              }}
            >
              Showing {resources.length} resource{resources.length === 1 ? '' : 's'}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '24px',
              }}
            >
              {resources.map((res) => (
                <ResourceCard key={res.id} resource={res} />
              ))}
            </div>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: '#0c0e15',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '60px 24px',
              textAlign: 'center',
              maxWidth: '500px',
              margin: '40px auto',
            }}
          >
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
                color: '#64748b',
              }}
            >
              <Search size={24} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>
              No Resources Found
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '20px' }}>
              We couldn't find any resources matching your search and filter criteria.
            </p>
            <button onClick={resetFilters} className="syn-btn syn-btn-secondary">
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
