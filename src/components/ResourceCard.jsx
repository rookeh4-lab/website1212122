import React from 'react';
import { Link } from 'react-router-dom';
import { Download, Eye, Heart, Sparkles, Code2, Box, Cpu } from 'lucide-react';

export default function ResourceCard({ resource }) {
  if (!resource) return null;

  const getLoaderBadgeClass = (loader) => {
    const l = (loader || '').toLowerCase();
    if (l.includes('fabric')) return 'syn-badge syn-badge-fabric';
    if (l.includes('neoforge')) return 'syn-badge syn-badge-neoforge';
    if (l.includes('forge')) return 'syn-badge syn-badge-forge';
    if (l.includes('c++') || l.includes('native') || l.includes('dll')) return 'syn-badge syn-badge-native';
    return 'syn-badge syn-badge-vanilla';
  };

  const formattedDownloads = Number(resource.downloads_count || 0).toLocaleString();
  const formattedViews = Number(resource.views_count || 0).toLocaleString();
  const formattedLikes = Number(resource.likes_count || 0).toLocaleString();

  return (
    <div
      className="syn-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Thumbnail & Badges */}
      <div
        style={{
          position: 'relative',
          height: '160px',
          width: '100%',
          overflow: 'hidden',
          backgroundColor: '#161924',
        }}
      >
        <img
          src={resource.thumbnail_url || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800'}
          alt={resource.title}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.3s ease',
          }}
          onError={(e) => {
            e.currentTarget.src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800';
          }}
        />

        {/* Gradient Overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(17, 19, 28, 0.95) 0%, rgba(17, 19, 28, 0.2) 60%, transparent 100%)',
          }}
        />

        {/* Badges Overlay */}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            zIndex: 2,
          }}
        >
          <span className={getLoaderBadgeClass(resource.loader)}>
            {resource.loader || 'Fabric'}
          </span>
          <span
            style={{
              background: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(8px)',
              color: '#f8fafc',
              fontSize: '0.72rem',
              fontWeight: '700',
              padding: '3px 8px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              letterSpacing: '0.02em',
            }}
          >
            {resource.version || '1.21.11'}
          </span>
        </div>

        {/* Category Pill Right */}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            zIndex: 2,
          }}
        >
          <span
            style={{
              background: 'rgba(124, 58, 237, 0.25)',
              backdropFilter: 'blur(8px)',
              color: '#d8b4fe',
              fontSize: '0.7rem',
              fontWeight: '700',
              padding: '3px 8px',
              borderRadius: '6px',
              border: '1px solid rgba(124, 58, 237, 0.4)',
              textTransform: 'uppercase',
            }}
          >
            {resource.category || 'Client'}
          </span>
        </div>
      </div>

      {/* Body Content */}
      <div
        style={{
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
        }}
      >
        {/* Author / Provider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '10px',
          }}
        >
          <img
            src={resource.author_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
            alt={resource.author_name}
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '1px solid rgba(255, 255, 255, 0.15)',
            }}
          />
          <span
            style={{
              fontSize: '0.8rem',
              color: '#94a3b8',
              fontWeight: '500',
            }}
          >
            {resource.author_name || 'Community Provider'}
          </span>
        </div>

        {/* Title */}
        <Link
          to={`/resource/${resource.slug || resource.id}`}
          style={{
            color: '#f8fafc',
            textDecoration: 'none',
            fontSize: '1.05rem',
            fontWeight: '700',
            lineHeight: '1.35',
            marginBottom: '8px',
            transition: 'color 0.18s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#c084fc')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#f8fafc')}
        >
          {resource.title}
        </Link>

        {/* Short Description */}
        <p
          style={{
            fontSize: '0.84rem',
            color: '#94a3b8',
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

        {/* Tags */}
        {resource.tags && resource.tags.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
              marginBottom: '16px',
            }}
          >
            {resource.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                style={{
                  fontSize: '0.72rem',
                  padding: '2px 7px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  color: '#94a3b8',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                #{tag}
              </span>
            ))}
            {resource.tags.length > 3 && (
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '2px 5px',
                  color: '#64748b',
                }}
              >
                +{resource.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Bottom Metrics Bar */}
        <div
          style={{
            marginTop: 'auto',
            paddingTop: '12px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '0.78rem',
              color: '#94a3b8',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Download size={13} style={{ color: '#8b5cf6' }} />
              <span>{formattedDownloads}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Eye size={13} style={{ color: '#38bdf8' }} />
              <span>{formattedViews}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Heart size={13} style={{ color: '#f43f5e' }} />
              <span>{formattedLikes}</span>
            </div>
          </div>

          <Link
            to={`/resource/${resource.slug || resource.id}`}
            style={{
              fontSize: '0.8rem',
              fontWeight: '600',
              color: '#c084fc',
              textDecoration: 'none',
              padding: '4px 10px',
              borderRadius: '6px',
              backgroundColor: 'rgba(124, 58, 237, 0.12)',
              border: '1px solid rgba(124, 58, 237, 0.25)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(124, 58, 237, 0.25)';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(124, 58, 237, 0.12)';
              e.currentTarget.style.color = '#c084fc';
            }}
          >
            Get Resource →
          </Link>
        </div>
      </div>
    </div>
  );
}
