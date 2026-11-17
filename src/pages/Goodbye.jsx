import React, { useEffect } from 'react';

export default function Goodbye() {
  useEffect(() => {
    document.title = 'Good Bye 👋 — 5.55 Client';
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#0a0a0f',
        backgroundImage: `
          radial-gradient(circle at 50% 20%, rgba(139, 92, 246, 0.12), transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(244, 63, 94, 0.08), transparent 40%),
          linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)
        `,
        backgroundSize: '100% 100%, 100% 100%, 32px 32px, 32px 32px',
        color: '#f3f4f6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Ambient background glow dots */}
      <div
        style={{
          position: 'absolute',
          top: '-120px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.18) 0%, transparent 70%)',
          pointerEvents: 'none',
          filter: 'blur(50px)',
        }}
      />

      <div
        style={{
          maxWidth: '680px',
          width: '100%',
          background: 'rgba(15, 14, 23, 0.88)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          padding: 'clamp(28px, 6vw, 48px)',
          boxShadow: '0 24px 60px -12px rgba(0, 0, 0, 0.8), 0 0 40px rgba(139, 92, 246, 0.12)',
          backdropFilter: 'blur(20px)',
          textAlign: 'center',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Status indicator */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '999px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            fontSize: '12px',
            fontWeight: 600,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            marginBottom: '24px',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#ef4444',
              boxShadow: '0 0 10px #ef4444',
              display: 'inline-block',
            }}
          />
          All Services Closed • Project Offline
        </div>

        {/* Minecraft Font Heading with Bye emoji */}
        <h1
          style={{
            fontFamily: "'Minecraft', 'Press Start 2P', 'Silkscreen', monospace",
            fontSize: 'clamp(32px, 6vw, 54px)',
            color: '#ffffff',
            margin: '0 0 20px 0',
            lineHeight: 1.25,
            letterSpacing: '1px',
            textShadow: '3px 3px 0 #120e22, 5px 5px 0 rgba(0, 0, 0, 0.65), 0 0 30px rgba(168, 85, 247, 0.45)',
            userSelect: 'none',
          }}
        >
          Good Bye 👋
        </h1>

        {/* Subtle decorative divider */}
        <div
          style={{
            width: '80px',
            height: '3px',
            background: 'linear-gradient(90deg, transparent, #a855f7, transparent)',
            margin: '0 auto 28px',
            borderRadius: '2px',
          }}
        />

        {/* Description body explaining shutdown due to sickness/health & personal problems */}
        <div
          style={{
            fontSize: 'clamp(14.5px, 2.5vw, 16px)',
            lineHeight: 1.8,
            color: '#cbd5e1',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            margin: '0 auto',
            maxWidth: '560px',
          }}
        >
          <p style={{ margin: 0 }}>
            We are deeply saddened to announce that <strong style={{ color: '#fff' }}>5.55 Client</strong> is officially closing down and all web, dashboard, and online services are now permanently offline.
          </p>

          <p style={{ margin: 0, color: '#94a3b8' }}>
            This decision had to be made due to ongoing health issues, falling sick, and difficult personal problems that require full attention and rest. Continuing development and running the project is no longer possible under these circumstances.
          </p>

          <p style={{ margin: 0, color: '#94a3b8' }}>
            We want to express our sincerest gratitude to every player, supporter, customer, and friend who was a part of this journey. Your support, feedback, and memories meant everything to us.
          </p>

          <p style={{ margin: '8px 0 0', color: '#e2e8f0', fontWeight: 500 }}>
            Please prioritize your health, stay safe, and take care of yourselves and your loved ones. ❤️
          </p>
        </div>

        {/* Footer signature in pixel/clean style */}
        <div
          style={{
            marginTop: '36px',
            paddingTop: '20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span
            style={{
              fontFamily: "'Minecraft', 'Press Start 2P', monospace",
              fontSize: '13px',
              color: '#a855f7',
              letterSpacing: '1px',
              textShadow: '2px 2px 0 #000',
            }}
          >
            5.55 CLIENT
          </span>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Thank you for being here with us. Farewell.
          </span>
        </div>
      </div>
    </div>
  );
}
