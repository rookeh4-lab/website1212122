import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Zap,
  Code2,
  Wrench,
  Sparkles,
  Box,
  TrendingUp,
  Download,
  Users,
  MessageSquare,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  Flame,
  Terminal,
  ExternalLink
} from 'lucide-react';
import ResourceCard from '../components/ResourceCard';
import { supabase } from '../lib/supabaseClient';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [featuredResources, setFeaturedResources] = useState([]);
  const [recentResources, setRecentResources] = useState([]);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState('All');
  const [stats, setStats] = useState({
    totalResources: 8,
    totalDownloads: 11970,
    totalComments: 12,
    totalLoaders: 5,
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // Fetch stats
        try {
          const statsRes = await fetch('/api/syndicate/stats');
          if (statsRes.ok) {
            const data = await statsRes.json();
            setStats({
              totalResources: data.totalResources || 8,
              totalDownloads: data.totalDownloads || 11970,
              totalComments: data.totalComments || 3,
              totalLoaders: 5,
            });
          }
        } catch (_e) {
          // Fallback to supabase direct
        }

        // Fetch featured resources
        const { data: featuredData } = await supabase
          .from('resources')
          .select('*')
          .eq('is_featured', true)
          .limit(4);

        if (featuredData && featuredData.length > 0) {
          setFeaturedResources(featuredData);
        }

        // Fetch recent resources
        const { data: recentData } = await supabase
          .from('resources')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(8);

        if (recentData && recentData.length > 0) {
          setRecentResources(recentData);
        }
      } catch (err) {
        console.error('Failed to load home resources:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/clients?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/clients');
    }
  };

  const categories = [
    {
      name: 'Clients',
      slug: 'Clients',
      icon: Zap,
      desc: 'PvP, Ghost, and Utility clients for Fabric, Forge, and Native C++.',
      color: '#a855f7',
      path: '/clients',
    },
    {
      name: 'Source Codes',
      slug: 'Source Codes',
      icon: Code2,
      desc: 'Clean bases, event engines, and open repositories for developers.',
      color: '#3b82f6',
      path: '/sources',
    },
    {
      name: 'Tools & Injectors',
      slug: 'Tools',
      icon: Wrench,
      desc: 'JNI injectors, memory mappers, and utility software for Windows.',
      color: '#10b981',
      path: '/tools',
    },
    {
      name: 'Macros & Configs',
      slug: 'Macros',
      icon: Sparkles,
      desc: 'FastPot, AutoTotem, and weapon swap scripts for high tick-rates.',
      color: '#f59e0b',
      path: '/macros',
    },
    {
      name: 'Launchers',
      slug: 'Launchers',
      icon: Box,
      desc: 'Multi-instance client managers and modpack loaders.',
      color: '#ec4899',
      path: '/launchers',
    },
  ];

  const filteredRecent = selectedCategoryTab === 'All'
    ? recentResources
    : recentResources.filter((r) => r.category === selectedCategoryTab);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Hero Section */}
      <section
        style={{
          position: 'relative',
          padding: '80px 24px 70px 24px',
          overflow: 'hidden',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        {/* Ambient background glow */}
        <div
          style={{
            position: 'absolute',
            top: '-10%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '800px',
            height: '400px',
            background: 'radial-gradient(ellipse, rgba(124, 58, 237, 0.18) 0%, rgba(59, 130, 246, 0.08) 40%, transparent 70%)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        <div
          style={{
            maxWidth: '1000px',
            margin: '0 auto',
            textAlign: 'center',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Eyebrow badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '999px',
              background: 'rgba(124, 58, 237, 0.12)',
              border: '1px solid rgba(124, 58, 237, 0.3)',
              marginBottom: '24px',
            }}
          >
            <Sparkles size={14} style={{ color: '#c084fc' }} />
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: '700',
                letterSpacing: '0.06em',
                color: '#d8b4fe',
                textTransform: 'uppercase',
              }}
            >
              COMMUNITY-DRIVEN MINECRAFT RESOURCE ARCHIVE
            </span>
          </div>

          {/* Main Title */}
          <h1
            style={{
              fontSize: 'clamp(2.4rem, 5vw, 4rem)',
              fontWeight: '900',
              lineHeight: '1.15',
              letterSpacing: '-0.03em',
              color: '#ffffff',
              marginBottom: '20px',
            }}
          >
            Discover, Share & Download <br />
            <span
              style={{
                background: 'linear-gradient(135deg, #c084fc 20%, #818cf8 60%, #38bdf8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Minecraft Clients & Source Codes
            </span>
          </h1>

          {/* Subtitle */}
          <p
            style={{
              fontSize: 'clamp(1rem, 2vw, 1.2rem)',
              color: '#94a3b8',
              maxWidth: '720px',
              margin: '0 auto 36px auto',
              lineHeight: '1.6',
            }}
          >
            An authentic, open repository for modern Fabric, Forge, C++ native modules,
            injectors, and client architecture bases. Safe, verified, and community tested.
          </p>

          {/* Big Search Bar */}
          <form
            onSubmit={handleSearchSubmit}
            style={{
              maxWidth: '680px',
              margin: '0 auto 24px auto',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: '18px',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                pointerEvents: 'none',
              }}
            >
              <Search size={20} />
            </div>

            <input
              type="text"
              placeholder="Search clients, source codes, 1.21.11 modules, injectors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '16px 140px 16px 52px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                backgroundColor: 'rgba(14, 16, 23, 0.85)',
                backdropFilter: 'blur(12px)',
                color: '#fff',
                fontSize: '1rem',
                outline: 'none',
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
                transition: 'all 0.2s ease',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#8b5cf6';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.25), 0 8px 30px rgba(0, 0, 0, 0.5)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.4)';
              }}
            />

            <button
              type="submit"
              className="syn-btn syn-btn-primary"
              style={{
                position: 'absolute',
                right: '8px',
                top: '8px',
                bottom: '8px',
                padding: '0 20px',
                borderRadius: '8px',
                fontWeight: '600',
              }}
            >
              Browse
            </button>
          </form>

          {/* Quick Tag Pills */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '500' }}>Popular:</span>
            {['1.21.11', 'Fabric', 'C++ Injectable', 'Auto Crystal', 'MCP 1.8.9', 'MinHook'].map((tag) => (
              <button
                key={tag}
                onClick={() => navigate(`/clients?search=${encodeURIComponent(tag)}`)}
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#94a3b8',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#8b5cf6';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.color = '#94a3b8';
                }}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Counter Bar */}
      <section
        style={{
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: '#0a0c12',
          padding: '24px 0',
        }}
      >
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            padding: '0 24px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: 'rgba(124, 58, 237, 0.15)',
                border: '1px solid rgba(124, 58, 237, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#c084fc',
              }}
            >
              <Zap size={22} />
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#fff' }}>
                {stats.totalResources}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Archived Resources
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38bdf8',
              }}
            >
              <Download size={22} />
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#fff' }}>
                {stats.totalDownloads.toLocaleString()}+
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total Downloads
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: 'rgba(52, 211, 153, 0.15)',
                border: '1px solid rgba(52, 211, 153, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#34d399',
              }}
            >
              <ShieldCheck size={22} />
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#fff' }}>
                100%
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Scanned & Clean
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: 'rgba(244, 63, 94, 0.15)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f43f5e',
              }}
            >
              <MessageSquare size={22} />
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#fff' }}>
                {stats.totalComments}+
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Community Comments
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Releases Section */}
      <section style={{ padding: '60px 24px', maxWidth: '1240px', margin: '0 auto', width: '100%' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginBottom: '32px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8b5cf6', marginBottom: '6px' }}>
              <Flame size={16} />
              <span style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Spotlight
              </span>
            </div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#ffffff' }}>
              Featured Releases
            </h2>
          </div>

          <Link
            to="/clients"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#c084fc',
              fontSize: '0.9rem',
              fontWeight: '600',
              textDecoration: 'none',
            }}
          >
            <span>View All</span>
            <ChevronRight size={16} />
          </Link>
        </div>

        {/* Featured Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '24px',
          }}
        >
          {featuredResources.map((res) => (
            <ResourceCard key={res.id} resource={res} />
          ))}
        </div>
      </section>

      {/* Category Explorer */}
      <section
        style={{
          padding: '60px 24px',
          backgroundColor: '#0a0c12',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#fff', marginBottom: '8px' }}>
              Browse By Category
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
              Navigate through curated sections of Minecraft modifications, native projects, and dev tools.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '20px',
            }}
          >
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.name}
                  to={cat.path}
                  className="syn-card"
                  style={{
                    padding: '24px',
                    textDecoration: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '10px',
                      backgroundColor: `${cat.color}1a`,
                      border: `1px solid ${cat.color}40`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: cat.color,
                      marginBottom: '16px',
                    }}
                  >
                    <Icon size={22} />
                  </div>

                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>
                    {cat.name}
                  </h3>

                  <p style={{ fontSize: '0.84rem', color: '#94a3b8', lineHeight: '1.5', marginBottom: '16px' }}>
                    {cat.desc}
                  </p>

                  <div
                    style={{
                      marginTop: 'auto',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: cat.color,
                      fontSize: '0.8rem',
                      fontWeight: '600',
                    }}
                  >
                    <span>Explore</span>
                    <ArrowRight size={14} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Recent Uploads Section with Filter Tabs */}
      <section style={{ padding: '60px 24px', maxWidth: '1240px', margin: '0 auto', width: '100%' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#ffffff', marginBottom: '4px' }}>
              Recently Uploaded
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
              Latest community contributions and updates across all Minecraft categories.
            </p>
          </div>

          {/* Category Tabs */}
          <div
            style={{
              display: 'flex',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              padding: '4px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              gap: '4px',
            }}
          >
            {['All', 'Clients', 'Source Codes', 'Tools', 'Macros'].map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedCategoryTab(tab)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: selectedCategoryTab === tab ? '600' : '500',
                  color: selectedCategoryTab === tab ? '#fff' : '#94a3b8',
                  backgroundColor: selectedCategoryTab === tab ? 'rgba(124, 58, 237, 0.3)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Resources Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '24px',
          }}
        >
          {filteredRecent.map((res) => (
            <ResourceCard key={res.id} resource={res} />
          ))}
        </div>

        {/* View Full Archive Button */}
        <div style={{ textAlign: 'center', marginTop: '48px' }}>
          <Link
            to="/clients"
            className="syn-btn syn-btn-secondary"
            style={{ padding: '12px 28px', fontSize: '0.95rem' }}
          >
            Browse Full Archive & Filters ({stats.totalResources} Available) →
          </Link>
        </div>
      </section>

      {/* Discord CTA Banner */}
      <section
        style={{
          padding: '60px 24px',
          backgroundColor: '#07080b',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(59, 130, 246, 0.1) 100%)',
            border: '1px solid rgba(124, 58, 237, 0.3)',
            padding: '48px 36px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '24px',
          }}
        >
          <div>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: '700',
                color: '#c084fc',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                display: 'block',
                marginBottom: '8px',
              }}
            >
              COMMUNITY ECOSYSTEM
            </span>
            <h3 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#fff', marginBottom: '8px' }}>
              Join the Syndicate Developer Discord
            </h3>
            <p style={{ color: '#cbd5e1', fontSize: '0.95rem', maxWidth: '600px', lineHeight: '1.5' }}>
              Chat with client developers, get early access to 1.21.11 C++ releases, request features, and share your own projects with thousands of members.
            </p>
          </div>

          <a
            href="https://discord.gg/syndicate"
            target="_blank"
            rel="noreferrer"
            className="syn-btn syn-btn-primary"
            style={{
              padding: '14px 28px',
              fontSize: '1rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <MessageSquare size={18} />
            Join Discord Community
          </a>
        </div>
      </section>
    </div>
  );
}
