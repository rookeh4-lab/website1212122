import React, { useState, useEffect } from 'react';
import { API_BASE } from '../utils/api';

export default function Status() {
  const [overallState, setOverallState] = useState('checking'); // 'online' | 'degraded' | 'offline' | 'checking'
  const [headline, setHeadline] = useState('Checking System Health...');
  const [latency, setLatency] = useState('—');
  const [dbStatus, setDbStatus] = useState('Checking...');
  const [lastCheck, setLastCheck] = useState('Checking now...');

  const checkHealth = async () => {
    const start = performance.now();
    try {
      const res = await fetch(`${API_BASE}/health`, { cache: 'no-store' });
      const ms = Math.max(1, Math.round(performance.now() - start));
      const data = await res.json().catch(() => ({}));
      const apiUp = res.ok && (data.status === 'online' || data.status === 'ok');
      const dbUp = data.db === 'connected';

      setLatency(`${ms} ms`);
      setDbStatus(dbUp ? 'Connected' : 'Degraded');
      setLastCheck(`Last checked: ${new Date().toLocaleTimeString()} (${ms}ms)`);

      if (apiUp && dbUp) {
        setOverallState('online');
        setHeadline('All Core Services Operational');
      } else if (res.ok || data.status === 'degraded') {
        setOverallState('degraded');
        setHeadline('Partial Service Degradation');
      } else {
        setOverallState('offline');
        setHeadline('API Service Unavailable');
      }
    } catch {
      setOverallState('offline');
      setHeadline('Unable to Reach API Server');
      setLatency('—');
      setDbStatus('Unreachable');
      setLastCheck(`Last check failed: ${new Date().toLocaleTimeString()}`);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const statusColor =
    overallState === 'online'
      ? '#10b981'
      : overallState === 'degraded' || overallState === 'checking'
      ? '#f59e0b'
      : '#ef4444';

  return (
    <div className="container" style={{ maxWidth: '800px', padding: '60px 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '38px', margin: '12px 0 6px', color: '#fff', fontWeight: 800 }}>
          System Health & Status
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
          Real-time service health, server latency, and database connectivity.
        </p>
      </div>

      <div
        className="card"
        style={{
          marginBottom: '24px',
          textAlign: 'center',
          padding: '36px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '20px',
            fontWeight: 700,
            color: statusColor,
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: statusColor,
              boxShadow: `0 0 12px ${statusColor}`,
            }}
          />
          <span>{headline}</span>
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: '8px' }}>
          {lastCheck}
        </div>
      </div>

      <div className="grid" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div
          className="card"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
          }}
        >
          <div>
            <div style={{ fontWeight: 700, color: '#fff', fontSize: '15px' }}>
              5.55 Client API
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              www.555client.xyz/api/health
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '13px',
                color: 'var(--accent-light)',
              }}
            >
              {latency}
            </span>
            <span className={`badge ${overallState === 'online' ? 'badge-success' : 'badge-warning'}`}>
              {overallState === 'online' ? 'Operational' : overallState === 'degraded' ? 'Degraded' : overallState === 'checking' ? 'Checking' : 'Offline'}
            </span>
          </div>
        </div>

        <div
          className="card"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
          }}
        >
          <div>
            <div style={{ fontWeight: 700, color: '#fff', fontSize: '15px' }}>
              Database
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Core Supabase Data Store
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className={`badge ${dbStatus === 'Connected' ? 'badge-success' : 'badge-warning'}`}>{dbStatus}</span>
          </div>
        </div>

        <div
          className="card"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
          }}
        >
          <div>
            <div style={{ fontWeight: 700, color: '#fff', fontSize: '15px' }}>
              Discord OAuth &amp; Community
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              OAuth2 Sign-In &amp; Community Discord
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-success">Integrated</span>
          </div>
        </div>

        <div
          className="card"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
          }}
        >
          <div>
            <div style={{ fontWeight: 700, color: '#fff', fontSize: '15px' }}>
              SellAuth Checkout
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Digital License Checkout &amp; Webhook Delivery
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-success">External Hosted</span>
          </div>
        </div>
      </div>
    </div>
  );
}
