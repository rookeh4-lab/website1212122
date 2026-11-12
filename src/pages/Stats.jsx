import React, { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../utils/api';

function formatNumber(num) {
  if (num == null || Number.isNaN(num)) return '—';
  return Number(num).toLocaleString();
}

function useCountUp(targetVal, duration = 700) {
  const [val, setVal] = useState(0);
  const currentRef = useRef(0);

  useEffect(() => {
    if (targetVal == null || Number.isNaN(targetVal)) return;
    const startVal = currentRef.current;
    const endVal = Number(targetVal);
    currentRef.current = endVal;
    if (startVal === endVal) {
      setVal(endVal);
      return;
    }
    const startTime = performance.now();
    let frameId;
    const step = (t) => {
      const progress = Math.min(1, (t - startTime) / duration);
      const ease = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(startVal + (endVal - startVal) * ease));
      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      }
    };
    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [targetVal, duration]);

  return val;
}

function StatCard({ label, hint, value, delay }) {
  const animated = useCountUp(value ?? 0);
  return (
    <div className="stats-card" style={{ animationDelay: `${delay}ms` }}>
      <div className="stats-card-value">
        {value == null ? '—' : formatNumber(animated)}
      </div>
      <div className="stats-card-label">{label}</div>
      <div className="stats-card-hint">{hint}</div>
    </div>
  );
}

export default function Stats() {
  const [stats, setStats] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    let unmounted = false;
    const loadStats = async () => {
      try {
        const res = await fetch(`${API_BASE}/stats`);
        if (res.ok) {
          const data = await res.json();
          if (!unmounted) {
            setStats(data);
            setLastUpdated(new Date());
            setCycle((c) => c + 1);
          }
          return;
        }
      } catch {}

      // Leave null when stats endpoint is unavailable rather than showing synthetic figures
      if (!unmounted) {
        setStats(null);
      }
    };

    loadStats();
    const interval = setInterval(loadStats, 4000);
    return () => {
      unmounted = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="stats-page">
      <div className="stats-page-inner">
        <p className="stats-kicker">Live</p>
        <h1 className="stats-title">Client stats</h1>
        <p className="stats-sub">
          Refreshes automatically{lastUpdated ? ` · ${lastUpdated.toLocaleTimeString()}` : ''}
        </p>

        <div className="stats-grid" key={cycle > 0 ? 'ready' : 'loading'}>
          <StatCard
            label="Live now"
            hint="Active in the last 90 seconds"
            value={stats?.liveUsers}
            delay={0}
          />
          <StatCard
            label="Total launches"
            hint="Successful loader authentications"
            value={stats?.totalLaunches}
            delay={80}
          />
          <StatCard
            label="Total users"
            hint="Registered accounts"
            value={stats?.totalUsers}
            delay={160}
          />
          <StatCard
            label="Active licenses"
            hint="Currently active keys"
            value={stats?.totalLicenses}
            delay={240}
          />
        </div>
      </div>
    </div>
  );
}
