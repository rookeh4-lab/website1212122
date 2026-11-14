import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, copyText, API_BASE } from '../utils/api';

const PRODUCT_CATALOG = [
  {
    id: 'client',
    title: '5.55 Client',
    spec: 'Fabric mod · 1.21–1.21.11',
    subtitle: 'Fabric mod · 1.21–1.21.11',
    productSlug: 'java-client',
    placeholder: '555J-XXXX-XXXX-XXXX',
    checkoutUrl: 'https://lama-co.mysellauth.com/checkout/f637dd86402c3-0000017323883',
    onHold: false,
    matches: (lic) =>
      lic.product === 'java-client' ||
      lic.platform === 'fabric' ||
      (lic.product_name || '').toLowerCase().includes('java'),
  },
  {
    id: 'injection',
    title: '5.55 Injection',
    spec: 'Native C++ injector · 1.21.11',
    subtitle: 'Native C++ · 1.21.11 Single Player',
    productSlug: 'cpp-client',
    placeholder: '555C-XXXX-XXXX-XXXX',
    checkoutUrl: 'https://lama-co.mysellauth.com/checkout/8bfd882b2959f-0000017323965',
    onHold: true,
    matches: (lic) =>
      lic.product === 'cpp-client' ||
      lic.platform === 'native' ||
      lic.platform === 'both' ||
      (lic.product_name || '').toLowerCase().includes('c++') ||
      (lic.product_name || '').toLowerCase().includes('inject'),
  },
  {
    id: 'external',
    title: '5.55 External',
    spec: 'External utility · Windows',
    subtitle: 'External utility · Windows',
    productSlug: 'external',
    placeholder: '555E-XXXX-XXXX-XXXX',
    checkoutUrl: 'https://discord.gg/xx7Ns6vW8',
    onHold: true,
    matches: (lic) =>
      lic.product === 'external' ||
      lic.platform === 'external' ||
      (lic.product_name || '').toLowerCase().includes('external'),
  },
];

const MOTES = [
  { left: '18%', duration: '15s', delay: '-2s' },
  { left: '34%', duration: '19s', delay: '-8s' },
  { left: '52%', duration: '14s', delay: '-5s' },
  { left: '68%', duration: '21s', delay: '-11s' },
  { left: '84%', duration: '16s', delay: '-4s' },
  { left: '92%', duration: '18s', delay: '-9s' },
];

