import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { auth, copyText, API_BASE } from '../utils/api';

export default function Download() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [licenses, setLicenses] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('java-client');
  const [downloadData, setDownloadData] = useState(null);
  const [authorizing, setAuthorizing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);

  // Load user licenses
  useEffect(() => {
    let active = true;
    const init = async () => {
      try {
        const profileData = await auth.getProfile();
        if (!active) return;
        if (profileData?.user) {
          setIsLoggedIn(true);
          const token = await auth.getToken();
          const res = await fetch(`${API_BASE}/user/licenses`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (active && data.licenses) {
            setLicenses(data.licenses);
            // Default selected product to whatever license user holds
            if (data.licenses.some((l) => l.products?.slug === 'cpp-client')) {
              setSelectedProduct('cpp-client');
            } else {
              setSelectedProduct('java-client');
            }
          }
        }
      } catch (err) {
        console.error('Download init error:', err);
      } finally {
        if (active) setLoading(false);
      }
    };

    init();
    return () => { active = false; };
  }, []);

  // Request authorized download token & manifest
  const requestDownload = useCallback(async (productSlug) => {
    setAuthorizing(true);
    setErrorMsg('');
    try {
      const token = await auth.getToken();
      const res = await fetch(`${API_BASE}/downloads/authorize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ product_slug: productSlug }),
      });
      const data = await res.json();
      if (res.ok && data.authorized) {
        setDownloadData(data);
      } else {
        setErrorMsg(data.error || 'Failed to authorize download for this product.');
        setDownloadData(null);
      }
    } catch {
      setErrorMsg('Error connecting to download verification server.');
      setDownloadData(null);
    } finally {
      setAuthorizing(false);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn && selectedProduct) {
      requestDownload(selectedProduct);
    }
  }, [isLoggedIn, selectedProduct, requestDownload]);

  const activeLicensesForSelected = licenses.filter(
    (l) => l.products?.slug === selectedProduct && l.status === 'active'
  );
  const hasAccess = activeLicensesForSelected.length > 0;

  return (
    <div className="container" style={{ maxWidth: '780px', padding: '48px 24px 80px' }}>
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
          Client Downloads
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0, lineHeight: 1.5 }}>
          Authorized downloads, SHA-256 integrity verification, and Ed25519 digital signatures.
        </p>
      </div>

      {/* Product Selection Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '24px',
        }}
      >
        <button
          type="button"
          onClick={() => setSelectedProduct('java-client')}
          style={{
            flex: 1,
            padding: '14px 18px',
            borderRadius: '12px',
            border: `1px solid ${selectedProduct === 'java-client' ? 'var(--primary)' : 'var(--border)'}`,
            background: selectedProduct === 'java-client' ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-card)',
            color: selectedProduct === 'java-client' ? '#fff' : 'var(--text-muted)',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.2s',
          }}
        >
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>5.55 Java Fabric Client</div>
          <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>
            .JAR package · Minecraft 1.21.0 - 1.21.4
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedProduct('cpp-client')}
          style={{
            flex: 1,
            padding: '14px 18px',
            borderRadius: '12px',
            border: `1px solid ${selectedProduct === 'cpp-client' ? 'var(--primary)' : 'var(--border)'}`,
            background: selectedProduct === 'cpp-client' ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-card)',
            color: selectedProduct === 'cpp-client' ? '#fff' : 'var(--text-muted)',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.2s',
          }}
        >
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>5.55 C++ Client</div>
          <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>
            .EXE + .DLL · Native Windows 10/11 64-bit
          </div>
        </button>
      </div>

      {!isLoggedIn ? (
        <div
          className="card"
          style={{
            padding: '40px',
            textAlign: 'center',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <h2 style={{ fontSize: '20px', color: '#fff', marginBottom: '10px' }}>Authentication Required</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
            Sign in with your account to access your purchased client builds and signed release manifests.
          </p>
          <Link to="/login" className="btn btn-primary" style={{ padding: '12px 28px', fontSize: '14.5px' }}>
            Sign In to Continue →
          </Link>
        </div>
      ) : hasAccess ? (
        <div
          className="card"
          style={{
            padding: '30px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
              paddingBottom: '16px',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div>
              <span className="badge badge-success" style={{ marginBottom: '6px' }}>
                Entitlement Verified
              </span>
              <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '6px 0 0', color: '#fff' }}>
                {selectedProduct === 'java-client' ? 'Fabric Mod Release' : 'Native Standalone Package'}
              </h2>
            </div>
            <div style={{ textAlign: 'right', fontSize: '12.5px', color: 'var(--text-dim)' }}>
              <div>Version: {downloadData?.version || '1.2.0'}</div>
              <div>Channel: Stable</div>
            </div>
          </div>

          {errorMsg && (
            <div
              style={{
                padding: '12px 16px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                color: '#f87171',
                fontSize: '13px',
                marginBottom: '16px',
              }}
            >
              {errorMsg}
            </div>
          )}

          {/* Download Action Buttons */}
          <div style={{ display: 'flex', gap: '14px', marginBottom: '24px', flexWrap: 'wrap' }}>
            {downloadData?.download_url ? (
              <a
                href={downloadData.download_url}
                className="btn btn-primary"
                style={{
                  flex: 1,
                  minWidth: '200px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '13px 20px',
                  fontSize: '14.5px',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                <span>⬇ Download Package ({selectedProduct === 'java-client' ? '.jar' : '.zip'})</span>
              </a>
            ) : (
              <button
                disabled={authorizing}
                onClick={() => requestDownload(selectedProduct)}
                className="btn btn-primary"
                style={{ flex: 1, minWidth: '200px', padding: '13px 20px' }}
              >
                {authorizing ? 'Authorizing Token…' : 'Generate Download URL'}
              </button>
            )}

            <button
              onClick={() => requestDownload(selectedProduct)}
              disabled={authorizing}
              className="btn btn-secondary"
              style={{ padding: '13px 20px', fontSize: '13.5px' }}
            >
              🔄 Refresh Token
            </button>
          </div>

          {/* SHA-256 and Security Verification Section */}
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '16px',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700 }}>
                SHA-256 Checksum
              </span>
              <button
                type="button"
                onClick={() => {
                  copyText(downloadData?.sha256 || '');
                  setCopiedHash(true);
                  setTimeout(() => setCopiedHash(false), 2000);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#818cf8',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {copiedHash ? '✓ Copied' : 'Copy Hash'}
              </button>
            </div>
            <code
              style={{
                fontFamily: 'monospace',
                fontSize: '12px',
                color: '#38bdf8',
                wordBreak: 'break-all',
                display: 'block',
              }}
            >
              {downloadData?.sha256 || '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08'}
            </code>
          </div>

          {/* Ed25519 Signature Card */}
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '16px',
            }}
          >
            <span style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700 }}>
              Ed25519 Release Signature (Server-Side Verified)
            </span>
            <code
              style={{
                fontFamily: 'monospace',
                fontSize: '11px',
                color: '#a78bfa',
                wordBreak: 'break-all',
                display: 'block',
                marginTop: '6px',
              }}
            >
              {downloadData?.signature || 'Verifying release signature…'}
            </code>
          </div>
        </div>
      ) : (
        <div
          className="card"
          style={{
            padding: '36px',
            textAlign: 'center',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <h2 style={{ fontSize: '20px', color: '#fff', marginBottom: '8px' }}>
            No Active License Found for {selectedProduct === 'java-client' ? 'Java Client' : 'C++ Client'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '22px' }}>
            You do not currently have an active entitlement for this product. Purchase a lifetime license or redeem your key in the dashboard.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Link to="/#pricing" className="btn btn-primary" style={{ padding: '11px 22px' }}>
              Purchase License
            </Link>
            <Link to="/dashboard" className="btn btn-secondary" style={{ padding: '11px 22px' }}>
              Redeem Key
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
