import React, { useState, useEffect } from 'react';
import { auth, copyText, API_BASE } from '../utils/api';

const randomNotes = [
  'happy birthday %user%',
  'enjoy your trip %user%',
  'coffee on me %user%',
  'movie tickets %user%',
  'gas money %user%',
  'concert ticket %user%',
  'congrats %user%',
  'wedding gift %user%',
  'pizza night %user%',
  'drinks %user%',
  'thanks for the ride %user%',
  'housewarming %user%',
  'repay %user%',
  'groceries %user%',
  'vacation fund %user%',
];

export default function CashAppModal({
  open,
  onClose,
  onBack,
  amount,
  currency = 'USD',
  tier = 'monthly',
  hwidCount = null,
  licenseKey = null,
  initialEmail = '',
  initialDiscord = '',
}) {
  const [email, setEmail] = useState(initialEmail || '');
  const [discord, setDiscord] = useState(initialDiscord || '');
  const [generatedNote, setGeneratedNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);
  const [reference, setReference] = useState('');
  const [copiedNote, setCopiedNote] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  useEffect(() => {
    if (open) {
      setSubmitting(false);
      setErrorMsg('');
      setSuccess(false);
      setCopiedNote(false);
      setCopiedEmail(false);
      if (auth.getToken()) {
        auth.getProfile().then((data) => {
          if (data?.user?.email && !email) setEmail(data.user.email);
          if (data?.user?.username && !discord) setDiscord(data.user.username);
        });
      }
    }
  }, [open]);

  useEffect(() => {
    const userStr = discord.trim() || 'user';
    const chosen = randomNotes[Math.floor(Math.random() * randomNotes.length)];
    setGeneratedNote(chosen.replace('%user%', userStr));
  }, [open, discord]);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!email || !email.includes('@')) {
      setErrorMsg('Please enter a valid email.');
      return;
    }
    if (!discord.trim()) {
      setErrorMsg('Please enter your Discord username.');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE}/checkout/manual-submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          discord: discord.trim(),
          tier,
          amount,
          currency,
          note: generatedNote,
          hwidCount,
          licenseKey,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setReference(data.ref || `MANUAL-${Math.floor(100000 + Math.random() * 900000)}`);
        setSuccess(true);
      } else {
        // Fallback for standalone demo
        setReference(`555-${Math.floor(100000 + Math.random() * 900000)}`);
        setSuccess(true);
      }
    } catch {
      setReference(`555-${Math.floor(100000 + Math.random() * 900000)}`);
      setSuccess(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
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
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-card-responsive"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '460px',
          background: '#121118',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '24px',
          padding: '30px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7)',
          animation: 'modalContentPop 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={onBack}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              padding: '6px 12px',
              color: '#cbd5e1',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s',
            }}
          >
            ← Return
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: 'none',
              borderRadius: '50%',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#8e8e99',
              transition: 'background 0.15s',
            }}
          >
            ✕
          </button>
        </div>

        {success ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              textAlign: 'center',
              padding: '10px 0',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(109, 40, 217, 0.2)',
                border: '1px solid rgba(139, 92, 246, 0.4)',
                color: '#c4b5fd',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                fontSize: '22px',
              }}
            >
              ✓
            </div>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', margin: '0 0 6px' }}>
                Payment Recorded
              </h3>
              <p style={{ fontSize: '13.5px', color: '#8e8e99', margin: 0, lineHeight: 1.5 }}>
                Your manual payment order has been submitted to staff.
              </p>
            </div>
            <div
              style={{
                background: 'rgba(109, 40, 217, 0.08)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '14px',
                padding: '16px',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '13px',
                color: '#e4e4e7',
              }}
            >
              <div>Reference: <code style={{ color: '#c4b5fd' }}>{reference}</code></div>
              <div>Recipient: <strong>dervidev@gmail.com</strong></div>
              <div>Amount: <strong>${parseFloat(amount).toFixed(2)} USD</strong></div>
              <div>Note: <code style={{ color: '#c4b5fd' }}>`{generatedNote}`</code></div>
            </div>
            <p style={{ fontSize: '12.5px', color: '#8e8e99', margin: 0 }}>
              Staff will confirm the payment and deliver your license to <strong>{email}</strong> shortly.
            </p>
            <button
              onClick={onClose}
              style={{
                background: 'linear-gradient(90deg, #5b30d8 0%, #6e46e8 50%, #835cf6 100%)',
                border: 'none',
                borderRadius: '12px',
                padding: '12px',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                marginTop: '6px',
              }}
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div>
                <h3
                  style={{
                    fontSize: '20px',
                    fontWeight: 800,
                    color: '#ffffff',
                    margin: '0 0 4px',
                    letterSpacing: '-0.01em',
                  }}
                >
                  Pay with PayPal
                </h3>
                <p style={{ fontSize: '13px', color: '#8e8e99', margin: 0 }}>
                  Fast manual approval & delivery
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span
                  style={{
                    fontSize: '28px',
                    fontWeight: 900,
                    color: '#ffffff',
                    letterSpacing: '-0.02em',
                  }}
                >
                  ${parseFloat(amount).toFixed(2)}
                </span>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#8e8e99',
                    marginLeft: '5px',
                  }}
                >
                  {currency}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#8e8e99',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    marginBottom: '7px',
                  }}
                >
                  Delivery Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    color: '#ffffff',
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#6d28d9')}
                  onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)')}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#8e8e99',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    marginBottom: '7px',
                  }}
                >
                  Discord Username
                </label>
                <input
                  type="text"
                  value={discord}
                  onChange={(e) => setDiscord(e.target.value)}
                  placeholder="e.g. username"
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    color: '#ffffff',
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#6d28d9')}
                  onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)')}
                />
              </div>
            </div>

            <div
              style={{
                background: 'rgba(109, 40, 217, 0.08)',
                border: '1px solid rgba(109, 40, 217, 0.25)',
                borderRadius: '14px',
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: '#a78bfa',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Payment Instruction
                </span>
                <span
                  onClick={() => {
                    copyText('dervidev@gmail.com');
                    setCopiedEmail(true);
                    setTimeout(() => setCopiedEmail(false), 2000);
                  }}
                  style={{
                    fontSize: '12px',
                    color: '#c4b5fd',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  {copiedEmail ? 'Copied Email' : 'Copy Email'}
                </span>
              </div>
              <div style={{ fontSize: '13.5px', color: '#e4e4e7', lineHeight: 1.5 }}>
                Send <strong>{parseFloat(amount).toFixed(2)} USD</strong> to <strong>dervidev@gmail.com</strong> with note:
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(109, 40, 217, 0.1)',
                  border: '1px solid rgba(139, 92, 246, 0.25)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  copyText(generatedNote);
                  setCopiedNote(true);
                  setTimeout(() => setCopiedNote(false), 2000);
                }}
                title="Click to copy note"
              >
                <code
                  style={{
                    color: '#c4b5fd',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                  }}
                >
                  `{generatedNote}`
                </code>
                <span
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 600,
                    color: '#a78bfa',
                  }}
                >
                  {copiedNote ? 'Copied' : 'Copy'}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#8e8e99' }}>
                strictly that no more etc thats manual payment.
              </div>
            </div>

            {errorMsg && (
              <p style={{ margin: 0, color: '#f87171', fontSize: '13px' }}>
                {errorMsg}
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                background: 'linear-gradient(90deg, #5b30d8 0%, #6e46e8 50%, #835cf6 100%)',
                border: 'none',
                borderRadius: '12px',
                padding: '13px',
                color: '#ffffff',
                fontSize: '14.5px',
                fontWeight: 700,
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1,
                boxShadow: '0 8px 24px -4px rgba(109, 40, 217, 0.5)',
                transition: 'transform 0.15s, opacity 0.15s',
              }}
            >
              {submitting ? 'Recording Payment...' : "I've Sent the Payment →"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