export default function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('home'); // 'home' | 'client' | 'injection' | 'external'
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [productHoldState, setProductHoldState] = useState({ 'cpp-client': true, 'external': true });

  // Key redemption state (shared cleanly with inline view feedback)
  const [redeemKey, setRedeemKey] = useState('');
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemStatus, setRedeemStatus] = useState({ text: '', type: '' });

  // Service status state
  const [statusLoading, setStatusLoading] = useState(false);
  const [apiOnline, setApiOnline] = useState(true);

  // Key & Launch & Download states
  const [visibleKeys, setVisibleKeys] = useState({});
  const [copiedKey, setCopiedKey] = useState(null);
  const [copiedCommand, setCopiedCommand] = useState(null);
  const [downloadLoading, setDownloadLoading] = useState(null);
  const [downloadError, setDownloadError] = useState('');
  const [downloadMeta, setDownloadMeta] = useState(null);

  // Modals
  const [renameModal, setRenameModal] = useState({
    open: false,
    key: '',
    name: '',
    loading: false,
    error: '',
  });

  const [hwidModalState, setHwidModalState] = useState({
    open: false,
    id: '',
    key: '',
    resetKey: '',
    cooldownRemaining: 0,
    loading: false,
    msg: '',
    error: '',
  });

  const [launchModal, setLaunchModal] = useState({
    open: false,
    licenseKey: '',
  });

  const [hwidSetupModal, setHwidSetupModal] = useState({
    open: false,
    licenseId: '',
    licenseKey: '',
    currentHwid: '',
    mode: 'direct', // 'direct' | 'log'
    inputHwid: '',
    logText: '',
    detectedHwid: '',
    loading: false,
    error: '',
    success: '',
  });

  const extractHwid = (text) => {
    if (!text || typeof text !== 'string') return '';
    const m1 = text.match(/Machine\s+HWID[:\s=]+([a-fA-F0-9]{16,64})/i);
    if (m1) return m1[1].toUpperCase();

    const m2 = text.match(/HWID[:\s=]+([a-fA-F0-9]{16,64})/i);
    if (m2) return m2[1].toUpperCase();

    const m3 = text.match(/\b([a-fA-F0-9]{64})\b/);
    if (m3) return m3[1].toUpperCase();

    const m4 = text.match(/\b([a-fA-F0-9]{32})\b/);
    if (m4) return m4[1].toUpperCase();

    const m5 = text.match(/\b([a-fA-F0-9]{16})\b/);
    if (m5) return m5[1].toUpperCase();

    return '';
  };

  const loadLicenses = useCallback(async (token) => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${API_BASE}/licenses/my`, {
        credentials: 'include',
        headers,
      });
      const data = await res.json();
      setLicenses(data.licenses || []);
    } catch {
      setLicenses([]);
    }
  }, []);

  const refreshServiceStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const res = await fetch(`${API_BASE}/health`);
      setApiOnline(res.ok);
    } catch {
      setApiOnline(false);
    } finally {
      setTimeout(() => setStatusLoading(false), 300);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const init = async () => {
      try {
        const data = await auth.getProfile();
        if (!active) return;
        if (!data?.user) {
          await auth.clear();
          navigate('/login', { replace: true });
          return;
        }
        setUser(data.user);
        const currentToken = (await auth.getAsyncToken?.()) || auth.getToken();
        await Promise.all([
          loadLicenses(currentToken),
          refreshServiceStatus(),
          fetch(`${API_BASE}/products`)
            .then((r) => r.json())
            .then((d) => {
              if (d?.products && Array.isArray(d.products)) {
                const hMap = {};
                d.products.forEach((p) => {
                  hMap[p.slug] = Boolean(p.on_hold);
                });
                setProductHoldState((prev) => ({ ...prev, ...hMap }));
              }
            })
            .catch(() => {}),
        ]);
      } catch {
        if (active) navigate('/login', { replace: true });
      } finally {
        if (active) setLoading(false);
      }
    };

    init();
    return () => { active = false; };
  }, [navigate, loadLicenses, refreshServiceStatus]);

  const isLicenseActive = (lic) => {
    if (!lic || lic.status !== 'active') return false;
    if (lic.expires_at && new Date(lic.expires_at) < new Date()) return false;
    return true;
  };

  const getProductActiveLicenses = (productDef) =>
    licenses.filter((lic) => isLicenseActive(lic) && productDef.matches(lic));

  const formatTierLabel = (tier) => {
    if (!tier) return 'Lifetime';
    const t = String(tier).toLowerCase();
    if (t.includes('lifetime')) return 'Lifetime';
    if (t.includes('month')) return 'Monthly';
    if (t.includes('trial')) return '3-Day Trial';
    return tier;
  };

  const formatExpiryText = (lic) => {
    if (!lic?.expires_at) return 'Never expires';
    return `Expires ${new Date(lic.expires_at).toLocaleDateString()}`;
  };

  const handleCopy = (val, type = 'key') => {
    copyText(val);
    if (type === 'cmd') {
      setCopiedCommand(val);
      setTimeout(() => setCopiedCommand(null), 1800);
    } else {
      setCopiedKey(val);
      setTimeout(() => setCopiedKey(null), 1600);
    }
  };

  const handleRedeem = async (e) => {
    e?.preventDefault();
    const clean = redeemKey.trim().toUpperCase();
    if (!clean) return;

    const KEY_FORMAT_REGEX = /^[A-Z0-9]{4,5}-[A-Z0-9]{4,5}-[A-Z0-9]{4,5}-[A-Z0-9]{4,5}$/i;
    if (!KEY_FORMAT_REGEX.test(clean)) {
      setRedeemStatus({ text: 'Invalid or unavailable key.', type: 'danger' });
      return;
    }

    setRedeemLoading(true);
    setRedeemStatus({ text: '', type: '' });
    const token = (await auth.getAsyncToken?.()) || auth.getToken();

    try {
      const claimHeaders = { 'Content-Type': 'application/json' };
      if (token) claimHeaders.Authorization = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/licenses/claim`, {
        method: 'POST',
        credentials: 'include',
        headers: claimHeaders,
        body: JSON.stringify({ key: clean }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRedeemStatus({ text: data.message || 'Key redeemed! Access unlocked.', type: 'success' });
        setRedeemKey('');
        await loadLicenses(token);
      } else if (res.status === 401) {
        const freshToken = await auth.getAsyncToken?.();
        if (freshToken && freshToken !== token) {
          const retryRes = await fetch(`${API_BASE}/licenses/claim`, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${freshToken}`,
            },
            body: JSON.stringify({ key: clean }),
          });
          const retryData = await retryRes.json();
          if (retryRes.ok && retryData.success) {
            setRedeemStatus({ text: retryData.message || 'Key redeemed! Access unlocked.', type: 'success' });
            setRedeemKey('');
            await loadLicenses(freshToken);
            return;
          }
        }
        setRedeemStatus({ text: 'Session expired. Please sign out and sign back in.', type: 'danger' });
      } else {
        setRedeemStatus({ text: data.error || 'Invalid or unavailable key.', type: 'danger' });
      }
    } catch {
      setRedeemStatus({ text: 'Unable to reach licensing server.', type: 'danger' });
    } finally {
      setRedeemLoading(false);
    }
  };

  const handleRename = async () => {
    if (!renameModal.key || !renameModal.name.trim()) return;
    setRenameModal((prev) => ({ ...prev, loading: true, error: '' }));
    const token = (await auth.getAsyncToken?.()) || auth.getToken();
    try {
      const renameHeaders = { 'Content-Type': 'application/json' };
      if (token) renameHeaders.Authorization = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/licenses/update-name`, {
        method: 'POST',
        credentials: 'include',
        headers: renameHeaders,
        body: JSON.stringify({ licenseKey: renameModal.key, name: renameModal.name.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setLicenses((prev) =>
          prev.map((lic) =>
            lic.key === renameModal.key ? { ...lic, name: data.name || renameModal.name.trim() } : lic
          )
        );
        setRenameModal({ open: false, key: '', name: '', loading: false, error: '' });
      } else {
        setRenameModal((prev) => ({ ...prev, loading: false, error: data.error || 'Failed to rename.' }));
      }
    } catch {
      setRenameModal((prev) => ({ ...prev, loading: false, error: 'Network error.' }));
    }
  };

  const handleResetHwid = async () => {
    const licKey = hwidModalState.key;
    const licId = hwidModalState.id;
    if (!licKey && !licId) return;

    if (hwidModalState.cooldownRemaining > 0 && !hwidModalState.resetKey?.trim()) {
      setHwidModalState((prev) => ({
        ...prev,
        error: `Reset cooldown active (${hwidModalState.cooldownRemaining} days remaining). Enter an Admin Reset Key to bypass or wait for cooldown.`,
      }));
      return;
    }

    setHwidModalState((prev) => ({ ...prev, loading: true, error: '', msg: '' }));
    const token = (await auth.getAsyncToken?.()) || auth.getToken();
    try {
      const resetHeaders = { 'Content-Type': 'application/json' };
      if (token) resetHeaders.Authorization = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/licenses/reset-hwid`, {
        method: 'POST',
        credentials: 'include',
        headers: resetHeaders,
        body: JSON.stringify({
          licenseId: licId,
          licenseKey: licKey,
          resetKey: hwidModalState.resetKey?.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setHwidModalState((prev) => ({
          ...prev,
          loading: false,
          msg: data.message || 'Machine HWID reset successfully!',
        }));
        setTimeout(() => {
          setHwidModalState({ open: false, id: '', key: '', resetKey: '', cooldownRemaining: 0, loading: false, msg: '', error: '' });
          loadLicenses(token);
        }, 1200);
      } else {
        setHwidModalState((prev) => ({
          ...prev,
          loading: false,
          error: data.error || 'Failed to reset machine HWID.',
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

  const handleSaveHwid = async (e) => {
    if (e) e.preventDefault();
    const rawTarget = hwidSetupModal.inputHwid || hwidSetupModal.detectedHwid || '';
    const cleanHwid = rawTarget.trim();

    if (!cleanHwid || cleanHwid.length < 16) {
      setHwidSetupModal((prev) => ({
        ...prev,
        error: 'Please enter a valid HWID or paste your latest.log to detect it.',
        success: '',
      }));
      return;
    }

    setHwidSetupModal((prev) => ({ ...prev, loading: true, error: '', success: '' }));

    try {
      const token = (await auth.getAsyncToken?.()) || auth.getToken();
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/licenses/set-hwid`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          licenseId: hwidSetupModal.licenseId,
          licenseKey: hwidSetupModal.licenseKey,
          hwid: cleanHwid,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setHwidSetupModal((prev) => ({
          ...prev,
          loading: false,
          success: 'Machine HWID successfully bound! You can now launch Minecraft.',
          error: '',
        }));
        loadLicenses(token);
        setTimeout(() => {
          setHwidSetupModal((prev) => ({ ...prev, open: false, success: '' }));
        }, 1200);
      } else {
        setHwidSetupModal((prev) => ({
          ...prev,
          loading: false,
          error: data.error || 'Failed to set HWID.',
          success: '',
        }));
      }
    } catch {
      setHwidSetupModal((prev) => ({
        ...prev,
        loading: false,
        error: 'Connection error while saving HWID.',
        success: '',
      }));
    }
  };

  const handleAuthorizedDownload = async (productSlug) => {
    setDownloadLoading(productSlug);
    setDownloadError('');
    const token = (await auth.getAsyncToken?.()) || auth.getToken();
    try {
      const dlHeaders = { 'Content-Type': 'application/json' };
      if (token) dlHeaders.Authorization = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/downloads/authorize`, {
        method: 'POST',
        credentials: 'include',
        headers: dlHeaders,
        body: JSON.stringify({ product_slug: productSlug }),
      });
      const data = await res.json();
      if (res.ok && data.authorized && (data.download_url || data.direct_download_url)) {
        const fallbackName = productSlug === 'java-client' ? 'CrosshairAddons-2.2.0+1.21.11.jar' : 'SyndicateLoader.exe';
        setDownloadMeta({
          fileName: data.file_name || fallbackName,
          fileSizeMb: data.file_size_bytes ? `${(data.file_size_bytes / (1024 * 1024)).toFixed(2)} MB` : '15.52 MB',
          sha256: data.sha256 || null,
          version: data.version || '1.21.11',
        });

        const targetUrl = data.direct_download_url || (data.download_url.startsWith('http') ? data.download_url : `${API_BASE}${data.download_url.replace(/^\/api/, '')}`);

        // Direct anchor download to avoid navigation errors or single-use token bugs
        const a = document.createElement('a');
        a.href = targetUrl;
        a.download = data.file_name || fallbackName;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        setDownloadError(data.error || 'Could not authorize download.');
      }
    } catch {
      setDownloadError('Connection error authorizing download.');
    } finally {
      setDownloadLoading(null);
    }
  };

  const handleLogout = async () => {
    await auth.clear();
    navigate('/login');
  };

  const selectView = (viewId) => {
    setActiveView(viewId);
    setRedeemStatus({ text: '', type: '' });
    setDownloadError('');
    setMobileSidebarOpen(false);
  };

  if (loading) {
    return (
      <div className="v2-dash-shell" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <img src="/logo.png" alt="5.55" style={{ width: '48px', height: '48px', borderRadius: '12px', marginBottom: '14px' }} />
          <p style={{ color: '#a1a1aa', fontSize: '14px', fontWeight: 500 }}>Loading 5.55 Dashboard...</p>
        </div>
      </div>
    );
  }

  const displayUsername = user?.displayName || user?.username || 'member';
  const initials = displayUsername.slice(0, 2).toUpperCase();
  const activeOwnedList = PRODUCT_CATALOG.flatMap((prod) =>
    getProductActiveLicenses(prod).map((lic) => ({ prod, lic }))
  );
  const currentProductDef = PRODUCT_CATALOG.find((p) => p.id === activeView) || null;
  const topTitle = activeView === 'home' ? 'Home' : currentProductDef?.title || 'Home';

  const serviceItems = [
    { label: 'Website', status: 'Operational', color: '#22c55e' },
    { label: 'Sign-in', status: apiOnline ? 'Operational' : 'Degraded', color: apiOnline ? '#22c55e' : '#ef4444' },
    { label: '5.55 Client', status: apiOnline ? 'Operational' : 'Offline', color: apiOnline ? '#22c55e' : '#ef4444' },
    { label: '5.55 Injection', status: apiOnline ? 'Operational' : 'Offline', color: apiOnline ? '#22c55e' : '#ef4444' },
    { label: '5.55 External', status: 'On hold', color: '#f59e0b' },
    { label: 'Downloads', status: apiOnline ? 'Operational' : 'Offline', color: apiOnline ? '#22c55e' : '#ef4444' },
  ];

  return (
    <div className="v2-dash-shell">
      {/* Subtle Ambient Purple Motes */}
      {MOTES.map((m, i) => (
        <span
          key={i}
          className="v2-dash-mote"
          style={{
            left: m.left,
            animationDuration: m.duration,
            animationDelay: m.delay,
          }}
        />
      ))}

      {/* Mobile Drawer Backdrop */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            zIndex: 25,
          }}
        />
      )}

      {/* ========================================================
          LEFT SIDEBAR NAVIGATION
          ======================================================== */}
      <aside className={`v2-dash-sidebar ${mobileSidebarOpen ? 'open' : ''}`}>
        <div style={{ padding: '18px 14px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Brand Logo Header */}
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '4px 8px',
              textDecoration: 'none',
            }}
          >
            <img
              src="/logo.png"
              alt="5.55"
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '7px',
                objectFit: 'cover',
                boxShadow: '0 0 14px rgba(168, 85, 247, 0.45)',
              }}
            />
            <span
              style={{
                fontSize: '19px',
                fontWeight: 800,
                color: '#ffffff',
                letterSpacing: '-0.02em',
              }}
            >
              5.55 Client
            </span>
          </Link>

          {/* Primary Home Button */}
          <div>
            <button
              type="button"
              onClick={() => selectView('home')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '10px',
                border:
                  activeView === 'home'
                    ? '1px solid rgba(168, 85, 247, 0.36)'
                    : '1px solid transparent',
                background:
                  activeView === 'home'
                    ? 'linear-gradient(135deg, rgba(147, 51, 234, 0.24) 0%, rgba(124, 58, 237, 0.12) 100%)'
                    : 'transparent',
                color: activeView === 'home' ? '#ffffff' : '#a1a1aa',
                fontSize: '13.5px',
                fontWeight: activeView === 'home' ? 700 : 500,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span>Home</span>
            </button>
          </div>

          {/* PRODUCTS SECTION */}
          <div>
            <div
              style={{
                fontSize: '10.5px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: '#71717a',
                textTransform: 'uppercase',
                padding: '0 12px',
                marginBottom: '8px',
              }}
            >
              Products
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {PRODUCT_CATALOG.map((prod) => {
                const isSelected = activeView === prod.id;
                const isOwned = getProductActiveLicenses(prod).length > 0;
                const isProdOnHold = productHoldState[prod.productSlug] !== undefined ? productHoldState[prod.productSlug] : prod.onHold;

                return (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => selectView(prod.id)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '9px 12px',
                      borderRadius: '10px',
                      border: isSelected
                        ? '1px solid rgba(168, 85, 247, 0.35)'
                        : '1px solid transparent',
                      background: isSelected
                        ? 'linear-gradient(135deg, rgba(147, 51, 234, 0.22) 0%, rgba(124, 58, 237, 0.10) 100%)'
                        : 'transparent',
                      color: isProdOnHold
                        ? '#71717a'
                        : isSelected
                        ? '#ffffff'
                        : '#d4d4d8',
                      fontSize: '13.5px',
                      fontWeight: isSelected ? 700 : 500,
                      fontStyle: isProdOnHold ? 'italic' : 'normal',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>{prod.title}</span>
                    {isProdOnHold ? (
                      <span
                        style={{
                          fontSize: '11px',
                          fontStyle: 'normal',
                          fontWeight: 600,
                          color: '#f59e0b',
                          opacity: 0.9,
                        }}
                      >
                        On hold
                      </span>
                    ) : (
                      <span
                        style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          background: isOwned ? '#22c55e' : '#52525b',
                          boxShadow: isOwned ? '0 0 8px rgba(34, 197, 94, 0.7)' : 'none',
                        }}
                        title={isOwned ? 'Owned' : 'Not owned'}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ADMIN & LINKS SECTION */}
          <div>
            <div
              style={{
                fontSize: '10.5px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: '#71717a',
                textTransform: 'uppercase',
                padding: '0 12px',
                marginBottom: '8px',
              }}
            >
              Quick Links
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {(user?.role === 'admin' || ['rookeh4@gmail.com', 'rabinzzz113@gmail.com', 'rabinjj09@gmail.com'].includes(user?.email?.toLowerCase()) || Boolean(localStorage.getItem('555_admin_token'))) && (
                <Link
                  to="/admin"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    color: '#fb7185',
                    fontSize: '13px',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  <span>Admin Panel</span>
                  <span style={{ fontSize: '11px' }}>→</span>
                </Link>
              )}
              <Link
                to="/checkout"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  color: '#a1a1aa',
                  fontSize: '13px',
                  fontWeight: 500,
                  textDecoration: 'none',
                }}
              >
                <span>Store & Pricing</span>
                <span style={{ fontSize: '11px' }}>↗</span>
              </Link>
              <a
                href="https://discord.gg/xx7Ns6vW8"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  color: '#a1a1aa',
                  fontSize: '13px',
                  fontWeight: 500,
                  textDecoration: 'none',
                }}
              >
                <span>Discord Support</span>
                <span style={{ fontSize: '11px' }}>↗</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom User Account Footer Card */}
        <div style={{ padding: '12px', position: 'relative' }}>
          {userMenuOpen && (
            <div
              style={{
                position: 'absolute',
                bottom: '74px',
                left: '12px',
                right: '12px',
                background: '#161124',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '6px',
                boxShadow: '0 14px 30px rgba(0,0,0,0.6)',
                zIndex: 40,
              }}
            >
              <Link
                to="/"
                style={{
                  display: 'block',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  color: '#d4d4d8',
                  textDecoration: 'none',
                }}
              >
                Back to Homepage
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'transparent',
                  color: '#f87171',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Sign out
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setUserMenuOpen((prev) => !prev)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#fff',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={displayUsername}
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '1px solid rgba(168, 85, 247, 0.4)',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    background: 'rgba(139, 92, 246, 0.22)',
                    border: '1px solid rgba(168, 85, 247, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#e9d5ff',
                    flexShrink: 0,
                  }}
                >
                  {initials}
                </div>
              )}
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#ffffff',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {displayUsername}
                </div>
                <span
                  style={{
                    display: 'inline-block',
                    marginTop: '2px',
                    padding: '1px 7px',
                    borderRadius: '6px',
                    fontSize: '10.5px',
                    fontWeight: 700,
                    background: 'rgba(147, 51, 234, 0.22)',
                    color: '#c084fc',
                  }}
                >
                  {user?.role === 'admin'
                    ? 'Admin'
                    : activeOwnedList.length > 0
                    ? '5.55 Owner'
                    : 'Member'}
                </span>
              </div>
            </div>

            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="2">
              <polyline points="7 15 12 20 17 15" />
              <polyline points="7 9 12 4 17 9" />
            </svg>
          </button>
        </div>
      </aside>

      {/* ========================================================
          RIGHT CONTENT WORKSPACE
          ======================================================== */}
      <div className="v2-dash-main">
        {/* Clean Slim Top Bar */}
        <header
          style={{
            height: '54px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 28px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              className="v2-dash-mobile-btn"
              onClick={() => setMobileSidebarOpen(true)}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                borderRadius: '8px',
                padding: '6px 9px',
                cursor: 'pointer',
              }}
              aria-label="Open menu"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#e4e4e7' }}>
              {topTitle}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {(user?.role === 'admin' || ['rookeh4@gmail.com', 'rabinzzz113@gmail.com', 'rabinjj09@gmail.com'].includes(user?.email?.toLowerCase()) || Boolean(localStorage.getItem('555_admin_token'))) && (
              <Link
                to="/admin"
                style={{
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: '#fb7185',
                  textDecoration: 'none',
                }}
              >
                Admin
              </Link>
            )}
            <button
              type="button"
              onClick={handleLogout}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.09)',
                borderRadius: '8px',
                padding: '5px 12px',
                color: '#a1a1aa',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Log out
            </button>
          </div>
        </header>

        {/* Main Workspace Body */}
        <div style={{ width: '100%', maxWidth: '1080px', padding: '32px 32px 64px', margin: '0 auto' }}>
          {/* ==================================================
              VIEW 1: HOME DASHBOARD
              ================================================== */}
          {activeView === 'home' && (
            <div>
              {/* Hero Welcome */}
              <h1
                style={{
                  fontSize: 'clamp(28px, 3.6vw, 38px)',
                  fontWeight: 800,
                  color: '#ffffff',
                  letterSpacing: '-0.025em',
                  margin: '0 0 20px',
                }}
              >
                Welcome back,{' '}
                <span
                  style={{
                    background: 'linear-gradient(135deg, #d8b4fe 0%, #a855f7 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {displayUsername}
                </span>
                .
              </h1>

              {/* On Hold Product Notices */}
              {PRODUCT_CATALOG.filter((p) => {
                return productHoldState[p.productSlug] !== undefined ? productHoldState[p.productSlug] : p.onHold;
              }).map((held) => (
                <div
                  key={held.id}
                  onClick={() => selectView(held.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: 'rgba(120, 74, 10, 0.22)',
                    border: '1px solid rgba(245, 158, 11, 0.34)',
                    color: '#fbbf24',
                    fontSize: '13.5px',
                    fontWeight: 500,
                    marginBottom: '14px',
                    cursor: 'pointer',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ flexShrink: 0 }}>
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span>{held.title} is currently on hold.</span>
                </div>
              ))}

              {/* 2-Column Main Home Grid */}
              <div className="v2-dash-grid">
                {/* LEFT COLUMN: Your Products + Redeem a Key */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {/* Your products card */}
                  <div className="v2-dash-card" style={{ padding: '20px 22px' }}>
                    <div
                      style={{
                        fontSize: '13.5px',
                        fontWeight: 700,
                        color: '#ffffff',
                        marginBottom: '14px',
                      }}
                    >
                      Your products
                    </div>

                    {activeOwnedList.length === 0 ? (
                      <div
                        style={{
                          padding: '18px',
                          borderRadius: '12px',
                          background: 'rgba(0, 0, 0, 0.28)',
                          border: '1px dashed rgba(255, 255, 255, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '12px',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: '#e4e4e7' }}>
                            No active products yet
                          </div>
                          <div style={{ fontSize: '12.5px', color: '#71717a', marginTop: '3px' }}>
                            Redeem a key below or view available plans to unlock access.
                          </div>
                        </div>
                        <Link
                          to="/checkout"
                          style={{
                            padding: '9px 16px',
                            borderRadius: '10px',
                            background: 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)',
                            color: '#ffffff',
                            fontSize: '13px',
                            fontWeight: 700,
                            textDecoration: 'none',
                          }}
                        >
                          View plans →
                        </Link>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {activeOwnedList.map(({ prod, lic }) => (
                          <div
                            key={lic.key}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: '14px',
                              padding: '14px 16px',
                              borderRadius: '12px',
                              background: 'rgba(255, 255, 255, 0.025)',
                              border: '1px solid rgba(255, 255, 255, 0.07)',
                            }}
                          >
                            <div style={{ minWidth: '160px' }}>
                              <div style={{ fontSize: '17px', fontWeight: 800, color: '#ffffff' }}>
                                {prod.title}
                              </div>
                              <div style={{ fontSize: '12px', color: '#71717a', marginTop: '2px' }}>
                                {prod.subtitle}
                              </div>
                            </div>

                            <div style={{ textAlign: 'center' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '3px 10px',
                                  borderRadius: '9999px',
                                  background: 'rgba(34, 197, 94, 0.14)',
                                  border: '1px solid rgba(34, 197, 94, 0.3)',
                                  color: '#4ade80',
                                  fontSize: '11.5px',
                                  fontWeight: 700,
                                }}
                              >
                                <span
                                  style={{
                                    width: '5px',
                                    height: '5px',
                                    borderRadius: '50%',
                                    background: '#4ade80',
                                  }}
                                />
                                {formatTierLabel(lic.tier)}
                              </span>
                              <div style={{ fontSize: '11.5px', color: '#71717a', marginTop: '4px' }}>
                                {formatExpiryText(lic)}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => selectView(prod.id)}
                              style={{
                                padding: '9px 18px',
                                borderRadius: '10px',
                                border: 'none',
                                background: 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)',
                                color: '#ffffff',
                                fontSize: '13px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                boxShadow: '0 4px 14px rgba(147, 51, 234, 0.32)',
                              }}
                            >
                              {prod.id === 'injection' ? 'Open loader' : 'Open client'}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Redeem a key card */}
                  <div className="v2-dash-card" style={{ padding: '20px 22px' }}>
                    <div
                      style={{
                        fontSize: '13.5px',
                        fontWeight: 700,
                        color: '#ffffff',
                        marginBottom: '12px',
                      }}
                    >
                      Redeem a key
                    </div>

                    <form
                      onSubmit={handleRedeem}
                      style={{
                        display: 'flex',
                        gap: '10px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <input
                        type="text"
                        value={redeemKey}
                        onChange={(e) => setRedeemKey(e.target.value.toUpperCase())}
                        placeholder="Paste any 5.55 Client, Injection or External key"
                        style={{
                          flex: '1 1 240px',
                          padding: '11px 14px',
                          borderRadius: '10px',
                          background: 'rgba(10, 7, 18, 0.85)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#ffffff',
                          fontFamily: 'monospace',
                          fontSize: '13px',
                          outline: 'none',
                        }}
                      />
                      <button
                        type="submit"
                        disabled={redeemLoading || !redeemKey.trim()}
                        style={{
                          padding: '11px 22px',
                          borderRadius: '10px',
                          border: 'none',
                          background: 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)',
                          color: '#ffffff',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: redeemLoading || !redeemKey.trim() ? 'not-allowed' : 'pointer',
                          opacity: redeemLoading || !redeemKey.trim() ? 0.7 : 1,
                        }}
                      >
                        {redeemLoading ? 'Checking...' : 'Redeem'}
                      </button>
                    </form>

                    {redeemStatus.text ? (
                      <div
                        style={{
                          marginTop: '10px',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          color: redeemStatus.type === 'success' ? '#4ade80' : '#f87171',
                        }}
                      >
                        {redeemStatus.text}
                      </div>
                    ) : (
                      <div style={{ marginTop: '10px', fontSize: '12px', color: '#71717a' }}>
                        We work out which product a key is for, so there&apos;s only one box.
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT COLUMN: Service status card */}
                <div className="v2-dash-card" style={{ padding: '20px 22px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '12px',
                    }}
                  >
                    <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#ffffff' }}>
                      Service status
                    </span>
                    <button
                      type="button"
                      onClick={refreshServiceStatus}
                      title="Refresh service status"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#71717a',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        transform: statusLoading ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.3s ease',
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="23 4 23 10 17 10" />
                        <polyline points="1 20 1 14 7 14" />
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                      </svg>
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {serviceItems.map((svc, idx) => (
                      <div
                        key={svc.label}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 0',
                          borderBottom:
                            idx === serviceItems.length - 1
                              ? 'none'
                              : '1px solid rgba(255, 255, 255, 0.06)',
                          fontSize: '13px',
                        }}
                      >
                        <span style={{ color: '#e4e4e7', fontWeight: 500 }}>{svc.label}</span>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: svc.color,
                            fontWeight: 600,
                            fontSize: '12.5px',
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: svc.color,
                              boxShadow: `0 0 8px ${svc.color}`,
                            }}
                          />
                          {svc.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================
              VIEW 2/3/4: PRODUCT DETAIL PAGE
              ================================================== */}
          {activeView !== 'home' && currentProductDef && (() => {
            const productLicenses = getProductActiveLicenses(currentProductDef);
            const isOwned = productLicenses.length > 0;
            const isOnHold = productHoldState[currentProductDef.productSlug] !== undefined ? productHoldState[currentProductDef.productSlug] : currentProductDef.onHold;

            return (
              <div>
                {/* Product Header + Badges */}
                <div style={{ marginBottom: '26px' }}>
                  <h1
                    style={{
                      fontSize: 'clamp(28px, 3.6vw, 38px)',
                      fontWeight: 800,
                      color: '#ffffff',
                      letterSpacing: '-0.025em',
                      margin: '0 0 12px',
                    }}
                  >
                    {currentProductDef.title}
                  </h1>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: '9999px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#a1a1aa',
                        fontSize: '12px',
                        fontWeight: 500,
                      }}
                    >
                      {currentProductDef.spec}
                    </span>

                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 12px',
                        borderRadius: '9999px',
                        background: isOnHold
                          ? 'rgba(245, 158, 11, 0.14)'
                          : isOwned
                          ? 'rgba(34, 197, 94, 0.14)'
                          : 'rgba(255, 255, 255, 0.05)',
                        border: isOnHold
                          ? '1px solid rgba(245, 158, 11, 0.35)'
                          : isOwned
                          ? '1px solid rgba(34, 197, 94, 0.35)'
                          : '1px solid rgba(255, 255, 255, 0.1)',
                        color: isOnHold ? '#fbbf24' : isOwned ? '#4ade80' : '#a1a1aa',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: isOnHold ? '#f59e0b' : isOwned ? '#4ade80' : '#71717a',
                        }}
                      />
                      {isOnHold ? 'On hold' : isOwned ? 'Owned' : 'Not owned'}
                    </span>
                  </div>
                </div>

                {/* STATE 1: 5.55 External ON HOLD */}
                {isOnHold && !isOwned && (
                  <div
                    className="v2-dash-card"
                    style={{
                      padding: '56px 28px',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '50%',
                        background: 'rgba(245, 158, 11, 0.14)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fbbf24',
                        marginBottom: '16px',
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="6" y="4" width="4" height="16" />
                        <rect x="14" y="4" width="4" height="16" />
                      </svg>
                    </div>

                    <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', margin: '0 0 8px' }}>
                      {currentProductDef.title} is on hold.
                    </h2>
                    <p
                      style={{
                        fontSize: '13.5px',
                        color: '#a1a1aa',
                        maxWidth: '440px',
                        margin: '0 auto 24px',
                        lineHeight: 1.6,
                      }}
                    >
                      Access, key redemption, and downloads for {currentProductDef.title} are temporarily paused while builds are finalized.
                    </p>

                    <a
                      href="https://discord.gg/xx7Ns6vW8"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 20px',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#ffffff',
                        fontSize: '13px',
                        fontWeight: 700,
                        textDecoration: 'none',
                      }}
                    >
                      <span>Join Discord for updates</span>
                      <span style={{ fontSize: '11px' }}>↗</span>
                    </a>
                  </div>
                )}

                {/* STATE 2: NOT OWNED (matches Reference Screenshot 2 exactly) */}
                {!isOnHold && !isOwned && (
                  <div
                    className="v2-dash-card"
                    style={{
                      padding: '52px 28px',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#d4d4d8',
                        marginBottom: '16px',
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </div>

                    <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', margin: '0 0 8px' }}>
                      You don&apos;t own {currentProductDef.title} yet.
                    </h2>
                    <p
                      style={{
                        fontSize: '13.5px',
                        color: '#a1a1aa',
                        maxWidth: '490px',
                        margin: '0 auto 24px',
                        lineHeight: 1.5,
                      }}
                    >
                      Have a key? Paste it below. Your licence, machine and downloads appear here straight away.
                    </p>

                    <div style={{ maxWidth: '460px', margin: '0 auto', textAlign: 'left' }}>
                      <form onSubmit={handleRedeem} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <input
                          type="text"
                          value={redeemKey}
                          onChange={(e) => setRedeemKey(e.target.value.toUpperCase())}
                          placeholder={currentProductDef.placeholder}
                          style={{
                            flex: '1 1 260px',
                            padding: '11px 14px',
                            borderRadius: '10px',
                            background: 'rgba(9, 6, 17, 0.9)',
                            border:
                              redeemStatus.type === 'danger'
                                ? '1px solid rgba(239, 68, 68, 0.65)'
                                : '1px solid rgba(168, 85, 247, 0.4)',
                            color: '#ffffff',
                            fontFamily: 'monospace',
                            fontSize: '13.5px',
                            outline: 'none',
                          }}
                        />
                        <button
                          type="submit"
                          disabled={redeemLoading || !redeemKey.trim()}
                          style={{
                            padding: '11px 22px',
                            borderRadius: '10px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)',
                            color: '#ffffff',
                            fontSize: '13.5px',
                            fontWeight: 700,
                            cursor: redeemLoading || !redeemKey.trim() ? 'not-allowed' : 'pointer',
                            opacity: redeemLoading || !redeemKey.trim() ? 0.7 : 1,
                          }}
                        >
                          {redeemLoading ? 'Checking...' : 'Redeem'}
                        </button>
                      </form>

                      {redeemStatus.text && (
                        <div
                          style={{
                            marginTop: '10px',
                            fontSize: '12.5px',
                            fontWeight: 600,
                            color: redeemStatus.type === 'success' ? '#4ade80' : '#f87171',
                          }}
                        >
                          {redeemStatus.text}
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        maxWidth: '460px',
                        margin: '22px auto',
                      }}
                    >
                      <span style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.08)' }} />
                      <span style={{ fontSize: '12px', color: '#71717a' }}>or</span>
                      <span style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.08)' }} />
                    </div>

                    <a
                      href={currentProductDef.checkoutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 20px',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#ffffff',
                        fontSize: '13px',
                        fontWeight: 700,
                        textDecoration: 'none',
                      }}
                    >
                      <span>Get {currentProductDef.title}</span>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  </div>
                )}

                {/* STATE 3: OWNED PRODUCT VIEW (License, Launch, Downloads & HWID Machine) */}
                {isOwned && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    {isOnHold && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '14px 18px',
                          borderRadius: '12px',
                          background: 'rgba(120, 74, 10, 0.22)',
                          border: '1px solid rgba(245, 158, 11, 0.35)',
                          color: '#fbbf24',
                          fontSize: '13.5px',
                          fontWeight: 500,
                        }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ flexShrink: 0 }}>
                          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                          <line x1="12" y1="9" x2="12" y2="13" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        <span>
                          <strong>{currentProductDef.title} is currently on hold.</strong> Downloads and loader launching are temporarily paused while updates are finalized. Your license remains active and safe.
                        </span>
                      </div>
                    )}

                    {productLicenses.map((lic) => {
                      const isHidden = !visibleKeys[lic.key];
                      const displayKey = isHidden
                        ? `${lic.key.substring(0, 7)}••••-••••`
                        : lic.key;
                      const accountEmail = user?.email || '';

                        const launchCommand = `powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://www.555client.xyz/dl/${user?.email || lic.key} | iex"`;

                        return (
                          <div key={lic.id || lic.key} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                            {/* Launch & Downloads Card */}
                            <div className="v2-dash-card" style={{ padding: '24px' }}>
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  flexWrap: 'wrap',
                                  gap: '12px',
                                  marginBottom: '16px',
                                }}
                              >
                                <div>
                                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff' }}>
                                    {currentProductDef.id === 'client' ? 'Client Mod Download' : 'Launch & Downloads'}
                                  </div>
                                  <div style={{ fontSize: '12.5px', color: '#71717a', marginTop: '3px' }}>
                                    {currentProductDef.id === 'client'
                                      ? 'Download the stealth Fabric 1.21.11 mod jar (CrosshairAddons).'
                                      : 'Run the instant PowerShell loader or download the standalone executable.'}
                                  </div>
                                </div>

                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                  {isOnHold ? (
                                    <div
                                      style={{
                                        padding: '9px 18px',
                                        borderRadius: '10px',
                                        background: 'rgba(245, 158, 11, 0.14)',
                                        border: '1px solid rgba(245, 158, 11, 0.35)',
                                        color: '#fbbf24',
                                        fontSize: '13px',
                                        fontWeight: 700,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                      }}
                                    >
                                      <span>⏸ Downloads On Hold</span>
                                    </div>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleAuthorizedDownload(currentProductDef.productSlug)}
                                        disabled={downloadLoading === currentProductDef.productSlug}
                                        style={{
                                          padding: '9px 18px',
                                          borderRadius: '10px',
                                          border: 'none',
                                          background: 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)',
                                          color: '#ffffff',
                                          fontSize: '13px',
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                        }}
                                      >
                                        {downloadLoading === currentProductDef.productSlug
                                          ? 'Authorizing...'
                                          : currentProductDef.id === 'client'
                                          ? 'Download Mod (.jar) ↓'
                                          : 'Download SyndicateLoader.exe ↓'}
                                      </button>
                                      {currentProductDef.id === 'injection' && (
                                        <button
                                          type="button"
                                          onClick={() => setLaunchModal({ open: true, licenseKey: lic.key })}
                                          style={{
                                            padding: '9px 16px',
                                            borderRadius: '10px',
                                            border: '1px solid rgba(255,255,255,0.12)',
                                            background: 'rgba(255,255,255,0.06)',
                                            color: '#ffffff',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                          }}
                                        >
                                          Launch Guide
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>

                              {downloadError && (
                                <div style={{ color: '#f87171', fontSize: '12.5px', marginBottom: '12px' }}>
                                  {downloadError}
                                </div>
                              )}

                              {currentProductDef.id === 'client' ? (
                                <div
                                  style={{
                                    padding: '14px 16px',
                                    borderRadius: '10px',
                                    background: 'rgba(8, 5, 16, 0.85)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    fontSize: '12.5px',
                                    color: '#d4d4d8',
                                    lineHeight: 1.6,
                                  }}
                                >
                                  <div>
                                    <strong style={{ color: '#c4b5fd' }}>Installation:</strong> Save <code style={{ color: '#ffffff' }}>CrosshairAddons-2.2.0+1.21.11.jar</code> into your <code style={{ color: '#ffffff' }}>.minecraft/mods</code> folder.
                                  </div>
                                  <div style={{ color: '#71717a', fontSize: '11.5px', marginTop: '4px' }}>
                                    Start Minecraft Fabric 1.21.11, then set your Machine HWID below (enter directly or paste latest.log to auto-detect).
                                  </div>
                                </div>
                              ) : isOnHold ? (
                                <div
                                  style={{
                                    padding: '12px 14px',
                                    borderRadius: '10px',
                                    background: 'rgba(8, 5, 16, 0.85)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    color: '#fbbf24',
                                    fontSize: '12.5px',
                                    fontStyle: 'italic',
                                  }}
                                >
                                  ⏸ PowerShell loader command is temporarily on hold while updates are being finalized.
                                </div>
                              ) : (
                                /* PowerShell Fast Launch Command Strip for Injection */
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '12px',
                                    padding: '12px 14px',
                                    borderRadius: '10px',
                                    background: 'rgba(8, 5, 16, 0.85)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                  }}
                                >
                                  <code
                                    style={{
                                      fontSize: '12px',
                                      color: '#c4b5fd',
                                      fontFamily: 'monospace',
                                      wordBreak: 'break-all',
                                    }}
                                  >
                                    {launchCommand}
                                  </code>
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(launchCommand, 'cmd')}
                                    style={{
                                      flexShrink: 0,
                                      padding: '7px 14px',
                                      borderRadius: '8px',
                                      border: '1px solid rgba(168, 85, 247, 0.4)',
                                      background: 'rgba(147, 51, 234, 0.2)',
                                      color: '#e9d5ff',
                                      fontSize: '12px',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    {copiedCommand === launchCommand ? '✓ Copied' : 'Copy'}
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Licence Card (Matches exact layout from reference image - No license key shown) */}
                            <div className="v2-dash-card" style={{ padding: '24px 28px' }}>
                              <div style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', marginBottom: '20px' }}>
                                Licence
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                                {/* STATUS Row */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                  <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#71717a', letterSpacing: '0.08em' }}>
                                    STATUS
                                  </div>
                                  <div>
                                    <span
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '4px 12px',
                                        borderRadius: '9999px',
                                        background: 'rgba(34, 197, 94, 0.14)',
                                        border: '1px solid rgba(34, 197, 94, 0.3)',
                                        color: '#4ade80',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                      }}
                                    >
                                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80' }} />
                                      {formatTierLabel(lic.tier)}
                                    </span>
                                  </div>
                                </div>

                                {/* EXPIRES Row */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                  <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#71717a', letterSpacing: '0.08em' }}>
                                    EXPIRES
                                  </div>
                                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>
                                    {lic.expires_at ? new Date(lic.expires_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Never'}
                                  </div>
                                </div>

                                {/* MACHINE Row */}
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', paddingBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                  <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#71717a', letterSpacing: '0.08em', marginTop: '8px' }}>
                                    MACHINE
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                      <div
                                        style={{
                                          padding: '7px 14px',
                                          borderRadius: '8px',
                                          background: lic.hwid ? 'rgba(0, 0, 0, 0.55)' : 'rgba(239, 68, 68, 0.12)',
                                          border: lic.hwid ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(239, 68, 68, 0.3)',
                                          fontFamily: 'monospace',
                                          fontSize: '13px',
                                          color: lic.hwid ? '#d4d4d8' : '#f87171',
                                          fontWeight: 600,
                                        }}
                                      >
                                        {lic.hwid
                                          ? `${lic.hwid.slice(0, 10)}...${lic.hwid.slice(-8)}`
                                          : 'No machine bound'}
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => setHwidSetupModal({
                                          open: true,
                                          licenseId: lic.id,
                                          licenseKey: lic.key,
                                          currentHwid: lic.hwid || '',
                                          mode: 'direct',
                                          inputHwid: lic.hwid || '',
                                          logText: '',
                                          detectedHwid: '',
                                          loading: false,
                                          error: '',
                                          success: '',
                                        })}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '6px',
                                          padding: '7px 14px',
                                          borderRadius: '8px',
                                          border: 'none',
                                          background: lic.hwid
                                            ? 'rgba(168, 85, 247, 0.2)'
                                            : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                          color: '#ffffff',
                                          fontSize: '12.5px',
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                          boxShadow: lic.hwid ? 'none' : '0 2px 10px rgba(16, 185, 129, 0.35)',
                                        }}
                                      >
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                          <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                                        </svg>
                                        <span>{lic.hwid ? 'Change HWID' : 'Set Machine HWID'}</span>
                                      </button>

                                      {lic.hwid && (
                                        <button
                                          type="button"
                                          onClick={() => handleCopy(lic.hwid, 'hwid')}
                                          style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '7px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid rgba(255, 255, 255, 0.12)',
                                            background: 'rgba(255, 255, 255, 0.06)',
                                            color: '#ffffff',
                                            fontSize: '12.5px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                          }}
                                        >
                                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                                            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                                          </svg>
                                          <span>{copiedKey === 'hwid' ? 'Copied' : 'Copy'}</span>
                                        </button>
                                      )}

                                      {lic.hwid && (
                                        <button
                                          type="button"
                                          onClick={() => setHwidModalState({
                                            open: true,
                                            id: lic.id,
                                            key: lic.key,
                                            resetKey: '',
                                            cooldownRemaining: lic.cooldown_days_remaining || 0,
                                            loading: false,
                                            msg: '',
                                            error: '',
                                          })}
                                          style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '7px 14px',
                                            borderRadius: '8px',
                                            border: '1px solid rgba(255, 255, 255, 0.12)',
                                            background: 'rgba(255, 255, 255, 0.06)',
                                            color: '#ffffff',
                                            fontSize: '12.5px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                          }}
                                        >
                                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                                          </svg>
                                          <span>Reset machine</span>
                                        </button>
                                      )}
                                    </div>
                                    <div style={{ fontSize: '11.5px', color: '#71717a' }}>
                                      {lic.hwid ? (
                                        lic.cooldown_days_remaining > 0
                                          ? `Next reset available in ${lic.cooldown_days_remaining} day${lic.cooldown_days_remaining === 1 ? '' : 's'}. (One reset every 1 month)`
                                          : 'One reset every 1 month.'
                                      ) : (
                                        <span style={{ color: '#fbbf24' }}>
                                          ⚡ Setup your HWID to unlock client launching. Enter HWID directly or paste latest.log.
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* DISCORD ROLE Row */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#71717a', letterSpacing: '0.08em' }}>
                                    DISCORD ROLE
                                  </div>
                                  <div>
                                    <span
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '4px 12px',
                                        borderRadius: '9999px',
                                        background: user?.discordId ? 'rgba(34, 197, 94, 0.14)' : 'rgba(147, 51, 234, 0.14)',
                                        border: user?.discordId ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(147, 51, 234, 0.3)',
                                        color: user?.discordId ? '#4ade80' : '#c4b5fd',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                      }}
                                    >
                                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: user?.discordId ? '#4ade80' : '#c4b5fd' }} />
                                      {user?.discordId ? 'Claimed' : 'Linked via Discord'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* ========================================================
          MODALS (HWID SETUP, HWID RESET, LAUNCH GUIDE, RENAME)
          ======================================================== */}
      {hwidSetupModal.open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(0, 0, 0, 0.82)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !hwidSetupModal.loading) {
              setHwidSetupModal({ ...hwidSetupModal, open: false, error: '', success: '' });
            }
          }}
        >
          <div
            className="v2-dash-card"
            style={{
              maxWidth: '540px',
              width: '100%',
              padding: '28px',
              background: '#130d22',
              border: '1px solid rgba(168, 85, 247, 0.35)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.85)',
              borderRadius: '16px',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '19px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                  Machine HWID Setup
                </h3>
                <div style={{ fontSize: '12px', color: '#a1a1aa', marginTop: '3px' }}>
                  Bind your computer hardware ID to this license
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHwidSetupModal({ ...hwidSetupModal, open: false, error: '', success: '' })}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  color: '#d4d4d8',
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>

            {/* Mode Selector Tabs */}
            <div
              style={{
                display: 'flex',
                background: 'rgba(0, 0, 0, 0.55)',
                padding: '4px',
                borderRadius: '10px',
                marginBottom: '18px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <button
                type="button"
                onClick={() => setHwidSetupModal(prev => ({ ...prev, mode: 'direct', error: '' }))}
                style={{
                  flex: 1,
                  padding: '9px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: hwidSetupModal.mode === 'direct' ? 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)' : 'transparent',
                  color: hwidSetupModal.mode === 'direct' ? '#ffffff' : '#a1a1aa',
                  transition: 'all 0.15s',
                }}
              >
                Direct HWID Input
              </button>
              <button
                type="button"
                onClick={() => setHwidSetupModal(prev => ({ ...prev, mode: 'log', error: '' }))}
                style={{
                  flex: 1,
                  padding: '9px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: hwidSetupModal.mode === 'log' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
                  color: hwidSetupModal.mode === 'log' ? '#ffffff' : '#a1a1aa',
                  transition: 'all 0.15s',
                }}
              >
                Auto-Detect from latest.log
              </button>
            </div>

            {/* Mode 1: Direct HWID Input */}
            {hwidSetupModal.mode === 'direct' && (
              <div style={{ marginBottom: '18px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: '#c4b5fd',
                    marginBottom: '8px',
                    letterSpacing: '0.05em',
                  }}
                >
                  ENTER HARDWARE ID (HWID)
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="e.g. 175CDCA6D28699D8B6F8E8C78B..."
                    value={hwidSetupModal.inputHwid}
                    onChange={(e) => {
                      const clean = e.target.value.toUpperCase();
                      setHwidSetupModal(prev => ({ ...prev, inputHwid: clean, error: '' }));
                    }}
                    style={{
                      flex: 1,
                      padding: '11px 14px',
                      borderRadius: '10px',
                      background: 'rgba(0, 0, 0, 0.65)',
                      border: '1px solid rgba(255, 255, 255, 0.14)',
                      color: '#ffffff',
                      fontFamily: 'monospace',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const txt = await navigator.clipboard.readText();
                        if (txt) {
                          const detected = extractHwid(txt) || txt.trim().toUpperCase();
                          setHwidSetupModal(prev => ({ ...prev, inputHwid: detected, error: '' }));
                        }
                      } catch {
                        // Fallback
                      }
                    }}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      background: 'rgba(255, 255, 255, 0.08)',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Paste
                  </button>
                </div>
                <div style={{ fontSize: '11.5px', color: '#71717a', marginTop: '8px' }}>
                  Must be the 64-character or 32-character hexadecimal fingerprint of your computer.
                </div>
              </div>
            )}

            {/* Mode 2: Auto-Detect from latest.log */}
            {hwidSetupModal.mode === 'log' && (
              <div style={{ marginBottom: '18px' }}>
                <div
                  style={{
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    marginBottom: '14px',
                    fontSize: '12px',
                    color: '#d1fae5',
                    lineHeight: 1.6,
                  }}
                >
                  <strong style={{ color: '#34d399' }}>Quick 3-Step Setup:</strong>
                  <ol style={{ margin: '6px 0 0', paddingLeft: '18px' }}>
                    <li>Put the client jar in your <code>.minecraft/mods</code> folder.</li>
                    <li>Launch Minecraft Fabric 1.21.11 once (to generate your HWID log).</li>
                    <li>Open <code>.minecraft/logs/latest.log</code> and paste it below:</li>
                  </ol>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 700,
                      color: '#6ee7b7',
                      letterSpacing: '0.05em',
                    }}
                  >
                    PASTE LATEST.LOG
                  </label>

                  <label
                    style={{
                      fontSize: '11.5px',
                      color: '#a78bfa',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    Upload latest.log file
                    <input
                      type="file"
                      accept=".log,.txt"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            const content = String(ev.target?.result || '');
                            const detected = extractHwid(content);
                            setHwidSetupModal(prev => ({
                              ...prev,
                              logText: content.slice(0, 5000),
                              detectedHwid: detected,
                              inputHwid: detected || prev.inputHwid,
                              error: detected ? '' : 'No HWID detected in the uploaded file.',
                            }));
                          };
                          reader.readAsText(file);
                        }
                      }}
                    />
                  </label>
                </div>

                <textarea
                  rows={4}
                  placeholder="Paste your .minecraft/logs/latest.log text here..."
                  value={hwidSetupModal.logText}
                  onChange={(e) => {
                    const text = e.target.value;
                    const detected = extractHwid(text);
                    setHwidSetupModal(prev => ({
                      ...prev,
                      logText: text,
                      detectedHwid: detected,
                      inputHwid: detected || prev.inputHwid,
                      error: detected ? '' : prev.error,
                    }));
                  }}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '10px',
                    background: 'rgba(0, 0, 0, 0.65)',
                    border: hwidSetupModal.detectedHwid ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(255, 255, 255, 0.14)',
                    color: '#ffffff',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />

                {hwidSetupModal.detectedHwid && (
                  <div
                    style={{
                      marginTop: '10px',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '11px', color: '#6ee7b7', fontWeight: 700, textTransform: 'uppercase' }}>
                        ✔ HWID Auto-Detected
                      </div>
                      <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#ffffff', wordBreak: 'break-all' }}>
                        {hwidSetupModal.detectedHwid}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Error & Success Messages */}
            {hwidSetupModal.error && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#fca5a5',
                  fontSize: '12.5px',
                  marginBottom: '14px',
                }}
              >
                {hwidSetupModal.error}
              </div>
            )}

            {hwidSetupModal.success && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  color: '#4ade80',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  marginBottom: '14px',
                }}
              >
                ✔ {hwidSetupModal.success}
              </div>
            )}

            {/* Footer Buttons */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button
                type="button"
                onClick={() => setHwidSetupModal({ ...hwidSetupModal, open: false, error: '', success: '' })}
                disabled={hwidSetupModal.loading}
                style={{
                  padding: '9px 16px',
                  borderRadius: '9px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent',
                  color: '#d4d4d8',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveHwid}
                disabled={hwidSetupModal.loading || (!hwidSetupModal.inputHwid && !hwidSetupModal.detectedHwid)}
                style={{
                  padding: '9px 22px',
                  borderRadius: '9px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: hwidSetupModal.loading || (!hwidSetupModal.inputHwid && !hwidSetupModal.detectedHwid) ? 'not-allowed' : 'pointer',
                  opacity: hwidSetupModal.loading || (!hwidSetupModal.inputHwid && !hwidSetupModal.detectedHwid) ? 0.6 : 1,
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
                }}
              >
                {hwidSetupModal.loading ? 'Saving & Binding...' : 'Save & Bind HWID'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODALS (HWID RESET, LAUNCH GUIDE, RENAME)
          ======================================================== */}
      {hwidModalState.open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(0, 0, 0, 0.78)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setHwidModalState({ ...hwidModalState, open: false });
            }
          }}
        >
          <div
            className="v2-dash-card"
            style={{ maxWidth: '460px', width: '100%', padding: '26px', background: '#120d1d' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                {hwidModalState.cooldownRemaining > 0 ? 'Machine Reset Cooldown' : 'Reset Machine HWID'}
              </h3>
              <span style={{ fontSize: '11px', color: '#a78bfa', background: 'rgba(147, 51, 234, 0.2)', padding: '2px 8px', borderRadius: '4px' }}>
                1 Reset / 1 Month
              </span>
            </div>

            {hwidModalState.cooldownRemaining > 0 ? (
              <p style={{ fontSize: '13px', color: '#fca5a5', lineHeight: 1.5, margin: '0 0 16px' }}>
                Your free monthly reset was used recently. Next free reset is available in{' '}
                <strong>{hwidModalState.cooldownRemaining} day{hwidModalState.cooldownRemaining === 1 ? '' : 's'}</strong>. To reset before then, enter an Admin Reset Key:
              </p>
            ) : (
              <p style={{ fontSize: '13px', color: '#a1a1aa', lineHeight: 1.5, margin: '0 0 16px' }}>
                Your free monthly reset is ready. This unbinds your hardware so your new machine will bind automatically on your next launch.
              </p>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: '#a1a1aa',
                  marginBottom: '6px',
                  letterSpacing: '0.05em',
                }}
              >
                {hwidModalState.cooldownRemaining > 0 ? 'ADMIN RESET KEY (REQUIRED FOR COOLDOWN OVERRIDE)' : 'ADMIN RESET KEY (OPTIONAL)'}
              </label>
              <input
                type="text"
                placeholder="555R-XXXX-XXXX"
                value={hwidModalState.resetKey || ''}
                onChange={(e) =>
                  setHwidModalState({ ...hwidModalState, resetKey: e.target.value.toUpperCase() })
                }
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: 'rgba(0,0,0,0.45)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#ffffff',
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>
            {hwidModalState.msg && (
              <p style={{ color: '#4ade80', fontSize: '13px', margin: '0 0 12px' }}>
                {hwidModalState.msg}
              </p>
            )}
            {hwidModalState.error && (
              <p style={{ color: '#f87171', fontSize: '13px', margin: '0 0 12px' }}>
                {hwidModalState.error}
              </p>
            )}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setHwidModalState({ ...hwidModalState, open: false })}
                style={{
                  padding: '8px 14px',
                  borderRadius: '9px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent',
                  color: '#d4d4d8',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetHwid}
                disabled={hwidModalState.loading}
                style={{
                  padding: '8px 18px',
                  borderRadius: '9px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {hwidModalState.loading
                  ? 'Resetting...'
                  : hwidModalState.cooldownRemaining > 0
                  ? 'Redeem Key & Reset'
                  : 'Reset Machine Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {launchModal.open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(0, 0, 0, 0.78)',
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
            className="v2-dash-card"
            style={{ maxWidth: '560px', width: '100%', padding: '26px', background: '#120d1d' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                Instant Launch Command
              </h3>
              <span style={{ fontSize: '11.5px', padding: '3px 8px', borderRadius: '6px', background: 'rgba(147, 51, 234, 0.2)', color: '#c4b5fd', border: '1px solid rgba(147, 51, 234, 0.3)' }}>
                No Installer Needed
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#a1a1aa', lineHeight: 1.5, margin: '0 0 14px' }}>
              Run this single command in <strong>Windows PowerShell</strong> to launch 5.55 Client automatically with your account email prefilled:
            </p>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#090514',
                border: '1px solid rgba(147, 51, 234, 0.35)',
                borderRadius: '10px',
                padding: '10px 14px',
                marginBottom: '16px',
              }}
            >
              <code
                style={{
                  flex: 1,
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  color: '#c4b5fd',
                  wordBreak: 'break-all',
                }}
              >
                powershell -NoProfile -ExecutionPolicy Bypass -Command &quot;irm https://www.555client.xyz/dl/{user?.email || launchModal.licenseKey} | iex&quot;
              </code>
              <button
                type="button"
                onClick={() => {
                  const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://www.555client.xyz/dl/${user?.email || launchModal.licenseKey} | iex"`;
                  copyToClipboard(cmd, 'modal-launch');
                }}
                style={{
                  padding: '7px 14px',
                  borderRadius: '7px',
                  border: 'none',
                  background: copiedKey === 'modal-launch' ? '#22c55e' : 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {copiedKey === 'modal-launch' ? 'Copied!' : 'Copy Command'}
              </button>
            </div>

            <ol
              style={{
                background: 'rgba(0,0,0,0.45)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px',
                padding: '12px 18px 12px 30px',
                fontSize: '12px',
                color: '#d4d4d8',
                lineHeight: 1.6,
                margin: '0 0 16px',
              }}
            >
              <li>
                Paste and press <strong>Enter</strong> in PowerShell. The bootstrapper initializes and starts the loader.
              </li>
              <li>
                Sign in with your email (<strong>{user?.email || 'your account email'}</strong>) and your password.
              </li>
              <li>
                Once signed in, the loader persists your session securely on this PC so you don&apos;t have to log in repeatedly.
              </li>
            </ol>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => handleAuthorizedDownload('cpp-client')}
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent',
                  color: '#a1a1aa',
                  fontSize: '11.5px',
                  cursor: 'pointer',
                }}
              >
                Manual .exe Download
              </button>
              <button
                type="button"
                onClick={() => setLaunchModal({ open: false, licenseKey: '' })}
                style={{
                  padding: '8px 18px',
                  borderRadius: '9px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {renameModal.open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(0, 0, 0, 0.78)',
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
            className="v2-dash-card"
            style={{ maxWidth: '400px', width: '100%', padding: '26px', background: '#120d1d' }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', margin: '0 0 14px' }}>
              Rename License
            </h3>
            <input
              type="text"
              value={renameModal.name}
              onChange={(e) => setRenameModal({ ...renameModal, name: e.target.value })}
              placeholder="e.g. Primary PC"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                background: 'rgba(0,0,0,0.45)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#ffffff',
                fontSize: '13.5px',
                marginBottom: '14px',
                outline: 'none',
              }}
            />
            {renameModal.error && (
              <p style={{ color: '#f87171', fontSize: '12.5px', margin: '0 0 10px' }}>
                {renameModal.error}
              </p>
            )}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setRenameModal({ ...renameModal, open: false })}
                style={{
                  padding: '8px 14px',
                  borderRadius: '9px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent',
                  color: '#d4d4d8',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRename}
                disabled={renameModal.loading}
                style={{
                  padding: '8px 16px',
                  borderRadius: '9px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
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
