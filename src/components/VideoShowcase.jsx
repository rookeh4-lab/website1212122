import React, { useRef, useState } from 'react';

const clips = [
  {
    id: 'duel-win',
    title: 'BelzFineshyt Slain • Round Win (1 - 0)',
    tag: '🏆 Ranked Duel Win',
    creator: 'terosik555',
    role: 'Top Tier Duelist',
    desc: 'Flawless sword combos, hit registration & critical sprint resets.',
    src: '/videos/clip_duel_win.mp4',
    poster: '/videos/thumb_duel_win.jpg',
    duration: '0:30',
  },
  {
    id: 'gui-showcase',
    title: '5.55 Client In-Game ClickGUI',
    tag: '⚙️ Undetectable Modules',
    creator: '0_robin_',
    role: 'Config Showcase',
    desc: 'Real-time module toggles: Pearl Catch, Key Pearl, Macro delays & Swap Back.',
    src: '/videos/clip_gui_showcase.mp4',
    poster: '/videos/thumb_gui_showcase.jpg',
    duration: '0:09',
  },
  {
    id: 'spear-win',
    title: 'makowiec1 Smashed • Match Complete',
    tag: '⚡ Match Win (1 - 0)',
    creator: 'terosik555',
    role: 'Spear & Mace Meta',
    desc: 'High velocity Netherite Spear strike, Wind Charge drop & match victory.',
    src: '/videos/clip_spear_win.mp4',
    poster: '/videos/thumb_spear_win.jpg',
    duration: '0:16',
  },
  {
    id: 'aerial-combat',
    title: 'Aerial Wind Charge Mobility',
    tag: '🚀 Movement Stealth',
    creator: '5.55 Player',
    role: 'Movement Bypass',
    desc: 'Bypass-ready kinetic glide, aerial trajectory control and evasive plays.',
    src: '/videos/clip_aerial_combat.mp4',
    poster: '/videos/thumb_aerial_combat.jpg',
    duration: '0:12',
  },
];

const creators = [
  {
    name: 'Cyde',
    avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=100&auto=format&fit=crop&q=80',
    role: 'Creator',
  },
  {
    name: 'ItzOwo',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
    role: 'PvP Creator',
  },
  {
    name: 'Tasin',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80',
    role: 'Tier 1 Ranked',
  },
  {
    name: 'terosik555',
    avatar: '/logo.png',
    role: '5.55 Champion',
  },
  {
    name: '0_robin_',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    role: 'Macro Tester',
  },
];

export default function VideoShowcase() {
  const [activeModal, setActiveModal] = useState(null);
  const [mutedStates, setMutedStates] = useState({});
  const trackRef = useRef(null);

  const toggleMute = (e, id) => {
    e.stopPropagation();
    setMutedStates((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const scroll = (direction) => {
    if (trackRef.current) {
      const scrollAmount = direction === 'left' ? -420 : 420;
      trackRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Duplicate cards for seamless looping
  const carouselClips = [...clips, ...clips];

  return (
    <section className="video-showcase-section">
      <div className="container">
        {/* Creator Trust Bar (as seen on echoclient.net) */}
        <div className="creators-bar" data-aos="fade-up" data-aos-duration="600">
          <span className="creators-label">Trusted by large creators</span>
          <div className="creators-list">
            {creators.map((c, i) => (
              <div key={i} className="creator-pill">
                <img
                  src={c.avatar}
                  alt={c.name}
                  className="creator-avatar"
                  onError={(e) => {
                    e.target.src = '/logo.png';
                  }}
                />
                <span className="creator-name">{c.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Section Header */}
        <div className="section-header" style={{ marginBottom: '28px' }} data-aos="fade-up" data-aos-duration="600">
          <p className="section-tag">Live Gameplay</p>
          <h2 className="section-title">Dominance In Every Gamemode</h2>
          <p className="section-desc">
            Raw, unedited combat footage and in-game UI demonstrations powered by 5.55 Client.
          </p>
        </div>
      </div>

      {/* Video Carousel Track */}
      <div className="video-carousel-container" data-aos="fade-up" data-aos-duration="700">
        {/* Controls */}
        <button
          className="carousel-nav-btn prev"
          onClick={() => scroll('left')}
          aria-label="Previous clips"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <button
          className="carousel-nav-btn next"
          onClick={() => scroll('right')}
          aria-label="Next clips"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>

        {/* Scrolling Strip */}
        <div className="video-carousel-track" ref={trackRef}>
          {carouselClips.map((clip, index) => {
            const isMuted = mutedStates[clip.id] !== false; // default muted for autoplay
            return (
              <div
                key={`${clip.id}-${index}`}
                className="video-showcase-card"
                onClick={() => setActiveModal(clip)}
              >
                <div className="video-card-inner">
                  <video
                    src={clip.src}
                    poster={clip.poster}
                    autoPlay
                    loop
                    muted={isMuted}
                    playsInline
                    preload="metadata"
                    className="video-player-element"
                  />

                  {/* Gradient overlays */}
                  <div className="video-card-gradient-top" />
                  <div className="video-card-gradient-bottom" />

                  {/* Top Bar Badges */}
                  <div className="video-card-top-bar">
                    <span className="video-card-badge">{clip.tag}</span>
                    <button
                      className="video-mute-btn"
                      onClick={(e) => toggleMute(e, clip.id)}
                      title={isMuted ? 'Unmute' : 'Mute'}
                    >
                      {isMuted ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                          <line x1="23" y1="9" x2="17" y2="15"></line>
                          <line x1="17" y1="9" x2="23" y2="15"></line>
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                        </svg>
                      )}
                      <span>{isMuted ? 'Muted' : 'Sound On'}</span>
                    </button>
                  </div>

                  {/* Center Play Button on Hover */}
                  <div className="video-hover-play-icon">
                    <div className="play-pulse-ring"></div>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                  </div>

                  {/* Bottom Info */}
                  <div className="video-card-bottom-info">
                    <div className="video-creator-tag">
                      <span className="creator-dot"></span>
                      <span>{clip.creator}</span>
                      <span className="duration-tag">{clip.duration}</span>
                    </div>
                    <h3 className="video-card-title">{clip.title}</h3>
                    <p className="video-card-desc">{clip.desc}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fullscreen Video Modal */}
      {activeModal && (
        <div className="video-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="video-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="video-modal-header">
              <div>
                <span className="video-card-badge" style={{ marginBottom: '6px', display: 'inline-block' }}>
                  {activeModal.tag}
                </span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
                  {activeModal.title}
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#9494a0' }}>{activeModal.desc}</p>
              </div>
              <button
                className="video-modal-close"
                onClick={() => setActiveModal(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="video-modal-body">
              <video
                src={activeModal.src}
                controls
                autoPlay
                className="video-modal-player"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
