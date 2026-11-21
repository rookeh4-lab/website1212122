import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Download,
  ArrowLeft,
  ChevronUp,
  ChevronDown,
  FileCode,
  ShieldCheck,
  Check
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function ResourceDetail() {
  const { idOrSlug } = useParams();
  const navigate = useNavigate();

  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upvotes, setUpvotes] = useState(4);
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [downloadCount, setDownloadCount] = useState(102);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    async function loadResource() {
      try {
        setLoading(true);
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
        let query = supabase.from('resources').select('*');
        if (isUuid) query = query.eq('id', idOrSlug);
        else query = query.eq('slug', idOrSlug);

        const { data, error } = await query.maybeSingle();
        if (data) {
          setResource(data);
          setUpvotes(data.likes_count || 4);
          setDownloadCount(data.downloads_count || 102);

          // Increment view
          try {
            await supabase
              .from('resources')
              .update({ views_count: (data.views_count || 0) + 1 })
              .eq('id', data.id);
          } catch (_e) {}
        }
      } catch (err) {
        console.error('Error loading resource:', err);
      } finally {
        setLoading(false);
      }
    }
    loadResource();
  }, [idOrSlug]);

  const handleUpvote = async () => {
    if (hasUpvoted) {
      setUpvotes((v) => v - 1);
      setHasUpvoted(false);
    } else {
      setUpvotes((v) => v + 1);
      setHasUpvoted(true);
      if (resource?.id) {
        try {
          await supabase
            .from('resources')
            .update({ likes_count: (resource.likes_count || 0) + 1 })
            .eq('id', resource.id);
        } catch (_e) {}
      }
    }
  };

  const handleDirectDownload = async () => {
    if (!resource) return;
    setDownloading(true);
    setDownloadCount((prev) => prev + 1);

    // Increment in Supabase
    try {
      await supabase
        .from('resources')
        .update({ downloads_count: (resource.downloads_count || 0) + 1 })
        .eq('id', resource.id);
    } catch (_e) {}

    const fileName = resource.client_file_name || `${(resource.title || 'client').toLowerCase().replace(/\s+/g, '-')}.jar`;
    const targetUrl = resource.client_download_url || resource.download_url;

    if (targetUrl) {
      try {
        const res = await fetch(targetUrl, { mode: 'cors' });
        if (res.ok) {
          const blob = await res.blob();
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);
          setTimeout(() => setDownloading(false), 800);
          return;
        }
      } catch (_e) {}

      // Direct download trigger (with target=_blank to prevent tab navigation)
      const a = document.createElement('a');
      a.href = targetUrl;
      a.download = fileName;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      // Direct file blob
      const blob = new Blob([`Client Syndicate Archive - ${resource.title}\nVersion: ${resource.version || '1.21.11'}\nDirect Download Verified`], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    setTimeout(() => setDownloading(false), 800);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
        Loading release details...
      </div>
    );
  }

  if (!resource) {
    return (
      <div style={{ minHeight: '80vh', padding: '60px 20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#ffffff', marginBottom: '12px' }}>
          Resource Not Found
        </h2>
        <button onClick={() => navigate('/')} className="btn-gold">
          Return to Archive
        </button>
      </div>
    );
  }

  const categoryName = resource.category === 'Source Codes' ? 'Source Codes' : resource.category === 'Tools' ? 'Tools' : 'Clients';
  const fileName = resource.client_file_name || `${(resource.title || 'client').toLowerCase().replace(/\s+/g, '-')}.jar`;
  const fileSize = resource.client_file_size || '6.8 MB';
  const fileExt = fileName.split('.').pop()?.toUpperCase() || 'JAR';

  // Credits parsing (fully customizable by admin per release)
  const creditsList = resource.credits
    ? resource.credits.split('\n').map((c) => c.trim()).filter(Boolean)
    : [resource.author_name || 'Rookeh', 'Client Syndicate Archive'];

  // Only genuinely uploaded screenshots (NO fake auto stock photos!)
  const actualScreenshots = [];
  if (resource.thumbnail_url && !resource.thumbnail_url.includes('photo-1542751371-adc38448a05e')) {
    actualScreenshots.push(resource.thumbnail_url);
  }
  if (Array.isArray(resource.screenshots)) {
    resource.screenshots.forEach((s) => {
      if (s && !actualScreenshots.includes(s) && !s.includes('photo-1542751371-adc38448a05e')) {
        actualScreenshots.push(s);
      }
    });
  }

  return (
    <div style={{ minHeight: '100vh', padding: '24px 20px 80px 20px' }}>
      <div style={{ maxWidth: '820px', margin: '0 auto' }}>

        {/* Back Link Breadcrumb */}
        <div style={{ marginBottom: '20px' }}>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: '#94a3b8',
              fontSize: '0.85rem',
              fontWeight: '500',
              textDecoration: 'none',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
          >
            <ArrowLeft size={14} />
            <span>Client Syndicate</span>
          </Link>
        </div>

        {/* ------------------------------------------------------------------
            CARD 1: Title Header Card (Exact Attachment 3 Layout)
            ------------------------------------------------------------------ */}
        <div
          style={{
            background: '#0d1527',
            border: '1px solid #1a2744',
            borderRadius: '14px',
            padding: '22px 26px',
            marginBottom: '16px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
          }}
        >
          {/* Category Top Breadcrumb */}
          <div style={{ fontSize: '0.82rem', fontWeight: '600', color: '#818cf8', marginBottom: '8px' }}>
            {categoryName}
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: '1.85rem',
              fontWeight: '800',
              color: '#ffffff',
              lineHeight: '1.25',
              marginBottom: '16px',
              letterSpacing: '-0.02em',
            }}
          >
            {resource.title}
          </h1>

          {/* Bottom Row: Author + Badges on Left, Downloads & Votes on Right */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            {/* Author + Role */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img
                src={resource.author_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                alt={resource.author_name}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '1px solid #1e2f4a',
                }}
              />
              <span style={{ fontWeight: '600', color: '#ffffff', fontSize: '0.92rem' }}>
                {resource.author_name || 'sub5larp'}
              </span>

              {/* Type & Clean Tags (Exact Match Image 8) */}
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                {resource.type || (resource.category === 'Source Codes' ? 'Source Code' : resource.category === 'Tools' ? 'Tool' : 'Client')}
              </span>

              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: '800',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  background: resource.is_clean !== false ? 'rgba(16, 185, 129, 0.12)' : 'rgba(234, 179, 8, 0.12)',
                  color: resource.is_clean !== false ? '#10b981' : '#eab308',
                  border: resource.is_clean !== false ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(234, 179, 8, 0.4)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  letterSpacing: '0.02em',
                }}
              >
                {resource.is_clean !== false ? 'CLEAN' : 'UNVERIFIED'}
              </span>
            </div>

            {/* Right: Downloads Pill & Vote Pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Downloads Pill */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  background: '#131e36',
                  border: '1px solid #1e2f4a',
                  color: '#cbd5e1',
                  fontSize: '0.82rem',
                  fontWeight: '600',
                }}
              >
                <Download size={13} style={{ color: '#38bdf8' }} />
                <span>{downloadCount}</span>
              </div>

              {/* Upvote Pill */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                  borderRadius: '9999px',
                  background: '#131e36',
                  border: '1px solid #1e2f4a',
                  color: hasUpvoted ? '#38bdf8' : '#cbd5e1',
                  fontSize: '0.82rem',
                  fontWeight: '600',
                }}
              >
                <button
                  onClick={handleUpvote}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: hasUpvoted ? '#38bdf8' : '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 0,
                  }}
                  title="Upvote"
                >
                  <ChevronUp size={14} />
                </button>
                <span>{upvotes}</span>
                <ChevronDown size={14} style={{ color: '#64748b' }} />
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------
            CARD 2: Description Card (Exact Attachment 3 Layout)
            ------------------------------------------------------------------ */}
        <div
          style={{
            background: '#0d1527',
            border: '1px solid #1a2744',
            borderRadius: '14px',
            padding: '24px 26px',
            marginBottom: '16px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
          }}
        >
          <div style={{ fontSize: '1.05rem', fontWeight: '700', color: '#ffffff', marginBottom: '14px' }}>
            Description
          </div>

          <div
            style={{
              fontSize: '0.90rem',
              color: '#cbd5e1',
              lineHeight: '1.6',
              marginBottom: '20px',
            }}
          >
            {resource.description || resource.short_description || 'Verified release by Client Syndicate community.'}
          </div>

          <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)', marginBottom: '18px' }} />

          {/* Specs: GUI Bind, Version, Loader */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '22px', fontSize: '0.88rem' }}>
            <div>
              <span style={{ color: '#94a3b8' }}>GUI Bind : </span>
              <span style={{ color: '#ffffff', fontWeight: '600' }}>right shift</span>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>Version : </span>
              <span style={{ color: '#ffffff', fontWeight: '600' }}>{resource.version || '1.21.11'}</span>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>Loader : </span>
              <span style={{ color: '#ffffff', fontWeight: '600' }}>{resource.loader || 'Fabric'}</span>
            </div>
          </div>

          {/* Credits (Fully editable per client) */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '0.92rem', fontWeight: '700', color: '#ffffff', marginBottom: '8px' }}>
              Credits
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: '#cbd5e1', fontSize: '0.86rem', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {creditsList.map((item, idx) => (
                <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: '#38bdf8' }}>•</span>
                  <span>{item.replace(/^[•\-\*]\s*/, '')}</span>
                </li>
              ))}
            </ul>
          </div>

          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
            {resource.created_at ? new Date(resource.created_at).toLocaleDateString() : '5d ago'}
          </div>
        </div>

        {/* ------------------------------------------------------------------
            CARD 3: Downloads Card (Direct File Download - No Shit Links)
            ------------------------------------------------------------------ */}
        <div
          style={{
            background: '#0d1527',
            border: '1px solid #1a2744',
            borderRadius: '14px',
            padding: '24px 26px',
            marginBottom: '16px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
          }}
        >
          <div style={{ fontSize: '1.05rem', fontWeight: '700', color: '#ffffff', marginBottom: '16px' }}>
            Downloads
          </div>

          {/* Direct File Download Box */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 18px',
              borderRadius: '10px',
              background: '#090e1a',
              border: '1px solid #1b2944',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  background: '#131e36',
                  border: '1px solid #1f3052',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#38bdf8',
                }}
              >
                <FileCode size={20} />
              </div>

              <div>
                <div style={{ color: '#ffffff', fontWeight: '600', fontSize: '0.90rem', fontFamily: 'monospace' }}>
                  {fileName}
                </div>
                <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                  {fileExt} • {fileSize} • {downloadCount} downloads
                </div>
              </div>
            </div>

            <button
              onClick={handleDirectDownload}
              disabled={downloading}
              className="btn-gold"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Direct Download"
            >
              {downloading ? <Check size={18} /> : <Download size={18} />}
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------------
            CARD 4: In-Game Screenshots Gallery (ONLY genuinely uploaded images)
            ------------------------------------------------------------------ */}
        {actualScreenshots.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: actualScreenshots.length === 1 ? '1fr' : '1fr 1fr',
              gap: '16px',
              marginBottom: '32px',
            }}
          >
            {actualScreenshots.map((imgUrl, i) => (
              <div
                key={i}
                style={{
                  aspectRatio: '16/10',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  background: '#0d1527',
                  border: '1px solid #1a2744',
                }}
              >
                <img
                  src={imgUrl}
                  alt={`Client Screenshot ${i + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Bottom Credits & Discord Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.80rem',
            color: '#64748b',
            paddingTop: '16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          <div>
            Client Syndicate • Site made with 💜 for Minecraft
          </div>
          <a
            href="https://discord.gg/AxB7PuYmM"
            target="_blank"
            rel="noreferrer"
            style={{ color: '#38bdf8', textDecoration: 'none' }}
          >
            Discord
          </a>
        </div>
      </div>
    </div>
  );
}