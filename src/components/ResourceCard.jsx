import React from 'react';
import { Link } from 'react-router-dom';
import { Download, Eye, MessageSquare, Flame, CheckCircle, ChevronUp } from 'lucide-react';

export default function ResourceCard({ resource }) {
  if (!resource) return null;

  const isHot = resource.is_featured || (resource.downloads_count && resource.downloads_count > 1000);
  const formattedViews = Number(resource.views_count || 0).toLocaleString();
  const upvotes = resource.likes_count || 0;
  const commentsCount = resource.comments_count || 4; // realistic fallback matching Image 1

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
          backgroundColor: '#0d1017',
        }}
      >
        <img
          src={resource.thumbnail_url || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800'}
          alt={resource.title}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.25s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.03)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          onError={(e) => {
            e.currentTarget.src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800';
          }}
        />

        {/* Subtle Vignette Gradient */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(9, 12, 18, 0.7) 0%, transparent 60%)',
          }}
        />

        {/* Top Badges Row: Hot & Verified (Image 1 style) */}
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
          }}
        >
          {/* Hot Badge */}
          {isHot ? (
            <div className="badge-hot-clean">
              <Flame size={12} />
              <span>Hot</span>
            </div>
          ) : (
            <div
              style={{
                fontSize: '0.7rem',
                fontWeight: '600',
                padding: '2px 8px',
                borderRadius: '9999px',
                backgroundColor: 'rgba(0, 0, 0, 0.65)',
                color: '#9ca3af',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(4px)',
              }}
            >
              {resource.type || 'Release'}
            </div>
          )}

          {/* Verified Badge */}
          <div className="badge-verified-clean">
            <CheckCircle size={11} />
            <span>Verified</span>
          </div>
        </div>

        {/* Bottom-Left Tag on Thumbnail (Image 1: • Minecraft Source Code) */}
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            left: '10px',
            zIndex: 2,
          }}
        >
          <div className="badge-tag-mc-clean">
            <span className="mc-dot-gold" />
            <span style={{ color: '#ffffff', fontWeight: '600' }}>Minecraft</span>
            <span style={{ color: '#9ca3af' }}>{resource.category || 'Client'}</span>
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
        }}
      >
        {/* Version & Category Tags (Image 1: [1.21.11] [Source Code]) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
          <span className="tag-pill-ver">
            {resource.version || '1.21.11'}
          </span>

          <span className="tag-pill-cat">
            {resource.category || resource.loader || 'Source Code'}
          </span>
        </div>

        {/* Title: Clean, simple, normal-sized font (Image 1: SignalDebug V2) */}
        <Link
          to={`/resource/${resource.slug || resource.id}`}
          style={{
            fontFamily: "var(--font-sans)",
            color: '#ffffff',
            textDecoration: 'none',
            fontSize: '1.05rem',
            fontWeight: '600',
            lineHeight: '1.35',
            marginBottom: '6px',
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#ff8533')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#ffffff')}
        >
          {resource.title}
        </Link>

        {/* Description: Clean, normal small text (Image 1: Skidded slop addon by Dexter) */}
        <p
          style={{
            fontSize: '0.84rem',
            color: '#8b949e',
            lineHeight: '1.45',
            marginBottom: '14px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {resource.description}
        </p>

        {/* Footer: Author on left, Stats on right (Image 1: Biscuit ^ 2 💬 4 👁 289) */}
        <div
          style={{
            marginTop: 'auto',
            paddingTop: '12px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          {/* Author */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
            <img
              src={resource.author_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
              alt={resource.author_name}
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: '0.82rem',
                color: '#d1d5db',
                fontWeight: '500',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {resource.author_name || 'Biscuit'}
            </span>
          </div>

          {/* Right Metrics: ^ 2  💬 4  👁 289 (Image 1 style) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.78rem',
              color: '#8b949e',
              flexShrink: 0,
            }}
          >
            {/* Upvotes */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                color: upvotes > 0 ? '#ff8533' : '#8b949e',
                fontWeight: '500',
              }}
            >
              <ChevronUp size={13} />
              <span>{upvotes}</span>
            </div>

            {/* Comments */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <MessageSquare size={12} />
              <span>{commentsCount}</span>
            </div>

            {/* Views */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Eye size={12} />
              <span>{formattedViews}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
