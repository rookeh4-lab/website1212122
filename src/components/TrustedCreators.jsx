import React from 'react';

const creators = [
  {
    name: 'Error Minecraft',
    handle: '@ErrorMinecraft-l2d',
    avatar: '/creators/errorminecraft.png',
    url: 'https://youtube.com/@errorminecraft-l2d?si=vvVDF_pSNnHponW_',
  },
  {
    name: 'Syndicate Client',
    handle: '@syndicateclient',
    avatar: '/creators/syndicateclient.png',
    url: 'https://youtube.com/@syndicateclient?si=urHq5xxyfmlsR22g',
  },
];

export default function TrustedCreators() {
  return (
    <div
      className="trusted-creators-wrapper"
      data-aos="fade-up"
      data-aos-delay="350"
      data-aos-duration="600"
      style={{
        marginTop: '44px',
        textAlign: 'center',
      }}
    >
      <p
        style={{
          fontSize: '13.5px',
          fontWeight: 600,
          color: '#8e8e99',
          letterSpacing: '0.02em',
          marginBottom: '18px',
          textTransform: 'none',
        }}
      >
        Trusted by large creators
      </p>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '36px',
          flexWrap: 'wrap',
        }}
      >
        {creators.map((creator) => (
          <a
            key={creator.name}
            href={creator.url}
            target="_blank"
            rel="noopener noreferrer"
            title={`${creator.name} (${creator.handle}) on YouTube`}
            className="trusted-creator-link"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              textDecoration: 'none',
              padding: '6px 14px 6px 6px',
              borderRadius: '9999px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              cursor: 'pointer',
            }}
          >
            <img
              src={creator.avatar}
              alt={creator.name}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '1.5px solid rgba(255, 255, 255, 0.12)',
                display: 'block',
              }}
            />
            <span
              className="trusted-creator-title"
              style={{
                fontSize: '17px',
                fontWeight: 700,
                color: '#f4f4f5',
                letterSpacing: '-0.01em',
                fontFamily: 'Outfit, sans-serif',
                transition: 'color 0.2s ease',
              }}
            >
              {creator.name}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
