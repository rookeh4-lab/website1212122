import React from 'react';
import { Link } from 'react-router-dom';
import { Flame, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';

export default function ResourceCard({ resource }) {
  if (!resource) return null;

  const isHot = Boolean(
    resource.is_featured ||
    resource.is_hot ||
    (Array.isArray(resource.tags) && (
      resource.tags.includes('hot') ||
      resource.tags.includes('Hot topic') ||
      resource.tags.includes('Hot')
    )) ||
    (resource.downloads_count && resource.downloads_count > 1000)
  );
  const isClean = resource.is_clean !== false && resource.status !== 'unverified';

  return (
    <div className={`resource-card-clean ${isHot ? 'card-hot-flame' : ''}`}>
      {/* 16:9 Thumbnail Area with Floating Badges */}
      <div
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
        <Link
          to={`/resource/${resource.slug || resource.id}`}
          style={{ display: 'block', width: '100%', height: '100%' }}
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

        {/* Floating Badges Overlay (Clean Placement on Thumbnail) */}
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            right: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pointerEvents: 'none',
            zIndex: 4,
          }}
        >
          {isHot ? (
            <span className="badge-hot-topic-shine">
              <Flame size={12} className="flame-icon-animated" />
              Hot topic
            </span>
          ) : (
            <div />
          )}

          <span className="badge-verified-shine">
            <CheckCircle2 size={12} />
            {isClean ? 'VERIFIED' : 'UNVERIFIED'}
          </span>
        </div>
      </div>

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
            marginBottom: '8px',
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
            marginBottom: '16px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {resource.short_description || resource.description || 'Verified Minecraft resource release.'}
        </p>

        {/* Card Footer: Clean Author only */}
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