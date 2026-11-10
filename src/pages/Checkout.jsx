import React, { useState } from 'react';
import PricingSection from '../components/PricingSection';
import PurchaseModal from '../components/PurchaseModal';

export default function Checkout() {
  const [selectedTier, setSelectedTier] = useState('lifetime');
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="container" style={{ maxWidth: '1080px', padding: '60px 20px 100px' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1
          style={{
            fontSize: '32px',
            fontWeight: 800,
            color: '#ffffff',
            marginBottom: '8px',
          }}
        >
          Choose your plan
        </h1>
        <p style={{ color: '#8e8e99', fontSize: '15px' }}>
          Instant digital delivery to your email right after checkout.
        </p>
      </div>

      <PricingSection
        onBuy={(tier) => {
          if (tier === 'client-lifetime' || tier === 'lifetime') {
            window.location.href = 'https://lama-co.mysellauth.com/checkout/f637dd86402c3-0000017323883';
            return;
          }
          if (tier === 'injectable-lifetime') {
            window.location.href = 'https://lama-co.mysellauth.com/checkout/8bfd882b2959f-0000017323965';
            return;
          }
          setSelectedTier(tier);
          setModalOpen(true);
        }}
      />

      <PurchaseModal
        open={modalOpen}
        selectedTier={selectedTier}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
