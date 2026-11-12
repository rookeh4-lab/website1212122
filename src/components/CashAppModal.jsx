import React from 'react';

export default function CashAppModal({
  open,
  onClose,
  onBack,
  tier = 'lifetime',
}) {
  if (!open) return null;

  const isHwid = tier === 'hwid_reset';

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
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          background: '#111015',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '20px',
          padding: '28px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.65)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          position: 'relative',
          color: '#fff',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              color: '#8e8e99',
              cursor: 'pointer',
              fontSize: '13px',
              padding: 0,
            }}
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#8e8e99',
              cursor: 'pointer',
              fontSize: '20px',
              lineHeight: 1,
              padding: 0,
            }}
          >
            ×
          </button>
        </div>

        <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
          {isHwid ? 'Admin HWID Reset Support' : 'Support & Official Checkout'}
        </h3>

        <p style={{ fontSize: '13.5px', color: '#a1a1aa', lineHeight: 1.55, margin: 0 }}>
          {isHwid
            ? 'HWID resets require an Admin Reset Key entered directly in your Dashboard under License -> Reset HWID. Please open a support ticket in our Discord server to request a reset key.'
            : 'All automated digital licenses are processed strictly through our official SellAuth storefront. If you need manual billing assistance or a monthly key request, please open a support ticket in our Discord server.'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
          {!isHwid && (
            <a
              href="https://lama-co.mysellauth.com/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                textAlign: 'center',
                background: 'linear-gradient(90deg, #5b30d8 0%, #6e46e8 50%, #835cf6 100%)',
                borderRadius: '12px',
                padding: '12px',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Open Official SellAuth Storefront →
            </a>
          )}
          <a
            href="https://discord.gg/xx7Ns6vW8"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              textAlign: 'center',
              background: 'rgba(88, 101, 242, 0.2)',
              border: '1px solid rgba(88, 101, 242, 0.45)',
              borderRadius: '12px',
              padding: '12px',
              color: '#e0e7ff',
              fontSize: '14px',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Open Support Ticket on Discord →
          </a>
        </div>
      </div>
    </div>
  );
}
