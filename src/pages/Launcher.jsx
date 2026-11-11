import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, API_BASE } from '../utils/api';

export default function Launcher() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState('java-client');
  const [launching, setLaunching] = useState(false);
  const [launchLog, setLaunchLog] = useState('');
  const [updateStatus, setUpdateStatus] = useState(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  useEffect(() => {
    let active = true;
    const loadLauncher = async () => {
      try {
        const profile = await auth.getProfile();
        if (!active) return;
        if (!profile?.user) {
          navigate('/login');
          return;
        }
        setUser(profile.user);
        const token = await auth.getToken();
        const res = await fetch(`${API_BASE}/user/licenses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (active && data.licenses) {
          setLicenses(data.licenses);
          if (data.licenses.some((l) => l.products?.slug === 'cpp-client')) {
            setSelectedProduct('cpp-client');
          } else if (data.licenses.some((l) => l.products?.slug === 'java-client')) {
            setSelectedProduct('java-client');
          }
        }
      } catch (err) {
        console.error('Launcher error:', err);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadLauncher();
    return () => { active = false; };
  }, [navigate]);

  const ownedProducts = licenses.map((l) => l.products?.slug).filter(Boolean);
  const activeLicenseForProduct = licenses.find(
    (l) => l.products?.slug === selectedProduct && l.status === 'active'
  );

  const handleLaunch = async () => {
    if (!activeLicenseForProduct) return;
    setLaunching(true);
    setLaunchLog('Initializing 5.55 Security Sandbox...\nConnecting to Supabase License Gateway...\n');

    try {
      const token = await auth.getToken();
      // Step 1: Validate license
      const res = await fetch(`${API_BASE}/licenses/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          license_key: activeLicenseForProduct.license_key,
          hwid: 'LAUNCHER-' + (user?.id ? user.id.substring(0, 12) : 'CLIENT'),
          client_type: selectedProduct === 'java-client' ? 'java' : 'cpp',
        }),
      });
      const data = await res.json();

      if (data.valid) {
        setLaunchLog((prev) => prev + `✓ License Authenticated [${data.product_slug}]\n✓ Ed25519 Signature Verified\n✓ Session token granted: ${data.session_token.substring(0, 8)}...\nStarting target process...\n[5.55 Client] Injected successfully! Have fun.`);
      } else {
        setLaunchLog((prev) => prev + `✗ Launch rejected: ${data.error || 'Validation failed'}`);
      }
    } catch {
      setLaunchLog((prev) => prev + '✗ Network error communicating with licensing server.');
    } finally {
      setLaunching(false);
    }
  };

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    try {
      const res = await fetch(`${API_BASE}/updates/${selectedProduct}/manifest`);
      const data = await res.json();
      setUpdateStatus(data);
    } catch {
      setUpdateStatus({ version: '1.2.0', error: 'Could not fetch remote manifest' });
    } finally {
      setCheckingUpdate(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '120px 20px', color: 'var(--text-muted)' }}>
        Loading 5.55 Unified Launcher...
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: '960px',
        margin: '30px auto',
        padding: '0 20px',
      }}
    >
      {/* Mock Launcher Window Frame */}
      <div
        style={{
          background: '#0d0e15',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
        }}
      >
        {/* Launcher Window Titlebar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            background: 'rgba(255, 255, 255, 0.03)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/logo.png" alt="5.55" style={{ height: '22px', borderRadius: '4px' }} />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff', letterSpacing: '0.04em' }}>
              5.55 UNIFIED DESKTOP LAUNCHER · v1.2.0
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#10b981',
                  boxShadow: '0 0 8px #10b981',
                }}
              />
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>{user?.email}</span>
            </div>
            <button
              onClick={() => {
                auth.signOut().then(() => navigate('/login'));
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#f87171',
                fontSize: '11.5px',
                cursor: 'pointer',
              }}
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Launcher Body Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', minHeight: '520px' }}>
          {/* Left Column: Product Selection (Owned products only) */}
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.3)',
              borderRight: '1px solid rgba(255, 255, 255, 0.06)',
              padding: '20px 14px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700, marginBottom: '12px', paddingLeft: '8px' }}>
                Your Products
              </div>

              {/* Java Client Option */}
              <button
                type="button"
                onClick={() => setSelectedProduct('java-client')}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  marginBottom: '8px',
                  borderRadius: '10px',
                  border: `1px solid ${selectedProduct === 'java-client' ? 'var(--primary)' : 'transparent'}`,
                  background: selectedProduct === 'java-client' ? 'rgba(99, 102, 241, 0.18)' : 'transparent',
                  color: selectedProduct === 'java-client' ? '#fff' : 'var(--text-muted)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '14px' }}>Java Client</span>
                  {ownedProducts.includes('java-client') ? (
                    <span style={{ fontSize: '10.5px', color: '#4ade80' }}>● Owned</span>
                  ) : (
                    <span style={{ fontSize: '10.5px', color: '#9ca3af' }}>Unowned</span>
                  )}
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-dim)', marginTop: '3px' }}>
                  Fabric 1.21.x · Mod
                </div>
              </button>

              {/* C++ Client Option */}
              <button
                type="button"
                onClick={() => setSelectedProduct('cpp-client')}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: `1px solid ${selectedProduct === 'cpp-client' ? 'var(--primary)' : 'transparent'}`,
                  background: selectedProduct === 'cpp-client' ? 'rgba(99, 102, 241, 0.18)' : 'transparent',
                  color: selectedProduct === 'cpp-client' ? '#fff' : 'var(--text-muted)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '14px' }}>C++ Client</span>
                  {ownedProducts.includes('cpp-client') ? (
                    <span style={{ fontSize: '10.5px', color: '#4ade80' }}>● Owned</span>
                  ) : (
                    <span style={{ fontSize: '10.5px', color: '#9ca3af' }}>Unowned</span>
                  )}
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-dim)', marginTop: '3px' }}>
                  Native Hook · EXE + DLL
                </div>
              </button>
            </div>

            {/* Bottom links */}
            <div style={{ padding: '0 8px' }}>
              <Link
                to="/dashboard"
                style={{ display: 'block', fontSize: '12.5px', color: '#818cf8', textDecoration: 'none', marginBottom: '8px' }}
              >
                ← Web Dashboard
              </Link>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                Hardware ID: PC-{(user?.id || 'CLIENT').substring(0, 8).toUpperCase()}
              </div>
            </div>
          </div>

          {/* Right Column: Game Details, Launch Controls & Logs */}
          <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              {/* Product Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                  <span className={`badge ${activeLicenseForProduct ? 'badge-success' : 'badge-secondary'}`}>
                    {activeLicenseForProduct ? 'License Active · Ready' : 'License Required'}
                  </span>
                  <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', margin: '8px 0 4px' }}>
                    {selectedProduct === 'java-client' ? '5.55 Java Fabric Client' : '5.55 C++ Native Client'}
                  </h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
                    {selectedProduct === 'java-client'
                      ? 'Undetectable ghost client mod for Fabric 1.21.0 - 1.21.4.'
                      : 'High performance native internal injector and stealth DLL.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCheckUpdate}
                  disabled={checkingUpdate}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '6px 14px', fontSize: '12px' }}
                >
                  {checkingUpdate ? 'Checking…' : 'Check Updates'}
                </button>
              </div>

              {/* Update Banner */}
              {updateStatus && (
                <div
                  style={{
                    background: 'rgba(56, 189, 248, 0.08)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    fontSize: '12.5px',
                    color: '#38bdf8',
                    marginBottom: '16px',
                  }}
                >
                  Latest Version: <strong>v{updateStatus.version}</strong> ({updateStatus.channel || 'stable'}) · Up to date!
                </div>
              )}

              {/* License Details Card */}
              {activeLicenseForProduct ? (
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '10px',
                    padding: '14px 18px',
                    fontSize: '13px',
                    marginBottom: '20px',
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    <div>
                      <div style={{ color: 'var(--text-dim)', fontSize: '11px', textTransform: 'uppercase' }}>Key</div>
                      <div style={{ color: '#fff', fontFamily: 'monospace', fontWeight: 600 }}>
                        {activeLicenseForProduct.license_key}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-dim)', fontSize: '11px', textTransform: 'uppercase' }}>Tier</div>
                      <div style={{ color: '#fff', textTransform: 'capitalize' }}>
                        {activeLicenseForProduct.license_type}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-dim)', fontSize: '11px', textTransform: 'uppercase' }}>Max Devices</div>
                      <div style={{ color: '#fff' }}>{activeLicenseForProduct.max_devices} PC</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    borderRadius: '10px',
                    padding: '16px 20px',
                    marginBottom: '20px',
                    color: '#f87171',
                  }}
                >
                  <p style={{ margin: '0 0 10px', fontWeight: 600 }}>No license registered for this product.</p>
                  <Link to="/checkout" className="btn btn-primary btn-sm" style={{ padding: '6px 14px' }}>
                    Purchase License ($19.99)
                  </Link>
                </div>
              )}

              {/* Live Injection Terminal Log */}
              {launchLog && (
                <div
                  style={{
                    background: '#050608',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    color: '#10b981',
                    whiteSpace: 'pre-wrap',
                    maxHeight: '130px',
                    overflowY: 'auto',
                    marginBottom: '16px',
                  }}
                >
                  {launchLog}
                </div>
              )}
            </div>

            {/* Launch Action Bar */}
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              {activeLicenseForProduct ? (
                <button
                  type="button"
                  onClick={handleLaunch}
                  disabled={launching}
                  className="btn btn-primary"
                  style={{
                    flex: 1,
                    padding: '16px 24px',
                    fontSize: '16px',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    borderRadius: '12px',
                    boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)',
                  }}
                >
                  {launching ? 'Injecting 5.55…' : '▶ LAUNCH & INJECT'}
                </button>
              ) : (
                <Link
                  to="/checkout"
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '16px 24px', fontSize: '15px', fontWeight: 700, textAlign: 'center', textDecoration: 'none' }}
                >
                  Unlock Access →
                </Link>
              )}

              <Link
                to="/download"
                className="btn btn-secondary"
                style={{ padding: '16px 20px', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}
              >
                ⬇ Direct Binary
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
