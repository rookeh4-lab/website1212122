import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Trash2,
  Download,
  Plus,
  Lock,
  LogOut,
  Upload,
  ArrowLeft,
  Image as ImageIcon,
  Sparkles,
  X,
  Check,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const AUTHORIZED_ADMIN_EMAIL = 'rookeh4@gmail.com';

const PRESET_IMAGES = [
  {
    name: 'Obsidian Client GUI',
    url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800',
  },
  {
    name: 'Crystal PvP Sunset',
    url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800',
  },
  {
    name: 'Cyber Matrix GUI',
    url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800',
  },
];

export default function AdminPage() {
  const navigate = useNavigate();
  const { user, profile, isAdmin, signIn, signOut } = useAuth();

  // Admin Dashboard State
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'manage'
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Login Gate State (if not logged in)
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [gateLoading, setGateLoading] = useState(false);
  const [gateError, setGateError] = useState('');

  // Direct File Upload Form State
  const [uploadForm, setUploadForm] = useState({
    title: '',
    category: 'Clients', // 'Clients' | 'Source Codes' | 'Tools'
    version: '1.21.11',
    loader: 'Fabric',
    description: '',
    author_name: 'Rookeh',
    is_clean: true,
    is_featured: false,
    gui_bind: 'right shift',
    credits: '• Rookeh\n• Client Syndicate Archive',
  });

  // Client Binary File State
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileDetails, setFileDetails] = useState({ name: '', size: '', type: '' });

  // IMAGE SYSTEM STATE (Only post image if user actually uploads an image!)
  const [primaryImageFile, setPrimaryImageFile] = useState(null);
  const [primaryImagePreview, setPrimaryImagePreview] = useState('');
  const [customImageUrl, setCustomImageUrl] = useState('');

  const [uploading, setUploading] = useState(false);

  // Load resources for management
  const loadResources = async () => {
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false });

      if (err) throw err;
      setResources(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load resources');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadResources();
    }
  }, [isAdmin]);

  // Handle Binary file select (.jar, .dll, .zip)
  const handleBinaryFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      const ext = file.name.split('.').pop()?.toUpperCase() || 'JAR';
      setFileDetails({
        name: file.name,
        size: `${sizeMb} MB`,
        type: ext,
      });
      if (!uploadForm.title) {
        setUploadForm((prev) => ({
          ...prev,
          title: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
        }));
      }
    }
  };

  // IMAGE SYSTEM: Primary Image Change
  const handlePrimaryImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPrimaryImageFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPrimaryImagePreview(objectUrl);
      setCustomImageUrl('');
    }
  };

  // IMAGE SYSTEM: Secondary Image Change
  const handleSecondaryImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSecondaryImageFile(file);
      const objectUrl = URL.createObjectURL(file);
      setSecondaryImagePreview(objectUrl);
    }
  };

  // Upload image to Supabase Storage or fallback
  const uploadImageToStorage = async (file, bucket = 'client-images') => {
    if (!file) return null;
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { data, error: uploadErr } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { cacheControl: '3600', upsert: true });

      if (uploadErr) throw uploadErr;

      const { data: publicData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      return publicData?.publicUrl || null;
    } catch (err) {
      console.warn('Storage image upload fallback to local preview:', err.message);
      return null;
    }
  };

  // Upload binary file to Supabase Storage
  const uploadBinaryToStorage = async (file, bucket = 'client-releases') => {
    if (!file) return null;
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${Date.now()}_${safeName}`;

      const { data, error: uploadErr } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (uploadErr) {
        console.warn('Storage upload error:', uploadErr.message);
        return null;
      }

      const { data: publicData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      return publicData?.publicUrl || null;
    } catch (err) {
      console.warn('Storage binary upload fallback:', err.message);
      return null;
    }
  };

  // Direct client file upload & save to Supabase
  const handleDirectUploadSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!uploadForm.title.trim()) {
      setError('Please provide a client name/title.');
      return;
    }

    try {
      setUploading(true);

      const clientFileName = fileDetails.name || `${uploadForm.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}.jar`;
      const clientFileSize = fileDetails.size || '16.4 MB';

      // 1. Process Images (ONLY attach if user uploaded or chose an image - NO auto fake photos!)
      let finalThumbnailUrl = customImageUrl.trim() || '';
      if (primaryImageFile) {
        const uploadedThumb = await uploadImageToStorage(primaryImageFile);
        if (uploadedThumb) finalThumbnailUrl = uploadedThumb;
        else if (primaryImagePreview) finalThumbnailUrl = primaryImagePreview;
      } else if (primaryImagePreview) {
        finalThumbnailUrl = primaryImagePreview;
      }

      // ONLY attach the image the user uploaded. Never auto-attach a second image!
      const finalScreenshots = finalThumbnailUrl ? [finalThumbnailUrl] : [];

      // 2. Process Binary Release File (Direct storage or release path)
      let directDownloadUrl = `https://github.com/rookeh4-lab/website1212122/releases/download/v1.0.0/${encodeURIComponent(clientFileName)}`;
      if (selectedFile) {
        const storageReleaseUrl = await uploadBinaryToStorage(selectedFile);
        if (storageReleaseUrl) {
          directDownloadUrl = storageReleaseUrl;
        }
      }

      // 3. Prepare Payload
      const generatedSlug = uploadForm.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now().toString(36);
      const authorName = profile?.username || uploadForm.author_name || 'rain';
      const authorAvatar = profile?.avatar_url || 'https://ooxshxykdujgxcyezofo.supabase.co/storage/v1/object/public/client-images/rain-avatar.jpg';
      const customCredits = uploadForm.credits?.trim() || `• ${authorName}\n• Client Syndicate Archive`;

      const newResource = {
        title: uploadForm.title.trim(),
        slug: generatedSlug,
        category: uploadForm.category,
        version: uploadForm.version,
        loader: uploadForm.loader,
        type: uploadForm.category === 'Clients' ? 'Client' : uploadForm.category === 'Source Codes' ? 'Source Code' : 'Tool',
        description: uploadForm.description.trim() || `${uploadForm.title} verified direct download release.`,
        credits: customCredits,
        author_name: authorName,
        author_avatar: authorAvatar,
        client_file_name: clientFileName,
        client_file_size: clientFileSize,
        client_download_url: directDownloadUrl,
        download_url: directDownloadUrl,
        is_clean: uploadForm.is_clean,
        is_featured: uploadForm.is_featured,
        is_approved: true,
        downloads_count: 102,
        likes_count: 4,
        tags: [uploadForm.category],
        thumbnail_url: finalThumbnailUrl || null,
        screenshots: finalScreenshots,
      };

      // Resilient insert with fallback if optional schema columns mismatch
      let insertError = null;
      try {
        const { error: insErr } = await supabase.from('resources').insert([newResource]);
        if (insErr) insertError = insErr;
      } catch (e) {
        insertError = e;
      }

      if (insertError) {
        console.warn('Initial insert threw, retrying with core columns:', insertError.message);
        // Fallback with only guaranteed schema columns
        const coreResource = { ...newResource };
        if (insertError.message && insertError.message.includes('schema cache')) {
          const colMatch = insertError.message.match(/'([^']+)' column/);
          if (colMatch && colMatch[1]) {
            delete coreResource[colMatch[1]];
          }
        }
        const { error: fallbackErr } = await supabase.from('resources').insert([coreResource]);
        if (fallbackErr) throw fallbackErr;
      }

      setMessage(`Successfully published "${uploadForm.title}" directly to Client Syndicate!`);

      // Update local cache immediately so it shows instantly everywhere
      try {
        const cached = localStorage.getItem('cached_syndicate_resources');
        const list = cached ? JSON.parse(cached) : [];
        const updatedList = [newResource, ...list.filter(r => r.title !== newResource.title)];
        localStorage.setItem('cached_syndicate_resources', JSON.stringify(updatedList));
      } catch (_e) {}

      // Reset form
      setUploadForm({
        title: '',
        category: 'Clients',
        version: '1.21.11',
        loader: 'Fabric',
        description: '',
        author_name: authorName,
        is_clean: true,
        is_featured: false,
        gui_bind: 'right shift',
        credits: `• ${authorName}\n• Client Syndicate Archive`,
      });
      setSelectedFile(null);
      setFileDetails({ name: '', size: '', type: '' });
      setPrimaryImageFile(null);
      setCustomImageUrl('');
      setPrimaryImagePreview('');

      loadResources();
    } catch (err) {
      setError(err.message || 'Failed to submit client upload');
    } finally {
      setUploading(false);
    }
  };

  // Toggle CLEAN / UNVERIFIED tag
  const handleToggleClean = async (res) => {
    try {
      const updated = !res.is_clean;
      await supabase.from('resources').update({ is_clean: updated }).eq('id', res.id);
      setResources((prev) =>
        prev.map((r) => (r.id === res.id ? { ...r, is_clean: updated } : r))
      );
      setMessage(`Updated "${res.title}" status to ${updated ? 'CLEAN' : 'UNVERIFIED'}.`);
    } catch (err) {
      setError(err.message);
    }
  };

  // Toggle Hot Topic tag & glowing aura
  const handleToggleHot = async (resItem) => {
    try {
      const nextHot = !resItem.is_featured;
      const nextTags = Array.isArray(resItem.tags) ? [...resItem.tags] : [resItem.category || 'Clients'];
      if (nextHot && !nextTags.includes('Hot topic')) {
        nextTags.push('Hot topic');
      } else if (!nextHot) {
        const idx = nextTags.indexOf('Hot topic');
        if (idx !== -1) nextTags.splice(idx, 1);
      }
      await supabase.from('resources').update({ is_featured: nextHot, tags: nextTags }).eq('id', resItem.id);
      setResources((prev) =>
        prev.map((r) => (r.id === resItem.id ? { ...r, is_featured: nextHot, tags: nextTags } : r))
      );
      setMessage(`Updated "${resItem.title}" hot status to ${nextHot ? 'HOT TOPIC 🔥' : 'NORMAL'}.`);
      try {
        const cached = localStorage.getItem('cached_syndicate_resources');
        if (cached) {
          const list = JSON.parse(cached);
          const updatedCache = list.map((r) =>
            r.id === resItem.id ? { ...r, is_featured: nextHot, tags: nextTags } : r
          );
          localStorage.setItem('cached_syndicate_resources', JSON.stringify(updatedCache));
        }
      } catch (_e) {}
    } catch (err) {
      setError(err.message);
    }
  };

  // Delete Resource
  const handleDeleteResource = async (id, title) => {
    if (!window.confirm(`Delete client "${title}"?`)) return;
    try {
      await supabase.from('resources').delete().eq('id', id);
      setResources((prev) => prev.filter((r) => r.id !== id));
      setMessage(`Deleted "${title}".`);
    } catch (err) {
      setError(err.message);
    }
  };

  // ------------------------------------------------------------------
  // 1. ACCESS GATE (Protected Administrator Portal)
  // ------------------------------------------------------------------
  if (!isAdmin) {
    const handleGateLogin = async (e) => {
      e?.preventDefault();
      setGateError('');

      if (passwordInput !== 'rabin1122') {
        setGateError('Incorrect administrator password. Access denied.');
        return;
      }

      const clean = (emailInput || AUTHORIZED_ADMIN_EMAIL).trim().toLowerCase();
      if (clean !== AUTHORIZED_ADMIN_EMAIL) {
        setGateError('Invalid administrator credentials.');
        return;
      }

      try {
        setGateLoading(true);
        await signIn(AUTHORIZED_ADMIN_EMAIL, 'rabin1122');
      } catch (err) {
        setGateError(err.message || 'Authentication failed. Please verify credentials.');
      } finally {
        setGateLoading(false);
      }
    };

    return (
      <div style={{ minHeight: '85vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div
          style={{
            maxWidth: '440px',
            width: '100%',
            background: '#0d1527',
            border: '1px solid #1e2f4a',
            borderRadius: '16px',
            padding: '36px 32px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#162442',
              border: '1px solid #38bdf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38bdf8',
              margin: '0 auto 16px auto',
              boxShadow: '0 0 16px rgba(56, 189, 248, 0.3)',
            }}
          >
            <Lock size={26} />
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#ffffff', marginBottom: '6px' }}>
            Client Syndicate Admin Portal
          </h2>

          <p style={{ fontSize: '0.86rem', color: '#94a3b8', marginBottom: '24px' }}>
            Enter administrator credentials to manage releases and client uploads.
          </p>

          {user && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                fontSize: '0.82rem',
                marginBottom: '18px',
                textAlign: 'left',
              }}
            >
              Logged in as <strong>{user.email}</strong>. This account does not have administrator privileges.
            </div>
          )}

          <form onSubmit={handleGateLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="Admin Email"
              style={{
                width: '100%',
                padding: '11px 16px',
                borderRadius: '8px',
                background: '#090e1a',
                border: '1px solid #1e2f4a',
                color: '#ffffff',
                fontSize: '0.90rem',
                outline: 'none',
              }}
            />

            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Admin Password"
              style={{
                width: '100%',
                padding: '11px 16px',
                borderRadius: '8px',
                background: '#090e1a',
                border: '1px solid #1e2f4a',
                color: '#ffffff',
                fontSize: '0.90rem',
                outline: 'none',
              }}
            />

            {gateError && (
              <div style={{ color: '#f87171', fontSize: '0.82rem', textAlign: 'left' }}>
                {gateError}
              </div>
            )}

            <button
              type="submit"
              disabled={gateLoading}
              className="btn-gold"
              style={{ padding: '10px 20px', fontSize: '0.90rem', width: '100%' }}
            >
              {gateLoading ? 'Authenticating...' : 'Sign In as Admin'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // 2. AUTHORIZED ADMIN PANEL
  // ------------------------------------------------------------------
  return (
    <div style={{ minHeight: '100vh', padding: '30px 24px 80px 24px' }}>
      <div style={{ maxWidth: '1080px', margin: '0 auto' }}>

        {/* Top Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '28px',
            paddingBottom: '20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#10b981', marginBottom: '6px' }}>
              <ShieldCheck size={16} />
              <span style={{ fontSize: '0.78rem', fontWeight: '700', letterSpacing: '0.04em' }}>
                ADMIN AUTHENTICATED: {AUTHORIZED_ADMIN_EMAIL}
              </span>
            </div>
            <h1 style={{ fontSize: '1.9rem', fontWeight: '800', color: '#ffffff', margin: 0 }}>
              Client Syndicate Administration
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link
              to="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: '#94a3b8',
                fontSize: '0.84rem',
                textDecoration: 'none',
              }}
            >
              <ArrowLeft size={14} />
              <span>View Site</span>
            </Link>

            <button
              onClick={() => {
                signOut();
                navigate('/');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '8px',
                background: '#162035',
                border: '1px solid #1e2f4a',
                color: '#f87171',
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              <LogOut size={13} />
              <span>Log out</span>
            </button>
          </div>
        </div>

        {/* Feedback Message */}
        {message && (
          <div style={{ padding: '12px 18px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', marginBottom: '20px', fontSize: '0.88rem' }}>
            {message}
          </div>
        )}
        {error && (
          <div style={{ padding: '12px 18px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', marginBottom: '20px', fontSize: '0.88rem' }}>
            {error}
          </div>
        )}

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
          <button
            onClick={() => setActiveTab('upload')}
            className={`cat-pill ${activeTab === 'upload' ? 'on' : ''}`}
          >
            <Plus size={14} />
            <span>Direct Upload Client &amp; Images</span>
          </button>

          <button
            onClick={() => setActiveTab('manage')}
            className={`cat-pill ${activeTab === 'manage' ? 'on' : ''}`}
          >
            <span>Manage Clients ({resources.length})</span>
          </button>
        </div>

        {/* TAB 1: DIRECT FILE & IMAGE UPLOAD */}
        {activeTab === 'upload' && (
          <div
            style={{
              background: '#0d1527',
              border: '1px solid #1a2744',
              borderRadius: '14px',
              padding: '28px',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
            }}
          >
            <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#ffffff', marginBottom: '6px' }}>
              Upload New Client, Binary &amp; Images
            </div>
            <p style={{ fontSize: '0.86rem', color: '#94a3b8', marginBottom: '24px' }}>
              Direct file upload from your PC (.jar, .dll, .zip) plus client GUI screenshot image preview.
            </p>

            {/* Author Profile Identity Banner */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 18px',
                borderRadius: '10px',
                background: '#090e1a',
                border: '1px solid #1e2f4a',
                marginBottom: '22px',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img
                  src={profile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                  alt={profile?.username || 'Rookeh'}
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid #38bdf8',
                    boxShadow: '0 0 10px rgba(56, 189, 248, 0.3)',
                  }}
                />
                <div>
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                    Publishing as Author (Shown on cards &amp; detail page):
                  </div>
                  <div style={{ fontSize: '0.96rem', fontWeight: '800', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{profile?.username || 'Rookeh'}</span>
                    <span
                      style={{
                        fontSize: '0.70rem',
                        fontWeight: '600',
                        padding: '1px 7px',
                        borderRadius: '999px',
                        background: 'rgba(56, 189, 248, 0.1)',
                        color: '#38bdf8',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                      }}
                    >
                      Reverse Engineer
                    </span>
                  </div>
                </div>
              </div>

              <Link
                to="/login"
                style={{
                  fontSize: '0.80rem',
                  color: '#38bdf8',
                  textDecoration: 'none',
                  fontWeight: '600',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: '#131e36',
                  border: '1px solid #1e2f4a',
                }}
              >
                Edit Name &amp; PFP →
              </Link>
            </div>

            <form onSubmit={handleDirectUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              
              {/* 1. Client Binary File Selector (.jar, .dll, .zip) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#cbd5e1', marginBottom: '8px' }}>
                  1. Client Binary File (.jar / .dll / .zip)
                </label>
                <div
                  style={{
                    border: '2px dashed #1e2f4a',
                    borderRadius: '12px',
                    padding: '22px 20px',
                    textAlign: 'center',
                    background: '#090e1a',
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                >
                  <input
                    type="file"
                    onChange={handleBinaryFileChange}
                    accept=".jar,.dll,.zip,.exe,.tar.gz"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      opacity: 0,
                      cursor: 'pointer',
                      width: '100%',
                      height: '100%',
                    }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        background: '#131e36',
                        border: '1px solid #38bdf8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#38bdf8',
                      }}
                    >
                      <Upload size={20} />
                    </div>
                    <div style={{ color: '#ffffff', fontWeight: '600', fontSize: '0.92rem' }}>
                      {fileDetails.name ? fileDetails.name : 'Click to select client file from PC'}
                    </div>
                    <div style={{ color: '#64748b', fontSize: '0.78rem' }}>
                      {fileDetails.size ? `${fileDetails.type} • ${fileDetails.size}` : 'Direct file upload (no external links)'}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. IMAGE SYSTEM: Client Screenshot & Thumbnail */}
              <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.84rem', fontWeight: '700', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ImageIcon size={15} style={{ color: '#38bdf8' }} />
                    <span>2. Client GUI Image &amp; Thumbnail</span>
                  </label>
                  <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                    Shown on client card &amp; detail page
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {/* Left: Image Upload Picker */}
                  <div
                    style={{
                      border: '2px dashed #1e2f4a',
                      borderRadius: '12px',
                      padding: '20px',
                      background: '#090e1a',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      position: 'relative',
                      minHeight: '160px',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="file"
                      onChange={handlePrimaryImageChange}
                      accept="image/*"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        opacity: 0,
                        cursor: 'pointer',
                        width: '100%',
                        height: '100%',
                      }}
                    />
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '8px',
                        background: '#131e36',
                        border: '1px solid #38bdf8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#38bdf8',
                        marginBottom: '8px',
                      }}
                    >
                      <ImageIcon size={18} />
                    </div>
                    <div style={{ color: '#ffffff', fontWeight: '600', fontSize: '0.86rem' }}>
                      {primaryImageFile ? primaryImageFile.name : 'Upload Screenshot from PC'}
                    </div>
                    <div style={{ color: '#64748b', fontSize: '0.74rem', marginTop: '2px' }}>
                      PNG, JPG, WEBP (Supports GUI &amp; in-game)
                    </div>
                  </div>

                  {/* Right: Live Image Preview Box */}
                  <div
                    style={{
                      borderRadius: '12px',
                      border: '1px solid #1e2f4a',
                      overflow: 'hidden',
                      background: '#090e1a',
                      position: 'relative',
                      aspectRatio: '16/9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {primaryImagePreview ? (
                      <>
                        <img
                          src={primaryImagePreview}
                          alt="Client Preview"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '8px',
                            left: '8px',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: 'rgba(0, 0, 0, 0.75)',
                            color: '#38bdf8',
                            fontSize: '0.72rem',
                            fontWeight: '600',
                          }}
                        >
                          Live Image Preview
                        </div>
                      </>
                    ) : (
                      <span style={{ color: '#64748b', fontSize: '0.82rem' }}>No image selected</span>
                    )}
                  </div>
                </div>

                {/* Preset image quick selectors & Clear button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Optional Presets:</span>
                  {PRESET_IMAGES.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => {
                        setPrimaryImagePreview(p.url);
                        setCustomImageUrl(p.url);
                        setPrimaryImageFile(null);
                      }}
                      style={{
                        padding: '3px 10px',
                        borderRadius: '6px',
                        background: primaryImagePreview === p.url ? '#162442' : '#0e1627',
                        border: primaryImagePreview === p.url ? '1px solid #38bdf8' : '1px solid #1a2744',
                        color: primaryImagePreview === p.url ? '#38bdf8' : '#94a3b8',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                      }}
                    >
                      {p.name}
                    </button>
                  ))}
                  {primaryImagePreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setPrimaryImagePreview('');
                        setCustomImageUrl('');
                        setPrimaryImageFile(null);
                      }}
                      style={{
                        padding: '3px 10px',
                        borderRadius: '6px',
                        background: 'transparent',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        color: '#ef4444',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                      }}
                    >
                      Clear Image
                    </button>
                  )}
                </div>
              </div>

              {/* 3. Title & Category */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '6px' }}>
                    Client / Resource Name
                  </label>
                  <input
                    type="text"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                    placeholder="e.g. Valk Client [Valk Plus]"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: '#090e1a',
                      border: '1px solid #1e2f4a',
                      color: '#ffffff',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '6px' }}>
                    Category (Strictly 3 Categories)
                  </label>
                  <select
                    value={uploadForm.category}
                    onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: '#090e1a',
                      border: '1px solid #1e2f4a',
                      color: '#ffffff',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  >
                    <option value="Clients">Clients</option>
                    <option value="Source Codes">Source Codes</option>
                    <option value="Tools">Tools</option>
                  </select>
                </div>
              </div>

              {/* 4. Version & Loader */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '6px' }}>
                    Minecraft Version
                  </label>
                  <input
                    type="text"
                    value={uploadForm.version}
                    onChange={(e) => setUploadForm({ ...uploadForm, version: e.target.value })}
                    placeholder="1.21.11"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: '#090e1a',
                      border: '1px solid #1e2f4a',
                      color: '#ffffff',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '6px' }}>
                    Loader / Platform
                  </label>
                  <input
                    type="text"
                    value={uploadForm.loader}
                    onChange={(e) => setUploadForm({ ...uploadForm, loader: e.target.value })}
                    placeholder="Fabric / Forge / Native C++"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: '#090e1a',
                      border: '1px solid #1e2f4a',
                      color: '#ffffff',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* 5. Status Tags: CLEAN / VERIFIED and HOT TOPIC */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#ffffff', fontSize: '0.86rem' }}>
                  <input
                    type="checkbox"
                    checked={uploadForm.is_clean}
                    onChange={(e) => setUploadForm({ ...uploadForm, is_clean: e.target.checked })}
                    style={{ width: '16px', height: '16px', accentColor: '#10b981' }}
                  />
                  <span>Mark as <strong style={{ color: '#10b981' }}>CLEAN / VERIFIED</strong> ✔</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#ffffff', fontSize: '0.86rem' }}>
                  <input
                    type="checkbox"
                    checked={uploadForm.is_featured}
                    onChange={(e) => setUploadForm({ ...uploadForm, is_featured: e.target.checked })}
                    style={{ width: '16px', height: '16px', accentColor: '#ea580c' }}
                  />
                  <span>Mark as <strong style={{ color: '#ff7700' }}>Hot topic</strong> 🔥 (Hot corners, glowing outline &amp; animated shine)</span>
                </label>
              </div>

              {/* 6. Description */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '6px' }}>
                  Description / GUI Bind
                </label>
                <textarea
                  rows={3}
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  placeholder="credits to username_xds for most of this crack, GUI Bind: right shift..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: '#090e1a',
                    border: '1px solid #1e2f4a',
                    color: '#ffffff',
                    fontSize: '0.88rem',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* 7. Credits System (Fully Editable) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#cbd5e1', marginBottom: '6px' }}>
                  Credits (Fully Editable - each line will be shown as a credit bullet)
                </label>
                <textarea
                  rows={3}
                  value={uploadForm.credits}
                  onChange={(e) => setUploadForm({ ...uploadForm, credits: e.target.value })}
                  placeholder="e.g.&#10;Plutora Development Team&#10;Cracked by JP&#10;Client Syndicate"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: '#090e1a',
                    border: '1px solid #1e2f4a',
                    color: '#ffffff',
                    fontSize: '0.88rem',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
                <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>
                  Type all credits for this client here. You can customize this freely for every release.
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="submit"
                  disabled={uploading}
                  className="btn-gold"
                  style={{ padding: '10px 28px', fontSize: '0.90rem' }}
                >
                  {uploading ? 'Publishing Direct Client...' : 'Publish to Client Syndicate'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: MANAGE CLIENTS */}
        {activeTab === 'manage' && (
          <div
            style={{
              background: '#0d1527',
              border: '1px solid #1a2744',
              borderRadius: '14px',
              padding: '24px',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
            }}
          >
            <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#ffffff', marginBottom: '16px' }}>
              All Published Clients ({resources.length})
            </div>

            {loading ? (
              <div style={{ color: '#94a3b8', textAlign: 'center', padding: '40px' }}>
                Loading resources...
              </div>
            ) : resources.length === 0 ? (
              <div style={{ color: '#94a3b8', textAlign: 'center', padding: '40px' }}>
                No clients found. Upload your first client above!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {resources.map((res) => (
                  <div
                    key={res.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 18px',
                      borderRadius: '10px',
                      background: '#090e1a',
                      border: '1px solid #1a2744',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                  >
                    {/* Thumbnail + Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <img
                        src={res.thumbnail_url || PRESET_IMAGES[0].url}
                        alt={res.title}
                        style={{
                          width: '56px',
                          height: '34px',
                          borderRadius: '6px',
                          objectFit: 'cover',
                          border: '1px solid #1e2f4a',
                        }}
                      />
                      <div>
                        <div style={{ color: '#ffffff', fontWeight: '700', fontSize: '0.92rem' }}>
                          {res.title}
                        </div>
                        <div style={{ color: '#64748b', fontSize: '0.78rem' }}>
                          {res.category} • {res.version} • {res.loader} • {res.client_file_name || 'release.jar'}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      {/* Toggle Hot topic badge & outline */}
                      <button
                        onClick={() => handleToggleHot(res)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '999px',
                          cursor: 'pointer',
                          fontSize: '0.76rem',
                          fontWeight: '800',
                          background: res.is_featured ? 'linear-gradient(135deg, #ff1a00, #ff8c00)' : 'rgba(255, 255, 255, 0.05)',
                          color: res.is_featured ? '#ffffff' : '#94a3b8',
                          border: res.is_featured ? '1px solid #ffa000' : '1px solid rgba(255, 255, 255, 0.12)',
                          boxShadow: res.is_featured ? '0 0 12px rgba(255, 107, 0, 0.55)' : 'none',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        {res.is_featured ? '🔥 Hot topic' : 'Normal'}
                      </button>

                      {/* Toggle CLEAN badge */}
                      <button
                        onClick={() => handleToggleClean(res)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '999px',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.76rem',
                          fontWeight: '700',
                          background: res.is_clean ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: res.is_clean ? '#10b981' : '#f59e0b',
                          borderWidth: '1px',
                          borderStyle: 'solid',
                          borderColor: res.is_clean ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)',
                        }}
                      >
                        {res.is_clean ? 'VERIFIED' : 'UNVERIFIED'}
                      </button>

                      {/* View Link */}
                      <Link
                        to={`/resource/${res.slug || res.id}`}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '6px',
                          background: '#131e36',
                          border: '1px solid #1e2f4a',
                          color: '#38bdf8',
                          fontSize: '0.78rem',
                          textDecoration: 'none',
                          fontWeight: '600',
                        }}
                      >
                        View
                      </Link>

                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteResource(res.id, res.title)}
                        style={{
                          padding: '5px 8px',
                          borderRadius: '6px',
                          background: 'transparent',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#ef4444',
                          cursor: 'pointer',
                        }}
                        title="Delete client"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
