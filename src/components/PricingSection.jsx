import React from 'react';

export const pricingProducts = {
  client: {
    title: '5.55 Client',
    subtitle: 'The original 5.55 client. Works with the launchers you already use.',
    monthly: {
      id: 'client-monthly',
      productName: '5.55 Client (Monthly)',
      label: 'MONTHLY',
      priceUsd: 1,
      period: '30 days of access · no auto-renewal',
      blurb: 'Full access for 30 days.',
      features: [
        'Fabric 1.21-1.21.11 support',
        'All modules included',
        'Regular updates',
        'Windows 10 / 11',
        '24/7 Discord support',
      ],
      btnText: 'Buy Monthly',
      btnColor: '#6366f1',
    },
    lifetime: {
      id: 'client-lifetime',
      productName: '5.55 Client (Lifetime)',
      label: 'LIFETIME',
      badge: 'Most Popular',
      badgeColor: '#10b981',
      borderColor: '#10b981',
      priceUsd: 2,
      checkoutUrl: 'https://lama-co.mysellauth.com/checkout/f637dd86402c3-0000017323883',
      period: 'one-time · forever · instant delivery',
      blurb: 'One payment. Updates forever.',
      features: [
        'Fabric 1.21-1.21.11 support',
        'All modules included',
        'Lifetime updates',
        'Windows 10 / 11',
        '24/7 Discord support',
        'Never pay again',
      ],
      btnText: 'Buy Lifetime',
      btnColor: '#10b981',
    },
  },
  injectable: {
    title: '5.55 Injectable',
    tag: 'NEW',
    subtitle: 'Injects straight into the game. Leaves without a trace.',
    monthly: {
      id: 'injectable-monthly',
      productName: '5.55 Injectable (Monthly)',
      label: 'MONTHLY',
      priceUsd: 4,
      period: '30 days of access · no auto-renewal',
      blurb: 'Full access for 30 days.',
      features: [
        'Injectable (new)',
        'Better screenshare bypass',
        'New GUI & modules',
        'Fabric 1.21-26.1 support',
        'Regular updates',
        '24/7 Discord support',
      ],
      btnText: 'Buy Monthly',
      btnColor: '#6366f1',
    },
    lifetime: {
      id: 'injectable-lifetime',
      productName: '5.55 Injectable (Lifetime)',
      label: 'LIFETIME',
      badge: 'Best Value',
      badgeColor: '#6366f1',
      borderColor: '#6366f1',
      priceUsd: 6,
      checkoutUrl: 'https://lama-co.mysellauth.com/checkout/8bfd882b2959f-0000017323965',
      period: 'one-time · forever · instant delivery',
      blurb: 'One payment. Stronger screenshare bypass, forever.',
      features: [
        'Injectable (new)',
        'Better screenshare bypass',
        'New GUI & modules',
        'Fabric 1.21-26.1 support',
        'Lifetime updates',
        '24/7 Discord support',
        'Never pay again',
      ],
      btnText: 'Buy Lifetime',
      btnColor: '#6366f1',
    },
  },
};

export function getPlanDetails(tierId) {
  for (const group of Object.values(pricingProducts)) {
    if (group.monthly.id === tierId) return group.monthly;
    if (group.lifetime.id === tierId) return group.lifetime;
  }
  // Fallbacks
  if (tierId === 'monthly') return pricingProducts.client.monthly;
  if (tierId === 'lifetime') return pricingProducts.client.lifetime;
  if (tierId === 'injectable-monthly') return pricingProducts.injectable.monthly;
  if (tierId === 'injectable-lifetime') return pricingProducts.injectable.lifetime;
  return pricingProducts.client.lifetime;
}

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#10b981"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <circle cx="12" cy="12" r="10" stroke="#10b981" />
      <path d="m9 12 2 2 4-4" stroke="#10b981" />
    </svg>
  );
}

