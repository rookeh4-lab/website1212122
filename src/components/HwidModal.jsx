import React, { useState, useEffect } from 'react';
import { auth, API_BASE } from '../utils/api';
import CashAppModal from './CashAppModal';

export default function HwidModal({ open, onClose, licenseKey, userEmail }) {
  const [email, setEmail] = useState(userEmail || '');
  const [count, setCount] = useState(1);
  const [currency, setCurrency] = useState('USD');
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeImmediate, setAgreeImmediate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const [showPayPalModal, setShowPayPalModal] = useState(false);

  useEffect(() => {
    if (open) {
      setSubmitting(false);
      setErrorMsg('');
      setShowPayPalModal(false);
      setPaymentMethod('stripe');
      if (auth.getToken()) {
        auth.getProfile().then((data) => {
          if (data?.user?.email && !email) setEmail(data.user.email);
        });
      }
    }
  }, [open]);

  if (!open) return null;

  const rate = { USD: 1, EUR: 0.92, GBP: 0.79 }[currency] || 1;
  const totalPrice = count * 3 * rate;

  const handleCheckout = async () => {
    if (!email || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (!agreeTerms || !agreeImmediate) {
      setErrorMsg('Please accept both statements to proceed.');
      return;
    }
    if (paymentMethod === 'paypal') {
      setShowPayPalModal(true);
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      const token = auth.getToken();
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/checkout/create-session`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          tier: 'hwid_reset',
          guestEmail: email.trim(),
          currency: currency.toLowerCase(),
          licenseKey,
          hwidCount: count,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('HWID Reset purchase initiated (Demo). Contact support or complete payment.');
        onClose();
      }
    } catch {
      alert('HWID Reset purchase initiated (Demo).');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (showPayPalModal) {
    return (
      <CashAppModal
        open={true}
        onClose={() => {
          setShowPayPalModal(false);
          onClose();
        }}
        onBack={() => setShowPayPalModal(false)}
        amount={totalPrice}
        currency={currency}
        tier="hwid_reset"
        hwidCount={count}
        licenseKey={licenseKey}
        initialEmail={email}
      />
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'modalBackdropFade 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setCurrencyOpen(false);
          onClose();
        }
      }}
    >
      <div
        className="modal-card-responsive"
        style={{
          width: '100%',
          maxWidth: '500px',
          background: 'rgba(14, 13, 18, 0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.85)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          position: 'relative',
          animation: 'modalSlideIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3
            style={{
              fontSize: '20px',
              fontWeight: 800,
              color: '#ffffff',
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            Purchase form
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#8e8e99',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div
          style={{
            background: '#6d28d9',
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#ffffff',
            fontSize: '13.5px',
            fontWeight: 600,
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ flexShrink: 0 }}
          >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>Note that changing the HWID requires an additional fee!</span>
        </div>

        <div style={{ position: 'relative' }}>
          <label
            style={{
              position: 'absolute',
              top: '-9px',
              left: '14px',
              background: 'rgba(14, 13, 18, 0.95)',
              padding: '0 8px',
              fontSize: '12px',
              color: '#8e8e99',
              fontWeight: 500,
              zIndex: 1,
            }}
          >
            E-mail
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@domain.com"
            style={{
              width: '100%',
              background: 'rgba(0, 0, 0, 0.45)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '14px 16px',
              color: '#ffffff',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                background: '#6d28d9',
                color: '#ffffff',
                fontSize: '12.5px',
                fontWeight: 800,
                padding: '3px 10px',
                borderRadius: '6px',
                minWidth: '22px',
                textAlign: 'center',
              }}
            >
              {count}
            </div>
            <span style={{ fontSize: '13px', color: '#a1a1aa', fontWeight: 500 }}>
              HWID Resets ($3.00 USD each)
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            style={{
              width: '100%',
              accentColor: '#8b5cf6',
              cursor: 'pointer',
            }}
          />
        </div>

        <div style={{ position: 'relative' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px',
            }}
          >
            <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#ffffff' }}>
              Select payment method
            </span>
            <div style={{ position: 'relative' }}>
              <div
                onClick={() => setCurrencyOpen(!currencyOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(0, 0, 0, 0.45)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  padding: '5px 10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#ffffff',
                  cursor: 'pointer',
                }}
              >
                <span>{currency}</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
              {currencyOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    right: 0,
                    zIndex: 20,
                    background: '#16151c',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    width: '84px',
                    boxShadow: '0 10px 24px rgba(0,0,0,0.6)',
                  }}
                >
                  {['USD', 'EUR', 'GBP'].map((curr) => (
                    <div
                      key={curr}
                      onClick={() => {
                        setCurrency(curr);
                        setCurrencyOpen(false);
                      }}
                      style={{
                        padding: '8px 12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: currency === curr ? '#a78bfa' : '#ffffff',
                        cursor: 'pointer',
                      }}
                    >
                      {curr}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div
              onClick={() => setPaymentMethod('stripe')}
              style={{
                background: paymentMethod === 'stripe' ? 'rgba(91, 48, 216, 0.16)' : 'rgba(255, 255, 255, 0.03)',
                border: paymentMethod === 'stripe' ? '1.5px solid #6d28d9' : '1.5px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: '#ffffff',
                    background: '#635bff',
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  stripe
                </span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>Stripe</span>
              </div>
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  border: paymentMethod === 'stripe' ? '2px solid #8b5cf6' : '2px solid rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {paymentMethod === 'stripe' && (
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#8b5cf6' }} />
                )}
              </div>
            </div>

            <div
              onClick={() => setPaymentMethod('paypal')}
              style={{
                background: paymentMethod === 'paypal' ? 'rgba(0, 112, 186, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                border: paymentMethod === 'paypal' ? '1.5px solid #0070ba' : '1.5px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: '#ffffff',
                    background: '#003087',
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  PayPal
                </span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>PayPal</span>
              </div>
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  border: paymentMethod === 'paypal' ? '2px solid #38bdf8' : '2px solid rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {paymentMethod === 'paypal' && (
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#38bdf8' }} />
                )}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div
            onClick={() => setAgreeTerms(!agreeTerms)}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              fontSize: '12px',
              color: '#9494a0',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: '18px',
                height: '18px',
                minWidth: '18px',
                borderRadius: '5px',
                border: agreeTerms ? '1.5px solid #8b5cf6' : '1.5px solid rgba(255, 255, 255, 0.25)',
                background: agreeTerms ? '#6d28d9' : 'rgba(255, 255, 255, 0.04)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {agreeTerms && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
            <span>I accept the terms of service and privacy policy.</span>
          </div>

          <div
            onClick={() => setAgreeImmediate(!agreeImmediate)}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              fontSize: '12px',
              color: '#9494a0',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: '18px',
                height: '18px',
                minWidth: '18px',
                borderRadius: '5px',
                border: agreeImmediate ? '1.5px solid #8b5cf6' : '1.5px solid rgba(255, 255, 255, 0.25)',
                background: agreeImmediate ? '#6d28d9' : 'rgba(255, 255, 255, 0.04)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {agreeImmediate && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
            <span>I agree to the immediate delivery and waive withdrawal rights.</span>
          </div>
        </div>

        {errorMsg && (
          <div style={{ color: '#f87171', fontSize: '13px' }}>{errorMsg}</div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
          <div>
            <span style={{ fontSize: '30px', fontWeight: 900, color: '#ffffff' }}>
              {totalPrice.toFixed(2)}
            </span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#8e8e99', marginLeft: '6px' }}>
              {currency}
            </span>
          </div>
          <button
            onClick={handleCheckout}
            disabled={submitting}
            style={{
              background: '#e4e4e7',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 28px',
              color: '#09090b',
              fontSize: '14.5px',
              fontWeight: 700,
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? 'Processing...' : 'Checkout'}
          </button>
        </div>
      </div>
    </div>
  );
}
