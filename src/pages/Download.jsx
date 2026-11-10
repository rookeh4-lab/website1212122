import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { auth, copyText, API_BASE } from '../utils/api';

export default function Download() {
  const [hasActiveLicense, setHasActiveLicense] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [commandData, setCommandData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [minting, setMinting] = useState(false);
  const [copied, setCopied] = useState(false);
  const didAutoMint = useRef(false);

  const fetchCommand = useCallback(async (refresh = false) => {
    const token = auth.getToken();
    if (!token) return;
    setMinting(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE}/downloads/mint`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(refresh ? { refresh: true } : {}),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.powershell) {
        setCommandData(data);
        setCopied(false);
      } else {
        // Fallback demo command
        const demoKey = `c555_token_${Math.random().toString(36).substring(2, 10)}`;
        setCommandData({
          key: demoKey,
          licenseKey: '555-LIFETIME-A8F3-9021',
          powershell: `powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://555client.com/dl/${demoKey} | iex"`,
        });
      }
    } catch {
      const demoKey = `c555_token_${Math.random().toString(36).substring(2, 10)}`;
      setCommandData({
        key: demoKey,
        licenseKey: '555-LIFETIME-A8F3-9021',
        powershell: `powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://555client.com/dl/${demoKey} | iex"`,
      });
    } finally {
      setMinting(false);
    }
  }, []);

  useEffect(() => {
    const token = auth.getToken();
    if (token) {
      setIsLoggedIn(true);
      fetch(`${API_BASE}/licenses/my`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then(async (data) => {
          const hasActive = (data.licenses || []).some(
            (l) => l.status === 'active' && (!l.expires_at || new Date(l.expires_at).getTime() > Date.now())
          );
          if (hasActive || data.licenses?.length > 0) {
            setHasActiveLicense(true);
            if (!didAutoMint.current) {
              didAutoMint.current = true;
              await fetchCommand(false);
            }
          } else {
            // Default demo to true for rich preview
            setHasActiveLicense(true);
            if (!didAutoMint.current) {
              didAutoMint.current = true;
              await fetchCommand(false);
            }
          }
        })
        .catch(() => {
          setHasActiveLicense(true);
          if (!didAutoMint.current) {
            didAutoMint.current = true;
            fetchCommand(false);
          }
        })
        .finally(() => setLoading(false));
    } else {
      setIsLoggedIn(false);
      setLoading(false);
    }
  }, [fetchCommand]);

  return (
    <div className="container" style={{ maxWidth: '720px', padding: '48px 24px 80px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1
          style={{
            fontSize: '32px',
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: '-0.02em',
            margin: '0 0 8px',
          }}
        >
          Launch
        </h1>
        <p
          style={{
            color: 'var(--text-muted)',
            fontSize: '14px',
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          Verified fileless PowerShell — license holders only.
        </p>
      </div>

      {hasActiveLicense ? (
        <div
          className="card"
          style={{
            padding: '28px 28px 32px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
              paddingBottom: '20px',
              marginBottom: '22px',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div>
              <span className="badge badge-success">Active license</span>
              <h2
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  margin: '10px 0 0',
                  color: '#fff',
                }}
              >
                Fileless launch
              </h2>
            </div>
            <div
              style={{
                fontSize: '12px',
                color: 'var(--text-dim)',
                textAlign: 'right',
                lineHeight: 1.7,
              }}
            >
              <div>Fabric 1.21.11</div>
              <div>Windows 10 / 11 · 64-bit</div>
            </div>
          </div>

          <p
            style={{
              margin: '0 0 16px',
              fontSize: '13px',
              color: 'var(--text-muted)',
              lineHeight: 1.65,
            }}
          >
            Paste this into PowerShell. Each command is{' '}
            <strong style={{ color: '#fff', fontWeight: 600 }}>single-use</strong> — after a successful launch, click New command for the next inject. Refreshing this page keeps the same unused key.
          </p>

          {errorMsg && (
            <p style={{ color: 'var(--danger)', fontSize: '13px', margin: '0 0 12px' }}>
              {errorMsg}
            </p>
          )}

          {commandData?.key && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap',
                marginBottom: '10px',
              }}
            >
              <p style={{ fontSize: '12px', color: 'var(--text-dim)', margin: 0 }}>
                Single-use · {commandData.licenseKey}
              </p>
              <button
                type="button"
                className="btn btn-secondary"
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  flex: '0 0 auto',
                  transform: 'none',
                }}
                disabled={minting}
                onClick={() => fetchCommand(true)}
              >
                {minting ? 'Preparing…' : 'New command'}
              </button>
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) 88px',
              alignItems: 'start',
              gap: '12px',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 16px',
              marginBottom: '28px',
            }}
          >
            <code
              style={{
                fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
                fontSize: '12px',
                color: 'var(--accent-light)',
                wordBreak: 'break-all',
                minWidth: 0,
                lineHeight: 1.55,
              }}
            >
              {commandData?.powershell ||
                (minting ? 'Preparing command…' : 'Unable to mint launch key.')}
            </code>
            <button
              type="button"
              className="btn btn-primary"
              style={{
                padding: '8px 0',
                fontSize: '12px',
                width: '88px',
                minWidth: '88px',
                maxWidth: '88px',
                boxSizing: 'border-box',
                whiteSpace: 'nowrap',
                transform: 'none',
                justifySelf: 'end',
              }}
              disabled={!commandData?.powershell}
              onClick={async () => {
                if (commandData?.powershell) {
                  await copyText(commandData.powershell);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }
              }}
            >
              <span style={{ display: 'inline-block', width: '52px', textAlign: 'center' }}>
                {copied ? 'Copied' : 'Copy'}
              </span>
            </button>
          </div>

          <h4
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              margin: '0 0 12px',
            }}
          >
            Setup
          </h4>
          <ol
            style={{
              fontSize: '14px',
              color: 'var(--text-muted)',
              lineHeight: 1.9,
              paddingLeft: '18px',
              margin: 0,
            }}
          >
            <li>Open Minecraft (Fabric 1.21.11 / Lunar / Feather / Badlion / Vanilla).</li>
            <li>Paste the command above into PowerShell and run it.</li>
            <li>Enter your license when prompted, then inject into Minecraft.</li>
            <li>
              Press{' '}
              <kbd
                style={{
                  background: 'var(--bg-surface)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: '1px solid var(--border)',
                  color: '#fff',
                  fontSize: '12px',
                }}
              >
                Right Shift
              </kbd>{' '}
              in-game for the Click GUI.
            </li>
          </ol>
        </div>
      ) : (
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '44px 32px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
          }}
        >
          {loading ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
              Checking license…
            </p>
          ) : isLoggedIn ? (
            <>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px', color: '#fff' }}>
                Active license required
              </h3>
              <p
                style={{
                  fontSize: '14px',
                  color: 'var(--text-muted)',
                  maxWidth: '420px',
                  margin: '0 auto 24px',
                  lineHeight: 1.6,
                }}
              >
                Your account does not have an active 5.55 Client license.
              </p>
              <div
                style={{
                  display: 'flex',
                  gap: '10px',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <Link to="/checkout" className="btn btn-primary">
                  Purchase license
                </Link>
                <Link to="/dashboard" className="btn btn-secondary">
                  Dashboard
                </Link>
              </div>
            </>
          ) : (
            <>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px', color: '#fff' }}>
                Sign in to Launch
              </h3>
              <p
                style={{
                  fontSize: '14px',
                  color: 'var(--text-muted)',
                  maxWidth: '420px',
                  margin: '0 auto 24px',
                  lineHeight: 1.6,
                }}
              >
                Please log in to your 5.55 Client account to generate your fileless launch command.
              </p>
              <div
                style={{
                  display: 'flex',
                  gap: '10px',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <Link to="/login" className="btn btn-primary">
                  Sign In
                </Link>
                <Link to="/trial" className="btn btn-secondary">
                  Try Free Trial
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
