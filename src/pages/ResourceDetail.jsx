import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Download,
  Eye,
  MessageSquare,
  ArrowLeft,
  Flame,
  CheckCircle,
  ChevronUp,
  ChevronDown,
  FileCode,
  Code2,
  ExternalLink,
  Send,
  ThumbsUp,
  Sparkles,
  Share2,
  Check
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import GithubIcon from '../components/GithubIcon';

export default function ResourceDetail() {
  const { idOrSlug } = useParams();
  const navigate = useNavigate();

  const [resource, setResource] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Upvote state
  const [upvotes, setUpvotes] = useState(0);
  const [hasUpvoted, setHasUpvoted] = useState(false);

  // Reaction state
  const [reactions, setReactions] = useState({
    fire: 24,
    bolt: 18,
    skull: 4,
    diamond: 12,
  });
  const [userReactions, setUserReactions] = useState({});

  // Download & Share states
  const [downloadingClient, setDownloadingClient] = useState(false);
  const [downloadingSource, setDownloadingSource] = useState(false);
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

        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
        let query = supabase.from('resources').select('*');
        if (isUuid) query = query.eq('id', idOrSlug);
        else query = query.eq('slug', idOrSlug);

        const { data, error } = await query.maybeSingle();

        if (data) {
          setResource(data);
          setUpvotes(data.likes_count || 0);
          loadComments(data.id);

          // Increment view count
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

  // Load comments
  const loadComments = async (resourceId) => {
    try {
      const { data } = await supabase
        .from('comments')
        .select('*')
        .eq('resource_id', resourceId)
        .order('created_at', { ascending: false });

      if (data) setComments(data);
    } catch (err) {
      console.error('Error fetching comments:', err);
    }
  };

  // Upvote Click
  const handleUpvote = async () => {
    if (!resource || hasUpvoted) return;
    const newCount = upvotes + 1;
    setUpvotes(newCount);
    setHasUpvoted(true);

    try {
      await supabase
        .from('resources')
        .update({ likes_count: newCount })
        .eq('id', resource.id);
    } catch (_e) {}
  };

  // Toggle Reaction
  const handleReaction = (key) => {
    const isSelected = userReactions[key];
    setUserReactions((prev) => ({ ...prev, [key]: !isSelected }));
    setReactions((prev) => ({
      ...prev,
      [key]: isSelected ? prev[key] - 1 : prev[key] + 1,
    }));
  };

  // Handle Download Click
  const handleDownload = async (type) => {
    if (!resource) return;
    const isSource = type === 'source';
    if (isSource) setDownloadingSource(true);
    else setDownloadingClient(true);

    const targetUrl = isSource ? resource.source_download_url : resource.client_download_url;

    try {
      const newDownloads = (resource.downloads_count || 0) + 1;
      await supabase
        .from('resources')
        .update({ downloads_count: newDownloads })
        .eq('id', resource.id);
      setResource((prev) => ({ ...prev, downloads_count: newDownloads }));
    } catch (_e) {}

    if (targetUrl) {
      window.open(targetUrl, '_blank');
    }

    if (isSource) setDownloadingSource(false);
    else setDownloadingClient(false);
  };

  // Handle Comment Submit
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

      const newComment = {
        resource_id: resource.id,
        author_id: `usr_${Date.now().toString(36)}`,
        author_name: commentName.trim() || 'Anonymous User',
        author_avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        content: commentText.trim(),
        likes_count: 0,
      };

      const { data, error } = await supabase
        .from('comments')
        .insert(newComment)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setComments((prev) => [data, ...prev]);
        setCommentText('');
      }
    } catch (err) {
      setCommentError(err.message || 'Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Handle Comment Like
  const handleCommentLike = async (commentId) => {
    try {
      const target = comments.find((c) => c.id === commentId);
      const newLikes = (target?.likes_count || 0) + 1;
      await supabase.from('comments').update({ likes_count: newLikes }).eq('id', commentId);
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, likes_count: newLikes } : c))
      );
    } catch (_e) {}
  };

  // Copy share link
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
        Loading release details...
      </div>
    );
  }

  if (!resource) {
    return (
      <div style={{ minHeight: '70vh', padding: '80px 20px', textAlign: 'center' }}>
        <h2 style={{ color: '#fff', fontSize: '1.8rem', marginBottom: '12px' }}>Release Not Found</h2>
        <p style={{ color: '#9ca3af', marginBottom: '24px' }}>
          This release does not exist or has been removed from the Syndicate archive.
        </p>
        <Link to="/" className="gta-pill-btn gta-pill-btn-primary">
          Back to Releases
        </Link>
      </div>
    );
  }

  const isHot = resource.is_featured || (resource.downloads_count && resource.downloads_count > 1000);

  return (
    <div style={{ minHeight: '100vh', padding: '30px 20px 80px 20px' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        {/* Back Link Breadcrumb */}
        <div style={{ marginBottom: '24px' }}>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: '#9ca3af',
              fontSize: '0.88rem',
              fontWeight: '600',
              textDecoration: 'none',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ff2a85')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#9ca3af')}
          >
            <ArrowLeft size={15} />
            <span>All posts</span>
          </Link>
        </div>

        {/* Badges Row (XenntSquad Format) */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px',
          }}
        >
          {isHot && (
            <div className="badge-hot">
              <Flame size={13} />
              <span>Hot</span>
            </div>
          )}

          <div className="badge-tag-dark">
            <span className="dot-indicator" />
            <span style={{ color: '#fff', fontWeight: '700' }}>Minecraft</span>
            <span style={{ color: '#9ca3af' }}>{resource.category || 'Client'}</span>
          </div>

          <div
            style={{
              fontSize: '0.74rem',
              fontWeight: '700',
              padding: '3px 10px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(0, 240, 255, 0.1)',
              color: '#00f0ff',
              border: '1px solid rgba(0, 240, 255, 0.3)',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {resource.version || '1.21.11'}
          </div>

          <div className="badge-verified">
            <CheckCircle size={13} />
            <span>Verified</span>
          </div>

          <div
            style={{
              fontSize: '0.74rem',
              fontWeight: '600',
              padding: '3px 10px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: '#cbd5e1',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            {resource.loader || 'Native C++'}
          </div>
        </div>

        {/* Large Elegant Display Title */}
        <h1
          className="font-serif-title"
          style={{
            fontSize: 'clamp(2.4rem, 5vw, 3.6rem)',
            fontWeight: '700',
            color: '#ffffff',
            lineHeight: '1.18',
            marginBottom: '18px',
          }}
        >
          {resource.title}
        </h1>

        {/* Author Metadata & Metrics Bar */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            paddingBottom: '20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            marginBottom: '20px',
          }}
        >
          {/* Author info + timestamps + stats */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <img
              src={resource.author_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
              alt={resource.author_name}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            />
            <span style={{ fontWeight: '700', color: '#fff', fontSize: '0.92rem' }}>
              {resource.author_name || 'Syndicate'}
            </span>
            <span style={{ color: '#6b7280', fontSize: '0.84rem' }}>
              {resource.created_at ? new Date(resource.created_at).toLocaleDateString() : '3d ago'}
            </span>
            <span style={{ color: '#4b5563' }}>•</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#9ca3af', fontSize: '0.84rem' }}>
              <Eye size={14} style={{ color: '#ff2a85' }} />
              <span>{Number(resource.views_count || 0).toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#9ca3af', fontSize: '0.84rem' }}>
              <Download size={14} style={{ color: '#00f0ff' }} />
              <span>{Number(resource.downloads_count || 0).toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#9ca3af', fontSize: '0.84rem' }}>
              <MessageSquare size={14} style={{ color: '#ff7a00' }} />
              <span>{comments.length}</span>
            </div>
          </div>

          {/* Upvote Pill (XenntSquad ▲ 2 ▼) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '9999px',
                padding: '5px 14px',
              }}
            >
              <button
                onClick={handleUpvote}
                style={{
                  background: 'none',
                  border: 'none',
                  color: hasUpvoted ? '#ff7a00' : '#9ca3af',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Upvote"
              >
                <ChevronUp size={16} />
              </button>
              <span style={{ fontWeight: '800', color: hasUpvoted ? '#ff7a00' : '#fff', fontSize: '0.88rem' }}>
                {upvotes}
              </span>
              <button
                onClick={() => {}}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6b7280',
                  cursor: 'default',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <ChevronDown size={16} />
              </button>
            </div>

            <button
              onClick={handleShare}
              className="gta-pill-btn gta-pill-btn-secondary"
              style={{ padding: '6px 14px', fontSize: '0.8rem' }}
            >
              {copiedLink ? <Check size={13} style={{ color: '#10b981' }} /> : <Share2 size={13} />}
              <span>{copiedLink ? 'Copied' : 'Share'}</span>
            </button>
          </div>
        </div>

        {/* Reaction Emoji Pills Row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
          {[
            { key: 'fire', emoji: '🔥', count: reactions.fire },
            { key: 'bolt', emoji: '⚡', count: reactions.bolt },
            { key: 'skull', emoji: '💀', count: reactions.skull },
            { key: 'diamond', emoji: '💎', count: reactions.diamond },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => handleReaction(item.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 12px',
                borderRadius: '9999px',
                border: '1px solid',
                borderColor: userReactions[item.key] ? 'rgba(255, 42, 133, 0.6)' : 'rgba(255, 255, 255, 0.08)',
                backgroundColor: userReactions[item.key] ? 'rgba(255, 42, 133, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                color: '#fff',
                fontSize: '0.82rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{item.emoji}</span>
              <span style={{ color: userReactions[item.key] ? '#ff2a85' : '#9ca3af' }}>{item.count}</span>
            </button>
          ))}
        </div>

        {/* Tags Row */}
        {resource.tags && resource.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '28px' }}>
            {resource.tags.map((tag, idx) => (
              <span
                key={idx}
                style={{
                  fontSize: '0.74rem',
                  padding: '3px 9px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  color: '#9ca3af',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* FILES CONTAINER (XenntSquad Files Box) */}
        <div
          style={{
            backgroundColor: 'rgba(18, 15, 27, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.09)',
            boxShadow: '0 12px 30px -10px rgba(0, 0, 0, 0.6)',
            borderRadius: '16px',
            padding: '24px 28px',
            marginBottom: '32px',
          }}
        >
          <div style={{ fontSize: '1rem', fontWeight: '800', color: '#fff', marginBottom: '18px' }}>
            Files <span style={{ color: '#ff2a85' }}>2</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* File 1: Client Binary (.jar / .dll) */}
            {resource.client_download_url && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '14px',
                  padding: '14px 18px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(255, 42, 133, 0.12)',
                      border: '1px solid rgba(255, 42, 133, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ff2a85',
                    }}
                  >
                    <FileCode size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: '700', color: '#fff', fontSize: '0.92rem', fontFamily: 'monospace' }}>
                      {resource.client_file_name || 'Client-Release.dll'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                      {resource.client_file_size || '3.4 MB'} • {resource.downloads_count || 1420} downloads
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDownload('client')}
                  disabled={downloadingClient}
                  className="gta-pill-btn gta-pill-btn-primary"
                  style={{ padding: '8px 22px', fontSize: '0.86rem' }}
                >
                  <Download size={15} />
                  <span>{downloadingClient ? 'Downloading...' : 'Download Client'}</span>
                </button>
              </div>
            )}

            {/* File 2: Source Code (.zip) */}
            {resource.source_download_url && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '14px',
                  padding: '14px 18px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(0, 240, 255, 0.12)',
                      border: '1px solid rgba(0, 240, 255, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#00f0ff',
                    }}
                  >
                    <Code2 size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: '700', color: '#fff', fontSize: '0.92rem', fontFamily: 'monospace' }}>
                      {resource.source_file_name || 'source-code.zip'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                      {resource.source_file_size || '1.8 MB'} • Source Archive
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDownload('source')}
                  disabled={downloadingSource}
                  className="gta-pill-btn gta-pill-btn-secondary"
                  style={{ padding: '8px 22px', fontSize: '0.86rem' }}
                >
                  <Download size={15} style={{ color: '#00f0ff' }} />
                  <span>{downloadingSource ? 'Preparing...' : 'Download Source'}</span>
                </button>
              </div>
            )}

            {/* External GitHub link */}
            {resource.github_url && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 18px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <GithubIcon size={18} style={{ color: '#9ca3af' }} />
                  <span style={{ fontSize: '0.86rem', color: '#e5e7eb', fontWeight: '500' }}>
                    Official Git Repository
                  </span>
                </div>

                <a
                  href={resource.github_url}
                  target="_blank"
                  rel="noreferrer"
                  className="gta-pill-btn gta-pill-btn-secondary"
                  style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                >
                  <span>Open GitHub</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Content Body / Description */}
        <div
          style={{
            backgroundColor: 'rgba(18, 15, 27, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '32px',
            marginBottom: '32px',
          }}
        >
          <div
            style={{
              fontSize: '0.98rem',
              lineHeight: '1.7',
              color: '#d1d5db',
              whiteSpace: 'pre-wrap',
            }}
          >
            {resource.content || resource.description}
          </div>
        </div>

        {/* COMMUNITY COMMENTS SECTION (Threaded XenntSquad Layout) */}
        <div
          style={{
            backgroundColor: 'rgba(18, 15, 27, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '32px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
            <MessageSquare size={20} style={{ color: '#ff2a85' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#fff' }}>
              Discussion ({comments.length})
            </h3>
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
            <div style={{ marginBottom: '12px' }}>
              <input
                type="text"
                placeholder="Your username or alias (e.g. ViceCityPro)"
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

            <div style={{ marginBottom: '12px' }}>
              <textarea
                placeholder="Leave a comment, feedback or review..."
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
              <div style={{ color: '#f87171', fontSize: '0.82rem', marginBottom: '12px' }}>
                {commentError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={submittingComment || !commentText.trim()}
                className="gta-pill-btn gta-pill-btn-primary"
                style={{ padding: '8px 20px', fontSize: '0.84rem' }}
              >
                <Send size={14} />
                <span>{submittingComment ? 'Posting...' : 'Post Comment'}</span>
              </button>
            </div>
          </form>

          {/* Comments List */}
          {comments.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  style={{
                    padding: '16px 20px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img
                        src={comment.author_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                        alt={comment.author_name}
                        style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <span style={{ fontWeight: '700', color: '#fff', fontSize: '0.88rem' }}>
                        {comment.author_name}
                      </span>
                      <span
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: '800',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(255, 42, 133, 0.15)',
                          color: '#ff2a85',
                          border: '1px solid rgba(255, 42, 133, 0.3)',
                          textTransform: 'uppercase',
                        }}
                      >
                        Verified Member
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {comment.created_at ? new Date(comment.created_at).toLocaleDateString() : 'Just now'}
                      </span>
                    </div>

                    <button
                      onClick={() => handleCommentLike(comment.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: 'none',
                        border: 'none',
                        color: '#9ca3af',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                      }}
                    >
                      <ThumbsUp size={13} />
                      <span>{comment.likes_count || 0}</span>
                    </button>
                  </div>

                  <p style={{ color: '#d1d5db', fontSize: '0.9rem', lineHeight: '1.5', margin: 0 }}>
                    {comment.content}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#6b7280', fontSize: '0.9rem' }}>
              No comments yet. Be the first to share your feedback!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
