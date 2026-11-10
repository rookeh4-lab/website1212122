import React from 'react';

const changelogEntries = [
  {
    version: 'v1.0 Beta',
    date: '12 October 2026',
    badge: 'Unreleased',
    title: 'Discord Rich Presence Integration',
    highlights: [
      'Completed full DiscordRPC (Customisable to turn on / off name, server, rpc)',
      'Granular privacy toggles allowing players to individually hide or display username and active server address',
      'Direct interactive profile buttons linking to client checkout and community Discord',
    ],
    image: '/discord-rpc.png',
    imageAlt: 'Discord RPC Preview',
  },
];

export default function Changelog() {
  return (
    <div className="container" style={{ maxWidth: '860px', padding: '60px 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '44px' }}>
        <h1 style={{ fontSize: '36px', margin: '0 0 10px', fontWeight: 800, color: '#fff' }}>
          Client Changelog
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
          Continuous improvements, anti-cheat bypass updates, and new features.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {changelogEntries.map((item, idx) => (
          <div
            key={idx}
            className="card"
            style={{
              padding: '36px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="badge badge-primary" style={{ fontSize: '12px', fontWeight: 700 }}>
                  {item.version}
                </span>
                <span
                  className="badge"
                  style={{
                    background: 'rgba(236, 154, 168, 0.1)',
                    color: 'var(--accent)',
                    border: '1px solid var(--accent)',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  {item.badge}
                </span>
              </div>
              <span style={{ fontSize: '13px', color: 'var(--text-dim)' }}>
                {item.date}
              </span>
            </div>

            <h2 style={{ fontSize: '22px', margin: '0 0 18px', fontWeight: 700, color: '#fff' }}>
              {item.title}
            </h2>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                marginBottom: item.image ? '24px' : '0',
              }}
            >
              {item.highlights.map((hl, hIdx) => (
                <div
                  key={hIdx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    fontSize: '14.5px',
                    color: '#e0e0e0',
                    lineHeight: 1.6,
                  }}
                >
                  <span
                    style={{
                      color: 'var(--accent)',
                      fontWeight: 700,
                      marginTop: '1px',
                    }}
                  >
                    —
                  </span>
                  <span>{hl}</span>
                </div>
              ))}
            </div>

            {item.image && (
              <div
                style={{
                  marginTop: '24px',
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    border: '1px solid var(--border)',
                    background: '#0a0d0b',
                    maxWidth: '340px',
                    width: '100%',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
                  }}
                >
                  <img
                    src={item.image}
                    alt={item.imageAlt}
                    style={{ width: '100%', height: 'auto', display: 'block' }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
