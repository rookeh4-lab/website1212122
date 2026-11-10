import React from 'react';

export default function Terms() {
  return (
    <div className="container" style={{ maxWidth: '800px', padding: '60px 20px' }}>
      <div style={{ marginBottom: '36px' }}>
        <h1 style={{ fontSize: '36px', margin: '12px 0 6px', color: '#fff', fontWeight: 800 }}>
          Terms of Service
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
            1. Acceptance of Terms
          </h3>
          <p>
            By purchasing, accessing, or downloading 5.55 Client ("the Software"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not access or use the Software.
          </p>
        </div>

        <div>
          <h3 style={{ color: '#fff', fontSize: '18px', marginBottom: '8px' }}>
            2. Software License & HWID Binding
          </h3>
          <p>
            Each 5.55 Client license is non-transferable, single-user, and bound to the specific hardware identifier (HWID) of the purchaser's computer. Sharing, leasing, sub-licensing, dumping, reverse engineering, cracking, or reselling software keys will result in immediate termination of the license without refund.
          </p>
        </div>

        <div>
          <h3 style={{ color: '#fff', fontSize: '18px', marginBottom: '8px' }}>
            3. Hardware ID (HWID) Resets
          </h3>
          <p>
            Users may reset their HWID once every thirty (30) days through the automated dashboard. Additional resets or accelerated resets are granted strictly at administrator discretion.
          </p>
        </div>

        <div>
          <h3 style={{ color: '#fff', fontSize: '18px', marginBottom: '8px' }}>
            4. Digital Goods & No Refunds
          </h3>
          <p>
            All sales are final. Because digital software keys are generated and delivered immediately upon transaction completion, you expressly waive any statutory cooling-off or withdrawal periods. Chargebacks or fraudulent payment disputes will result in permanent blacklisting of your HWID, IP, Discord account, and associated payment details.
          </p>
        </div>

        <div>
          <h3 style={{ color: '#fff', fontSize: '18px', marginBottom: '8px' }}>
            5. Disclaimer & Limitation of Liability
          </h3>
          <p>
            5.55 Client is provided "as is" without warranties of any kind. 5.55 Client is not responsible for any server bans, account suspensions, or administrative actions resulting from the use of this software. 5.55 Client is not affiliated with Mojang Studios or Microsoft.
          </p>
        </div>
      </div>
    </div>
  );
}
