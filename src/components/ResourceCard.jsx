import React from 'react';
import { Link } from 'react-router-dom';
import { Eye, MessageSquare, Flame, CheckCircle, ChevronUp } from 'lucide-react';

export default function ResourceCard({ resource }) {
  if (!resource) return null;

  const isHot = resource.is_featured || (resource.downloads_count && resource.downloads_count > 1000) || true;
  const formattedViews = Number(resource.views_count || resource.downloads_count ? (resource.views_count || resource.downloads_count * 2 + 89) : 289).toLocaleString();
  const upvotes = resource.likes_count !== undefined ? resource.likes_count : (resource.downloads_count ? Math.floor(resource.downloads_count / 800) : 2);
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
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.03)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          onError={(e) => {
            e.currentTarget.src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800';
          }}
        />

        {/* Top Badges Row: Hot & Verified */}
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
          <div className="badge-hot-clean">
            <Flame size={12} />
            <span>Hot</span>
          </div>

          {/* Verified Badge */}
          <div className="badge-verified-clean">
            <CheckCircle size={11} />
            <span>Verified</span>
          </div>
        </div>

        {/* Top/Middle Tag on Thumbnail (• Minecraft Category) */}
        <div
          style={{
            position: 'absolute',
            top: '38px',
            left: '10px',
            zIndex: 2,
            pointerEvents: 'none',
          }}
        >
          <div className="badge-tag-mc-clean">
            <span className="mc-dot-gold" />
            <span style={{ color: '#ffffff', fontWeight: '600' }}>Minecraft</span>
            <span style={{ color: '#94a3b8', fontWeight: '400' }}>{resource.category || 'Source Code'}</span>
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
        {/* Version & Category Tags ([1.21.11] [Source Code]) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
          <span className="tag-pill-ver">
            {resource.version || '1.21.11'}
          </span>

          <span className="tag-pill-cat">
            {resource.category === 'Source Codes' || resource.category === 'Clients' ? (resource.category === 'Source Codes' ? 'Source Code' : 'Client') : (resource.category || 'Source Code')}
          </span>
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
          {resource.short_description || resource.description || 'Skidded slop addon by Dexter'}
        </p>

        {/* Card Footer: Author & Metrics (Caret Up, Comment, Views) */}
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
                (resource.author_name || 'B')[0].toUpperCase()
              )}
            </div>

            <span style={{ color: '#cbd5e1', fontWeight: '500', fontSize: '0.82rem' }}>
              {resource.author_name || 'Biscuit'}
            </span>
          </div>

          {/* Metrics: ^ upvotes, chat comments, eye views */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#94a3b8', fontSize: '0.78rem' }}>
            {/* Upvotes */}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                cursor: 'pointer',
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
              title="Upvotes"
            >
              <ChevronUp size={13} strokeWidth={2.4} />
              <span>{upvotes}</span>
            </span>

            {/* Comments */}
            <span
              style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}
              title="Comments"
            >
              <MessageSquare size={12} />
              <span>{commentsCount}</span>
            </span>

            {/* Views */}
            <span
              style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}
              title="Views"
            >
              <Eye size={12} />
              <span>{formattedViews}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
