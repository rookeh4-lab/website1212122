import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { copyText, API_BASE } from '../utils/api';

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const initialKey = searchParams.get('key') || '';
  const orderId = searchParams.get('order') || searchParams.get('orderId') || '';
  const sessionId = searchParams.get('session_id') || searchParams.get('sessionId') || '';
  const isFree = searchParams.get('free') === '1';

  const [licenseKey, setLicenseKey] = useState(initialKey);
  const [order, setOrder] = useState(orderId);
  const [tier, setTier] = useState(searchParams.get('tier') || '');
  const [loading, setLoading] = useState(!initialKey && !!(orderId || sessionId));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (licenseKey) return;
    if (!orderId && !sessionId) {
      setLoading(false);
      return;
    }

    let attempts = 0;
    let timer = null;

    const checkStatus = async () => {
      try {
        const q = new URLSearchParams();
        if (orderId) q.set('order', orderId);
        if (sessionId) q.set('session_id', sessionId);
        const res = await fetch(`${API_BASE}/checkout/order-status?${q.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (data.orderId) setOrder(data.orderId);
          if (data.tier) setTier(data.tier);
          if (data.licenseKey) {
            setLicenseKey(data.licenseKey);
            setLoading(false);
            return;
          }
        }
      } catch {}

      attempts += 1;
      if (attempts < 8) {
        timer = setTimeout(checkStatus, 1500);
      } else {
        setLoading(false);
      }
    };

    checkStatus();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [licenseKey, orderId, sessionId]);

  const handleCopy = async () => {
    if (licenseKey) {
      await copyText(licenseKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  };

  const formatTierLabel = (t) => {
    if (!t) return 'Lifetime';
    if (t === 'monthly') return 'Monthly';
    if (t === 'quarterly') return '3 Months';
    return 'Lifetime';
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
        className="card"
        style={{
          maxWidth: '520px',
          width: '100%',
          textAlign: 'center',
          borderRadius: 'var(--radius-lg)',
          padding: '44px',
          borderColor: 'var(--accent)',
          background: 'var(--bg-card)',
        }}
      >
        <div>
          <img
            src="/logo.png"
            style={{ height: '52px', width: 'auto', marginBottom: '16px' }}
            alt="5.55 Client"
          />
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '14px',
          }}
        >
          <span className="badge badge-success">
            {isFree ? 'License Activated' : 'Payment Confirmed'}
          </span>
          <span
            className="badge"
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid var(--border)',
            }}
          >
            {formatTierLabel(tier)}
          </span>
        </div>

        <h1 style={{ fontSize: '26px', margin: '0 0 10px', fontWeight: 700, color: '#fff' }}>
          {isFree ? 'Access Granted' : 'Order Completed'}
        </h1>
        <p
          style={{
            fontSize: '14px',
            color: 'var(--text-muted)',
            lineHeight: 1.6,
            marginBottom: '24px',
          }}
        >
          {isFree
            ? 'Your license key has been generated and linked to your account.'
            : 'Thank you for your purchase. Your license has been activated and sent to your email.'}
        </p>

        {loading ? (
          <div style={{ padding: '24px 0', color: 'var(--text-muted)' }}>
            Retrieving your license key...
          </div>
        ) : (
          <div style={{ marginBottom: '28px' }}>
            {licenseKey ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(0, 0, 0, 0.45)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  marginBottom: '12px',
                }}
              >
                <code style={{ fontSize: '15px', color: '#c4b5fd', fontFamily: 'monospace' }}>
                  {licenseKey}
                </code>
                <button
                  onClick={handleCopy}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#fff',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '13px',
                  }}
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            ) : (
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.45)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '16px 18px',
                  marginBottom: '12px',
                  fontSize: '13.5px',
                  color: 'var(--text-muted)',
                  lineHeight: 1.5,
                }}
              >
                No license key was attached to this URL yet. Check your SellAuth receipt email or sign in to your Dashboard to view activated keys.
              </div>
            )}
            {order && (
              <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                Order ID: {order}
              </span>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <Link to="/download" className="btn btn-primary" style={{ padding: '12px 24px' }}>
            Launch Client →
          </Link>
          <Link to="/dashboard" className="btn btn-secondary" style={{ padding: '12px 24px' }}>
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
