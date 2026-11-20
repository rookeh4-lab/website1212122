import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  Code2,
  FileCode,
  Sparkles,
  Check,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function UploadPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    category: 'Clients',
    version: '1.21.11',
    loader: 'C++ / Native',
    type: 'Client',
    description: '',
    content: '',
    author_name: '',
    author_avatar: '',
    client_download_url: '',
    client_file_name: '',
    client_file_size: '',
    source_download_url: '',
    source_file_name: '',
    source_file_size: '',
    github_url: '',
    discord_url: '',
    website_url: '',
    tags: '1.21.11, C++, MinHook, Ghost',
    thumbnail_url: '',
    changelog_version: 'v1.0.0',
    changelog_notes: 'Initial public release',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.title.trim()) {
      setError('Please provide a title for the resource.');
      return;
    }

    if (!formData.description.trim() || formData.description.length < 10) {
      setError('Please provide a description (at least 10 characters).');
      return;
    }

    if (!formData.client_download_url.trim() && !formData.source_download_url.trim()) {
      setError('You must provide at least one download URL (Client Binary or Source Code).');
      return;
    }

    try {
      setLoading(true);

      const parsedTags = formData.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const payload = {
        title: formData.title.trim(),
        category: formData.category,
        version: formData.version,
        loader: formData.loader,
        type: formData.type,
        description: formData.description.trim(),
        content: formData.content.trim() || formData.description.trim(),
        author_name: formData.author_name.trim() || 'Community Member',
        author_avatar: formData.author_avatar.trim() || undefined,
        client_download_url: formData.client_download_url.trim(),
        client_file_name: formData.client_file_name.trim(),
        client_file_size: formData.client_file_size.trim(),
        source_download_url: formData.source_download_url.trim(),
        source_file_name: formData.source_file_name.trim(),
        source_file_size: formData.source_file_size.trim(),
        github_url: formData.github_url.trim(),
        discord_url: formData.discord_url.trim(),
        website_url: formData.website_url.trim(),
        thumbnail_url: formData.thumbnail_url.trim() || undefined,
        tags: parsedTags,
        changelog: [
          {
            version: formData.changelog_version.trim() || 'v1.0.0',
            date: new Date().toISOString().split('T')[0],
            notes: formData.changelog_notes
              .split('\n')
              .map((n) => n.trim())
              .filter(Boolean),
          },
        ],
      };

      let createdResource = null;

      try {
        const res = await fetch('/api/resources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const data = await res.json();
          createdResource = data.resource;
        }
      } catch (_e) {
        // Fall back to direct Supabase
      }

      if (!createdResource) {
        const baseSlug = payload.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
        const slug = `${baseSlug}-${Date.now().toString(36)}`;

        const { data: dbData, error: dbErr } = await supabase
          .from('resources')
          .insert({
            ...payload,
            slug,
            author_id: `usr_${Date.now().toString(36)}`,
            author_avatar: payload.author_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
            thumbnail_url: payload.thumbnail_url || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800',
            banner_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1600',
            downloads_count: 0,
            likes_count: 0,
            views_count: 0,
            is_featured: false,
            is_approved: true,
          })
          .select()
          .single();

        if (dbErr) throw dbErr;
        createdResource = dbData;
      }

      if (createdResource) {
        navigate(`/resource/${createdResource.slug || createdResource.id}`);
      } else {
        navigate('/clients');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while uploading.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: '40px 24px 80px 24px' }}>
      <div style={{ maxWidth: '840px', margin: '0 auto' }}>
        {/* Page Header */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#c084fc', marginBottom: '8px' }}>
            <Upload size={16} />
            <span style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Publish Resource
            </span>
          </div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: '800', color: '#fff', marginBottom: '8px' }}>
            Contribute to Syndicate Archive
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
            Share your Minecraft clients, source codes, native C++ DLLs, or macro utilities with the Syndicate community.
          </p>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '14px 18px',
              color: '#f87171',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '24px',
            }}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Upload Form */}
        <form
          onSubmit={handleSubmit}
          style={{
            backgroundColor: '#0c0e15',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          {/* Title */}
          <div>
            <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.88rem', fontWeight: '600', marginBottom: '8px' }}>
              Resource Title *
            </label>
            <input
              type="text"
              name="title"
              placeholder="e.g. Syndicate v5.55 — Autonomous C++ Injectable Client"
              value={formData.title}
              onChange={handleChange}
              required
              className="syn-input"
              style={{ width: '100%' }}
            />
          </div>

          {/* Category, Version & Loader Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.88rem', fontWeight: '600', marginBottom: '8px' }}>
                Category *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="syn-input"
                style={{ width: '100%', cursor: 'pointer' }}
              >
                <option value="Clients">Clients</option>
                <option value="Source Codes">Source Codes</option>
                <option value="Tools">Tools</option>
                <option value="Macros">Macros</option>
                <option value="Launchers">Launchers</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.88rem', fontWeight: '600', marginBottom: '8px' }}>
                Minecraft Version *
              </label>
              <select
                name="version"
                value={formData.version}
                onChange={handleChange}
                className="syn-input"
                style={{ width: '100%', cursor: 'pointer' }}
              >
                <option value="1.21.11">1.21.11</option>
                <option value="1.21.4">1.21.4</option>
                <option value="1.20.4">1.20.4</option>
                <option value="1.20.1">1.20.1</option>
                <option value="1.19.4">1.19.4</option>
                <option value="1.8.9">1.8.9</option>
                <option value="All Versions">All Versions</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.88rem', fontWeight: '600', marginBottom: '8px' }}>
                Loader Engine *
              </label>
              <select
                name="loader"
                value={formData.loader}
                onChange={handleChange}
                className="syn-input"
                style={{ width: '100%', cursor: 'pointer' }}
              >
                <option value="C++ / Native">C++ / Native</option>
                <option value="Fabric">Fabric</option>
                <option value="Forge">Forge</option>
                <option value="NeoForge">NeoForge</option>
                <option value="Vanilla">Vanilla</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.88rem', fontWeight: '600', marginBottom: '8px' }}>
              Short Summary Description *
            </label>
            <input
              type="text"
              name="description"
              placeholder="A concise 1-2 sentence description shown in browse cards..."
              value={formData.description}
              onChange={handleChange}
              required
              className="syn-input"
              style={{ width: '100%' }}
            />
          </div>

          {/* Detailed Content */}
          <div>
            <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.88rem', fontWeight: '600', marginBottom: '8px' }}>
              Detailed Overview & Instructions (Markdown supported)
            </label>
            <textarea
              name="content"
              rows={6}
              placeholder="Provide module breakdown, installation instructions, keybinds, and compatibility notes..."
              value={formData.content}
              onChange={handleChange}
              className="syn-input"
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          {/* Dual Download URLs */}
          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '20px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#fff', marginBottom: '16px' }}>
              Distribution & Files
            </h3>

            {/* Client Binary */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.82rem', marginBottom: '6px' }}>
                  Client Binary URL (.jar, .dll, .exe)
                </label>
                <input
                  type="url"
                  name="client_download_url"
                  placeholder="https://.../client.dll"
                  value={formData.client_download_url}
                  onChange={handleChange}
                  className="syn-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.82rem', marginBottom: '6px' }}>
                  File Name
                </label>
                <input
                  type="text"
                  name="client_file_name"
                  placeholder="client.dll"
                  value={formData.client_file_name}
                  onChange={handleChange}
                  className="syn-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.82rem', marginBottom: '6px' }}>
                  File Size
                </label>
                <input
                  type="text"
                  name="client_file_size"
                  placeholder="3.4 MB"
                  value={formData.client_file_size}
                  onChange={handleChange}
                  className="syn-input"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* Source Code Archive */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.82rem', marginBottom: '6px' }}>
                  Source Code Archive URL (.zip, .tar.gz)
                </label>
                <input
                  type="url"
                  name="source_download_url"
                  placeholder="https://.../source.zip"
                  value={formData.source_download_url}
                  onChange={handleChange}
                  className="syn-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.82rem', marginBottom: '6px' }}>
                  Source File Name
                </label>
                <input
                  type="text"
                  name="source_file_name"
                  placeholder="source.zip"
                  value={formData.source_file_name}
                  onChange={handleChange}
                  className="syn-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.82rem', marginBottom: '6px' }}>
                  Source Size
                </label>
                <input
                  type="text"
                  name="source_file_size"
                  placeholder="1.2 MB"
                  value={formData.source_file_size}
                  onChange={handleChange}
                  className="syn-input"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>

          {/* Links & Metadata */}
          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '20px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#fff', marginBottom: '16px' }}>
              Links & Attribution
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.82rem', marginBottom: '6px' }}>
                  Author / Provider Name
                </label>
                <input
                  type="text"
                  name="author_name"
                  placeholder="Your handle or team name"
                  value={formData.author_name}
                  onChange={handleChange}
                  className="syn-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.82rem', marginBottom: '6px' }}>
                  GitHub Repository URL
                </label>
                <input
                  type="url"
                  name="github_url"
                  placeholder="https://github.com/..."
                  value={formData.github_url}
                  onChange={handleChange}
                  className="syn-input"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.82rem', marginBottom: '6px' }}>
                Tags (comma separated)
              </label>
              <input
                type="text"
                name="tags"
                placeholder="1.21.11, C++, MinHook, Ghost, AimAssist"
                value={formData.tags}
                onChange={handleChange}
                className="syn-input"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.82rem', marginBottom: '6px' }}>
                Thumbnail Image URL (optional)
              </label>
              <input
                type="url"
                name="thumbnail_url"
                placeholder="https://.../banner.png"
                value={formData.thumbnail_url}
                onChange={handleChange}
                className="syn-input"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Submit Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '16px' }}>
            <button
              type="submit"
              disabled={loading}
              className="syn-btn syn-btn-primary"
              style={{ padding: '12px 32px', fontSize: '1rem' }}
            >
              <Upload size={18} />
              <span>{loading ? 'Publishing...' : 'Publish to Syndicate'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
