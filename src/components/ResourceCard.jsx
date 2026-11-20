import React from 'react';
import { Link } from 'react-router-dom';
import { Download, Eye, MessageSquare, Flame, CheckCircle, ChevronUp } from 'lucide-react';

export default function ResourceCard({ resource }) {
  if (!resource) return null;

  const isHot = resource.is_featured || (resource.downloads_count && resource.downloads_count > 1000);
  const formattedDownloads = Number(resource.downloads_count || 0).toLocaleString();
  const formattedViews = Number(resource.views_count || 0).toLocaleString();
  const upvotes = resource.likes_count || 0;

  return (
    <div className={`gta-crack-card ${isHot ? 'is-hot' : ''}`}>
      {/* 16:9 Thumbnail Area */}
      <Link
        to={`/resource/${resource.slug || resource.id}`}
        style={{
          position: 'relative',
          aspectRatio: '16/9',
          width: '100%',
          overflow: 'hidden',
          display: 'block',
          backgroundColor: '#12101b',
        }}
      >
        <img
          src={resource.thumbnail_url || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800'}
          alt={resource.title}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.35s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          onError={(e) => {
            e.currentTarget.src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800';
          }}
        />

        {/* Ambient Card Vignette */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(16, 14, 24, 0.95) 0%, rgba(16, 14, 24, 0.25) 55%, transparent 100%)',
          }}
        />

        {/* Overlaid Badges: Top Row */}
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
          }}
        >
          {/* Hot Badge */}
          {isHot ? (
            <div className="badge-hot">
              <Flame size={12} />
              <span>Hot</span>
            </div>
          ) : (
            <div
              style={{
                fontSize: '0.7rem',
                fontWeight: '700',
                padding: '3px 8px',
                borderRadius: '999px',
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(8px)',
                color: '#9ca3af',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              {resource.type || 'Release'}
            </div>
          )}

          {/* Verified Badge */}
          <div className="badge-verified">
            <CheckCircle size={12} />
            <span>Verified</span>
          </div>
        </div>

        {/* Overlaid Bottom-Left Tag (XenntSquad Dual Pill) */}
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            zIndex: 2,
          }}
        >
          <div className="badge-tag-dark">
            <span className="dot-indicator" />
            <span style={{ color: '#fff', fontWeight: '700' }}>Minecraft</span>
            <span style={{ color: '#9ca3af' }}>{resource.category || 'Client'}</span>
          </div>
        </div>
      </Link>

      {/* Card Content Body */}
      <div
        style={{
          padding: '18px 20px 20px 20px',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
        }}
      >
        {/* Version & Loader Sub-tags */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: '700',
              padding: '2px 8px',
              borderRadius: '6px',
              backgroundColor: 'rgba(0, 240, 255, 0.1)',
              color: '#00f0ff',
              border: '1px solid rgba(0, 240, 255, 0.25)',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {resource.version || '1.21.11'}
          </span>

          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: '600',
              padding: '2px 8px',
              borderRadius: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: '#cbd5e1',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            {resource.loader || 'Fabric'}
          </span>
        </div>

        {/* Title */}
        <Link
          to={`/resource/${resource.slug || resource.id}`}
          style={{
            color: '#ffffff',
            textDecoration: 'none',
            fontSize: '1.12rem',
            fontWeight: '700',
            lineHeight: '1.35',
            marginBottom: '8px',
            transition: 'color 0.18s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#ff2a85')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#ffffff')}
        >
          {resource.title}
        </Link>

        {/* Description Excerpt */}
        <p
          style={{
            fontSize: '0.85rem',
            color: '#9ca3af',
            lineHeight: '1.5',
            marginBottom: '16px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {resource.description}
        </p>

        {/* Card Footer (Author + Metrics) */}
        <div
          style={{
            marginTop: 'auto',
            paddingTop: '14px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          {/* Author */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <img
              src={resource.author_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
              alt={resource.author_name}
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: '0.82rem',
                color: '#e5e7eb',
                fontWeight: '600',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {resource.author_name || 'Syndicate'}
            </span>
          </div>

          {/* Right Metrics (Upvotes, Comments, Views, Downloads) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.78rem',
              color: '#9ca3af',
              flexShrink: 0,
            }}
          >
            {/* Upvote Count */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                color: upvotes > 0 ? '#ff7a00' : '#9ca3af',
                fontWeight: '600',
              }}
            >
              <ChevronUp size={14} />
              <span>{upvotes}</span>
            </div>

            {/* Downloads */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Download size={13} style={{ color: '#00f0ff' }} />
              <span>{formattedDownloads}</span>
            </div>

            {/* Views */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Eye size={13} style={{ color: '#ff2a85' }} />
              <span>{formattedViews}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
