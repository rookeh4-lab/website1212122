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
          onError={(e) => {
            e.currentTarget.src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800';
          }}
        />

        {/* Top Badges Row: Hot & CLEAN/UNVERIFIED */}
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            right: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 2,
            pointerEvents: 'none',
          }}
        >
          {/* Hot Badge */}
          {isHot ? (
            <div className="badge-hot-clean">
              <Flame size={12} />
              <span>Hot</span>
            </div>
          ) : (
            <div />
          )}

          {/* CLEAN / UNVERIFIED Badge */}
          {isClean ? (
            <div className="badge-clean-tag">
              <ShieldCheck size={11} />
              <span>CLEAN</span>
            </div>
          ) : (
            <div className="badge-unverified-tag">
              <AlertCircle size={11} />
              <span>UNVERIFIED</span>
            </div>
          )}
        </div>

        {/* Top Tag on Thumbnail (• Minecraft Category) */}
        <div
          style={{
            position: 'absolute',
            top: isHot ? '40px' : '10px',
            left: '10px',
            zIndex: 2,
            pointerEvents: 'none',
          }}
        >
          <div className="badge-tag-mc-clean">
            <span className="mc-dot-gold" />
            <span style={{ color: '#ffffff', fontWeight: '600' }}>Minecraft</span>
            <span style={{ color: '#94a3b8', fontWeight: '400' }}>{resource.category || 'Client'}</span>
          </div>
        </div>
      </Link>

      {/* Card Body */}
      <div
        style={{
          padding: '14px 16px 16px 16px',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          background: '#0e1526',
        }}
      >
        {/* Version & Category Tags ([1.21.11] [Client] [CLEAN]) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
          <span className="tag-pill-ver">
            {resource.version || '1.21.11'}
          </span>

          <span className="tag-pill-cat">
            {resource.category === 'Source Codes' ? 'Source Code' : resource.category === 'Tools' ? 'Tool' : 'Client'}
          </span>

          {isClean ? (
            <span
              style={{
                fontSize: '10px',
                fontWeight: '700',
                padding: '2px 7px',
                borderRadius: '4px',
                color: '#10b981',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                letterSpacing: '0.02em',
              }}
            >
              CLEAN
            </span>
          ) : (
            <span
              style={{
                fontSize: '10px',
                fontWeight: '700',
                padding: '2px 7px',
                borderRadius: '4px',
                color: '#f59e0b',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                letterSpacing: '0.02em',
              }}
            >
              UNVERIFIED
            </span>
          )}
        </div>

        {/* Title: Clean bold white text with blue hover */}
        <Link
          to={`/resource/${resource.slug || resource.id}`}
          style={{
            fontFamily: "var(--font-sans)",
            color: '#ffffff',
            textDecoration: 'none',
            fontSize: '1.02rem',
            fontWeight: '700',
            lineHeight: '1.3',
            marginBottom: '4px',
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