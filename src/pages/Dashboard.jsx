import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { auth, copyText, API_BASE } from '../utils/api';
import HwidModal from '../components/HwidModal';

export default function Dashboard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [licenses, setLicenses] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('licenses');

  // Key Redemption state
  const [redeemKey, setRedeemKey] = useState('');
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemStatus, setRedeemStatus] = useState({ text: '', type: '' });

  // Key visibility & copy states
  const [visibleKeys, setVisibleKeys] = useState({});
  const [copiedKey, setCopiedKey] = useState(null);
  const [copiedCommand, setCopiedCommand] = useState(null);

  // Modals
  const [renameModal, setRenameModal] = useState({
    open: false,
    key: '',
    id: null,
    name: '',
    loading: false,
    error: '',
  });

  const [hwidModalState, setHwidModalState] = useState({
    open: false,
    key: '',
    loading: false,
    msg: '',
    error: '',
  });

  const [launchModal, setLaunchModal] = useState({
    open: false,
    licenseKey: '',
  });

  const [buyHwidModal, setBuyHwidModal] = useState({ open: false, licenseKey: '' });

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      auth.setToken(token);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const currentToken = auth.getToken();
    if (currentToken) {
      loadProfile(currentToken);
    } else {
      navigate('/login');
    }
  }, [searchParams, navigate]);

  const loadProfile = async (token) => {
    try {
      const data = await auth.getProfile();
      if (!data?.user) {
        auth.clear();
        navigate('/login');
        return;
      }
      setUser(data.user);
      await loadLicenses(token);
    } catch {
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const loadLicenses = async (token) => {
    try {
      const res = await fetch(`${API_BASE}/licenses/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setLicenses(data.licenses || []);
      setOrders(data.orders || []);
    } catch {
      setLicenses([]);
      setOrders([]);
    }
  };

  const handleCopy = (key) => {
    copyText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1600);
  };

  const toggleKeyVisibility = (key) => {
    setVisibleKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleRedeem = async (e) => {
    e?.preventDefault();
    const clean = redeemKey.trim().toUpperCase();
    if (!clean) return;

    const KEY_FORMAT_REGEX = /^[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/i;
    if (!KEY_FORMAT_REGEX.test(clean)) {
      setRedeemStatus({
        text: 'Incorrect key format! Key must follow: 5558N-87WEF-CB9VM-F95M6',
        type: 'danger',
      });
      return;
    }

    setRedeemLoading(true);
    setRedeemStatus({ text: '', type: '' });
    const token = auth.getToken();

    try {
      const res = await fetch(`${API_BASE}/licenses/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ key: clean }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRedeemStatus({ text: data.message || 'Key activated successfully!', type: 'success' });
        setRedeemKey('');
        await loadLicenses(token);
      } else {
        setRedeemStatus({ text: data.error || 'Failed to activate key.', type: 'danger' });
      }
    } catch {
      setRedeemStatus({ text: 'Error connecting to licensing server.', type: 'danger' });
    } finally {
      setRedeemLoading(false);
    }
  };

  const handleRename = async () => {
    if (!renameModal.key) return;
    setRenameModal((prev) => ({ ...prev, loading: true, error: '' }));
    const token = auth.getToken();
    try {
      const res = await fetch(`${API_BASE}/licenses/update-name`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ licenseKey: renameModal.key, name: renameModal.name.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setLicenses((prev) =>
          prev.map((lic) =>
            lic.key === renameModal.key ? { ...lic, name: data.name || renameModal.name.trim() } : lic
          )
        );
        setRenameModal({ open: false, key: '', id: null, name: '', loading: false, error: '' });
      }
    } catch {
      setRenameModal({ open: false, key: '', id: null, name: '', loading: false, error: '' });
    }
  };

  const handleResetHwid = async () => {
    if (!hwidModalState.key) return;
    setHwidModalState((prev) => ({ ...prev, loading: true, error: '', msg: '' }));
    const token = auth.getToken();
    try {
      const res = await fetch(`${API_BASE}/licenses/reset-hwid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ licenseKey: hwidModalState.key }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setHwidModalState((prev) => ({
          ...prev,
          loading: false,
          msg: data.message || 'HWID reset successfully!',
        }));
        setTimeout(() => {
          setHwidModalState({ open: false, key: '', loading: false, msg: '', error: '' });
          loadLicenses(token);
        }, 900);
      } else {
        setHwidModalState((prev) => ({
          ...prev,
          loading: false,
          error: data.error || 'Failed to reset HWID.',
        }));
      }
    } catch {
      setHwidModalState((prev) => ({
        ...prev,
        loading: false,
        error: 'Connection error while resetting HWID.',
      }));
    }
  };

  const handleLogout = () => {
    auth.clear();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '100px 20px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>Loading 5.55 Client Dashboard...</p>
      </div>
    );
  }

  const formatTier = (tier) => {
    if (!tier) return 'Standard';
    const t = String(tier).toLowerCase();
    if (t.includes('inject')) return 'Injectable Lifetime';
    if (t.includes('lifetime')) return 'Lifetime';
    if (t.includes('month')) return 'Monthly';
    return tier;
  };

  return (
    <div className="container" style={{ maxWidth: '1120px', padding: '40px 24px 80px' }}>
      {/* User Discord Profile Header Banner */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(24, 22, 34, 0.85) 0%, rgba(15, 14, 21, 0.95) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          padding: '28px 32px',
          marginBottom: '32px',
          boxShadow: '0 12px 36px -12px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ position: 'relative' }}>
            <img
              src={user?.avatar || '/logo.png'}
              alt={user?.username || 'User'}
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                border: '2px solid rgba(255, 255, 255, 0.15)',
                objectFit: 'cover',
                background: '#0e0d14',
              }}
              onError={(e) => {
                e.currentTarget.src = '/logo.png';
              }}
            />
            <span
              style={{
                position: 'absolute',
                bottom: '2px',
                right: '2px',
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                background: '#10b981',
                border: '2px solid #0e0d14',
              }}
              title="Online"
            />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1
                style={{
                  fontSize: '22px',
                  fontWeight: 800,
                  color: '#ffffff',
                  margin: 0,
                  letterSpacing: '-0.01em',
                }}
              >
                {user?.displayName || user?.username || '5.55 Member'}
              </h1>
              <span
                className="badge"
                style={{
                  background: licenses.length > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                  color: licenses.length > 0 ? '#10b981' : '#818cf8',
                  border: licenses.length > 0 ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(99, 102, 241, 0.3)',
                  padding: '3px 10px',
                  borderRadius: '9999px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                }}
              >
                {licenses.length > 0 ? '👑 Verified Licensee' : 'Discord Member'}
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#8e8e99' }}>
              Discord ID: <span style={{ color: '#d1d5db', fontFamily: 'monospace' }}>{user?.discordId || user?.id || 'Connected'}</span>
              {user?.username && <span> · @{user.username}</span>}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              textAlign: 'right',
              paddingRight: '16px',
              borderRight: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div style={{ fontSize: '12px', color: '#8e8e99', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Licenses
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff' }}>
              {licenses.length} Active
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="btn btn-secondary btn-sm"
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="dashboard-tabs"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          marginBottom: '32px',
        }}
      >
        <button
          onClick={() => setActiveTab('licenses')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '12px 2px 14px',
            fontSize: '14.5px',
            fontWeight: 700,
            color: activeTab === 'licenses' ? '#ffffff' : '#8e8e99',
            borderBottom: activeTab === 'licenses' ? '2px solid #8b5cf6' : '2px solid transparent',
            transition: 'color 0.15s, border-color 0.15s',
          }}
        >
          My Licenses ({licenses.length})
        </button>

        <button
          onClick={() => setActiveTab('redeem')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '12px 2px 14px',
            fontSize: '14.5px',
            fontWeight: 700,
            color: activeTab === 'redeem' ? '#ffffff' : '#8e8e99',
            borderBottom: activeTab === 'redeem' ? '2px solid #8b5cf6' : '2px solid transparent',
            transition: 'color 0.15s, border-color 0.15s',
          }}
        >
          Activate Key
        </button>

        <button
          onClick={() => setActiveTab('faq')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '12px 2px 14px',
            fontSize: '14.5px',
            fontWeight: 700,
            color: activeTab === 'faq' ? '#ffffff' : '#8e8e99',
            borderBottom: activeTab === 'faq' ? '2px solid #8b5cf6' : '2px solid transparent',
            transition: 'color 0.15s, border-color 0.15s',
          }}
        >
          Launcher & Support
        </button>
      </div>

      {/* TAB 1: LICENSES */}
      {activeTab === 'licenses' && (
        <div>
          {licenses.length === 0 ? (
            /* EMPTY STATE: Professional Buy & Redeem Action Center */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              <div
                className="card"
                style={{
                  textAlign: 'center',
                  padding: '48px 24px',
                  background: 'rgba(18, 17, 26, 0.75)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '20px',
                }}
              >
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: 'rgba(99, 102, 241, 0.12)',
                    color: '#818cf8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', margin: '0 0 8px' }}>
                  No Active License Found
                </h2>
                <p
                  style={{
                    fontSize: '14px',
                    color: 'var(--text-muted)',
                    maxWidth: '480px',
                    margin: '0 auto 28px',
                    lineHeight: 1.6,
                  }}
                >
                  Your Discord account is connected, but you do not currently hold an active 5.55 license key. Choose a plan below to activate instant access:
                </p>

                {/* Instant Purchase Cards matching user's SellAuth links */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '20px',
                    maxWidth: '720px',
                    margin: '0 auto 32px',
                    textAlign: 'left',
                  }}
                >
                  {/* 5.55 Client Lifetime */}
                  <div
                    style={{
                      background: 'rgba(14, 13, 20, 0.85)',
                      border: '1.5px solid #10b981',
                      borderRadius: '16px',
                      padding: '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      position: 'relative',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: '-10px',
                        right: '16px',
                        background: '#10b981',
                        color: '#fff',
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      Most Popular
                    </span>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: '0 0 4px' }}>
                      5.55 Client Lifetime
                    </h3>
                    <p style={{ fontSize: '12px', color: '#8e8e99', margin: '0 0 14px' }}>
                      One-time · Forever · Instant Delivery
                    </p>
                    <div style={{ fontSize: '32px', fontWeight: 900, color: '#fff', marginBottom: '14px' }}>
                      $2.00
                    </div>
                    <ul style={{ margin: '0 0 20px', paddingLeft: '18px', fontSize: '12.5px', color: '#d1d5db', lineHeight: 1.7 }}>
                      <li>Fabric 1.21-1.21.11 support</li>
                      <li>All modules included</li>
                      <li>Lifetime updates & Discord support</li>
                    </ul>
                    <a
                      href="https://lama-co.mysellauth.com/checkout/f637dd86402c3-0000017323883"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn"
                      style={{
                        background: '#10b981',
                        color: '#fff',
                        textAlign: 'center',
                        textDecoration: 'none',
                        fontWeight: 700,
                        padding: '12px',
                        borderRadius: '10px',
                        marginTop: 'auto',
                      }}
                    >
                      Buy Lifetime ($2) →
                    </a>
                  </div>

                  {/* 5.55 Injectable Lifetime */}
                  <div
                    style={{
                      background: 'rgba(14, 13, 20, 0.85)',
                      border: '1.5px solid #6366f1',
                      borderRadius: '16px',
                      padding: '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      position: 'relative',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: '-10px',
                        right: '16px',
                        background: '#6366f1',
                        color: '#fff',
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      Best Value · NEW
                    </span>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: '0 0 4px' }}>
                      5.55 Injectable Lifetime
                    </h3>
                    <p style={{ fontSize: '12px', color: '#8e8e99', margin: '0 0 14px' }}>
                      Stronger screenshare bypass · Leaves no trace
                    </p>
                    <div style={{ fontSize: '32px', fontWeight: 900, color: '#fff', marginBottom: '14px' }}>
                      $6.00
                    </div>
                    <ul style={{ margin: '0 0 20px', paddingLeft: '18px', fontSize: '12.5px', color: '#d1d5db', lineHeight: 1.7 }}>
                      <li>Direct in-game injection</li>
                      <li>Fabric 1.21-26.1 support</li>
                      <li>New GUI & undetected modules</li>
                    </ul>
                    <a
                      href="https://lama-co.mysellauth.com/checkout/8bfd882b2959f-0000017323965"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn"
                      style={{
                        background: '#6366f1',
                        color: '#fff',
                        textAlign: 'center',
                        textDecoration: 'none',
                        fontWeight: 700,
                        padding: '12px',
                        borderRadius: '10px',
                        marginTop: 'auto',
                      }}
                    >
                      Buy Injectable ($6) →
                    </a>
                  </div>
                </div>

                {/* Inline Quick Key Activation Form */}
                <div
                  style={{
                    maxWidth: '520px',
                    margin: '0 auto',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '16px',
                    padding: '24px',
                    textAlign: 'left',
                  }}
                >
                  <h4 style={{ margin: '0 0 6px', fontSize: '15px', color: '#fff', fontWeight: 700 }}>
                    Already have a license key?
                  </h4>
                  <p style={{ margin: '0 0 14px', fontSize: '12.5px', color: '#8e8e99' }}>
                    Enter your key below to bind it to your Discord account immediately:
                  </p>
                  <form onSubmit={handleRedeem} style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="text"
                      placeholder="e.g. 5558N-87WEF-CB9VM-F95M6"
                      value={redeemKey}
                      onChange={(e) => setRedeemKey(e.target.value.toUpperCase())}
                      className="form-control"
                      style={{ fontSize: '13.5px', padding: '10px 14px' }}
                    />
                    <button
                      type="submit"
                      disabled={redeemLoading}
                      className="btn btn-primary btn-sm"
                      style={{ padding: '0 18px', whiteSpace: 'nowrap' }}
                    >
                      {redeemLoading ? 'Activating...' : 'Activate Key'}
                    </button>
                  </form>
                  {redeemStatus.text && (
                    <div
                      style={{
                        marginTop: '12px',
                        fontSize: '12.5px',
                        color: redeemStatus.type === 'success' ? '#4ade80' : '#f87171',
                      }}
                    >
                      {redeemStatus.text}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* ACTIVE LICENSES LIST */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                  Active Licenses ({licenses.length})
                </h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setActiveTab('redeem')} className="btn btn-secondary btn-sm">
                    + Redeem Key
                  </button>
                  <a
                    href="https://lama-co.mysellauth.com/checkout/f637dd86402c3-0000017323883"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary btn-sm"
                  >
                    + Purchase More
                  </a>
                </div>
              </div>

              {licenses.map((lic) => {
                const isHidden = !visibleKeys[lic.key];
                const displayKey = isHidden
                  ? lic.key.substring(0, 7) + '••••-••••'
                  : lic.key;

                return (
                  <div
                    key={lic.key}
                    className="card"
                    style={{
                      background: 'rgba(18, 17, 26, 0.85)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '18px',
                      padding: '28px',
                      boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)',
                    }}
                  >
                    {/* Header */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px',
                        marginBottom: '18px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>
                          {lic.name || (lic.duration ? `5.55 ${lic.duration}` : '5.55 Client Lifetime')}
                        </span>
                        <button
                          onClick={() =>
                            setRenameModal({
                              open: true,
                              key: lic.key,
                              id: lic.id,
                              name: lic.name || '',
                              loading: false,
                              error: '',
                            })
                          }
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#8e8e99',
                            cursor: 'pointer',
                            fontSize: '12px',
                            textDecoration: 'underline',
                          }}
                        >
                          Rename
                        </button>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="badge badge-primary">{formatTier(lic.tier || lic.duration)}</span>
                        <span
                          className={`badge ${lic.status === 'active' ? 'badge-success' : 'badge-danger'}`}
                        >
                          {lic.status === 'active' ? '● Active' : '● Expired'}
                        </span>
                      </div>
                    </div>

                    {/* Key box */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'rgba(0, 0, 0, 0.5)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        marginBottom: '18px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <code style={{ fontSize: '15px', color: '#c4b5fd', fontFamily: 'monospace' }}>
                          {displayKey}
                        </code>
                        <button
                          onClick={() => toggleKeyVisibility(lic.key)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#8e8e99',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
                        >
                          {isHidden ? '👁️ Show' : '🔒 Hide'}
                        </button>
                      </div>

                      <button
                        onClick={() => handleCopy(lic.key)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#fff',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: 700,
                        }}
                      >
                        {copiedKey === lic.key ? '✓ Copied' : 'Copy Key'}
                      </button>
                    </div>

                    {/* Footer Info & Actions */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '14px',
                      }}
                    >
                      <div style={{ fontSize: '13px', color: '#8e8e99', lineHeight: 1.5 }}>
                        HWID:{' '}
                        <span style={{ color: '#fff', fontFamily: 'monospace' }}>
                          {lic.hwid ? `${lic.hwid.substring(0, 16)}...` : 'Unbound (Ready for first PC)'}
                        </span>
                        <span> · {lic.hwid_resets_left ?? 2} reset(s) available</span>
                      </div>

                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() =>
                            setHwidModalState({
                              open: true,
                              key: lic.key,
                              loading: false,
                              msg: '',
                              error: '',
                            })
                          }
                          className="btn btn-secondary btn-sm"
                        >
                          Reset HWID
                        </button>

                        <button
                          onClick={() => setLaunchModal({ open: true, licenseKey: lic.key })}
                          className="btn btn-primary btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <span>🚀 Launch Command</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REDEEM KEY */}
      {activeTab === 'redeem' && (
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <div
            className="card"
            style={{
              padding: '36px',
              background: 'rgba(18, 17, 26, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '20px',
            }}
          >
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>
              Activate a License Key
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '0 0 24px', lineHeight: 1.6 }}>
              Purchased your key on SellAuth or received a license key from an administrator? Enter it below to instantly bind it to your Discord account:
            </p>

            <form onSubmit={handleRedeem} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', textTransform: 'uppercase', color: '#8e8e99', marginBottom: '6px', fontWeight: 700 }}>
                  License Key
                </label>
                <input
                  type="text"
                  placeholder="e.g. 5558N-87WEF-CB9VM-F95M6"
                  value={redeemKey}
                  onChange={(e) => setRedeemKey(e.target.value.toUpperCase())}
                  className="form-control"
                  style={{ fontSize: '14px', padding: '12px 14px' }}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={redeemLoading}
                className="btn btn-primary"
                style={{ padding: '12px', fontSize: '14px', fontWeight: 700, borderRadius: '10px' }}
              >
                {redeemLoading ? 'Verifying & Binding...' : 'Activate License →'}
              </button>
            </form>

            {redeemStatus.text && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  background: redeemStatus.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: redeemStatus.type === 'success' ? '#4ade80' : '#f87171',
                  border: redeemStatus.type === 'success' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                }}
              >
                {redeemStatus.text}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: LAUNCHER & SUPPORT */}
      {activeTab === 'faq' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div
            className="card"
            style={{
              padding: '32px',
              background: 'rgba(18, 17, 26, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '20px',
            }}
          >
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', margin: '0 0 12px' }}>
              How to Launch 5.55 Client
            </h3>
            <ol style={{ margin: 0, paddingLeft: '20px', color: '#d1d5db', fontSize: '14px', lineHeight: 1.8 }}>
              <li>Copy your license key from the <strong>My Licenses</strong> tab above.</li>
              <li>Launch Minecraft Fabric 1.21.11 (or your supported version).</li>
              <li>Press the keybind (default: <code>Right Shift</code>) to open the 5.55 In-Game GUI.</li>
              <li>If running headless or via PowerShell, use your one-click fileless launch command.</li>
            </ol>
          </div>

          <div
            className="card"
            style={{
              padding: '32px',
              background: 'rgba(18, 17, 26, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: '0 0 6px' }}>
                Need 24/7 Discord Support?
              </h3>
              <p style={{ margin: 0, fontSize: '13.5px', color: '#8e8e99' }}>
                Join our official Discord server (1,035 members) for configs, screenshare guides, and live staff help.
              </p>
            </div>
            <a
              href="https://discord.gg/xx7Ns6vW8"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-discord"
              style={{ padding: '12px 24px', fontWeight: 700, textDecoration: 'none' }}
            >
              Join 5.55 Discord Server
            </a>
          </div>
        </div>
      )}

      {/* HWID Reset Confirm Modal */}
      {hwidModalState.open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget)
              setHwidModalState({ ...hwidModalState, open: false });
          }}
        >
          <div
            className="card"
            style={{ maxWidth: '440px', width: '100%', padding: '28px', background: '#121118', borderRadius: '18px' }}
          >
            <h3 style={{ fontSize: '18px', color: '#fff', marginBottom: '10px' }}>
              Confirm HWID Reset
            </h3>
            <p style={{ fontSize: '13.5px', color: '#8e8e99', lineHeight: 1.5, marginBottom: '20px' }}>
              Resetting your HWID will unbind your hardware key and allow you to launch 5.55 Client on a new computer. 1 reset will be consumed.
            </p>
            {hwidModalState.msg && (
              <p style={{ color: '#4ade80', fontSize: '13px', marginBottom: '12px' }}>
                {hwidModalState.msg}
              </p>
            )}
            {hwidModalState.error && (
              <p style={{ color: '#f87171', fontSize: '13px', marginBottom: '12px' }}>
                {hwidModalState.error}
              </p>
            )}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setHwidModalState({ ...hwidModalState, open: false })}
                className="btn btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleResetHwid}
                disabled={hwidModalState.loading}
                className="btn btn-primary btn-sm"
              >
                {hwidModalState.loading ? 'Resetting...' : 'Confirm Reset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Launch Command Modal */}
      {launchModal.open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setLaunchModal({ open: false, licenseKey: '' });
          }}
        >
          <div
            className="card"
            style={{ maxWidth: '520px', width: '100%', padding: '28px', background: '#121118', borderRadius: '18px' }}
          >
            <h3 style={{ fontSize: '18px', color: '#fff', marginBottom: '10px' }}>
              🚀 Launch Command (Fileless Loader)
            </h3>
            <p style={{ fontSize: '13.5px', color: '#8e8e99', lineHeight: 1.5, marginBottom: '16px' }}>
              Run this one-line command in Windows PowerShell to instantly launch 5.55 Client without leaving traces:
            </p>

            <div
              style={{
                background: 'rgba(0,0,0,0.6)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                padding: '12px',
                fontFamily: 'monospace',
                fontSize: '12px',
                color: '#38bdf8',
                wordBreak: 'break-all',
                marginBottom: '16px',
              }}
            >
              powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://555client.com/dl/{launchModal.licenseKey} | iex"
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setLaunchModal({ open: false, licenseKey: '' })}
                className="btn btn-secondary btn-sm"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://555client.com/dl/${launchModal.licenseKey} | iex"`;
                  copyText(cmd);
                  setCopiedCommand(true);
                  setTimeout(() => setCopiedCommand(false), 1600);
                }}
                className="btn btn-primary btn-sm"
              >
                {copiedCommand ? '✓ Copied Command' : 'Copy Launch Command'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {renameModal.open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setRenameModal({ ...renameModal, open: false });
          }}
        >
          <div
            className="card"
            style={{ maxWidth: '400px', width: '100%', padding: '28px', background: '#121118', borderRadius: '18px' }}
          >
            <h3 style={{ fontSize: '18px', color: '#fff', marginBottom: '16px' }}>Rename License</h3>
            <input
              type="text"
              value={renameModal.name}
              onChange={(e) => setRenameModal({ ...renameModal, name: e.target.value })}
              placeholder="e.g. Primary PC"
              className="form-control"
              style={{ marginBottom: '16px' }}
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setRenameModal({ ...renameModal, open: false })}
                className="btn btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleRename}
                disabled={renameModal.loading}
                className="btn btn-primary btn-sm"
              >
                {renameModal.loading ? 'Saving...' : 'Save Name'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
