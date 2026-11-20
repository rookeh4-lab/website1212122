import React from 'react';
import { Link } from 'react-router-dom';
import { Download, Eye, MessageSquare, Flame, CheckCircle, ChevronUp } from 'lucide-react';

export default function ResourceCard({ resource }) {
  if (!resource) return null;

  const isHot = resource.is_featured || (resource.downloads_count && resource.downloads_count > 1000);
  const formattedViews = Number(resource.views_count || 0).toLocaleString();
  const upvotes = resource.likes_count || 0;
  const commentsCount = resource.comments_count || 4;

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
          backgroundColor: '#101724',
        }}
      >
        <img
          src={resource.thumbnail_url || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800'}
          alt={resource.title}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.3s var(--ease-out)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.04)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          onError={(e) => {
            e.currentTarget.src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800';
          }}
        />

        {/* Soft Vignette Gradient */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(14, 19, 29, 0.8) 0%, transparent 60%)',
          }}
        />

        {/* Top Badges Row: Hot & Verified */}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            right: '12px',
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
            <div
              style={{
                fontSize: '0.72rem',
                fontWeight: '600',
                padding: '3px 9px',
                borderRadius: '9999px',
                backgroundColor: 'rgba(14, 19, 29, 0.75)',
                color: 'var(--text-muted)',
                border: '1px solid var(--edge)',
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

        {/* Bottom-Left Tag on Thumbnail (• Minecraft Category) */}
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            left: '10px',
            zIndex: 2,
            pointerEvents: 'none',
          }}
        >
          <div className="badge-tag-mc-clean">
            <span className="mc-dot-gold" />
            <span style={{ color: '#ffffff', fontWeight: '700' }}>Minecraft</span>
            <span style={{ color: '#94a3b8', fontWeight: '500' }}>{resource.category || 'Client'}</span>
          </div>
        </div>
      </Link>

      {/* Card Body */}
      <div
        style={{
          padding: '16px 18px 18px 18px',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          background: 'var(--bg-card)',
        }}
      >
        {/* Version & Category Tags ([1.21.11] [Source Code]) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
          <span className="tag-pill-ver">
            {resource.version || '1.21.11'}
          </span>

          <span className="tag-pill-cat">
            {resource.category || resource.loader || 'Source Code'}
          </span>
        </div>

        {/* Title: Clean, bold white text with cyan hover */}
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
            transition: 'color 0.18s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#38bdf8')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#ffffff')}
        >
          {resource.title}
        </Link>

        {/* Description: Readable slate text, 2 lines */}
        <p
          style={{
            fontSize: '0.84rem',
            color: 'var(--text-muted)',
            lineHeight: '1.5',
            marginBottom: '16px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {resource.short_description || resource.description || 'Premium Minecraft resource release.'}
        </p>

        {/* Card Footer: Author & Metrics */}
        <div
          style={{
            marginTop: 'auto',
            paddingTop: '12px',
            borderTop: '1px solid var(--edge)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.82rem',
          }}
        >
          {/* Author */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #38bdf8, #6366f1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.68rem',
                fontWeight: '700',
                color: '#ffffff',
                overflow: 'hidden',
                boxShadow: '0 0 6px rgba(56, 189, 248, 0.3)',
              }}
            >
              {resource.author_avatar ? (
                <img
                  src={resource.author_avatar}
                  alt={resource.author_name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                (resource.author_name || 'B')[0].toUpperCase()
              )}
            </div>

            <span style={{ color: '#ffffff', fontWeight: '600' }}>
              {resource.author_name || 'Biscuit'}
            </span>
          </div>

          {/* Metrics */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-dim)' }}>
            {/* Upvotes */}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#38bdf8')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
              title="Upvotes"
            >
              <ChevronUp size={14} />
              <span>{upvotes}</span>
            </span>

            {/* Comments */}
            <span
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              title="Comments"
            >
              <MessageSquare size={13} />
              <span>{commentsCount}</span>
            </span>

            {/* Views */}
            <span
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              title="Views"
            >
              <Eye size={13} />
              <span>{formattedViews}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
