import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { auth, copyText, API_BASE } from '../utils/api';

export default function Download() {
  const [searchParams] = useSearchParams();
  const [licenseKey, setLicenseKey] = useState(searchParams.get('key') || '');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [errorType, setErrorType] = useState('');
  const [successData, setSuccessData] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [userLicenses, setUserLicenses] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // If user is logged in, optionally show their existing keys for one-click redemption
  useEffect(() => {
    let active = true;
    const fetchUserKeys = async () => {
      try {
        const profile = await auth.getProfile();
        if (!active || !profile?.user) return;
        setIsLoggedIn(true);
        const token = await auth.getToken();
        const res = await fetch(`${API_BASE}/user/licenses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (active && data.licenses) {
          setUserLicenses(data.licenses);
        }
      } catch {
        // Guest mode is totally fine
      }
    };
    fetchUserKeys();
    return () => { active = false; };
  }, []);

  const handleRedeem = async (e, directKey = null) => {
    if (e) e.preventDefault();
    const keyToSubmit = (directKey || licenseKey).trim().toUpperCase();
    if (!keyToSubmit) {
      setErrorMsg('Please enter your license key.');
      setErrorType('INVALID_KEY');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setErrorType('');
    setSuccessData(null);

    try {
      const res = await fetch(`${API_BASE}/licenses/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ license_key: keyToSubmit }),
      });

      const data = await res.json();

      if (res.ok && data.valid && data.authorized) {
        setSuccessData(data);
        setLicenseKey(data.key || keyToSubmit);
      } else {
        const msg = data.message || data.error || 'Failed to verify license key.';
        setErrorMsg(msg);
        setErrorType(data.error || 'ERROR');
      }
    } catch {
      setErrorMsg('Error connecting to download verification server. Please try again.');
      setErrorType('NETWORK_ERROR');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (successData?.key) {
      copyText(successData.key);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '820px', padding: '56px 24px 96px' }}>
      {/* Brand Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '999px',
            background: 'rgba(99, 102, 241, 0.12)',
            border: '1px solid rgba(99, 102, 241, 0.28)',
            color: '#a5b4fc',
            fontSize: '12px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '16px',
          }}
        >
          <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#6366f1' }} />
          5.55 Client Licensing & Download Engine
        </div>

        <h1
          style={{
            fontSize: '36px',
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: '-0.025em',
            margin: '0 0 12px',
          }}
        >
          Redeem License & Download
        </h1>
        <p
          style={{
            color: 'var(--text-muted, #94a3b8)',
            fontSize: '15px',
            maxWidth: '540px',
            margin: '0 auto',
            lineHeight: 1.6,
          }}
        >
          Enter your purchased license key below to unlock immediate access to the 5.55 C++ Client loader.
        </p>
      </div>

      {/* Main Key Input Card */}
      <div
        style={{
          background: 'var(--bg-card, rgba(17, 24, 39, 0.75))',
          border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
          borderRadius: '20px',
          padding: '36px 32px',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(16px)',
          marginBottom: '32px',
        }}
      >
        <form onSubmit={handleRedeem}>
          <label
            htmlFor="license-key-input"
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--text-secondary, #cbd5e1)',
              marginBottom: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            5.55 License Key
          </label>

          <div
            style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <input
              id="license-key-input"
              type="text"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
              placeholder="555C-XXXX-XXXX-XXXX"
              autoComplete="off"
              spellCheck="false"
              style={{
                flex: '1 1 320px',
                padding: '16px 20px',
                borderRadius: '12px',
                background: 'rgba(10, 14, 26, 0.85)',
                border: errorMsg ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.14)',
                color: '#ffffff',
                fontFamily: 'monospace, Consolas, Courier New',
                fontSize: '16px',
                fontWeight: 600,
                letterSpacing: '0.06em',
                outline: 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
            />

            <button
              type="submit"
              disabled={loading || !licenseKey.trim()}
              style={{
                padding: '16px 32px',
                borderRadius: '12px',
                border: 'none',
                background: loading
                  ? 'rgba(99, 102, 241, 0.5)'
                  : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                color: '#ffffff',
                fontSize: '15px',
                fontWeight: 700,
                cursor: loading || !licenseKey.trim() ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                minWidth: '160px',
                justifyContent: 'center',
              }}
            >
              {loading ? (
                <>
                  <span
                    style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      borderTopColor: '#ffffff',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                    }}
                  />
                  <span>Verifying...</span>
                </>
              ) : (
                <span>Redeem & Download</span>
              )}
            </button>
          </div>
        </form>

        {/* Informational Guidance */}
        <div
          style={{
            marginTop: '14px',
            fontSize: '12px',
            color: 'var(--text-muted, #94a3b8)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span>Example: <code>555C-A82K-P9XM-7QZW</code> (found in your SellAuth purchase receipt)</span>
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div
            style={{
              marginTop: '20px',
              padding: '14px 18px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#fca5a5',
              fontSize: '14px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Success Card & Download Gate */}
      {successData && (
        <div
          style={{
            background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, rgba(17, 24, 39, 0.85) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            borderRadius: '20px',
            padding: '36px 32px',
            boxShadow: '0 20px 40px -15px rgba(16, 185, 129, 0.2)',
            backdropFilter: 'blur(16px)',
            marginBottom: '32px',
            animation: 'fadeIn 0.3s ease-out',
          }}
        >
          {/* Header Banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '24px',
              paddingBottom: '20px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>
                  License verified successfully.
                </div>
                <div style={{ fontSize: '13px', color: '#10b981', fontWeight: 600 }}>
                  Product: {successData.product_name || '5.55 C++ Client'}
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                fontFamily: 'monospace',
                fontSize: '13px',
                color: '#e2e8f0',
              }}
            >
              <span>{successData.key}</span>
              <button
                type="button"
                onClick={handleCopy}
                style={{
                  background: 'none',
                  border: 'none',
                  color: copiedKey ? '#10b981' : '#94a3b8',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  fontSize: '11px',
                  fontWeight: 700,
                }}
              >
                {copiedKey ? 'COPIED' : 'COPY'}
              </button>
            </div>
          </div>

          {/* Download Action Area */}
          <div style={{ textAlign: 'center', padding: '16px 0 24px' }}>
            <a
              href={`${API_BASE}${successData.download_url}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                padding: '18px 44px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                fontSize: '17px',
                fontWeight: 800,
                textDecoration: 'none',
                boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)',
                transition: 'all 0.2s',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Download 555 Client Loader</span>
            </a>

            <div style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)', marginTop: '12px' }}>
              Package: <code>SyndicateLoader.exe</code> (5.28 MB) · Windows 64-bit · Fabric 1.21.11 Single Player
            </div>
          </div>

          {/* Activation Instructions */}
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.35)',
              borderRadius: '14px',
              padding: '20px 24px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#ffffff',
                marginBottom: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              How to activate in 3 simple steps:
            </div>

            <ol
              style={{
                margin: 0,
                paddingLeft: '20px',
                fontSize: '14px',
                color: 'var(--text-secondary, #cbd5e1)',
                lineHeight: 1.8,
              }}
            >
              <li>Run <strong>SyndicateLoader.exe</strong> on your computer.</li>
              <li>
                Enter your same license key:{' '}
                <strong style={{ fontFamily: 'monospace', color: '#6ee7b7' }}>{successData.key}</strong>
              </li>
              <li>Start Minecraft Fabric 1.21.11, click <strong>Launch</strong>, and press <strong>Right Shift</strong> in game.</li>
            </ol>

            <div
              style={{
                marginTop: '16px',
                paddingTop: '12px',
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                fontSize: '12px',
                color: '#6ee7b7',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>
                <strong>Important:</strong> Website redemption does NOT consume your key. It remains fully valid for activating the loader on your computer.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Account Quick-Fill (if user is logged in and owns keys) */}
      {isLoggedIn && userLicenses.length > 0 && !successData && (
        <div
          style={{
            background: 'var(--bg-card, rgba(17, 24, 39, 0.75))',
            border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
            borderRadius: '16px',
            padding: '24px 28px',
          }}
        >
          <div
            style={{
              fontSize: '14px',
              fontWeight: 700,
              color: '#ffffff',
              marginBottom: '12px',
            }}
          >
            Your Account Licenses (One-Click Redemption):
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {userLicenses.map((lic) => (
              <div
                key={lic.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div>
                  <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#ffffff', fontSize: '14px' }}>
                    {lic.license_key}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)', marginTop: '2px' }}>
                    {lic.products?.name || '5.55 Client'} · Status: <span style={{ color: lic.status === 'active' ? '#10b981' : '#f59e0b' }}>{lic.status}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setLicenseKey(lic.license_key);
                    handleRedeem(null, lic.license_key);
                  }}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: '1px solid rgba(99, 102, 241, 0.4)',
                    background: 'rgba(99, 102, 241, 0.15)',
                    color: '#c7d2fe',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Use Key
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
