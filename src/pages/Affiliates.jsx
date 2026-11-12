import React, { useState, useEffect } from 'react';
import { auth, copyText, API_BASE } from '../utils/api';

export default function Affiliates() {
  const [user, setUser] = useState(null);
  const [affiliate, setAffiliate] = useState(null);
  const [customCode, setCustomCode] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [status, setStatus] = useState({ text: '', type: '' });
  const [savingCode, setSavingCode] = useState(false);
  const [resettingCode, setResettingCode] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadAffiliateData() {
      try {
        const profile = await auth.getProfile();
        if (!active || !profile?.user) return;
        setUser(profile.user);

        const token = auth.getToken();
        const res = await fetch(`${API_BASE}/affiliates/my`, {
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.affiliate) {
          setAffiliate(data.affiliate);
          setCustomCode((data.affiliate.code || '').toLowerCase());
        } else {
          const code = (profile.user.username || 'partner').toLowerCase();
          setAffiliate({
            code,
            clicks: 0,
            total_sales: 0,
            total_earned: 0,
            total_paid: 0,
          });
          setCustomCode(code);
        }
      } catch {
        setStatus({ text: 'Affiliate tracking is not currently enabled on this server.', type: 'info' });
      }
    }

    loadAffiliateData();
    return () => { active = false; };
  }, []);

  const showStatus = (text, type = 'success') => {
    setStatus({ text, type });
    setTimeout(() => setStatus({ text: '', type: '' }), 3000);
  };

  const referralUrl = affiliate?.code
    ? `${window.location.origin}/referral/${affiliate.code.toLowerCase()}`
    : `${window.location.origin}/referral/partner`;

  const handleCopyLink = () => {
    copyText(referralUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 1500);
  };

  const handleUpdateCode = async () => {
    const code = customCode.trim().toLowerCase();
    if (!code) return;
    setSavingCode(true);
    const token = auth.getToken();
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/affiliates/update-code`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ newCode: code }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setAffiliate((prev) => ({ ...(prev || {}), code: data.code.toLowerCase() }));
        setCustomCode(data.code.toLowerCase());
        showStatus('✓ Affiliate code updated successfully!', 'success');
      } else {
        showStatus(data.error || 'Could not update affiliate code — partner program API is not active yet.', 'danger');
      }
    } catch {
      showStatus('Unable to reach affiliate service.', 'danger');
    } finally {
      setSavingCode(false);
    }
  };

  const handleResetCode = async () => {
    setResettingCode(true);
    const token = auth.getToken();
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/affiliates/reset-code`, {
        method: 'POST',
        credentials: 'include',
        headers,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && data.code) {
        const rand = data.code.toLowerCase();
        setAffiliate((prev) => ({ ...(prev || {}), code: rand }));
        setCustomCode(rand);
        showStatus(`✓ Reset to randomized code: ${rand}`, 'success');
      } else {
        showStatus(data.error || 'Could not reset affiliate code — partner program API is not active yet.', 'danger');
      }
    } catch {
      showStatus('Unable to reach affiliate service.', 'danger');
    } finally {
      setResettingCode(false);
    }
  };

  const unpaid = affiliate
    ? Math.max(0, (Number(affiliate.total_earned) || 0) - (Number(affiliate.total_paid) || 0))
    : 0;

  return (
    <div className="container" style={{ maxWidth: '1040px', padding: '40px 20px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '28px',
          paddingBottom: '20px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 800,
              margin: '0 0 6px',
              letterSpacing: '-0.02em',
              color: '#fff',
            }}
          >
            Affiliate Partner Center
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13.5px', margin: 0 }}>
            Share your referral link, earn 20% commission on every license, and track real-time conversions.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span className="badge badge-success">20% Recurring Share</span>
          <a
            href="https://discord.gg/xx7Ns6vW8"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
          >
            Discord Support (#affiliates)
          </a>
        </div>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <div
          className="stats-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '20px',
          }}
        >
          <div
            className="card"
            style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px' }}
          >
            <div
              style={{
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-muted)',
                fontWeight: 600,
              }}
            >
              Link Visits & Clicks
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#fff', marginTop: '6px' }}>
              {affiliate?.clicks || 0}
            </div>
          </div>

          <div
            className="card"
            style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px' }}
          >
            <div
              style={{
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-muted)',
                fontWeight: 600,
              }}
            >
              Purchases Referred
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#fff', marginTop: '6px' }}>
              {affiliate?.total_sales || 0}
            </div>
          </div>

          <div
            className="card"
            style={{ padding: '16px', background: 'rgba(109, 40, 217, 0.06)', borderRadius: '12px' }}
          >
            <div
              style={{
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--accent-light)',
                fontWeight: 600,
              }}
            >
              Total Earned
            </div>
            <div
              style={{
                fontSize: '24px',
                fontWeight: 800,
                color: 'var(--accent-light)',
                marginTop: '6px',
              }}
            >
              ${Number(affiliate?.total_earned || 0).toFixed(2)}
            </div>
          </div>

          <div
            className="card"
            style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.06)', borderRadius: '12px' }}
          >
            <div
              style={{
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#10b981',
                fontWeight: 600,
              }}
            >
              Unpaid Balance
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981', marginTop: '6px' }}>
              ${unpaid.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      <div
        className="card"
        style={{
          padding: '28px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          marginBottom: '24px',
        }}
      >
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '16px' }}>
          Your Referral Link
        </h3>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(0, 0, 0, 0.45)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '20px',
          }}
        >
          <code style={{ fontSize: '14px', color: '#c4b5fd', fontFamily: 'monospace' }}>
            {referralUrl}
          </code>
          <button
            onClick={handleCopyLink}
            className="btn btn-primary btn-sm"
            style={{ padding: '8px 18px' }}
          >
            {copiedLink ? '✓ Copied' : 'Copy Link'}
          </button>
        </div>

        <h4
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            marginBottom: '10px',
          }}
        >
          Customize Referral Code
        </h4>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={customCode}
            onChange={(e) => setCustomCode(e.target.value)}
            className="form-control"
            style={{ maxWidth: '280px' }}
            placeholder="custom-code"
          />
          <button
            onClick={handleUpdateCode}
            disabled={savingCode}
            className="btn btn-primary btn-sm"
          >
            {savingCode ? 'Saving...' : 'Update Code'}
          </button>
          <button
            onClick={handleResetCode}
            disabled={resettingCode}
            className="btn btn-secondary btn-sm"
          >
            {resettingCode ? 'Resetting...' : 'Randomize'}
          </button>
        </div>

        {status.text && (
          <p
            style={{
              marginTop: '12px',
              fontSize: '13px',
              color: status.type === 'success' ? '#4ade80' : '#f87171',
            }}
          >
            {status.text}
          </p>
        )}
      </div>

      <div
        className="card"
        style={{
          padding: '24px 28px',
          background: 'rgba(18, 17, 22, 0.72)',
          border: '1px solid rgba(255, 255, 255, 0.07)',
          borderRadius: '16px',
        }}
      >
        <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
          Payout Information
        </h4>
        <p style={{ color: 'var(--text-muted)', fontSize: '13.5px', lineHeight: 1.6, margin: 0 }}>
          Payouts are processed bi-weekly upon request via PayPal, Crypto (USDT/BTC/LTC), or Discord Nitro credits. Open a ticket in our official Discord server (#affiliates) to request your cashout.
        </p>
      </div>
    </div>
  );
}
