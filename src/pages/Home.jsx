import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import PricingSection from '../components/PricingSection';
import PurchaseModal from '../components/PurchaseModal';
import VideoShowcase from '../components/VideoShowcase';
import TrustedCreators from '../components/TrustedCreators';

export default function Home() {
  const [modalState, setModalState] = useState({ open: false, tier: 'lifetime' });

  return (
    <div className="landing-wrapper">
      {/* Hero Section */}
      <section className="hero">
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <h1
            className="hero-title"
            data-aos="fade-up"
            data-aos-duration="600"
          >
            5.55 Client —
            <br />
            <span className="hero-gradient">Best 1.21.11 PVP Client.</span>
          </h1>

          <p
            className="hero-subtitle"
            data-aos="fade-up"
            data-aos-delay="100"
            data-aos-duration="600"
          >
            Win more fights without it ever looking like cheating. Works on every version from 1.21.
          </p>

          <div
            className="hero-actions"
            data-aos="fade-up"
            data-aos-delay="200"
            data-aos-duration="600"
          >
            <a href="#pricing" className="btn btn-primary btn-lg">
              Get Started Now
            </a>
            <a href="#pricing" className="btn btn-secondary btn-lg">
              View Plans &amp; Pricing
            </a>
          </div>

          <div
            className="hero-features"
            data-aos="fade-up"
            data-aos-delay="300"
            data-aos-duration="600"
          >
            <span className="hero-feature-item">
              <svg
                className="hero-feature-icon"
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              Fabric 1.21.11
            </span>

            <span className="hero-feature-item">
              <svg
                className="hero-feature-icon"
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              Windows 10+
            </span>

            <span className="hero-feature-item">
              <svg
                className="hero-feature-icon"
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              Instant Delivery
            </span>
          </div>

          {/* Trusted by large creators */}
          <TrustedCreators />
        </div>
      </section>

      {/* Echo-Style Animated Video Showcase Reel */}
      <VideoShowcase />

      {/* Showcase Section */}
      <section
        id="showcase"
        className="section"
        style={{ background: 'rgba(0,0,0,0.2)' }}
      >
        <div className="container">
          <div
            className="section-header"
            data-aos="fade-up"
            data-aos-duration="600"
          >
            <p className="section-tag">Showcase</p>
            <h2 className="section-title">See 5.55 Client in Action</h2>
            <p className="section-desc">
              Undetectable ghost client gameplay and in-depth module demonstrations.
            </p>
          </div>

          <div
            data-aos="fade-up"
            data-aos-duration="600"
            className="showcase-grid-responsive"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '24px',
              maxWidth: '1120px',
              margin: '0 auto',
            }}
          >
            <div
              style={{
                background: 'rgba(18, 17, 22, 0.75)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '12px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  paddingBottom: '56.25%',
                  height: 0,
                  overflow: 'hidden',
                  borderRadius: '10px',
                }}
              >
                <iframe
                  src="https://www.youtube.com/embed/Syxg9dcdWUk"
                  title="5.55 Client Showcase 1"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    border: 'none',
                  }}
                />
              </div>
            </div>

            <div
              style={{
                background: 'rgba(18, 17, 22, 0.75)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '12px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  paddingBottom: '56.25%',
                  height: 0,
                  overflow: 'hidden',
                  borderRadius: '10px',
                }}
              >
                <iframe
                  src="https://www.youtube.com/embed/XjJy_hv2dfs"
                  title="5.55 Client Showcase 2"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    border: 'none',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="section">
        <div className="container">
          <div
            className="section-header"
            data-aos="fade-up"
            data-aos-duration="600"
          >
            <p className="section-tag">Pricing Plans</p>
            <h2 className="section-title">Choose your plan</h2>
            <p className="section-desc">
              Transparent pricing with instant key delivery and 24/7 Discord support.
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
              setModalState({ open: true, tier });
            }}
          />

          {/* CTA Box */}
          <div
            className="cta-box"
            data-aos="fade-up"
            data-aos-duration="600"
            style={{ marginTop: 48, padding: '40px 28px', border: '1px solid rgba(245, 158, 11, 0.35)' }}
          >
            <p
              className="section-tag"
              style={{
                marginBottom: 10,
                display: 'inline-block',
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#fbbf24',
                borderColor: 'rgba(245, 158, 11, 0.4)',
              }}
            >
              ⏸ Free Trial · Temporarily On Hold
            </p>
            <h3 className="cta-title" style={{ fontSize: 28, marginBottom: 10 }}>
              Free Trials Are On Hold
            </h3>
            <p
              className="cta-desc"
              style={{
                marginBottom: 24,
                maxWidth: 480,
                marginLeft: 'auto',
                marginRight: 'auto',
              }}
            >
              Free trial activations are temporarily on hold while updates are being finalized. Check our pricing plans below or visit Discord for announcements.
            </p>
            <div className="cta-actions">
              <a href="#pricing" className="btn btn-primary btn-lg">
                View Available Plans
              </a>
              <Link to="/trial" className="btn btn-secondary btn-lg">
                Trial Status
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Purchase Modal */}
      <PurchaseModal
        open={modalState.open}
        selectedTier={modalState.tier}
        onClose={() => setModalState({ open: false, tier: 'lifetime' })}
      />
    </div>
  );
}
