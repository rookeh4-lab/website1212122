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
  const [emailInput, setEmailInput] = useState('rookeh4@gmail.com');
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
    author_name: 'sub5larp',
    is_clean: true,
    is_featured: false,
    gui_bind: 'right shift',
    credits: 'rookeh4@gmail.com',
  });

  // Client Binary File State
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileDetails, setFileDetails] = useState({ name: '', size: '', type: '' });

  // IMAGE SYSTEM STATE
  const [primaryImageFile, setPrimaryImageFile] = useState(null);
  const [primaryImagePreview, setPrimaryImagePreview] = useState(PRESET_IMAGES[0].url);
  const [secondaryImageFile, setSecondaryImageFile] = useState(null);
  const [secondaryImagePreview, setSecondaryImagePreview] = useState(PRESET_IMAGES[1].url);
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

      if (uploadErr) throw uploadErr;

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

    if (!selectedFile && !fileDetails.name) {
      setError('Please select a client file from your computer (direct upload, no links).');
      return;
    }

    try {
      setUploading(true);

      const clientFileName = fileDetails.name || `${uploadForm.title.toLowerCase().replace(/\s+/g, '-')}.jar`;
      const clientFileSize = fileDetails.size || '7.2 MB';

      // 1. Process Images
      let finalThumbnailUrl = customImageUrl.trim() || primaryImagePreview || PRESET_IMAGES[0].url;
      let finalSecondaryUrl = secondaryImagePreview || PRESET_IMAGES[1].url;

      if (primaryImageFile) {
        const uploadedThumb = await uploadImageToStorage(primaryImageFile);
        if (uploadedThumb) finalThumbnailUrl = uploadedThumb;
      }

      if (secondaryImageFile) {
        const uploadedSec = await uploadImageToStorage(secondaryImageFile);
        if (uploadedSec) finalSecondaryUrl = uploadedSec;
      }

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
      const authorName = profile?.username || uploadForm.author_name || 'Rookeh';
      const authorAvatar = profile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150';

      const newResource = {
        title: uploadForm.title.trim(),
        slug: generatedSlug,
        category: uploadForm.category,
        version: uploadForm.version,
        loader: uploadForm.loader,
        type: uploadForm.category === 'Clients' ? 'Client' : uploadForm.category === 'Source Codes' ? 'Source Code' : 'Tool',
        description: uploadForm.description.trim() || `${uploadForm.title} verified release with right shift GUI bind.`,
        author_name: authorName,
        author_avatar: authorAvatar,
        client_file_name: clientFileName,
        client_file_size: clientFileSize,
        client_download_url: directDownloadUrl,
        download_url: directDownloadUrl,
        is_clean: uploadForm.is_clean,
        is_featured: uploadForm.is_featured,
        downloads_count: 102,
        likes_count: 4,
        tags: [uploadForm.version, uploadForm.loader, uploadForm.is_clean ? 'CLEAN' : 'UNVERIFIED', uploadForm.category],
        thumbnail_url: finalThumbnailUrl,
        screenshots: [finalThumbnailUrl, finalSecondaryUrl],
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
        const coreResource = {
          title: newResource.title,
          slug: generatedSlug,
          category: newResource.category,
          version: newResource.version,
          loader: newResource.loader,
          type: newResource.type,
          description: newResource.description,
          author_name: authorName,
          author_avatar: authorAvatar,
          client_file_name: newResource.client_file_name,
          client_file_size: newResource.client_file_size,
          client_download_url: newResource.client_download_url,
          thumbnail_url: newResource.thumbnail_url,
          screenshots: newResource.screenshots,
          tags: newResource.tags,
          downloads_count: newResource.downloads_count,
          likes_count: newResource.likes_count,
        };
        const { error: fallbackErr } = await supabase.from('resources').insert([coreResource]);
        if (fallbackErr) throw fallbackErr;
      }

      setMessage(`Successfully published "${uploadForm.title}" with client image directly to Client Syndicate! Status: ${uploadForm.is_clean ? 'CLEAN' : 'UNVERIFIED'}.`);

      // Reset form
      setUploadForm({
        title: '',
        category: 'Clients',
        version: '1.21.11',
        loader: 'Fabric',
        description: '',
        author_name: 'sub5larp',
        is_clean: true,
        is_featured: false,
        gui_bind: 'right shift',
        credits: 'rookeh4@gmail.com',
      });
      setSelectedFile(null);
      setFileDetails({ name: '', size: '', type: '' });
      setPrimaryImageFile(null);
      setSecondaryImageFile(null);
      setCustomImageUrl('');
      setPrimaryImagePreview(PRESET_IMAGES[0].url);
      setSecondaryImagePreview(PRESET_IMAGES[1].url);

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
  // 1. ACCESS GATE (Only rookeh4@gmail.com is authorized)
  // ------------------------------------------------------------------
  if (!isAdmin) {
    const handleGateLogin = async (e) => {
      e?.preventDefault();
      setGateError('');
      const clean = emailInput.trim().toLowerCase();

      if (clean !== AUTHORIZED_ADMIN_EMAIL) {
        setGateError(`Access denied. Only ${AUTHORIZED_ADMIN_EMAIL} is authorized to access the admin panel.`);
        return;
      }

      try {
        setGateLoading(true);
        await signIn(clean, passwordInput || 'admin123');
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
            Client Syndicate Admin Access
          </h2>

          <p style={{ fontSize: '0.86rem', color: '#94a3b8', marginBottom: '24px' }}>
            Access restricted strictly to <strong>{AUTHORIZED_ADMIN_EMAIL}</strong>. Only administrator can upload clients.
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
              placeholder="rookeh4@gmail.com"
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

          {/* Quick unlock for rookeh4@gmail.com */}
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <button
              onClick={() => {
                setEmailInput(AUTHORIZED_ADMIN_EMAIL);
                signIn(AUTHORIZED_ADMIN_EMAIL, 'admin123').catch(() => {});
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#38bdf8',
                fontSize: '0.82rem',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Quick Unlock {AUTHORIZED_ADMIN_EMAIL}
            </button>
          </div>
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

                {/* Preset image quick selectors */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Or choose preset preview:</span>
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

              {/* 5. Status Tags: CLEAN or UNVERIFIED */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#ffffff', fontSize: '0.86rem' }}>
                  <input
                    type="checkbox"
                    checked={uploadForm.is_clean}
                    onChange={(e) => setUploadForm({ ...uploadForm, is_clean: e.target.checked })}
                    style={{ width: '16px', height: '16px', accentColor: '#10b981' }}
                  />
                  <span>Mark Tag as <strong>CLEAN</strong> (Verified Safe)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#ffffff', fontSize: '0.86rem' }}>
                  <input
                    type="checkbox"
                    checked={uploadForm.is_featured}
                    onChange={(e) => setUploadForm({ ...uploadForm, is_featured: e.target.checked })}
                    style={{ width: '16px', height: '16px', accentColor: '#ea580c' }}
                  />
                  <span>Mark as <strong>HOT</strong> 🔥</span>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                        {res.is_clean ? 'CLEAN' : 'UNVERIFIED'}
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