function PricingCard({ plan, onBuy }) {
  const isFeatured = !!plan.badge;

  return (
    <div
      data-aos="fade-up"
      data-aos-duration="600"
      style={{
        background: 'rgba(14, 13, 20, 0.85)',
        border: plan.borderColor
          ? `1.5px solid ${plan.borderColor}`
          : '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        padding: '32px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        position: 'relative',
        minHeight: '440px',
        boxShadow: isFeatured ? '0 12px 36px -10px rgba(0, 0, 0, 0.6)' : 'none',
      }}
    >
      {plan.badge && (
        <span
          style={{
            position: 'absolute',
            top: '-12px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '24px',
            padding: '0 14px',
            background: plan.badgeColor || '#10b981',
            color: '#ffffff',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            boxShadow: `0 4px 14px ${plan.badgeColor || '#10b981'}40`,
          }}
        >
          {plan.badge}
        </span>
      )}

      <div>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: '#8e8e99',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          {plan.label}
        </span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '6px' }}>
          <span
            style={{
              fontSize: '38px',
              fontWeight: 900,
              color: '#ffffff',
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
            }}
          >
            ${plan.priceUsd.toFixed(2)}
          </span>
        </div>
        <p style={{ fontSize: '12px', color: '#71717a', margin: '4px 0 0' }}>
          {plan.period}
        </p>
        <p style={{ fontSize: '13px', color: '#a1a1aa', margin: '10px 0 0', lineHeight: 1.4 }}>
          {plan.blurb}
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '11px',
          margin: '10px 0 auto',
        }}
      >
        {plan.features.map((feat) => (
          <div
            key={feat}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '13px',
              color: '#e4e4e7',
            }}
          >
            <CheckIcon />
            <span>{feat}</span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => {
          if (plan.checkoutUrl) {
            window.location.href = plan.checkoutUrl;
          } else if (onBuy) {
            onBuy(plan.id);
          }
        }}
        style={{
          background: plan.btnColor || '#6366f1',
          border: 'none',
          borderRadius: '12px',
          padding: '12px',
          textAlign: 'center',
          color: '#ffffff',
          fontWeight: 700,
          fontSize: '14px',
          cursor: 'pointer',
          transition: 'transform 0.15s, opacity 0.15s',
          boxShadow: `0 6px 20px -4px ${plan.btnColor || '#6366f1'}66`,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
      >
        {plan.btnText}
      </button>
    </div>
  );
}

export default function PricingSection({ onBuy }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '64px', maxWidth: '820px', margin: '0 auto' }}>
      {/* 5.55 Client Group */}
      <div>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h3
            style={{
              fontSize: '26px',
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-0.02em',
              margin: '0 0 6px',
            }}
          >
            {pricingProducts.client.title}
          </h3>
          <p style={{ color: '#8e8e99', fontSize: '14px', margin: 0 }}>
            {pricingProducts.client.subtitle}
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
            alignItems: 'stretch',
          }}
        >
          <PricingCard plan={pricingProducts.client.monthly} onBuy={onBuy} />
          <PricingCard plan={pricingProducts.client.lifetime} onBuy={onBuy} />
        </div>
      </div>

      {/* 5.55 Injectable Group */}
      <div>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <h3
              style={{
                fontSize: '26px',
                fontWeight: 800,
                color: '#ffffff',
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              {pricingProducts.injectable.title}
            </h3>
            <span
              style={{
                background: '#ef4444',
                color: '#fff',
                fontSize: '10px',
                fontWeight: 800,
                padding: '2px 7px',
                borderRadius: '6px',
                letterSpacing: '0.04em',
              }}
            >
              NEW
            </span>
          </div>
          <p style={{ color: '#8e8e99', fontSize: '14px', margin: 0 }}>
            {pricingProducts.injectable.subtitle}
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
            alignItems: 'stretch',
          }}
        >
          <PricingCard plan={pricingProducts.injectable.monthly} onBuy={onBuy} />
          <PricingCard plan={pricingProducts.injectable.lifetime} onBuy={onBuy} />
        </div>
      </div>
    </div>
  );
}
