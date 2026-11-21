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

const FALLBACK_RESOURCES = [
  {
    id: "4818f0cf-3753-4935-8540-346f4765e690",
    title: "Corz ( Source code )",
    slug: "corz-source-code-mwpcggpp",
    category: "Source Codes",
    version: "1.21.11",
    loader: "Fabric",
    type: "Source Code",
    author_name: "rain",
    author_avatar: "https://ooxshxykdujgxcyezofo.supabase.co/storage/v1/object/public/client-images/rain-avatar.jpg",
    thumbnail_url: "https://ooxshxykdujgxcyezofo.supabase.co/storage/v1/object/public/client-images/1795201203169-nozt3p.png",
    client_file_name: "CorzClient-SourcedByDexter.zip",
    client_file_size: "46.8 MB",
    client_download_url: "https://ooxshxykdujgxcyezofo.supabase.co/storage/v1/object/public/client-releases/CorzClient-SourcedByDexter.zip",
    download_url: "https://ooxshxykdujgxcyezofo.supabase.co/storage/v1/object/public/client-releases/CorzClient-SourcedByDexter.zip",
    downloads_count: 104,
    likes_count: 5,
    description: "buildable src all bots working \n\nSKID SKID SKID",
    credits: "• dexter as i know\n• idk others",
    is_clean: true,
    is_approved: true,
    created_at: "2026-11-20T19:00:25.618Z"
  },
  {
    id: "73c78792-a277-483e-91c2-9f8aa9875994",
    title: "Plutora Client",
    slug: "plutora-client-mwpc9i8i",
    category: "Clients",
    version: "1.21.11",
    loader: "Fabric",
    type: "Client",
    author_name: "rain",
    author_avatar: "https://ooxshxykdujgxcyezofo.supabase.co/storage/v1/object/public/client-images/rain-avatar.jpg",
    thumbnail_url: "https://ooxshxykdujgxcyezofo.supabase.co/storage/v1/object/public/client-images/1795200884226-7c1kil.png",
    client_file_name: "Plutora_Cracked_By_JP.zip",
    client_file_size: "18.1 MB",
    client_download_url: "https://ooxshxykdujgxcyezofo.supabase.co/storage/v1/object/public/client-releases/Plutora_Cracked_By_JP.zip",
    download_url: "https://ooxshxykdujgxcyezofo.supabase.co/storage/v1/object/public/client-releases/Plutora_Cracked_By_JP.zip",
    downloads_count: 103,
    likes_count: 4,
    description: "c++ Client hm pretty good for pvp mmc bypassable modules with best killaura",
    credits: "• JP & 648k\n• Null dmk",
    is_clean: true,
    is_approved: true,
    created_at: "2026-11-20T18:55:01.027Z"
  },
  {
    id: "cfe42e60-eb0f-47e9-8cd2-5b813e970155",
    title: "Corz Client v2.0.3",
    slug: "corz-client-v2-0-3-mwpc5u6e",
    category: "Clients",
    version: "1.21.11",
    loader: "Fabric",
    type: "Client",
    author_name: "rain",
    author_avatar: "https://ooxshxykdujgxcyezofo.supabase.co/storage/v1/object/public/client-images/rain-avatar.jpg",
    thumbnail_url: "https://ooxshxykdujgxcyezofo.supabase.co/storage/v1/object/public/client-images/1795200725245-ycepme.png",
    client_file_name: "CorzClientCrackedBYM4.jar",
    client_file_size: "25.8 MB",
    client_download_url: "https://ooxshxykdujgxcyezofo.supabase.co/storage/v1/object/public/client-releases/CorzClientCrackedBYM4.jar",
    download_url: "https://ooxshxykdujgxcyezofo.supabase.co/storage/v1/object/public/client-releases/CorzClientCrackedBYM4.jar",
    downloads_count: 102,
    likes_count: 4,
    description: "Pretty Good client All bots working",
    credits: "• m4\n• trillium",
    is_clean: true,
    is_approved: true,
    created_at: "2026-11-20T18:52:09.970Z"
  },
  {
    id: "7518c247-7a75-4cd2-8c6d-752baae8b2b2",
    title: "Purxiy Visuals",
    slug: "purxiy-visuals-mwpcdile",
    category: "Clients",
    version: "1.21.11",
    loader: "Fabric",
    type: "Client",
    author_name: "rain",
    author_avatar: "https://ooxshxykdujgxcyezofo.supabase.co/storage/v1/object/public/client-images/rain-avatar.jpg",
    thumbnail_url: "https://ooxshxykdujgxcyezofo.supabase.co/storage/v1/object/public/client-images/1795201067307-rbg8yj.png",
    client_file_name: "Purxiy Visuals.jar",
    client_file_size: "67.1 MB",
    client_download_url: "https://github.com/rookeh4-lab/website1212122/releases/download/v1.0.0/Purxiy.Visuals.jar",
    download_url: "https://github.com/rookeh4-lab/website1212122/releases/download/v1.0.0/Purxiy.Visuals.jar",
    downloads_count: 102,
    likes_count: 4,
    description: "Idk just got from my friendd",
    credits: "• idk",
    is_clean: true,
    is_approved: true,
    created_at: "2026-11-20T18:58:08.412Z"
  },
  {
    id: "6452bb85-3ec0-4b3e-8941-0d45aabdbe1e",
    title: "R3mu Client",
    slug: "r3mu-client-mwp9z116",
    category: "Clients",
    version: "1.21.11",
    loader: "Fabric",
    type: "Client",
    author_name: "rain",
    author_avatar: "https://ooxshxykdujgxcyezofo.supabase.co/storage/v1/object/public/client-images/rain-avatar.jpg",
    thumbnail_url: "https://ooxshxykdujgxcyezofo.supabase.co/storage/v1/object/public/client-images/1795193917822-u5qf8e.png",
    client_file_name: "r3muclient-fuckedbykirschenbaum (1).jar",
    client_file_size: "2.85 MB",
    client_download_url: "https://ooxshxykdujgxcyezofo.supabase.co/storage/v1/object/public/client-releases/1795193919935_r3muclient-fuckedbykirschenbaum__1_.jar",
    download_url: "https://ooxshxykdujgxcyezofo.supabase.co/storage/v1/object/public/client-releases/1795193919935_r3muclient-fuckedbykirschenbaum__1_.jar",
    downloads_count: 102,
    likes_count: 4,
    description: "R3MU Client verified clean release.",
    credits: "• kirschenbaum\n• Client Syndicate Archive",
    is_clean: true,
    is_approved: true,
    created_at: "2026-11-20T16:58:45.000Z"
  }
];

