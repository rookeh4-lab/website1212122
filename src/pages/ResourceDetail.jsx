import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Download,
  Heart,
  Eye,
  Share2,
  Calendar,
  Layers,
  Code2,
  Cpu,
  MessageSquare,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Check,
  AlertCircle,
  FileCode,
  Sparkles,
  Send,
  ThumbsUp
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import GithubIcon from '../components/GithubIcon';

export default function ResourceDetail() {
  const { idOrSlug } = useParams();
  const navigate = useNavigate();

  const [resource, setResource] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'changelog' | 'screenshots'

  // Download & Like states
  const [downloadingClient, setDownloadingClient] = useState(false);
  const [downloadingSource, setDownloadingSource] = useState(false);
  const [hasLiked, setHasLiked] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Comment submission form
  const [commentName, setCommentName] = useState('');
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState('');

  // Fetch resource data
  useEffect(() => {
    async function loadResource() {
      try {
        setLoading(true);
        // Try fetching via API router
        let resData = null;
        try {
          const apiRes = await fetch(`/api/resources/${idOrSlug}`);
          if (apiRes.ok) {
            const data = await apiRes.json();
            resData = data.resource;
          }
        } catch (_e) {
          // Fallback to Supabase direct
        }

        if (!resData) {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
          let query = supabase.from('resources').select('*');
          if (isUuid) query = query.eq('id', idOrSlug);
          else query = query.eq('slug', idOrSlug);
          const { data } = await query.maybeSingle();
          resData = data;
        }

        if (resData) {
          setResource(resData);
          loadComments(resData.id);
        }
      } catch (err) {
        console.error('Error fetching resource details:', err);
      } finally {
        setLoading(false);
      }
    }

    loadResource();
  }, [idOrSlug]);

  // Load comments
  const loadComments = async (resourceId) => {
    try {
      const res = await fetch(`/api/resources/${resourceId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      } else {
        const { data } = await supabase
          .from('comments')
          .select('*')
          .eq('resource_id', resourceId)
          .order('created_at', { ascending: false });
        if (data) setComments(data);
      }
    } catch (err) {
      console.error('Error loading comments:', err);
    }
  };

  // Handle Download Click
  const handleDownload = async (type) => {
    if (!resource) return;
    const isSource = type === 'source';
    if (isSource) setDownloadingSource(true);
    else setDownloadingClient(true);

    try {
      const res = await fetch(`/api/resources/${resource.id}/download/${type}`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setResource((prev) => ({
          ...prev,
          downloads_count: data.downloads_count || (prev.downloads_count + 1),
        }));

        const targetUrl = data.download_url || (isSource ? resource.source_download_url : resource.client_download_url);
        if (targetUrl) {
          window.open(targetUrl, '_blank');
        }
      } else {
        const fallbackUrl = isSource ? resource.source_download_url : resource.client_download_url;
        if (fallbackUrl) window.open(fallbackUrl, '_blank');
      }
    } catch (err) {
      console.error('Download error:', err);
      const fallbackUrl = isSource ? resource.source_download_url : resource.client_download_url;
      if (fallbackUrl) window.open(fallbackUrl, '_blank');
    } finally {
      if (isSource) setDownloadingSource(false);
      else setDownloadingClient(false);
    }
  };

  // Handle Like Click
  const handleLike = async () => {
    if (!resource || hasLiked) return;
    try {
      const res = await fetch(`/api/resources/${resource.id}/like`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setResource((prev) => ({ ...prev, likes_count: data.likes_count }));
        setHasLiked(true);
      }
    } catch (err) {
      console.error('Like error:', err);
    }
  };

  // Handle Comment Like
  const handleCommentLike = async (commentId) => {
    try {
      const res = await fetch(`/api/comments/${commentId}/like`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setComments((prev) =>
          prev.map((c) => (c.id === commentId ? { ...c, likes_count: data.likes_count } : c))
        );
      }
    } catch (err) {
      console.error('Comment like error:', err);
    }
  };

  // Handle Submit Comment
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    if (commentText.trim().length < 2) {
      setCommentError('Comment must be at least 2 characters.');
      return;
    }

    try {
      setSubmittingComment(true);
      setCommentError('');

      const res = await fetch(`/api/resources/${resource.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author_name: commentName.trim() || 'Anonymous User',
          content: commentText.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setComments((prev) => [data.comment, ...prev]);
        setCommentText('');
      } else {
        const errData = await res.json();
        setCommentError(errData.error || 'Failed to post comment.');
      }
    } catch (err) {
      setCommentError('Network error while posting comment.');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Handle Share Link
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
        Loading Syndicate resource details...
      </div>
    );
  }

  if (!resource) {
    return (
      <div style={{ minHeight: '70vh', padding: '80px 24px', textAlign: 'center' }}>
        <h2 style={{ color: '#fff', fontSize: '1.8rem', marginBottom: '12px' }}>Resource Not Found</h2>
        <p style={{ color: '#94a3b8', marginBottom: '24px' }}>
          The requested Minecraft resource does not exist or has been removed from the Syndicate archive.
        </p>
        <Link to="/clients" className="syn-btn syn-btn-primary">
          Back to Archive
        </Link>
      </div>
    );
  }

  const getLoaderBadgeClass = (loader) => {
    const l = (loader || '').toLowerCase();
    if (l.includes('fabric')) return 'syn-badge syn-badge-fabric';
    if (l.includes('neoforge')) return 'syn-badge syn-badge-neoforge';
    if (l.includes('forge')) return 'syn-badge syn-badge-forge';
    if (l.includes('c++') || l.includes('native') || l.includes('dll')) return 'syn-badge syn-badge-native';
    return 'syn-badge syn-badge-vanilla';
  };

  return (
    <div style={{ minHeight: '100vh', padding: '30px 24px 80px 24px' }}>
      <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
        {/* Breadcrumb Navigation */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.84rem',
            color: '#64748b',
            marginBottom: '24px',
          }}
        >
          <Link to="/" style={{ color: '#94a3b8', textDecoration: 'none' }}>
            Home
          </Link>
          <ChevronRight size={14} />
          <Link
            to={`/clients?category=${encodeURIComponent(resource.category)}`}
            style={{ color: '#94a3b8', textDecoration: 'none' }}
          >
            {resource.category || 'Clients'}
          </Link>
          <ChevronRight size={14} />
          <span style={{ color: '#cbd5e1', fontWeight: '500' }}>
            {resource.title}
          </span>
        </div>

        {/* Main Header Card */}
        <div
          style={{
            backgroundColor: '#0c0e15',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '32px',
            marginBottom: '32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          {/* Top Row: Badges & Actions */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
              <span className={getLoaderBadgeClass(resource.loader)}>
                {resource.loader || 'Fabric'}
              </span>
              <span
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  color: '#fff',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                MC {resource.version || '1.21.11'}
              </span>
              <span
                style={{
                  background: 'rgba(124, 58, 237, 0.18)',
                  color: '#c084fc',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  border: '1px solid rgba(124, 58, 237, 0.3)',
                  textTransform: 'uppercase',
                }}
              >
                {resource.type || 'Release'}
              </span>
            </div>

            {/* Like & Share Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={handleLike}
                className="syn-btn syn-btn-secondary"
                style={{
                  padding: '7px 14px',
                  fontSize: '0.82rem',
                  color: hasLiked ? '#f43f5e' : '#cbd5e1',
                  borderColor: hasLiked ? 'rgba(244, 63, 94, 0.4)' : 'rgba(255, 255, 255, 0.1)',
                }}
              >
                <Heart size={14} fill={hasLiked ? '#f43f5e' : 'none'} />
                <span>{resource.likes_count || 0}</span>
              </button>

              <button
                onClick={handleShare}
                className="syn-btn syn-btn-secondary"
                style={{
                  padding: '7px 14px',
                  fontSize: '0.82rem',
                }}
              >
                {copiedLink ? <Check size={14} style={{ color: '#10b981' }} /> : <Share2 size={14} />}
                <span>{copiedLink ? 'Copied' : 'Share'}</span>
              </button>
            </div>
          </div>

          {/* Title & Description */}
          <div>
            <h1
              style={{
                fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)',
                fontWeight: '900',
                color: '#ffffff',
                lineHeight: '1.2',
                marginBottom: '12px',
                letterSpacing: '-0.02em',
              }}
            >
              {resource.title}
            </h1>
            <p
              style={{
                fontSize: '1.05rem',
                color: '#94a3b8',
                lineHeight: '1.6',
                maxWidth: '900px',
              }}
            >
              {resource.description}
            </p>
          </div>

          {/* Author Badge & Metrics Bar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              paddingTop: '20px',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            {/* Author */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img
                src={resource.author_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                alt={resource.author_name}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                }}
              />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.92rem', fontWeight: '700', color: '#fff' }}>
                    {resource.author_name || 'Community Member'}
                  </span>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: '700',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(56, 189, 248, 0.15)',
                      color: '#38bdf8',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                    }}
                  >
                    VERIFIED
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Updated {resource.created_at ? new Date(resource.created_at).toLocaleDateString() : 'Recently'}
                </div>
              </div>
            </div>

            {/* Metrics Counters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '0.85rem', color: '#94a3b8' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Download size={15} style={{ color: '#8b5cf6' }} />
                <span>{Number(resource.downloads_count || 0).toLocaleString()} downloads</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Eye size={15} style={{ color: '#38bdf8' }} />
                <span>{Number(resource.views_count || 0).toLocaleString()} views</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dual Download Action Card */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.12) 0%, rgba(59, 130, 246, 0.08) 100%)',
            border: '1px solid rgba(124, 58, 237, 0.3)',
            borderRadius: '16px',
            padding: '24px 32px',
            marginBottom: '32px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '20px',
          }}
        >
          <div>
            <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#fff', marginBottom: '4px' }}>
              Download Options
            </div>
            <div style={{ fontSize: '0.88rem', color: '#94a3b8' }}>
              Pre-built client binary and complete source code distribution.
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px' }}>
            {/* Primary Client Download Button */}
            {resource.client_download_url && (
              <button
                onClick={() => handleDownload('client')}
                disabled={downloadingClient}
                className="syn-btn syn-btn-primary"
                style={{
                  padding: '12px 24px',
                  fontSize: '0.95rem',
                }}
              >
                <Download size={18} />
                <span>
                  {downloadingClient ? 'Starting...' : 'Download Client'}
                </span>
                {resource.client_file_size && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    }}
                  >
                    {resource.client_file_size}
                  </span>
                )}
              </button>
            )}

            {/* Secondary Source Code Download Button */}
            {resource.source_download_url && (
              <button
                onClick={() => handleDownload('source')}
                disabled={downloadingSource}
                className="syn-btn syn-btn-secondary"
                style={{
                  padding: '12px 24px',
                  fontSize: '0.95rem',
                }}
              >
                <Code2 size={18} style={{ color: '#38bdf8' }} />
                <span>
                  {downloadingSource ? 'Preparing...' : 'Download Source (.zip)'}
                </span>
                {resource.source_file_size && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      color: '#94a3b8',
                    }}
                  >
                    {resource.source_file_size}
                  </span>
                )}
              </button>
            )}

            {/* External GitHub Link */}
            {resource.github_url && (
              <a
                href={resource.github_url}
                target="_blank"
                rel="noreferrer"
                className="syn-btn syn-btn-outline"
                style={{
                  padding: '12px 18px',
                  fontSize: '0.95rem',
                }}
              >
                <GithubIcon size={18} />
                <span>GitHub</span>
              </a>
            )}
          </div>
        </div>

        {/* Content Tabs Navigation */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            marginBottom: '32px',
            gap: '8px',
          }}
        >
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              padding: '12px 20px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'overview' ? '2px solid #8b5cf6' : '2px solid transparent',
              color: activeTab === 'overview' ? '#fff' : '#94a3b8',
              fontWeight: activeTab === 'overview' ? '700' : '500',
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Layers size={16} />
            Overview & Features
          </button>

          <button
            onClick={() => setActiveTab('changelog')}
            style={{
              padding: '12px 20px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'changelog' ? '2px solid #8b5cf6' : '2px solid transparent',
              color: activeTab === 'changelog' ? '#fff' : '#94a3b8',
              fontWeight: activeTab === 'changelog' ? '700' : '500',
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Calendar size={16} />
            Changelog
          </button>

          <button
            onClick={() => setActiveTab('screenshots')}
            style={{
              padding: '12px 20px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'screenshots' ? '2px solid #8b5cf6' : '2px solid transparent',
              color: activeTab === 'screenshots' ? '#fff' : '#94a3b8',
              fontWeight: activeTab === 'screenshots' ? '700' : '500',
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Sparkles size={16} />
            Screenshots
          </button>
        </div>

        {/* Content Layout: Left Body (2/3) + Right Details Panel (1/3) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)',
            gap: '32px',
          }}
          className="detail-grid"
        >
          {/* Left Column: Tab Content */}
          <div>
            {activeTab === 'overview' && (
              <div
                style={{
                  backgroundColor: '#0c0e15',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '16px',
                  padding: '32px',
                  marginBottom: '32px',
                }}
              >
                <div
                  className="syn-markdown-content"
                  style={{
                    fontSize: '0.96rem',
                    lineHeight: '1.7',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {resource.content || resource.description}
                </div>
              </div>
            )}

            {activeTab === 'changelog' && (
              <div
                style={{
                  backgroundColor: '#0c0e15',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '16px',
                  padding: '32px',
                  marginBottom: '32px',
                }}
              >
                <h3 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '20px' }}>
                  Version History
                </h3>
                {resource.changelog && Array.isArray(resource.changelog) && resource.changelog.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {resource.changelog.map((entry, idx) => (
                      <div
                        key={idx}
                        style={{
                          borderLeft: '2px solid #8b5cf6',
                          paddingLeft: '16px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <span style={{ fontWeight: '700', color: '#c084fc', fontSize: '1rem' }}>
                            {entry.version}
                          </span>
                          <span style={{ color: '#64748b', fontSize: '0.8rem' }}>
                            {entry.date}
                          </span>
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '18px', color: '#cbd5e1', fontSize: '0.9rem' }}>
                          {(entry.notes || []).map((note, nIdx) => (
                            <li key={nIdx} style={{ marginBottom: '4px' }}>
                              {note}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#94a3b8' }}>Initial public version.</p>
                )}
              </div>
            )}

            {activeTab === 'screenshots' && (
              <div
                style={{
                  backgroundColor: '#0c0e15',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '16px',
                  padding: '32px',
                  marginBottom: '32px',
                }}
              >
                <h3 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '20px' }}>
                  Visual Previews
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  {(resource.screenshots || [resource.thumbnail_url]).map((imgUrl, idx) => (
                    <img
                      key={idx}
                      src={imgUrl}
                      alt={`Screenshot ${idx + 1}`}
                      style={{
                        width: '100%',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* COMMENTS SECTION */}
            <div
              style={{
                backgroundColor: '#0c0e15',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '32px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '24px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <MessageSquare size={20} style={{ color: '#8b5cf6' }} />
                  <h3 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: '800' }}>
                    Community Discussion ({comments.length})
                  </h3>
                </div>
              </div>

              {/* Add Comment Form */}
              <form
                onSubmit={handleCommentSubmit}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '32px',
                }}
              >
                <div style={{ marginBottom: '14px' }}>
                  <input
                    type="text"
                    placeholder="Your username or alias (e.g. ShadowPvP)"
                    value={commentName}
                    onChange={(e) => setCommentName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      color: '#fff',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <textarea
                    placeholder="Leave a comment, review, feature feedback, or report..."
                    rows={3}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      color: '#fff',
                      fontSize: '0.9rem',
                      lineHeight: '1.5',
                      outline: 'none',
                      resize: 'vertical',
                    }}
                  />
                </div>

                {commentError && (
                  <div
                    style={{
                      color: '#ef4444',
                      fontSize: '0.82rem',
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <AlertCircle size={14} />
                    {commentError}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="submit"
                    disabled={submittingComment || !commentText.trim()}
                    className="syn-btn syn-btn-primary"
                    style={{
                      padding: '8px 20px',
                      fontSize: '0.86rem',
                    }}
                  >
                    <Send size={14} />
                    <span>{submittingComment ? 'Posting...' : 'Post Comment'}</span>
                  </button>
                </div>
              </form>

              {/* Comments List */}
              {comments.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {comments.map((comment) => (
                    <div
                      key={comment.id}
                      style={{
                        padding: '16px 20px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '10px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img
                            src={comment.author_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                            alt={comment.author_name}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                            }}
                          />
                          <span style={{ fontWeight: '700', color: '#fff', fontSize: '0.88rem' }}>
                            {comment.author_name}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {comment.created_at ? new Date(comment.created_at).toLocaleDateString() : 'Just now'}
                          </span>
                        </div>

                        {/* Comment Like Button */}
                        <button
                          onClick={() => handleCommentLike(comment.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: 'none',
                            border: 'none',
                            color: '#94a3b8',
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                          }}
                        >
                          <ThumbsUp size={13} />
                          <span>{comment.likes_count || 0}</span>
                        </button>
                      </div>

                      <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.5', margin: 0 }}>
                        {comment.content}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#64748b', fontSize: '0.9rem' }}>
                  No comments yet. Be the first to share your thoughts on this resource!
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Resource Metadata Sidebar */}
          <div>
            <div
              style={{
                backgroundColor: '#0c0e15',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '24px',
                position: 'sticky',
                top: '90px',
              }}
            >
              <h3 style={{ color: '#fff', fontSize: '1.05rem', fontWeight: '800', marginBottom: '20px' }}>
                Resource Properties
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.86rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '10px' }}>
                  <span style={{ color: '#64748b' }}>Category</span>
                  <span style={{ color: '#fff', fontWeight: '600' }}>{resource.category}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '10px' }}>
                  <span style={{ color: '#64748b' }}>Minecraft Version</span>
                  <span style={{ color: '#fff', fontWeight: '600' }}>{resource.version}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '10px' }}>
                  <span style={{ color: '#64748b' }}>Loader Engine</span>
                  <span style={{ color: '#fff', fontWeight: '600' }}>{resource.loader}</span>
                </div>

                {resource.client_file_name && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '10px' }}>
                    <span style={{ color: '#64748b' }}>Binary File</span>
                    <span style={{ color: '#c084fc', fontFamily: 'monospace' }}>{resource.client_file_name}</span>
                  </div>
                )}

                {resource.source_file_name && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '10px' }}>
                    <span style={{ color: '#64748b' }}>Source Archive</span>
                    <span style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{resource.source_file_name}</span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '10px' }}>
                  <span style={{ color: '#64748b' }}>Security Check</span>
                  <span style={{ color: '#10b981', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ShieldCheck size={14} /> Clean / Scanned
                  </span>
                </div>
              </div>

              {/* Tags Section */}
              {resource.tags && resource.tags.length > 0 && (
                <div style={{ marginTop: '24px' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '10px', fontWeight: '700' }}>
                    Tags
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {resource.tags.map((t, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: '0.74rem',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(255, 255, 255, 0.04)',
                          color: '#94a3b8',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Links */}
              <div style={{ marginTop: '28px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {resource.website_url && (
                  <a
                    href={resource.website_url}
                    target="_blank"
                    rel="noreferrer"
                    className="syn-btn syn-btn-secondary"
                    style={{ width: '100%', fontSize: '0.84rem' }}
                  >
                    <ExternalLink size={14} />
                    Official Website
                  </a>
                )}
                {resource.discord_url && (
                  <a
                    href={resource.discord_url}
                    target="_blank"
                    rel="noreferrer"
                    className="syn-btn syn-btn-secondary"
                    style={{ width: '100%', fontSize: '0.84rem' }}
                  >
                    <MessageSquare size={14} />
                    Support Discord
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Responsive layout styles */}
      <style>{`
        @media (max-width: 900px) {
          .detail-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
