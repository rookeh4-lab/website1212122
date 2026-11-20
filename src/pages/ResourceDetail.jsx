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
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, likes_count: (c.likes_count || 0) + 1 } : c))
    );
    try {
      const target = comments.find((c) => c.id === commentId);
      if (target) {
        await supabase
          .from('comments')
          .update({ likes_count: (target.likes_count || 0) + 1 })
          .eq('id', commentId);
      }
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
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
        Loading release details...
      </div>
    );
  }

  if (!resource) {
    return (
      <div style={{ minHeight: '80vh', padding: '60px 20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a', marginBottom: '12px' }}>
          Resource Not Found
        </h2>
        <p style={{ color: '#64748b', marginBottom: '20px' }}>
          This resource may have been removed or does not exist.
        </p>
        <button onClick={() => navigate('/')} className="btn-gold">
          Return to Archive
        </button>
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
              color: '#94a3b8',
              fontSize: '0.88rem',
              fontWeight: '500',
              textDecoration: 'none',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
          >
            <ArrowLeft size={15} />
            <span>All posts</span>
          </Link>
        </div>

        {/* Badges Row */}
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
            <div className="badge-hot-clean">
              <Flame size={13} />
              <span>Hot</span>
            </div>
          )}

          <div className="badge-tag-mc-clean">
            <span className="mc-dot-gold" />
            <span style={{ color: '#ffffff', fontWeight: '600' }}>Minecraft</span>
            <span style={{ color: '#94a3b8' }}>{resource.category || 'Client'}</span>
          </div>

          <div className="tag-pill-ver">
            {resource.version || '1.21.11'}
          </div>

          <div className="badge-verified-clean">
            <CheckCircle size={13} />
            <span>Verified</span>
          </div>

          <div
            style={{
              fontSize: '0.74rem',
              fontWeight: '600',
              padding: '3px 10px',
              borderRadius: '9999px',
              backgroundColor: '#111e30',
              color: '#38bdf8',
              border: '1px solid #1e3352',
            }}
          >
            {resource.loader || 'Native C++'}
          </div>
        </div>

        {/* Title */}
        <h1
          className="font-clean-title"
          style={{
            fontSize: '1.9rem',
            fontWeight: '700',
            color: '#ffffff',
            lineHeight: '1.25',
            marginBottom: '16px',
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
            borderBottom: '1px solid #1e293b',
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
                border: '1px solid #1e293b',
              }}
            />
            <span style={{ fontWeight: '600', color: '#ffffff', fontSize: '0.92rem' }}>
              {resource.author_name || 'Syndicate'}
            </span>
            <span style={{ color: '#94a3b8', fontSize: '0.84rem' }}>
              {resource.created_at ? new Date(resource.created_at).toLocaleDateString() : '3d ago'}
            </span>
            <span style={{ color: '#334155' }}>•</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#94a3b8', fontSize: '0.84rem' }}>
              <Eye size={14} />
              <span>{Number(resource.views_count || 0).toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#94a3b8', fontSize: '0.84rem' }}>
              <Download size={14} />
              <span>{Number(resource.downloads_count || 0).toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#94a3b8', fontSize: '0.84rem' }}>
              <MessageSquare size={14} />
              <span>{comments.length}</span>
            </div>
          </div>

          {/* Upvote Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#0d1527',
                border: '1px solid #1e293b',
                borderRadius: '9999px',
                padding: '5px 14px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <button
                onClick={handleUpvote}
                style={{
                  background: 'none',
                  border: 'none',
                  color: hasUpvoted ? '#ea580c' : '#94a3b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Upvote"
              >
                <ChevronUp size={16} />
              </button>
              <span style={{ fontWeight: '700', color: hasUpvoted ? '#ea580c' : '#ffffff', fontSize: '0.88rem' }}>
                {upvotes}
              </span>
              <button
                onClick={() => {}}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#475569',
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
              className="filter-dropdown-pill"
              style={{ padding: '6px 14px', fontSize: '0.8rem', height: 'auto' }}
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
                gap: '6px',
                padding: '5px 12px',
                borderRadius: '9999px',
                border: '1px solid',
                borderColor: userReactions[item.key] ? '#38bdf8' : '#1e293b',
                backgroundColor: userReactions[item.key] ? '#162442' : '#0d1527',
                color: '#ffffff',
                fontSize: '0.82rem',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{item.emoji}</span>
              <span style={{ color: userReactions[item.key] ? '#38bdf8' : '#94a3b8' }}>{item.count}</span>
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
                  backgroundColor: '#111827',
                  color: '#94a3b8',
                  border: '1px solid #1e293b',
                  fontFamily: "ui-monospace, monospace",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* FILES CONTAINER */}
        <div
          style={{
            backgroundColor: '#0e1526',
            border: '1px solid #1a2438',
            boxShadow: 'var(--shadow-card)',
            borderRadius: '14px',
            padding: '24px 28px',
            marginBottom: '32px',
          }}
        >
          <div style={{ fontSize: '1rem', fontWeight: '700', color: '#ffffff', marginBottom: '18px' }}>
            Download Files
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* File 1: Client Binary */}
            {resource.client_download_url && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '14px',
                  padding: '14px 18px',
                  borderRadius: '10px',
                  backgroundColor: '#090e1a',
                  border: '1px solid #1e293b',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      backgroundColor: '#111e30',
                      border: '1px solid #1e3352',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#38bdf8',
                    }}
                  >
                    <FileCode size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', color: '#ffffff', fontSize: '0.92rem', fontFamily: 'monospace' }}>
                      {resource.client_file_name || 'Client-Release.dll'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                      {resource.client_file_size || '3.4 MB'} • {resource.downloads_count || 1420} downloads
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDownload('client')}
                  disabled={downloadingClient}
                  className="btn-gold"
                  style={{ padding: '8px 22px', fontSize: '0.86rem' }}
                >
                  <Download size={15} />
                  <span>{downloadingClient ? 'Downloading...' : 'Download Client'}</span>
                </button>
              </div>
            )}

            {/* File 2: Source Code */}
            {resource.source_download_url && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '14px',
                  padding: '14px 18px',
                  borderRadius: '10px',
                  backgroundColor: '#090e1a',
                  border: '1px solid #1e293b',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#10b981',
                    }}
                  >
                    <Code2 size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', color: '#ffffff', fontSize: '0.92rem', fontFamily: 'monospace' }}>
                      {resource.source_file_name || 'source-code.zip'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                      {resource.source_file_size || '1.8 MB'} • Source Archive
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDownload('source')}
                  disabled={downloadingSource}
                  className="filter-dropdown-pill"
                  style={{ padding: '8px 22px', fontSize: '0.86rem', height: 'auto' }}
                >
                  <Download size={15} />
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
                  borderRadius: '10px',
                  backgroundColor: '#090e1a',
                  border: '1px solid #1e293b',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <GithubIcon size={18} style={{ color: '#ffffff' }} />
                  <span style={{ fontSize: '0.86rem', color: '#cbd5e1', fontWeight: '500' }}>
                    Official Git Repository
                  </span>
                </div>

                <a
                  href={resource.github_url}
                  target="_blank"
                  rel="noreferrer"
                  className="filter-dropdown-pill"
                  style={{ padding: '6px 14px', fontSize: '0.8rem', height: 'auto', textDecoration: 'none' }}
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
            backgroundColor: '#0e1526',
            border: '1px solid #1a2438',
            boxShadow: 'var(--shadow-card)',
            borderRadius: '14px',
            padding: '30px',
            marginBottom: '32px',
          }}
        >
          <div
            style={{
              fontSize: '0.96rem',
              lineHeight: '1.7',
              color: '#cbd5e1',
              whiteSpace: 'pre-wrap',
            }}
          >
            {resource.content || resource.description}
          </div>
        </div>

        {/* COMMUNITY COMMENTS SECTION */}
        <div
          style={{
            backgroundColor: '#0e1526',
            border: '1px solid #1a2438',
            boxShadow: 'var(--shadow-card)',
            borderRadius: '14px',
            padding: '30px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
            <MessageSquare size={19} style={{ color: '#38bdf8' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#ffffff' }}>
              Discussion ({comments.length})
            </h3>
          </div>

          {/* Add Comment Form */}
          <form
            onSubmit={handleCommentSubmit}
            style={{
              backgroundColor: '#090e1a',
              border: '1px solid #1e293b',
              borderRadius: '10px',
              padding: '18px',
              marginBottom: '28px',
            }}
          >
            <div style={{ marginBottom: '12px' }}>
              <input
                type="text"
                placeholder="Your username or alias"
                value={commentName}
                onChange={(e) => setCommentName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #1e293b',
                  backgroundColor: '#0d1527',
                  color: '#ffffff',
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
                  border: '1px solid #1e293b',
                  backgroundColor: '#0d1527',
                  color: '#ffffff',
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
                className="btn-gold"
                style={{ padding: '8px 20px', fontSize: '0.84rem' }}
              >
                <Send size={14} />
                <span>{submittingComment ? 'Posting...' : 'Post Comment'}</span>
              </button>
            </div>
          </form>

          {/* Comments List */}
          {comments.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  style={{
                    padding: '16px 20px',
                    borderRadius: '10px',
                    backgroundColor: '#090e1a',
                    border: '1px solid #1e293b',
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
                      <span style={{ fontWeight: '600', color: '#ffffff', fontSize: '0.88rem' }}>
                        {comment.author_name}
                      </span>
                      <span
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: '700',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(56, 189, 248, 0.1)',
                          color: '#38bdf8',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                          textTransform: 'uppercase',
                        }}
                      >
                        Verified
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
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
              No comments yet. Be the first to share your feedback!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
