import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Trash2,
  Star,
  CheckCircle2,
  AlertCircle,
  Eye,
  Download,
  MessageSquare,
  RefreshCw,
  Plus,
  ExternalLink,
  Layers
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function AdminPage() {
  const [resources, setResources] = useState([]);
  const [comments, setComments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('resources'); // 'resources' | 'comments'
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadAdminData = async () => {
    try {
      setLoading(true);
      setMessage('');
      setError('');

      // 1. Stats
      try {
        const statsRes = await fetch('/api/syndicate/stats');
        if (statsRes.ok) {
          const s = await statsRes.json();
          setStats(s);
        }
      } catch (_e) {}

      // 2. Resources
      const { data: resData, error: resErr } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false });

      if (resErr) throw resErr;
      setResources(resData || []);

      // 3. Comments
      const { data: comData, error: comErr } = await supabase
        .from('comments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (comErr) throw comErr;
      setComments(comData || []);
    } catch (err) {
      setError(err.message || 'Failed to load administration data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleToggleFeatured = async (resource) => {
    try {
      const updated = !resource.is_featured;
      const { error: updateErr } = await supabase
        .from('resources')
        .update({ is_featured: updated })
        .eq('id', resource.id);

      if (updateErr) throw updateErr;

      setResources((prev) =>
        prev.map((r) => (r.id === resource.id ? { ...r, is_featured: updated } : r))
      );
      setMessage(`Updated "${resource.title}" featured status.`);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteResource = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      const res = await fetch(`/api/resources/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Delete failed');
      }

      setResources((prev) => prev.filter((r) => r.id !== id));
      setMessage(`Deleted "${title}".`);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteComment = async (id) => {
    if (!window.confirm('Delete this comment?')) return;

    try {
      const res = await fetch(`/api/comments/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Delete failed');
      }

      setComments((prev) => prev.filter((c) => c.id !== id));
      setMessage('Comment removed.');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: '40px 24px 80px 24px' }}>
      <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#38bdf8', marginBottom: '8px' }}>
              <ShieldCheck size={16} />
              <span style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Admin Portal
              </span>
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: '800', color: '#fff', marginBottom: '6px' }}>
              Syndicate Archive Administration
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
              Manage resources, moderate community comments, and review platform metrics.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={loadAdminData}
              className="syn-btn syn-btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              <RefreshCw size={14} />
              Refresh
            </button>
            <Link
              to="/upload"
              className="syn-btn syn-btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              <Plus size={14} />
              New Resource
            </Link>
          </div>
        </div>

        {/* Notifications */}
        {message && (
          <div
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '8px',
              padding: '12px 16px',
              color: '#34d399',
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '20px',
            }}
          >
            <CheckCircle2 size={16} />
            {message}
          </div>
        )}

        {error && (
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '12px 16px',
              color: '#f87171',
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '20px',
            }}
          >
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Admin Stats Grid */}
        {stats && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              marginBottom: '32px',
            }}
          >
            <div
              style={{
                backgroundColor: '#0c0e15',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '20px',
              }}
            >
              <div style={{ color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '6px' }}>
                Total Resources
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#fff' }}>
                {stats.totalResources}
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#0c0e15',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '20px',
              }}
            >
              <div style={{ color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '6px' }}>
                Total Downloads
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#38bdf8' }}>
                {Number(stats.totalDownloads || 0).toLocaleString()}
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#0c0e15',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '20px',
              }}
            >
              <div style={{ color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '6px' }}>
                Total Comments
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#c084fc' }}>
                {stats.totalComments}
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#0c0e15',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '20px',
              }}
            >
              <div style={{ color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '6px' }}>
                Admin Owner
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#10b981', marginTop: '6px' }}>
                adigod2014@gmail.com
              </div>
            </div>
          </div>
        )}

        {/* Tab Selection */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            marginBottom: '24px',
            gap: '8px',
          }}
        >
          <button
            onClick={() => setActiveTab('resources')}
            style={{
              padding: '12px 20px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'resources' ? '2px solid #8b5cf6' : '2px solid transparent',
              color: activeTab === 'resources' ? '#fff' : '#94a3b8',
              fontWeight: activeTab === 'resources' ? '700' : '500',
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Layers size={16} />
            Resources ({resources.length})
          </button>

          <button
            onClick={() => setActiveTab('comments')}
            style={{
              padding: '12px 20px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'comments' ? '2px solid #8b5cf6' : '2px solid transparent',
              color: activeTab === 'comments' ? '#fff' : '#94a3b8',
              fontWeight: activeTab === 'comments' ? '700' : '500',
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <MessageSquare size={16} />
            Comments ({comments.length})
          </button>
        </div>

        {/* Tab Content: Resources Table */}
        {activeTab === 'resources' && (
          <div
            style={{
              backgroundColor: '#0c0e15',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              overflowX: 'auto',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#64748b' }}>
                  <th style={{ padding: '14px 20px' }}>Resource Title</th>
                  <th style={{ padding: '14px 16px' }}>Category</th>
                  <th style={{ padding: '14px 16px' }}>Version</th>
                  <th style={{ padding: '14px 16px' }}>Loader</th>
                  <th style={{ padding: '14px 16px' }}>Downloads</th>
                  <th style={{ padding: '14px 16px' }}>Featured</th>
                  <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {resources.map((res) => (
                  <tr
                    key={res.id}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '14px 20px' }}>
                      <Link
                        to={`/resource/${res.slug || res.id}`}
                        style={{ color: '#fff', fontWeight: '600', textDecoration: 'none' }}
                      >
                        {res.title}
                      </Link>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#c084fc' }}>{res.category}</td>
                    <td style={{ padding: '14px 16px', color: '#94a3b8' }}>{res.version}</td>
                    <td style={{ padding: '14px 16px', color: '#94a3b8' }}>{res.loader}</td>
                    <td style={{ padding: '14px 16px', color: '#38bdf8' }}>{res.downloads_count || 0}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <button
                        onClick={() => handleToggleFeatured(res)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: res.is_featured ? '#eab308' : '#64748b',
                        }}
                        title={res.is_featured ? 'Remove featured' : 'Make featured'}
                      >
                        <Star size={16} fill={res.is_featured ? '#eab308' : 'none'} />
                      </button>
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleDeleteResource(res.id, res.title)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '4px',
                        }}
                        title="Delete Resource"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab Content: Comments Moderation */}
        {activeTab === 'comments' && (
          <div
            style={{
              backgroundColor: '#0c0e15',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {comments.length > 0 ? (
              comments.map((c) => (
                <div
                  key={c.id}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ fontWeight: '700', color: '#fff', fontSize: '0.9rem' }}>
                        {c.author_name}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {c.created_at ? new Date(c.created_at).toLocaleString() : ''}
                      </span>
                    </div>
                    <p style={{ color: '#cbd5e1', fontSize: '0.88rem', margin: 0 }}>
                      {c.content}
                    </p>
                  </div>

                  <button
                    onClick={() => handleDeleteComment(c.id)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      color: '#f87171',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Trash2 size={13} />
                    Delete
                  </button>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                No comments to moderate.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
