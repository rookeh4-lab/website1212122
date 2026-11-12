import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { auth, API_BASE } from '../utils/api';

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
  const [showOAuthHelp, setShowOAuthHelp] = useState(false); // kept for potential future use

  // 1. Check OAuth Authorization Code callback or existing session on mount
  useEffect(() => {
    let active = true;

    const initAuth = async () => {
      // Check password reset redirect
      if (searchParams.get('reset') === 'true') {
        setStatus({ text: 'Please enter your new password below.', type: 'info' });
      }

      // Check for any auth errors in URL params
      const oauthError = searchParams.get('oauth_error');
      if (oauthError) {
        window.history.replaceState({}, document.title, window.location.pathname);
        setStatus({
          text: 'Authentication failed. Please try again.',
          type: 'danger',
        });
        return;
      }

      // Strip any unexpected hash fragments from /login URL immediately
      if (window.location.hash && window.location.hash.length > 1) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
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
