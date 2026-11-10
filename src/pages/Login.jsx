import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { auth, API_BASE } from '../utils/api';

const DISCORD_CLIENT_ID = '1557993745884905512';

export default function Login() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [keyOrUsername, setKeyOrUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ text: '', type: '' });
  const [showOAuthHelp, setShowOAuthHelp] = useState(false);
  const [copiedRedirect, setCopiedRedirect] = useState(false);

  // 1. Detect direct token in search params (?token=...) or Discord OAuth hash (#access_token=...)
  useEffect(() => {
    // Check direct query token (from /weblogin command)
    const queryToken = searchParams.get('token');
    if (queryToken) {
      auth.setToken(queryToken);
      navigate('/dashboard', { replace: true });
      return;
    }

    // Check OAuth fragment token
    const hash = window.location.hash;
    if (hash && hash.includes('access_token=')) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      if (accessToken) {
        setLoading(true);
        setStatus({ text: 'Syncing Discord profile with 5.55 Licensing Bot...', type: 'info' });

        fetch('https://discord.com/api/users/@me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
          .then((res) => res.json())
          .then(async (discordUser) => {
            if (discordUser?.id) {
              const avatarUrl = discordUser.avatar
                ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png?size=256`
                : null;

              // Sync with 5.55 bot backend
              try {
                const syncRes = await fetch(`${API_BASE}/auth/discord-sync`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    discordId: discordUser.id,
                    username: discordUser.username,
                    displayName: discordUser.global_name || discordUser.username,
                    avatarUrl,
                  }),
                });
                const syncData = await syncRes.json();
                if (syncData.token) {
                  auth.setToken(syncData.token);
                  localStorage.setItem('plutora_user', JSON.stringify(syncData.user));
                } else {
                  auth.setToken('discord_' + discordUser.id);
                  localStorage.setItem('plutora_user', JSON.stringify(discordUser));
                }
              } catch {
                auth.setToken('discord_' + discordUser.id);
                localStorage.setItem('plutora_user', JSON.stringify(discordUser));
              }

              window.history.replaceState(null, '', window.location.pathname);
              const returnUrl = sessionStorage.getItem('plutora_login_return');
              if (returnUrl === '/trial') {
                sessionStorage.removeItem('plutora_login_return');
                navigate('/trial');
              } else {
                navigate('/dashboard');
              }
            } else {
              setStatus({ text: 'Failed to retrieve Discord profile.', type: 'danger' });
            }
          })
          .catch(() => {
            setStatus({ text: 'Error connecting to Discord API.', type: 'danger' });
          })
          .finally(() => setLoading(false));
      }
    }
  }, [navigate]);

  // 2. Direct login with Discord OAuth URL
  const handleDiscordOAuth = () => {
    const redirectUri = encodeURIComponent(window.location.origin + '/login');
    const discordAuthUrl = `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&response_type=token&redirect_uri=${redirectUri}&scope=identify`;
    window.location.href = discordAuthUrl;
  };

  // 3. Direct Key or Username login (instantly syncs with bot DB)
  const handleKeyOrUserLogin = async (e) => {
    e?.preventDefault();
    const query = keyOrUsername.trim().toUpperCase();
    if (!query) {
      setStatus({ text: 'Please enter your Discord username or License key.', type: 'danger' });
      return;
    }

    const isKeyLike = query.includes('-');
    const KEY_FORMAT_REGEX = /^[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/i;
    if (isKeyLike && !KEY_FORMAT_REGEX.test(query)) {
      setStatus({
        text: 'Incorrect key format! Key must follow: 5558N-87WEF-CB9VM-F95M6',
        type: 'danger',
      });
      return;
    }

    setLoading(true);
    setStatus({ text: '', type: '' });

    try {
      // Sync with bot database directly
      const res = await fetch(`${API_BASE}/auth/discord-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discordId: query.startsWith('CLIENT-') ? '0' : query,
          username: query,
          displayName: query,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.token) {
        auth.setToken(data.token);
        localStorage.setItem('plutora_user', JSON.stringify(data.user));
        navigate('/dashboard');
      } else {
        // Fallback demo login
        auth.setToken('session_' + Date.now());
        localStorage.setItem(
          'plutora_user',
          JSON.stringify({
            id: query,
            username: query,
            displayName: query,
            avatar: null,
          })
        );
        navigate('/dashboard');
      }
    } catch {
      auth.setToken('session_' + Date.now());
      localStorage.setItem(
        'plutora_user',
        JSON.stringify({
          id: query,
          username: query,
          displayName: query,
          avatar: null,
        })
      );
      navigate('/dashboard');
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
          maxWidth: '440px',
          width: '100%',
          textAlign: 'center',
          borderRadius: 'var(--radius-lg)',
          padding: '40px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
        }}
      >
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            marginBottom: '24px',
            textDecoration: 'none',
          }}
        >
          <img
            src="/logo.png"
            alt="5.55 Logo"
            style={{ height: '42px', width: 'auto', borderRadius: '8px' }}
          />
          <span style={{ fontSize: '24px', color: '#fff', fontWeight: 800 }}>
            5.55 Client
          </span>
        </Link>

        <h2 style={{ fontSize: '24px', marginBottom: '8px', color: '#fff', fontWeight: 800 }}>
          Sign In
        </h2>
        <p
          style={{
            fontSize: '13.5px',
            color: 'var(--text-muted)',
            marginBottom: '28px',
            lineHeight: 1.5,
          }}
        >
          Authenticate with your Discord account to manage your 5.55 licenses, HWID resets, and launcher commands.
        </p>

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
            padding: '13px 20px',
            fontSize: '14.5px',
            fontWeight: 700,
            borderRadius: '12px',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginBottom: '10px',
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="currentColor"
            style={{ flexShrink: 0 }}
          >
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
          </svg>
          <span>Continue with Discord</span>
        </button>

        <button
          type="button"
          onClick={() => setShowOAuthHelp(!showOAuthHelp)}
          style={{
            background: 'none',
            border: 'none',
            color: '#a5b4fc',
            fontSize: '12px',
            cursor: 'pointer',
            marginBottom: '20px',
            textDecoration: 'underline',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          {showOAuthHelp ? 'Hide Discord setup help' : 'Getting "Invalid OAuth2 redirect_uri"? Click here'}
        </button>

        {showOAuthHelp && (
          <div
            style={{
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.28)',
              borderRadius: '12px',
              padding: '14px 16px',
              textAlign: 'left',
              fontSize: '12.5px',
              color: '#d1d5db',
              lineHeight: 1.55,
              marginBottom: '22px',
            }}
          >
            <p style={{ margin: '0 0 8px', fontWeight: 700, color: '#fff' }}>
              🔧 How to authorize redirect in Discord Developer Portal:
            </p>
            <ol style={{ margin: '0 0 10px', paddingLeft: '18px' }}>
              <li>
                Open{' '}
                <a
                  href="https://discord.com/developers/applications/1557993745884905512/oauth2"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: '#818cf8', fontWeight: 600, textDecoration: 'underline' }}
                >
                  Discord Developer Portal (OAuth2)
                </a>
              </li>
              <li>
                Under <strong>Redirects</strong>, click <strong>Add Redirect</strong>
              </li>
              <li>Paste this exact URL and click <strong>Save Changes</strong>:</li>
            </ol>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                padding: '7px 10px',
                marginBottom: '10px',
                fontFamily: 'monospace',
                fontSize: '12px',
                color: '#38bdf8',
                wordBreak: 'break-all',
              }}
            >
              <span>{window.location.origin}/login</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/login`);
                  setCopiedRedirect(true);
                  setTimeout(() => setCopiedRedirect(false), 2000);
                }}
                style={{
                  background: '#6366f1',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  flexShrink: 0,
                  marginLeft: '8px',
                }}
              >
                {copiedRedirect ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <p style={{ margin: 0, fontSize: '11.5px', color: '#9ca3af' }}>
              💡 <em>Or run <code>/weblogin</code> in your Discord server for instant 1-click access!</em>
            </p>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            marginBottom: '24px',
          }}
        >
          <span style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          <span
            style={{
              fontSize: '11.5px',
              color: 'var(--text-dim)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            or license / username
          </span>
          <span style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        </div>

        {/* License Key or Username Input Form */}
        <form onSubmit={handleKeyOrUserLogin}>
          <div className="form-group" style={{ textAlign: 'left', marginBottom: '18px' }}>
            <label className="form-label" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Discord Username or License Key
            </label>
            <input
              type="text"
              value={keyOrUsername}
              onChange={(e) => setKeyOrUsername(e.target.value)}
              className="form-control"
              placeholder="e.g. 5558N-87WEF-CB9VM-F95M6 or discord username"
              required
              style={{ fontSize: '14px', padding: '12px 14px' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '12px 20px',
              fontSize: '14.5px',
              borderRadius: '12px',
            }}
          >
            {loading ? 'Authenticating...' : 'Sign In →'}
          </button>
        </form>

        {status.text && (
          <div
            style={{
              marginTop: '16px',
              fontSize: '13px',
              color: status.type === 'danger' ? '#f87171' : status.type === 'info' ? '#38bdf8' : '#4ade80',
            }}
          >
            {status.text}
          </div>
        )}
      </div>
    </div>
  );
}
