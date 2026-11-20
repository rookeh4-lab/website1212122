import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LogIn,
  UserPlus,
  Mail,
  Lock,
  User,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  ShieldCheck,
  Eye,
  EyeOff,
  Camera,
  Upload,
  Sparkles,
  Save,
  LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';

const PRESET_AVATARS = [
  { name: 'Syndicate Pixel', url: '/logo.png' },
  { name: 'Reverse Engineer', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150' },
  { name: 'Cyber Phantom', url: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150' },
  { name: 'Neon Hacker', url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, updateProfile, signIn, signUp, signOut, isAdmin } = useAuth();

  // Mode: 'login' | 'register'
  const [mode, setMode] = useState('login');

  // Form Fields for Login/Register
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Profile Editor State (when logged in)
  const [editName, setEditName] = useState(profile?.username || 'Rookeh');
  const [editAvatar, setEditAvatar] = useState(profile?.avatar_url || PRESET_AVATARS[1].url);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileError, setProfileError] = useState('');

  // States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Sync edit states when profile changes
  useEffect(() => {
    if (profile) {
      setEditName(profile.username || 'Rookeh');
      setEditAvatar(profile.avatar_url || PRESET_AVATARS[1].url);
    }
  }, [profile]);

  // Handle Profile Picture file selection
  const handlePfpFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setEditAvatar(objectUrl);
      setCustomAvatarUrl('');

      // Try uploading to Supabase Storage client-images bucket
      try {
        const fileExt = file.name.split('.').pop();
        const filePath = `avatars/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error: uploadErr } = await supabase.storage
          .from('client-images')
          .upload(filePath, file, { cacheControl: '3600', upsert: true });

        if (!uploadErr) {
          const { data: publicData } = supabase.storage
            .from('client-images')
            .getPublicUrl(filePath);
          if (publicData?.publicUrl) {
            setEditAvatar(publicData.publicUrl);
          }
        }
      } catch (err) {
        console.warn('Avatar upload fallback to local preview:', err.message);
      }
    }
  };

  // Save Profile Changes (Display Name & PFP)
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileMsg('');
    setProfileError('');

    if (!editName.trim()) {
      setProfileError('Display Name cannot be empty.');
      return;
    }

    try {
      setSavingProfile(true);
      const finalAvatar = customAvatarUrl.trim() || editAvatar || PRESET_AVATARS[1].url;
      await updateProfile({
        username: editName.trim(),
        avatar_url: finalAvatar,
      });
      setProfileMsg('Profile updated! Your new name and avatar will be shown on all your posts.');
      setTimeout(() => setProfileMsg(''), 4000);
    } catch (err) {
      setProfileError(err.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Sign In / Register
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim() || !password) {
      setError('Please provide both email and password.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    try {
      setLoading(true);

      if (mode === 'login') {
        await signIn(email, password);
        setSuccess('Logged in successfully! Redirecting...');
        setTimeout(() => {
          if (email.toLowerCase().trim() === 'rookeh4@gmail.com') {
            navigate('/admin', { replace: true });
          } else {
            navigate('/', { replace: true });
          }
        }, 500);
      } else {
        await signUp(email, password, username);
        setSuccess('Account created successfully! Redirecting...');
        setTimeout(() => {
          if (email.toLowerCase().trim() === 'rookeh4@gmail.com') {
            navigate('/admin', { replace: true });
          } else {
            navigate('/', { replace: true });
          }
        }, 800);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------------------------------
  // LOGGED IN: USER DASHBOARD & PROFILE NAME/PFP EDITOR
  // ------------------------------------------------------------------
  if (user) {
    return (
      <div style={{ minHeight: '85vh', padding: '30px 20px 80px 20px', display: 'flex', justifyContent: 'center' }}>
        <div
          style={{
            maxWidth: '560px',
            width: '100%',
            background: '#0d1527',
            border: '1px solid #1a2744',
            borderRadius: '18px',
            padding: '32px 28px',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* Breadcrumb back */}
          <div style={{ marginBottom: '20px' }}>
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
              <span>Back to Client Syndicate</span>
            </Link>
          </div>

          {/* User Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: '700',
                    padding: '2px 9px',
                    borderRadius: '999px',
                    background: isAdmin ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.1)',
                    color: isAdmin ? '#10b981' : '#38bdf8',
                    border: isAdmin ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(56, 189, 248, 0.3)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {isAdmin ? <ShieldCheck size={12} /> : <User size={12} />}
                  <span>{isAdmin ? 'ADMINISTRATOR' : 'MEMBER'}</span>
                </span>
              </div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#ffffff', margin: 0 }}>
                User Profile Settings
              </h1>
              <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '2px' }}>
                {user.email}
              </p>
            </div>

            {isAdmin && (
              <button
                onClick={() => navigate('/admin')}
                className="btn-gold"
                style={{ padding: '8px 16px', fontSize: '0.82rem' }}
              >
                Go to Admin Panel
              </button>
            )}
          </div>

          {/* Feedback Messages */}
          {profileMsg && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                color: '#10b981',
                fontSize: '0.84rem',
                marginBottom: '18px',
              }}
            >
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span>{profileMsg}</span>
            </div>
          )}

          {profileError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                color: '#f87171',
                fontSize: '0.84rem',
                marginBottom: '18px',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{profileError}</span>
            </div>
          )}

          {/* PROFILE EDITOR FORM */}
          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            
            {/* 1. Avatar (PFP) Editor */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#cbd5e1', marginBottom: '10px' }}>
                Profile Picture (PFP)
              </label>

              <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginBottom: '14px' }}>
                {/* Avatar Preview Circle */}
                <div
                  style={{
                    position: 'relative',
                    width: '74px',
                    height: '74px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: '2px solid #38bdf8',
                    boxShadow: '0 0 16px rgba(56, 189, 248, 0.3)',
                    flexShrink: 0,
                    background: '#090e1a',
                  }}
                >
                  <img
                    src={editAvatar}
                    alt={editName}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.currentTarget.src = PRESET_AVATARS[1].url;
                    }}
                  />
                </div>

                <div style={{ flex: 1 }}>
                  {/* Upload PFP Button */}
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '7px',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      background: '#131e36',
                      border: '1px solid #1e2f4a',
                      color: '#ffffff',
                      fontSize: '0.82rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      marginBottom: '6px',
                    }}
                  >
                    <Camera size={14} style={{ color: '#38bdf8' }} />
                    <span>Upload PFP from Computer</span>
                    <input
                      type="file"
                      onChange={handlePfpFileChange}
                      accept="image/*"
                      style={{ display: 'none' }}
                    />
                  </label>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                    Upload any .PNG, .JPG image from your PC
                  </div>
                </div>
              </div>

              {/* Preset Avatars Selector */}
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '6px' }}>
                  Or select preset avatar:
                </span>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {PRESET_AVATARS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => {
                        setEditAvatar(p.url);
                        setCustomAvatarUrl('');
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: editAvatar === p.url ? '#162442' : '#090e1a',
                        border: editAvatar === p.url ? '1px solid #38bdf8' : '1px solid #1a2744',
                        color: editAvatar === p.url ? '#38bdf8' : '#94a3b8',
                        fontSize: '0.76rem',
                        cursor: 'pointer',
                      }}
                    >
                      <img src={p.url} alt={p.name} style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'cover' }} />
                      <span>{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. Display Name / Username Editor */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#cbd5e1', marginBottom: '6px' }}>
                Profile Name / Display Name
              </label>
              <div style={{ position: 'relative' }}>
                <User size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Rookeh"
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 36px',
                    borderRadius: '8px',
                    background: '#090e1a',
                    border: '1px solid #1a2744',
                    color: '#ffffff',
                    fontSize: '0.90rem',
                    outline: 'none',
                  }}
                />
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>
                This name and PFP will be shown as the author when you publish or post clients, source codes, or tools.
              </div>
            </div>

            {/* 3. Live Author Badge Preview */}
            <div
              style={{
                padding: '14px 18px',
                borderRadius: '10px',
                background: '#090e1a',
                border: '1px solid #162238',
              }}
            >
              <div style={{ fontSize: '0.74rem', color: '#64748b', marginBottom: '8px' }}>
                Live Author Badge Preview (How your posts look):
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                <img
                  src={editAvatar}
                  alt={editName}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '1px solid #1e2f4a',
                  }}
                  onError={(e) => {
                    e.currentTarget.src = PRESET_AVATARS[1].url;
                  }}
                />
                <span style={{ fontWeight: '600', color: '#ffffff', fontSize: '0.92rem' }}>
                  {editName || 'Rookeh'}
                </span>
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
                <span
                  style={{
                    fontSize: '0.70rem',
                    fontWeight: '700',
                    padding: '1px 7px',
                    borderRadius: '999px',
                    background: 'rgba(16, 185, 129, 0.12)',
                    color: '#10b981',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                  }}
                >
                  CLEAN
                </span>
              </div>
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={savingProfile}
              className="btn-gold"
              style={{
                width: '100%',
                padding: '11px',
                fontSize: '0.90rem',
                gap: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Save size={15} />
              <span>{savingProfile ? 'Saving Profile...' : 'Save Profile Changes'}</span>
            </button>
          </form>

          {/* Footer Actions */}
          <div
            style={{
              marginTop: '24px',
              paddingTop: '18px',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <button
              onClick={() => navigate('/')}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                fontSize: '0.84rem',
                cursor: 'pointer',
              }}
            >
              ← Return to Archive
            </button>

            <button
              onClick={() => {
                signOut();
                navigate('/');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'none',
                border: 'none',
                color: '#ef4444',
                fontSize: '0.82rem',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              <LogOut size={13} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // NOT LOGGED IN: SIGN IN & REGISTER TABS
  // ------------------------------------------------------------------
  return (
    <div style={{ minHeight: '85vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '30px 20px 60px 20px' }}>
      <div
        style={{
          maxWidth: '440px',
          width: '100%',
          background: '#0d1527',
          border: '1px solid #1a2744',
          borderRadius: '18px',
          padding: '32px 30px',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Back Link */}
        <div style={{ marginBottom: '18px' }}>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: '#94a3b8',
              fontSize: '0.82rem',
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={13} />
            <span>Back to Client Syndicate</span>
          </Link>
        </div>

        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <img
            src="/logo.png"
            alt="Client Syndicate"
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              objectFit: 'cover',
              margin: '0 auto 12px auto',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              boxShadow: '0 0 18px rgba(56, 189, 248, 0.25)',
            }}
          />
          <h1 style={{ fontSize: '1.45rem', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.02em', marginBottom: '4px' }}>
            Client Syndicate
          </h1>
          <p style={{ fontSize: '0.86rem', color: '#94a3b8' }}>
            {mode === 'login' ? 'Sign in with your email account' : 'Create a new Syndicate member account'}
          </p>
        </div>

        {/* Tab Switcher (Sign In / Register) */}
        <div
          style={{
            display: 'flex',
            borderRadius: '10px',
            background: '#090e1a',
            border: '1px solid #1a2744',
            padding: '4px',
            marginBottom: '22px',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
              setSuccess('');
            }}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '7px',
              border: 'none',
              background: mode === 'login' ? '#162238' : 'transparent',
              color: mode === 'login' ? '#ffffff' : '#94a3b8',
              fontSize: '0.86rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <LogIn size={14} />
            <span>Sign In</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError('');
              setSuccess('');
            }}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '7px',
              border: 'none',
              background: mode === 'register' ? '#162238' : 'transparent',
              color: mode === 'register' ? '#ffffff' : '#94a3b8',
              fontSize: '0.86rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <UserPlus size={14} />
            <span>Register</span>
          </button>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              fontSize: '0.84rem',
              marginBottom: '16px',
            }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#34d399',
              fontSize: '0.84rem',
              marginBottom: '16px',
            }}
          >
            <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
            <span>{success}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {mode === 'register' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                Display Name / Username
              </label>
              <div style={{ position: 'relative' }}>
                <User size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. Rookeh"
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 36px',
                    borderRadius: '8px',
                    background: '#090e1a',
                    border: '1px solid #1a2744',
                    color: '#ffffff',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  borderRadius: '8px',
                  background: '#090e1a',
                  border: '1px solid #1a2744',
                  color: '#ffffff',
                  fontSize: '0.88rem',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '10px 38px 10px 36px',
                  borderRadius: '8px',
                  background: '#090e1a',
                  border: '1px solid #1a2744',
                  color: '#ffffff',
                  fontSize: '0.88rem',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-gold"
            style={{
              width: '100%',
              padding: '11px',
              fontSize: '0.92rem',
              fontWeight: '700',
              marginTop: '8px',
            }}
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In to Syndicate' : 'Create Account'}
          </button>
        </form>

        {/* Admin Note */}
        <div
          style={{
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            fontSize: '0.78rem',
            color: '#64748b',
            textAlign: 'center',
          }}
        >
          Administrator access is restricted to <strong>rookeh4@gmail.com</strong>
        </div>
      </div>
    </div>
  );
}
