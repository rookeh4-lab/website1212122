import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { auth, API_BASE } from '../utils/api';

const DISCORD_CLIENT_ID = '1557993745884905512';

export default function Login() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Mode: 'login' | 'register' | 'forgot' | 'key'
  const [mode, setMode] = useState('login');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [licenseKey, setLicenseKey] = useState('');

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ text: '', type: '' });
  const [showOAuthHelp, setShowOAuthHelp] = useState(false);
  const [copiedRedirect, setCopiedRedirect] = useState(false);

  // 1. Check OAuth callback or existing session on mount
  useEffect(() => {
    let active = true;

    const initAuth = async () => {
      // Check direct query token (from /weblogin command)
      const queryToken = searchParams.get('token');
      if (queryToken) {
        auth.setToken(queryToken);
        navigate('/dashboard', { replace: true });
        return;
      }

      // Check password reset redirect
      if (searchParams.get('reset') === 'true') {
        setStatus({ text: 'Please enter your new password below.', type: 'info' });
      }

      // Check OAuth fragment token & clear from URL immediately
      const hash = window.location.hash;
      if (hash && hash.includes('access_token=')) {
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get('access_token');
        window.history.replaceState(null, '', window.location.pathname);

        if (accessToken) {
          setLoading(true);
          setStatus({ text: 'Completing Discord sign-in...', type: 'info' });
          try {
            const syncRes = await fetch(`${API_BASE}/auth/discord-sync`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ accessToken }),
            });
            const syncData = await syncRes.json().catch(() => ({}));

            if (!active) return;

            if (syncRes.ok && syncData?.success && syncData?.token) {
              if (syncData.session?.access_token && syncData.session?.refresh_token) {
                await auth.supabase.auth.setSession({
                  access_token: syncData.session.access_token,
                  refresh_token: syncData.session.refresh_token,
                });
              }
              auth.setToken(syncData.token);
              if (syncData.user) {
                localStorage.setItem('plutora_user', JSON.stringify(syncData.user));
              }
              navigate('/dashboard', { replace: true });
              return;
            } else {
              setStatus({
                text: syncData?.error || 'Could not sign in with Discord. Please try again.',
                type: 'danger',
              });
            }
          } catch {
            if (active) {
              setStatus({ text: 'Connection error during Discord sign-in.', type: 'danger' });
            }
          } finally {
            if (active) setLoading(false);
          }
          return;
        }
      }

      // Check existing authenticated session
      const existing = await auth.getProfile();
      if (active && existing?.user) {
        navigate('/dashboard', { replace: true });
      }
    };

    initAuth();
    return () => { active = false; };
  }, [searchParams, navigate]);

  // Handle Email + Password Sign In
  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setStatus({ text: 'Please fill in both email and password.', type: 'danger' });
      return;
    }

    setLoading(true);
    setStatus({ text: '', type: '' });

    try {
      const data = await auth.signIn(email.trim(), password);
      if (data?.user) {
        setStatus({ text: 'Login successful! Redirecting...', type: 'success' });
        setTimeout(() => navigate('/dashboard'), 400);
      }
    } catch (err) {
      setStatus({
        text: err.message || 'Login failed. Please verify your credentials.',
        type: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle User Registration
  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setStatus({ text: 'Please provide email and password.', type: 'danger' });
      return;
    }
    if (password.length < 6) {
      setStatus({ text: 'Password must be at least 6 characters.', type: 'danger' });
      return;
    }
    if (password !== confirmPassword) {
      setStatus({ text: 'Passwords do not match.', type: 'danger' });
      return;
    }

    setLoading(true);
    setStatus({ text: '', type: '' });

    try {
      const data = await auth.signUp(email.trim(), password, username.trim());
      if (data?.session) {
        setStatus({ text: 'Account created! Redirecting to dashboard...', type: 'success' });
        setTimeout(() => navigate('/dashboard'), 500);
      } else {
        setStatus({
          text: 'Registration successful! Please check your email inbox to confirm your account.',
          type: 'success',
        });
      }
    } catch (err) {
      setStatus({
        text: err.message || 'Registration failed. Please try a different email.',
        type: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle Password Reset Request
  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!email) {
      setStatus({ text: 'Please enter your account email address.', type: 'danger' });
      return;
    }

    setLoading(true);
    setStatus({ text: '', type: '' });

    try {
      await auth.resetPassword(email.trim());
      setStatus({
        text: 'Password recovery email sent! Check your inbox for reset instructions.',
        type: 'success',
      });
    } catch (err) {
      setStatus({
        text: err.message || 'Error sending password reset email.',
        type: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle License Key Quick Lookup / Login
  const handleKeyLogin = async (e) => {
    e.preventDefault();
    const clean = licenseKey.trim().toUpperCase();
    if (!clean) return;

    setLoading(true);
    setStatus({ text: '', type: '' });

    try {
      const res = await fetch(`${API_BASE}/auth/key-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ license_key: clean }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.token) {
        auth.setToken(data.token);
        if (data.user) {
          localStorage.setItem('plutora_user', JSON.stringify(data.user));
        }
        navigate('/dashboard', { replace: true });
      } else {
        setStatus({ text: data.error || 'Invalid or inactive license key.', type: 'danger' });
      }
    } catch {
      setStatus({ text: 'Could not connect to license validation server.', type: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  // Discord OAuth Redirect
  const handleDiscordOAuth = () => {
    const baseOrigin =
      window.location.hostname === '555client.xyz'
        ? 'https://www.555client.xyz'
        : window.location.origin;
    const redirectUri = encodeURIComponent(`${baseOrigin}/login`);
    const discordAuthUrl = `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&response_type=token&redirect_uri=${redirectUri}&scope=identify%20email`;
    window.location.href = discordAuthUrl;
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: 'calc(100vh - 160px)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
      }}
    >
      <div
        className="card login-card-responsive"
        style={{
          maxWidth: '460px',
          width: '100%',
          textAlign: 'center',
          borderRadius: 'var(--radius-lg)',
          padding: '36px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
        }}
      >
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            marginBottom: '20px',
            textDecoration: 'none',
          }}
        >
          <img
            src="/logo.png"
            alt="5.55 Logo"
            style={{ height: '40px', width: 'auto', borderRadius: '8px' }}
          />
          <span style={{ fontSize: '24px', color: '#fff', fontWeight: 800 }}>5.55 Client</span>
        </Link>

        {/* Tab Selector */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.04)',
            padding: '4px',
            borderRadius: '10px',
            marginBottom: '24px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setStatus({ text: '', type: '' });
            }}
            style={{
              flex: 1,
              padding: '9px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              borderRadius: '7px',
              cursor: 'pointer',
              background: mode === 'login' ? 'var(--primary)' : 'transparent',
              color: mode === 'login' ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.2s',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setStatus({ text: '', type: '' });
            }}
            style={{
              flex: 1,
              padding: '9px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              borderRadius: '7px',
              cursor: 'pointer',
              background: mode === 'register' ? 'var(--primary)' : 'transparent',
              color: mode === 'register' ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.2s',
            }}
          >
            Register
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('key');
              setStatus({ text: '', type: '' });
            }}
            style={{
              flex: 1,
              padding: '9px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              borderRadius: '7px',
              cursor: 'pointer',
              background: mode === 'key' ? 'var(--primary)' : 'transparent',
              color: mode === 'key' ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.2s',
            }}
          >
            License Key
          </button>
        </div>

        {/* 1. SIGN IN FORM */}
        {mode === 'login' && (
          <form onSubmit={handleSignIn}>
            <h2 style={{ fontSize: '22px', marginBottom: '6px', color: '#fff', fontWeight: 800 }}>
              Welcome Back
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '22px' }}>
              Sign in to manage your Java and C++ client entitlements.
            </p>

            <div className="form-group" style={{ textAlign: 'left', marginBottom: '14px' }}>
              <label className="form-label" style={{ fontSize: '11.5px', textTransform: 'uppercase' }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-control"
                placeholder="name@example.com"
                required
                style={{ fontSize: '14px', padding: '11px 14px' }}
              />
            </div>

            <div className="form-group" style={{ textAlign: 'left', marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" style={{ fontSize: '11.5px', textTransform: 'uppercase' }}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setStatus({ text: '', type: '' });
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#818cf8',
                    fontSize: '11.5px',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Forgot password?
                </button>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-control"
                placeholder="••••••••"
                required
                style={{ fontSize: '14px', padding: '11px 14px' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                borderRadius: '10px',
                marginTop: '16px',
                fontWeight: 700,
              }}
            >
              {loading ? 'Authenticating...' : 'Sign In →'}
            </button>
          </form>
        )}

        {/* 2. REGISTER FORM */}
        {mode === 'register' && (
          <form onSubmit={handleSignUp}>
            <h2 style={{ fontSize: '22px', marginBottom: '6px', color: '#fff', fontWeight: 800 }}>
              Create Account
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '22px' }}>
              Create your permanent 5.55 Client account.
            </p>

            <div className="form-group" style={{ textAlign: 'left', marginBottom: '14px' }}>
              <label className="form-label" style={{ fontSize: '11.5px', textTransform: 'uppercase' }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="form-control"
                placeholder="Choose username"
                required
                style={{ fontSize: '14px', padding: '11px 14px' }}
              />
            </div>

            <div className="form-group" style={{ textAlign: 'left', marginBottom: '14px' }}>
              <label className="form-label" style={{ fontSize: '11.5px', textTransform: 'uppercase' }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-control"
                placeholder="name@example.com"
                required
                style={{ fontSize: '14px', padding: '11px 14px' }}
              />
            </div>

            <div className="form-group" style={{ textAlign: 'left', marginBottom: '14px' }}>
              <label className="form-label" style={{ fontSize: '11.5px', textTransform: 'uppercase' }}>
                Password (min 6 chars)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-control"
                placeholder="••••••••"
                required
                style={{ fontSize: '14px', padding: '11px 14px' }}
              />
            </div>

            <div className="form-group" style={{ textAlign: 'left', marginBottom: '16px' }}>
              <label className="form-label" style={{ fontSize: '11.5px', textTransform: 'uppercase' }}>
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="form-control"
                placeholder="••••••••"
                required
                style={{ fontSize: '14px', padding: '11px 14px' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                borderRadius: '10px',
                fontWeight: 700,
              }}
            >
              {loading ? 'Creating Account...' : 'Register Now →'}
            </button>
          </form>
        )}

        {/* 3. FORGOT PASSWORD FORM */}
        {mode === 'forgot' && (
          <form onSubmit={handlePasswordReset}>
            <h2 style={{ fontSize: '22px', marginBottom: '6px', color: '#fff', fontWeight: 800 }}>
              Reset Password
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '22px' }}>
              Enter your email and we'll send you a password recovery link.
            </p>

            <div className="form-group" style={{ textAlign: 'left', marginBottom: '16px' }}>
              <label className="form-label" style={{ fontSize: '11.5px', textTransform: 'uppercase' }}>
                Account Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-control"
                placeholder="name@example.com"
                required
                style={{ fontSize: '14px', padding: '11px 14px' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                borderRadius: '10px',
                fontWeight: 700,
                marginBottom: '10px',
              }}
            >
              {loading ? 'Sending link...' : 'Send Recovery Link →'}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('login');
                setStatus({ text: '', type: '' });
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#818cf8',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              ← Back to Sign In
            </button>
          </form>
        )}

        {/* 4. LICENSE KEY DIRECT FORM */}
        {mode === 'key' && (
          <form onSubmit={handleKeyLogin}>
            <h2 style={{ fontSize: '22px', marginBottom: '6px', color: '#fff', fontWeight: 800 }}>
              License Key
            </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '22px' }}>
              Enter your product license key for instant dashboard access.
            </p>

            <div className="form-group" style={{ textAlign: 'left', marginBottom: '16px' }}>
              <label className="form-label" style={{ fontSize: '11.5px', textTransform: 'uppercase' }}>
                Product License Key
              </label>
              <input
                type="text"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                className="form-control"
                placeholder="555C-XXXX-XXXX-XXXX"
                required
                style={{ fontSize: '14px', padding: '11px 14px', letterSpacing: '0.05em' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                borderRadius: '10px',
                fontWeight: 700,
              }}
            >
              {loading ? 'Verifying...' : 'Authorize Session →'}
            </button>
          </form>
        )}

        {/* Discord OAuth Option Divider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            margin: '22px 0 16px',
          }}
        >
          <span style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          <span
            style={{
              fontSize: '11px',
              color: 'var(--text-dim)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            or continue with
          </span>
          <span style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        </div>

        {/* Discord OAuth Button */}
        <button
          onClick={handleDiscordOAuth}
          disabled={loading}
          className="btn btn-discord"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            padding: '11px 16px',
            fontSize: '13.5px',
            fontWeight: 700,
            borderRadius: '10px',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginBottom: '8px',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
          </svg>
          <span>Continue with Discord</span>
        </button>

        {/* Status display */}
        {status.text && (
          <div
            style={{
              marginTop: '14px',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              background:
                status.type === 'danger'
                  ? 'rgba(239, 68, 68, 0.12)'
                  : status.type === 'info'
                  ? 'rgba(56, 189, 248, 0.12)'
                  : 'rgba(34, 197, 94, 0.12)',
              border: `1px solid ${
                status.type === 'danger'
                  ? 'rgba(239, 68, 68, 0.3)'
                  : status.type === 'info'
                  ? 'rgba(56, 189, 248, 0.3)'
                  : 'rgba(34, 197, 94, 0.3)'
              }`,
              color:
                status.type === 'danger'
                  ? '#f87171'
                  : status.type === 'info'
                  ? '#38bdf8'
                  : '#4ade80',
            }}
          >
            {status.text}
          </div>
        )}
      </div>
    </div>
  );
}
