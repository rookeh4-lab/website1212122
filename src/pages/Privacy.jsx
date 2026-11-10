import React from 'react';

export default function Privacy() {
  return (
    <div className="container" style={{ maxWidth: '800px', padding: '60px 20px' }}>
      <div style={{ marginBottom: '36px' }}>
        <h1 style={{ fontSize: '36px', margin: '12px 0 6px', color: '#fff', fontWeight: 800 }}>
          Privacy Policy
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
            1. Information We Collect
          </h3>
          <p>
            We collect minimal information necessary to deliver software licenses, verify hardware authentication, and prevent fraudulent abuse. This includes your email address, Discord account ID, hardware hash (HWID), transaction history, and IP address for trial eligibility and security. Trial eligibility records are retained to prevent repeat claims; contact support with privacy requests.
          </p>
        </div>

        <div>
          <h3 style={{ color: '#fff', fontSize: '18px', marginBottom: '8px' }}>
            2. How We Use Information
          </h3>
          <p>
            Your information is used strictly to authenticate client launches, send license delivery receipts, process renewal subscriptions, and manage support tickets.
          </p>
        </div>

        <div>
          <h3 style={{ color: '#fff', fontSize: '18px', marginBottom: '8px' }}>
            3. Data Protection & Third Parties
          </h3>
          <p>
            Payment information is processed directly by Stripe and is never stored on our servers. We do not sell, rent, or share personal user data with third-party advertisers or external companies.
          </p>
        </div>
      </div>
    </div>
  );
}
