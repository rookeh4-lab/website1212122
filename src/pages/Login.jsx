import React, { useState } from 'react';
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
  EyeOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signIn, signUp, signOut, isAdmin } = useAuth();

  // Mode: 'login' | 'register'
  const [mode, setMode] = useState('login');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Destination after login
  const from = location.state?.from || (email.toLowerCase().trim() === 'rookeh4@gmail.com' ? '/admin' : '/');

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
            navigate(from, { replace: true });
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

  // If already logged in, show current profile card with quick switch/logout
  if (user) {
    return (
      <div style={{ minHeight: '85vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
        <div
          style={{
            maxWidth: '440px',
            width: '100%',
            background: '#0d1527',
            border: '1px solid #1e293b',
            borderRadius: '16px',
            padding: '32px 28px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            textAlign: 'center',
          }}
        >
          <img
            src="/logo.png"
            alt="Client Syndicate"
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              objectFit: 'cover',
              margin: '0 auto 16px auto',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              boxShadow: '0 0 20px rgba(56, 189, 248, 0.25)',
            }}
          />

          <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#ffffff', marginBottom: '6px' }}>
            Currently Signed In
          </h2>

          <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginBottom: '20px' }}>
            Logged in as <strong style={{ color: '#38bdf8' }}>{user.email}</strong>
          </p>

          {isAdmin ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '999px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#10b981',
                fontSize: '0.80rem',
                fontWeight: '700',
                marginBottom: '24px',
              }}
            >
              <ShieldCheck size={14} />
              <span>ADMINISTRATOR VERIFIED</span>
            </div>
          ) : (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '999px',
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                color: '#38bdf8',
                fontSize: '0.80rem',
                fontWeight: '600',
                marginBottom: '24px',
              }}
            >
              <User size={13} />
              <span>Member Account</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {isAdmin && (
              <button
                onClick={() => navigate('/admin')}
                className="btn-gold"
                style={{ width: '100%', padding: '10px', fontSize: '0.90rem' }}
              >
                Go to Admin Panel
              </button>
            )}

            <button
              onClick={() => navigate('/')}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '10px',
                background: '#131e36',
                border: '1px solid #1e2f4a',
                color: '#ffffff',
                fontWeight: '600',
                fontSize: '0.88rem',
                cursor: 'pointer',
              }}
            >
              Return to Archive
            </button>

            <button
              onClick={signOut}
              style={{
                width: '100%',
                padding: '9px',
                borderRadius: '10px',
                background: 'transparent',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                fontWeight: '600',
                fontSize: '0.84rem',
                cursor: 'pointer',
                marginTop: '6px',
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

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
                Username
              </label>
              <div style={{ position: 'relative' }}>
                <User size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. Dexter"
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
