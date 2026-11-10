import React from 'react';

export default function Refund() {
  return (
    <div className="container" style={{ maxWidth: '800px', padding: '60px 20px' }}>
      <div style={{ marginBottom: '36px' }}>
        <h1 style={{ fontSize: '36px', margin: '12px 0 6px', color: '#fff', fontWeight: 800 }}>
          Refund Policy
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
          Last updated: October 11, 2026
        </p>
      </div>

      <div
        className="card"
        style={{
          fontSize: '14px',
          color: '#d1d1d6',
          lineHeight: 1.9,
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          padding: '36px',
        }}
      >
        <div>
          <h3 style={{ color: '#fff', fontSize: '18px', marginBottom: '8px' }}>
            1. All Sales Final
          </h3>
          <p>
            Due to the nature of digital software keys and immediate automated activation, all purchases are non-refundable. Once a license key has been generated or delivered to your email/account, the sale cannot be cancelled or refunded.
          </p>
        </div>

        <div>
          <h3 style={{ color: '#fff', fontSize: '18px', marginBottom: '8px' }}>
            2. Statutory Waiver
          </h3>
          <p>
            By completing checkout, you explicitly consent to the immediate delivery of digital goods and acknowledge that you waive your right of withdrawal or statutory cooling-off periods.
          </p>
        </div>

        <div>
          <h3 style={{ color: '#fff', fontSize: '18px', marginBottom: '8px' }}>
            3. Chargebacks & Disputes
          </h3>
          <p>
            Filing a fraudulent chargeback or dispute through your bank or payment provider will result in the immediate revocation of your license key and permanent blacklisting from our services.
          </p>
        </div>
      </div>
    </div>
  );
}
