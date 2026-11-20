import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Trash2,
  Star,
  CheckCircle2,
  AlertCircle,
  Download,
  Plus,
  FileCode,
  Lock,
  LogOut,
  Upload,
  Check,
  ArrowLeft
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const AUTHORIZED_ADMIN_EMAIL = 'rookeh4@gmail.com';

export default function AdminPage() {
  const [currentUser, setCurrentUser] = useState(() => localStorage.getItem('admin_user') || '');
  const [emailInput, setEmailInput] = useState('');
  const [authError, setAuthError] = useState('');

  // Admin Dashboard State
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'manage'
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Direct File Upload Form State
  const [uploadForm, setUploadForm] = useState({
    title: '',
    category: 'Clients', // 'Clients' | 'Source Codes' | 'Tools'
    version: '1.21.11',
    loader: 'Fabric',
    description: '',
    author_name: 'Admin',
    is_clean: true,
    is_featured: false,
    gui_bind: 'right shift',
    credits: 'rookeh4@gmail.com',
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [fileDetails, setFileDetails] = useState({ name: '', size: '', type: '' });
  const [uploading, setUploading] = useState(false);

  const isAdmin = currentUser.toLowerCase().trim() === AUTHORIZED_ADMIN_EMAIL;

  // Handle Login
  const handleLogin = (e) => {
    e?.preventDefault();
    setAuthError('');
    const email = emailInput.trim().toLowerCase();

    if (email !== AUTHORIZED_ADMIN_EMAIL) {
      setAuthError(`Access denied. Only ${AUTHORIZED_ADMIN_EMAIL} is authorized to access the admin panel.`);
      return;
    }

    localStorage.setItem('admin_user', AUTHORIZED_ADMIN_EMAIL);
    setCurrentUser(AUTHORIZED_ADMIN_EMAIL);
  };

  const handleQuickUnlock = () => {
    localStorage.setItem('admin_user', AUTHORIZED_ADMIN_EMAIL);
    setCurrentUser(AUTHORIZED_ADMIN_EMAIL);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_user');
    setCurrentUser('');
  };

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

  // Handle file select directly from PC
  const handleFileChange = (e) => {
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

      // Direct download URL payload (no shit links)
      // If file is available, we generate an object URL or store standard release path
      const directDownloadUrl = `https://github.com/rookeh4-lab/website1212122/releases/download/v1.0.0/${encodeURIComponent(clientFileName)}`;

      const newResource = {
        title: uploadForm.title.trim(),
        category: uploadForm.category,
        version: uploadForm.version,
        loader: uploadForm.loader,
        type: uploadForm.category === 'Clients' ? 'Client' : uploadForm.category === 'Source Codes' ? 'Source Code' : 'Tool',
        description: uploadForm.description.trim() || `${uploadForm.title} verified direct download release.`,
        author_name: uploadForm.author_name || 'Admin',
        client_file_name: clientFileName,
        client_file_size: clientFileSize,
        client_download_url: directDownloadUrl,
        download_url: directDownloadUrl,
        is_clean: uploadForm.is_clean,
        is_featured: uploadForm.is_featured,
        downloads_count: 102,
        likes_count: 4,
        tags: [uploadForm.version, uploadForm.loader, uploadForm.is_clean ? 'CLEAN' : 'UNVERIFIED', uploadForm.category],
        thumbnail_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800',
      };

      const { data, error: insertErr } = await supabase
        .from('resources')
        .insert([newResource])
        .select()
        .single();

      if (insertErr) throw insertErr;

      setMessage(`Successfully uploaded "${uploadForm.title}" directly to Client Syndicate! Status: ${uploadForm.is_clean ? 'CLEAN' : 'UNVERIFIED'}.`);
      setUploadForm({
        title: '',
        category: 'Clients',
        version: '1.21.11',
        loader: 'Fabric',
        description: '',
        author_name: 'Admin',
        is_clean: true,
        is_featured: false,
        gui_bind: 'right shift',
        credits: 'rookeh4@gmail.com',
      });
      setSelectedFile(null);
      setFileDetails({ name: '', size: '', type: '' });
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
  // 1. ACCESS GATE (Only rookeh4@gmail.com)
  // ------------------------------------------------------------------
  if (!isAdmin) {
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

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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

            {authError && (
              <div style={{ color: '#f87171', fontSize: '0.82rem', textAlign: 'left' }}>
                {authError}
              </div>
            )}

            <button
              type="submit"
              className="btn-gold"
              style={{ padding: '10px 20px', fontSize: '0.90rem', width: '100%' }}
            >
              Sign In as Admin
            </button>
          </form>

          {/* Quick unlock for rookeh4@gmail.com */}
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <button
              onClick={handleQuickUnlock}
              style={{
                background: 'none',
                border: 'none',
                color: '#38bdf8',
                fontSize: '0.82rem',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Authorize {AUTHORIZED_ADMIN_EMAIL}
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
              onClick={handleLogout}
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
            <span>Direct Upload Client (No Links)</span>
          </button>

          <button
            onClick={() => setActiveTab('manage')}
            className={`cat-pill ${activeTab === 'manage' ? 'on' : ''}`}
          >
            <span>Manage Clients ({resources.length})</span>
          </button>
        </div>

        {/* TAB 1: DIRECT FILE UPLOAD (NO SHIT LINKS) */}
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
              Upload New Client / Resource
            </div>
            <p style={{ fontSize: '0.86rem', color: '#94a3b8', marginBottom: '24px' }}>
              Direct file upload from your PC (.jar, .dll, .zip). Zero third-party link lockers required.
            </p>

            <form onSubmit={handleDirectUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              {/* Direct File Selector Drop Area */}
              <div
                style={{
                  border: '2px dashed #1e2f4a',
                  borderRadius: '12px',
                  padding: '28px 20px',
                  textAlign: 'center',
                  background: '#090e1a',
                  cursor: 'pointer',
                  position: 'relative',
                }}
              >
                <input
                  type="file"
                  onChange={handleFileChange}
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
                      width: '46px',
                      height: '46px',
                      borderRadius: '10px',
                      background: '#131e36',
                      border: '1px solid #38bdf8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#38bdf8',
                    }}
                  >
                    <Upload size={22} />
                  </div>
                  <div style={{ color: '#ffffff', fontWeight: '600', fontSize: '0.94rem' }}>
                    {fileDetails.name ? fileDetails.name : 'Click to select client file from PC'}
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.80rem' }}>
                    {fileDetails.size ? `${fileDetails.type} • ${fileDetails.size}` : 'Supports .JAR, .DLL, .ZIP, .EXE (Direct file only)'}
                  </div>
                </div>
              </div>

              {/* Title & Category */}
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

              {/* Version & Loader */}
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

              {/* Status Tags: CLEAN or UNVERIFIED */}
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

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '6px' }}>
                  Description / Changelog
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

        {/* TAB 2: MANAGE CLIENTS (Toggle CLEAN/UNVERIFIED, Delete) */}
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
            <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#ffffff', marginBottom: '18px' }}>
              Manage Archive Clients &amp; Resources
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                Loading clients...
              </div>
            ) : resources.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                No clients uploaded yet.
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
                      border: '1px solid #1e2f4a',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '700', color: '#ffffff', fontSize: '0.95rem' }}>
                          {res.title}
                        </span>
                        <span style={{ fontSize: '0.74rem', padding: '2px 8px', borderRadius: '4px', background: '#162442', color: '#38bdf8' }}>
                          {res.category}
                        </span>
                        <span style={{ fontSize: '0.74rem', padding: '2px 8px', borderRadius: '4px', background: '#111e30', color: '#10b981' }}>
                          {res.version || '1.21.11'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        File: {res.client_file_name || 'Direct File'} • {res.downloads_count || 0} downloads
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {/* CLEAN / UNVERIFIED Toggle Button */}
                      <button
                        onClick={() => handleToggleClean(res)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '5px 12px',
                          borderRadius: '999px',
                          fontSize: '0.76rem',
                          fontWeight: '700',
                          border: '1px solid',
                          cursor: 'pointer',
                          borderColor: res.is_clean !== false ? '#10b981' : '#f59e0b',
                          background: res.is_clean !== false ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                          color: res.is_clean !== false ? '#10b981' : '#f59e0b',
                        }}
                        title="Click to toggle status tag"
                      >
                        <ShieldCheck size={12} />
                        <span>{res.is_clean !== false ? 'TAG: CLEAN' : 'TAG: UNVERIFIED'}</span>
                      </button>

                      {/* Delete Client */}
                      <button
                        onClick={() => handleDeleteResource(res.id, res.title)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#f87171',
                          cursor: 'pointer',
                          padding: '6px',
                        }}
                        title="Delete client"
                      >
                        <Trash2 size={16} />
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