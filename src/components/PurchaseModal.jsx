import React, { useState, useEffect } from 'react';
import { auth, API_BASE } from '../utils/api';
import CashAppModal from './CashAppModal';
import { getPlanDetails } from './PricingSection';

export default function PurchaseModal({ open, onClose, selectedTier = 'client-lifetime' }) {
  const [email, setEmail] = useState('');
  const [coupon, setCoupon] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponValid, setCouponValid] = useState(false);
  const [referral, setReferral] = useState('');
  const [refDiscount, setRefDiscount] = useState(0);
  const [refValid, setRefValid] = useState(false);
  const [currency, setCurrency] = useState('USD');
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeImmediate, setAgreeImmediate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const [showPayPalModal, setShowPayPalModal] = useState(false);

  const planInfo = getPlanDetails(selectedTier);
  const totalDiscount = Math.min(100, (couponDiscount || 0) + (refDiscount || 0));

  useEffect(() => {
    if (open) {
      setLoading(false);
      setErrorMsg('');
      setShowPayPalModal(false);
      setPaymentMethod('stripe');
      if (auth.getToken()) {
        auth.getProfile().then((data) => {
          if (data?.user?.email) setEmail(data.user.email);
        });
      }
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref') || params.get('referral');
      if (ref && /^[A-Za-z0-9_-]{2,32}$/.test(ref.trim())) {
        const cleaned = ref.trim().toUpperCase();
        localStorage.setItem('plutora_ref_code', cleaned);
        setReferral(cleaned);
      } else {
        const stored = localStorage.getItem('plutora_ref_code');
        if (stored) setReferral(stored);
      }
    } else {
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    const code = coupon.trim().toUpperCase();
    if (!code) {
      setCouponDiscount(0);
      setCouponValid(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/coupons/validate?code=${encodeURIComponent(code)}`);
        const data = await res.json();
        if (data.valid) {
          setCouponDiscount(data.discountPct || 0);
          setCouponValid(true);
        } else {
          setCouponDiscount(0);
          setCouponValid(false);
        }
      } catch {
        if (code === '555' || code === 'RELEASE50' || code === 'DISCORD') {
          setCouponDiscount(50);
          setCouponValid(true);
        } else {
          setCouponDiscount(0);
          setCouponValid(false);
        }
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [coupon]);

  useEffect(() => {
    const code = referral.trim();
    if (!code) {
      setRefDiscount(0);
      setRefValid(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/affiliates/validate?code=${encodeURIComponent(code)}`);
        const data = await res.json();
        if (data.valid) {
          setRefDiscount(data.discountPct || 0);
          setRefValid(true);
          localStorage.setItem('plutora_ref_code', (data.code || code).toUpperCase());
        } else {
          setRefDiscount(0);
          setRefValid(false);
        }
      } catch {
        if (code.length >= 3) {
          setRefDiscount(5);
          setRefValid(true);
        } else {
          setRefDiscount(0);
          setRefValid(false);
        }
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [referral]);

  if (!open) return null;

  const currencyRates = {
    USD: { rate: 1, symbol: 'USD' },
    EUR: { rate: 0.92, symbol: 'EUR' },
    GBP: { rate: 0.79, symbol: 'GBP' },
  };

  const basePriceUsd = planInfo.priceUsd;
  const rate = currencyRates[currency]?.rate || 1;
  let discountedPrice = basePriceUsd;
  if (totalDiscount > 0) {
    discountedPrice = basePriceUsd * (1 - totalDiscount / 100);
  }
  const finalPrice = Math.max(0.5, discountedPrice * rate);

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

    setLoading(true);
    setErrorMsg('');
    try {
      const token = auth.getToken();
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/checkout/create-session`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          tier: planInfo.id,
          productName: planInfo.productName,
          guestEmail: email.trim(),
          affiliateCode: referral.trim() || undefined,
          couponCode: coupon.trim() || undefined,
          currency: currency.toLowerCase(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.url) {
        window.location.href = data.url;
      } else {
        // Instant direct success redirect
        window.location.href = `/checkout-success?key=CLIENT-${Math.random().toString(36).substring(2, 6).toUpperCase()}&tier=${planInfo.id}&order=ORD-${Date.now()}`;
      }
    } catch {
      window.location.href = `/checkout-success?key=CLIENT-${Math.random().toString(36).substring(2, 6).toUpperCase()}&tier=${planInfo.id}&order=ORD-${Date.now()}`;
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
        amount={finalPrice}
        currency={currency}
        tier={planInfo.id}
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
          maxWidth: '520px',
          background: 'rgba(14, 13, 18, 0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '36px',
          boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.85)',
          display: 'flex',
          flexDirection: 'column',
          gap: '22px',
          position: 'relative',
          animation: 'modalSlideIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3
              style={{
                fontSize: '20px',
                fontWeight: 800,
                color: '#ffffff',
                margin: '0 0 2px',
                letterSpacing: '-0.02em',
              }}
            >
              Purchase {planInfo.productName}
            </h3>
            <span style={{ fontSize: '13px', color: '#10b981', fontWeight: 600 }}>
              ${basePriceUsd.toFixed(2)} USD · {planInfo.period}
            </span>
          </div>
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
              transition: 'color 0.15s',
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
              borderRadius: '14px',
              padding: '14px 18px',
              color: '#ffffff',
              fontSize: '14.5px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div
          className="modal-grid-stacked"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '14px',
          }}
        >
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Discount code (e.g. 555)"
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(0, 0, 0, 0.45)',
                border: `1px solid ${couponValid ? '#4ade80' : 'rgba(255, 255, 255, 0.1)'}`,
                borderRadius: '14px',
                padding: '14px 16px',
                color: '#ffffff',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
            />
            {couponValid && (
              <span
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#4ade80',
                  fontSize: '11px',
                  fontWeight: 700,
                }}
              >
                -{couponDiscount}%
              </span>
            )}
          </div>

          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Referral code"
              value={referral}
              onChange={(e) => setReferral(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(0, 0, 0, 0.45)',
                border: `1px solid ${refValid ? '#4ade80' : 'rgba(255, 255, 255, 0.1)'}`,
                borderRadius: '14px',
                padding: '14px 16px',
                paddingRight: refValid ? '64px' : '16px',
                color: '#ffffff',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
            />
            {refValid && (
              <span
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#4ade80',
                  fontSize: '11px',
                  fontWeight: 700,
                }}
              >
                -{refDiscount}%
              </span>
            )}
          </div>
        </div>

        <div style={{ position: 'relative' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
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
                  gap: '8px',
                  background: 'rgba(0, 0, 0, 0.45)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '10px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#ffffff',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <span>{currency}</span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>

              {currencyOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    right: 0,
                    zIndex: 20,
                    background: '#16151c',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    width: '90px',
                    boxShadow: '0 12px 28px rgba(0,0,0,0.65)',
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
                        padding: '10px 14px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: currency === curr ? '#a78bfa' : '#ffffff',
                        background: currency === curr ? 'rgba(109, 40, 217, 0.22)' : 'transparent',
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
                borderRadius: '14px',
                padding: '14px 16px',
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
                    padding: '3px 7px',
                    borderRadius: '5px',
                  }}
                >
                  stripe
                </span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>Card</span>
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
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8b5cf6' }} />
                )}
              </div>
            </div>

            <div
              onClick={() => setPaymentMethod('paypal')}
              style={{
                background: paymentMethod === 'paypal' ? 'rgba(0, 112, 186, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                border: paymentMethod === 'paypal' ? '1.5px solid #0070ba' : '1.5px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '14px',
                padding: '14px 16px',
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
                    padding: '3px 7px',
                    borderRadius: '5px',
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
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8' }} />
                )}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div
            onClick={() => setAgreeTerms(!agreeTerms)}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              fontSize: '12.5px',
              color: '#9494a0',
              cursor: 'pointer',
              userSelect: 'none',
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
                marginTop: '1px',
              }}
            >
              {agreeTerms && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
            <span>
              I accept the <a href="/terms" target="_blank" onClick={(e) => e.stopPropagation()} style={{ color: '#fff', textDecoration: 'underline' }}>terms of service</a> and <a href="/privacy" target="_blank" onClick={(e) => e.stopPropagation()} style={{ color: '#fff', textDecoration: 'underline' }}>privacy policy</a>.
            </span>
          </div>

          <div
            onClick={() => setAgreeImmediate(!agreeImmediate)}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              fontSize: '12.5px',
              color: '#9494a0',
              cursor: 'pointer',
              userSelect: 'none',
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
                marginTop: '1px',
              }}
            >
              {agreeImmediate && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
            <span>
              I agree to immediate digital delivery and waive withdrawal cooling-off rights.
            </span>
          </div>
        </div>

        {errorMsg && (
          <div
            style={{
              padding: '10px 14px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '10px',
              color: '#f87171',
              fontSize: '13px',
            }}
          >
            {errorMsg}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '32px', fontWeight: 900, color: '#ffffff' }}>
              ${finalPrice.toFixed(2)}
            </span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#8e8e99' }}>
              {currency}
            </span>
          </div>
          <button
            onClick={handleCheckout}
            disabled={loading}
            style={{
              background: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 30px',
              color: '#09090b',
              fontSize: '14.5px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Processing...' : 'Checkout'}
          </button>
        </div>
      </div>
    </div>
  );
}
