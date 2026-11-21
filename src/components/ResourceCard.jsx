import React from 'react';
import { Link } from 'react-router-dom';
import { Flame, ShieldCheck, AlertCircle } from 'lucide-react';

export default function ResourceCard({ resource }) {
  if (!resource) return null;

  const isHot = resource.is_featured || (resource.downloads_count && resource.downloads_count > 1000);
  const isClean = resource.is_clean !== false && resource.status !== 'unverified';

  return (
    <div className="resource-card-clean">
      {/* 16:9 Thumbnail Area */}
      <Link
        to={`/resource/${resource.slug || resource.id}`}
        style={{
          position: 'relative',
          aspectRatio: '16/9',
          width: '100%',
          overflow: 'hidden',
          display: 'block',
          backgroundColor: '#0a0f1d',
          borderBottom: '1px solid #1a2438',
        }}
      >
        <img
          src={resource.thumbnail_url || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800'}
          alt={resource.title}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.25s var(--ease-out)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.04)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        />
      </Link>

      {/* Card Body */}
      <div
        style={{
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          background: '#0e1526',
        }}
      >
        {/* Tags Row: Type & Clean Badge (Exact Image 8 style) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: '700',
              padding: '2px 8px',
              borderRadius: '6px',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#f87171',
              border: '1px solid rgba(239, 68, 68, 0.35)',
            }}
          >
            {resource.type || (resource.category === 'Source Codes' ? 'Source Code' : resource.category === 'Tools' ? 'Tool' : 'Client')}
          </span>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: '800',
              padding: '2px 8px',
              borderRadius: '6px',
              background: isClean ? 'rgba(16, 185, 129, 0.12)' : 'rgba(234, 179, 8, 0.12)',
              color: isClean ? '#10b981' : '#eab308',
              border: isClean ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(234, 179, 8, 0.4)',
              letterSpacing: '0.02em',
            }}
          >
            {isClean ? 'CLEAN' : 'UNVERIFIED'}
          </span>
        </div>

        {/* Title: Clean bold white text with blue hover */}
        <Link
          to={`/resource/${resource.slug || resource.id}`}
          style={{
            fontFamily: "var(--font-sans)",
            color: '#ffffff',
            textDecoration: 'none',
            fontSize: '1.05rem',
            fontWeight: '700',
            lineHeight: '1.3',
            marginBottom: '6px',
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#38bdf8')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#ffffff')}
        >
          {resource.title}
        </Link>

        {/* Description: Clean slate-400 text, 1-2 lines */}
        <p
          style={{
            fontSize: '0.84rem',
            color: '#94a3b8',
            lineHeight: '1.45',
            marginBottom: '14px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {resource.short_description || resource.description || 'Verified Minecraft resource release.'}
        </p>

        {/* Card Footer: Clean Author only (Comments/Views removed per user request) */}
        <div
          style={{
            marginTop: 'auto',
            paddingTop: '10px',
            borderTop: '1px solid #162035',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.82rem',
          }}
        >
          {/* Author */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <div
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: '#162238',
                border: '1px solid #233454',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.66rem',
                fontWeight: '700',
                color: '#cbd5e1',
                overflow: 'hidden',
              }}
            >
              {resource.author_avatar ? (
                <img
                  src={resource.author_avatar}
                  alt={resource.author_name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                (resource.author_name || 'S')[0].toUpperCase()
              )}
            </div>

            <span style={{ color: '#cbd5e1', fontWeight: '500', fontSize: '0.82rem' }}>
              {resource.author_name || 'Syndicate Team'}
            </span>
          </div>

          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            {resource.loader || 'Fabric'}
          </span>
        </div>
      </div>
    </div>
  );
}