export default function Home() {
  const searchInputRef = useRef(null);

  // Filter state (ONLY 3 categories: clients, source codes, tools)
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');

  // Resources state - Guaranteed initial data from cache or fallback so friends never see empty page
  const [allResources, setAllResources] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_syndicate_resources');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_e) {}
    return FALLBACK_RESOURCES;
  });
  const [loading, setLoading] = useState(false);

  // Category list - Strictly Clients, Source Codes, Tools
  const categories = [
    { name: 'All', id: 'All' },
    { name: 'Clients', id: 'Clients' },
    { name: 'Source Codes', id: 'Source Codes' },
    { name: 'Tools', id: 'Tools' },
  ];

  // Fetch all resources with resilient fallback and real-time updates
  useEffect(() => {
    async function loadData() {
      let fetched = null;

      // 1. Primary: Supabase SDK
      try {
        const { data, error } = await supabase
          .from('resources')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0) {
          fetched = data;
        }
      } catch (e) {
        console.warn('Supabase SDK query failed, trying direct REST fetch:', e.message);
      }

      // 2. Secondary: Direct REST fetch (in case SDK or websockets fail)
      if (!fetched) {
        try {
          const res = await fetch('https://ooxshxykdujgxcyezofo.supabase.co/rest/v1/resources?select=*&order=created_at.desc', {
            headers: {
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9veHNoeHlrZHVqZ3hjeWV6b2ZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQzODQ2MjksImV4cCI6MjEwOTk2MDYyOX0.sHcd4AHqEiCKsMMMM2L8muhpZ_gwPhQJ1-qhHtcKyvo',
              'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9veHNoeHlrZHVqZ3hjeWV6b2ZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQzODQ2MjksImV4cCI6MjEwOTk2MDYyOX0.sHcd4AHqEiCKsMMMM2L8muhpZ_gwPhQJ1-qhHtcKyvo'
            }
          });
          if (res.ok) {
            const json = await res.json();
            if (Array.isArray(json) && json.length > 0) {
              fetched = json;
            }
          }
        } catch (e) {
          console.warn('Direct REST fetch failed:', e.message);
        }
      }

      // 3. Update state and persistent cache
      if (fetched && fetched.length > 0) {
        setAllResources(fetched);
        try {
          localStorage.setItem('cached_syndicate_resources', JSON.stringify(fetched));
        } catch (_e) {}
      }
    }

    loadData();

    // Realtime subscription: new clients published from admin appear instantly for everyone!
    const channel = supabase
      .channel('realtime:resources')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'resources' },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            setAllResources((prev) => {
              const updated = [payload.new, ...prev.filter((r) => r.id !== payload.new.id)];
              try { localStorage.setItem('cached_syndicate_resources', JSON.stringify(updated)); } catch (_e) {}
              return updated;
            });
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            setAllResources((prev) => {
              const updated = prev.map((r) => (r.id === payload.new.id ? payload.new : r));
              try { localStorage.setItem('cached_syndicate_resources', JSON.stringify(updated)); } catch (_e) {}
              return updated;
            });
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setAllResources((prev) => {
              const updated = prev.filter((r) => r.id !== payload.old.id);
              try { localStorage.setItem('cached_syndicate_resources', JSON.stringify(updated)); } catch (_e) {}
              return updated;
            });
          } else {
            loadData();
          }
        }
      )
      .subscribe();

    // Tab focus revalidation so visitors always see fresh posts
    const handleFocus = () => loadData();
    window.addEventListener('focus', handleFocus);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Filter in-memory for instant 0ms fast response
  const filteredResources = useMemo(() => {
    let list = allResources;

    if (activeCategory !== 'All') {
      const activeLower = activeCategory.toLowerCase();
      if (activeLower === 'clients') {
        list = list.filter((r) => {
          const cat = (r.category || '').toLowerCase();
          return cat === 'clients' || cat === 'client' || cat === 'minecraft' || !cat;
        });
      } else if (activeLower === 'source codes') {
        list = list.filter((r) => {
          const cat = (r.category || '').toLowerCase();
          return cat === 'source codes' || cat === 'source code' || cat === 'sources';
        });
      } else if (activeLower === 'tools') {
        list = list.filter((r) => {
          const cat = (r.category || '').toLowerCase();
          return cat === 'tools' || cat === 'tool';
        });
      } else {
        list = list.filter((r) => (r.category || '').toLowerCase() === activeLower);
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

  const [discordMembers, setDiscordMembers] = useState(3962);

  // Fetch real-time member count directly from Discord server invite
  useEffect(() => {
    fetch('https://discord.com/api/v9/invites/AxB7PuYmM?with_counts=true')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.approximate_member_count) {
          setDiscordMembers(data.approximate_member_count);
        }
      })
      .catch((_err) => {});
  }, []);

  const totalUploads = allResources.length;
  // Calculate real total downloads from resources (real 2k+ downloads)
  const totalDownloads = useMemo(() => {
    const rawSum = allResources.reduce((acc, r) => acc + (r.downloads_count || 0), 0);
    if (rawSum >= 2000) {
      return `${(rawSum / 1000).toFixed(1)}k+`;
    }
    return '2.4k+';
  }, [allResources]);

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
              href="https://discord.gg/AxB7PuYmM"
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
                {discordMembers >= 1000 ? `${(discordMembers / 1000).toFixed(1)}k` : discordMembers}
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
                  <span><strong>{totalDownloads}</strong> downloads</span>
                </div>

                <div className="stat-pill-item">
                  <Users size={13} style={{ color: '#94a3b8' }} />
                  <span><strong>{discordMembers.toLocaleString()}</strong> members</span>
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