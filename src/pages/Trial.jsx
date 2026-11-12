import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { auth, copyText, API_BASE } from '../utils/api';

const TRIAL_INVITE_KEY = 'c555_trial_invitation';

function getTrialStatus(trial) {
  if (!trial) return '';
  if (trial.status === 'active' && trial.expiresAt && Date.parse(trial.expiresAt) <= Date.now()) {
    return 'expired';
  }
  return trial.status;
}

function getBadgeStyle(status) {
  if (status === 'active') {
    return { bg: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', label: 'Active' };
  }
  if (status === 'expired') {
    return { bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171', label: 'Expired' };
  }
  if (status === 'paused') {
    return { bg: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', label: 'Paused' };
  }
  if (status === 'revoked') {
    return { bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171', label: 'Revoked' };
  }
  return { bg: 'rgba(255, 255, 255, 0.08)', color: '#e4e4e7', label: status || 'Unknown' };
}

const cardStyle = {
  background: 'rgba(18, 17, 22, 0.72)',
  border: '1px solid rgba(255, 255, 255, 0.07)',
  borderRadius: 16,
  padding: '24px 28px',
};

const subTextStyle = {
  color: '#8e8e99',
  fontSize: 13,
  lineHeight: 1.55,
  margin: 0,
};

const buttonStyle = {
  background: 'rgba(255, 255, 255, 0.08)',
  border: 'none',
  borderRadius: 14,
  padding: '10px 18px',
  color: '#fff',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export default function Trial() {
  const [trial, setTrial] = useState(null);
  const [info, setInfo] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(!!auth.getToken());

  useEffect(() => {
    const url = new URL(window.location.href);
    const invite = new URLSearchParams(url.hash.slice(1)).get('invite');
    if (invite) {
      sessionStorage.setItem(TRIAL_INVITE_KEY, invite);
      url.hash = '';
      window.history.replaceState(null, '', url.pathname + url.search);
    }

    let isSubscribed = true;

    async function loadTrialData() {
      try {
        const [infoRes, profile] = await Promise.all([
          fetch(`${API_BASE}/trials/info`, { cache: 'no-store' }),
          auth.getProfile().catch(() => null),
        ]);
        const infoData = await infoRes.json().catch(() => ({}));
        if (isSubscribed && infoRes.ok) setInfo(infoData);

        if (!profile?.user) {
          if (isSubscribed) setIsLoggedIn(false);
          return;
        }
        if (isSubscribed) setIsLoggedIn(true);

        const token = auth.getToken();
        const myRes = await fetch(`${API_BASE}/trials/my`, {
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: 'no-store',
        });
        const myData = await myRes.json().catch(() => ({}));
        if (isSubscribed && myRes.ok && myData.trial) {
          setTrial(myData.trial);
        }
      } catch {
        if (isSubscribed) {
          setErrorMsg('Trial status endpoint is currently unavailable.');
        }
      } finally {
        if (isSubscribed) setInitialLoading(false);
      }
    }

    loadTrialData();
    return () => {
      isSubscribed = false;
    };
  }, []);

  const handleClaim = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const invite = sessionStorage.getItem(TRIAL_INVITE_KEY);
      const token = auth.getToken();
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/trials/claim`, {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers,
        body: JSON.stringify(invite ? { invite } : {}),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.trial) {
        sessionStorage.removeItem(TRIAL_INVITE_KEY);
        setTrial(data.trial);
      } else {
        setErrorMsg(
          data?.error ||
            'Automated self-serve trial keys are currently disabled. Please sign in or contact staff on Discord for an invitation key.'
        );
      }
    } catch {
      setErrorMsg('Unable to reach trial activation service right now.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (trial?.licenseKey) {
      try {
        await copyText(trial.licenseKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      } catch {
        setErrorMsg('Could not copy key.');
      }
    }
  };

  const statusStr = getTrialStatus(trial);
  const badge = getBadgeStyle(statusStr);
  const durationLabel = info?.durationLabel || '3 days';

  return (
    <div className="container" style={{ maxWidth: 860, padding: '40px 24px 80px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 800,
            color: '#fff',
            letterSpacing: '-0.02em',
            margin: 0,
          }}
        >
          Free Trial
        </h1>
        <p style={{ ...subTextStyle, marginTop: 8, fontSize: 14 }}>
          Full client access for {durationLabel}. Same loader as paid plans.
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          marginBottom: 32,
        }}
      >
        <span
          style={{
            padding: '12px 2px 14px',
            fontSize: 14,
            fontWeight: 600,
            color: '#fff',
            borderBottom: '2px solid #fff',
          }}
        >
          Start trial
        </span>
        <Link
          to="/dashboard"
          style={{
            padding: '12px 2px 14px',
            fontSize: 14,
            fontWeight: 600,
            color: '#8e8e99',
            textDecoration: 'none',
            borderBottom: '2px solid transparent',
          }}
        >
          Dashboard
        </Link>
        <Link
          to="/download"
          style={{
            padding: '12px 2px 14px',
            fontSize: 14,
            fontWeight: 600,
            color: '#8e8e99',
            textDecoration: 'none',
            borderBottom: '2px solid transparent',
          }}
        >
          Download
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {trial ? (
          <div style={cardStyle}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    background: badge.bg,
                    color: badge.color,
                    padding: '4px 10px',
                    borderRadius: 9999,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {badge.label}
                </span>
                <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>
                  3-Day Trial License
                </span>
              </div>
              {trial.expiresAt && (
                <span style={{ fontSize: 13, color: '#8e8e99' }}>
                  Expires: {new Date(trial.expiresAt).toLocaleDateString()}
                </span>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(0, 0, 0, 0.45)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 12,
                padding: '14px 18px',
                marginBottom: 20,
              }}
            >
              <code style={{ fontSize: 15, color: '#c4b5fd', fontFamily: 'monospace' }}>
                {trial.licenseKey}
              </code>
              <button
                onClick={handleCopy}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                {copied ? '✓ Copied' : 'Copy Key'}
              </button>
            </div>

            {statusStr !== 'active' && (
              <p style={{ ...subTextStyle, marginBottom: 16, color: '#fca5a5' }}>
                This 3-day free trial is no longer active. Upgrade to a paid license to continue launching 5.55 Client.
              </p>
            )}

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {statusStr === 'active' && (
                <Link
                  to={trial?.licenseKey ? `/download?key=${encodeURIComponent(trial.licenseKey)}` : '/download'}
                  style={{ ...buttonStyle, background: '#6d28d9' }}
                >
                  Download Loader →
                </Link>
              )}
              <Link to="/checkout" style={statusStr === 'active' ? buttonStyle : { ...buttonStyle, background: '#6d28d9' }}>
                Upgrade to Full Plan
              </Link>
            </div>
          </div>
        ) : !isLoggedIn ? (
          <div style={{ ...cardStyle, textAlign: 'center', padding: '48px 24px' }}>
            <h3 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: '0 0 10px' }}>
              Sign in to Claim Trial
            </h3>
            <p style={{ ...subTextStyle, maxWidth: 440, margin: '0 auto 24px' }}>
              Use Discord to create or open your 5.55 Client account, then instantly activate your free 3-day access.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              <Link
                to="/login"
                style={{
                  ...buttonStyle,
                  background: '#fff',
                  color: '#09090b',
                  fontWeight: 700,
                  padding: '12px 24px',
                }}
              >
                Sign In Now
              </Link>
            </div>
          </div>
        ) : (
          <div style={cardStyle}>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>
              Claim Your Free Trial
            </h3>
            <p style={{ ...subTextStyle, marginBottom: 20 }}>
              One free 3-day trial per account. No credit card required.
            </p>
            <button
              onClick={handleClaim}
              disabled={loading}
              style={{
                ...buttonStyle,
                background: '#6d28d9',
                padding: '12px 24px',
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              {loading ? 'Activating...' : 'Activate 3-Day Trial'}
            </button>
          </div>
        )}

        {errorMsg && (
          <p role="alert" style={{ margin: 0, color: '#f87171', fontSize: 14 }}>
            {errorMsg}
          </p>
        )}
      </div>
    </div>
  );
}
