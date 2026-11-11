import React from 'react';

const clips = [
  { id: 'duel-win', src: '/videos/clip_duel_win.mp4', poster: '/videos/thumb_duel_win.jpg' },
  { id: 'gui-showcase', src: '/videos/clip_gui_showcase.mp4', poster: '/videos/thumb_gui_showcase.jpg' },
  { id: 'spear-win', src: '/videos/clip_spear_win.mp4', poster: '/videos/thumb_spear_win.jpg' },
  { id: 'aerial-combat', src: '/videos/clip_aerial_combat.mp4', poster: '/videos/thumb_aerial_combat.jpg' },
];

export default function VideoShowcase() {
  // Triple the array to create a completely seamless infinite loop
  const infiniteClips = [...clips, ...clips, ...clips];

  return (
    <section className="video-showcase-section">
      <div className="video-carousel-container">
        <div className="video-carousel-track">
          {infiniteClips.map((clip, index) => (
            <div key={`${clip.id}-${index}`} className="video-showcase-card">
              <div className="video-card-inner">
                <video
                  src={clip.src}
                  poster={clip.poster}
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="auto"
                  disablePictureInPicture
                  className="video-player-element"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
