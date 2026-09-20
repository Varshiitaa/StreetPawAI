import React, { useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Sparkles, Heart, ShieldCheck } from 'lucide-react';

export default function HeroVideoBanner() {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className="glass-panel" style={{
      padding: '24px',
      marginBottom: '28px',
      background: 'linear-gradient(135deg, rgba(255, 126, 103, 0.12) 0%, rgba(16, 185, 129, 0.12) 50%, rgba(167, 139, 250, 0.12) 100%)',
      border: '1px solid rgba(255, 126, 103, 0.3)',
      boxShadow: '0 16px 48px rgba(0, 0, 0, 0.45)',
      overflow: 'hidden',
      position: 'relative'
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.1fr 0.9fr',
        gap: '28px',
        alignItems: 'center'
      }}>
        {/* Text Details & Branding */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span className="badge badge-coral">
              <Sparkles size={12} /> LIVE ANIMATED DOG COMPANION
            </span>
            <span className="badge badge-emerald">
              <ShieldCheck size={12} /> AI VISION READY
            </span>
          </div>

          <h2 style={{ fontSize: '2rem', fontWeight: 800, lineHeight: '1.25', marginBottom: '12px' }} className="gradient-text">
            Meet Your Real-Looking AI Dog Companion 🐾
          </h2>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.96rem', lineHeight: '1.6', marginBottom: '20px' }}>
            StreetPaw.AI combines deep learning vision models with real-time video companions to help protect and rescue stray dogs, cats, pigs, cows, and other quadrupeds.
          </p>

          {/* Quick Metrics Badges */}
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{
              background: 'rgba(18, 24, 38, 0.7)',
              padding: '10px 16px',
              borderRadius: '16px',
              border: '1px solid rgba(255, 126, 103, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <Heart size={20} color="#ff7e67" fill="#ff7e67" />
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Mascot Status</span>
                <p style={{ fontWeight: 800, fontSize: '0.9rem', color: '#ff7e67', margin: 0 }}>Active & Happy 🐾</p>
              </div>
            </div>

            <div style={{
              background: 'rgba(18, 24, 38, 0.7)',
              padding: '10px 16px',
              borderRadius: '16px',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <Sparkles size={20} color="#34d399" />
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Detection Speed</span>
                <p style={{ fontWeight: 800, fontSize: '0.9rem', color: '#34d399', margin: 0 }}>~140ms Latency</p>
              </div>
            </div>
          </div>
        </div>

        {/* Animated Dog Video Frame */}
        <div style={{
          position: 'relative',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6), 0 0 25px rgba(255, 126, 103, 0.3)',
          border: '2px solid rgba(255, 126, 103, 0.4)',
          maxHeight: '300px',
          background: '#000'
        }}>
          <video
            ref={videoRef}
            src="/dog_animation.mp4"
            autoPlay
            loop
            muted={isMuted}
            playsInline
            style={{
              width: '100%',
              height: '300px',
              objectFit: 'cover',
              display: 'block'
            }}
          />

          {/* Video Controls Overlay */}
          <div style={{
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            display: 'flex',
            gap: '8px',
            zIndex: 10
          }}>
            <button
              onClick={togglePlay}
              className="btn-secondary"
              style={{
                padding: '8px 12px',
                borderRadius: '12px',
                background: 'rgba(11, 15, 25, 0.8)',
                backdropFilter: 'blur(8px)',
                fontSize: '0.78rem'
              }}
            >
              {isPlaying ? <Pause size={14} color="#ff7e67" /> : <Play size={14} color="#ff7e67" />}
              {isPlaying ? 'Pause' : 'Play'}
            </button>

            <button
              onClick={toggleMute}
              className="btn-secondary"
              style={{
                padding: '8px 12px',
                borderRadius: '12px',
                background: 'rgba(11, 15, 25, 0.8)',
                backdropFilter: 'blur(8px)',
                fontSize: '0.78rem'
              }}
            >
              {isMuted ? <VolumeX size={14} color="#94a3b8" /> : <Volume2 size={14} color="#34d399" />}
              {isMuted ? 'Muted' : 'Sound On'}
            </button>
          </div>

          {/* Floating Badge on Video */}
          <div style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            background: 'rgba(11, 15, 25, 0.85)',
            backdropFilter: 'blur(8px)',
            padding: '6px 14px',
            borderRadius: '9999px',
            border: '1px solid rgba(255, 126, 103, 0.4)',
            fontSize: '0.75rem',
            fontWeight: 800,
            color: '#ff7e67',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span className="pulse-dot" style={{ backgroundColor: '#ff7e67' }}></span> REAL DOG ANIMATION FEED
          </div>
        </div>
      </div>
    </div>
  );
}
