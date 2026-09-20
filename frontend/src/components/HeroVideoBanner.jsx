import React, { useRef, useState } from 'react';
import { ChevronDown, Play, Pause, Volume2, VolumeX, Sparkles, PawPrint, ShieldCheck, Heart } from 'lucide-react';

export default function HeroVideoBanner({ onExploreClick }) {
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

  const scrollToImplementation = () => {
    const target = document.getElementById('project-implementation-section');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    } else if (onExploreClick) {
      onExploreClick();
    }
  };

  return (
    <section style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      marginLeft: 'calc(-50vw + 50%)',
      marginTop: '-28px',
      marginBottom: '40px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      color: '#ffffff'
    }}>
      {/* Background Fullscreen Video */}
      <video
        ref={videoRef}
        src="/dog_animation.mp4"
        autoPlay
        loop
        muted={isMuted}
        playsInline
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 1
        }}
      />

      {/* Dark Vignette Overlay for Cinema Look */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(circle at center, rgba(11, 15, 25, 0.4) 0%, rgba(11, 15, 25, 0.85) 75%, rgba(11, 15, 25, 0.98) 100%)',
        zIndex: 2
      }} />

      {/* Floating Header Badges */}
      <div style={{
        position: 'absolute',
        top: '28px',
        left: '40px',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, #ff7e67 0%, #10b981 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 25px rgba(255, 126, 103, 0.5)',
          color: '#fff'
        }}>
          <PawPrint size={26} strokeWidth={2.5} />
        </div>
        <div>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
            STREETPAW.AI
          </span>
          <span style={{ display: 'block', fontSize: '0.72rem', color: '#ff7e67', fontWeight: 700 }}>
            DAYANANDA SAGAR UNIVERSITY MAJOR PROJECT
          </span>
        </div>
      </div>

      {/* Video Control Buttons Top Right */}
      <div style={{
        position: 'absolute',
        top: '28px',
        right: '40px',
        zIndex: 10,
        display: 'flex',
        gap: '10px'
      }}>
        <button
          onClick={togglePlay}
          className="btn-secondary"
          style={{
            padding: '8px 16px',
            borderRadius: '9999px',
            background: 'rgba(11, 15, 25, 0.75)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            fontSize: '0.8rem',
            color: '#fff'
          }}
        >
          {isPlaying ? <Pause size={14} color="#ff7e67" /> : <Play size={14} color="#ff7e67" />}
          {isPlaying ? 'Pause Video' : 'Play Video'}
        </button>

        <button
          onClick={toggleMute}
          className="btn-secondary"
          style={{
            padding: '8px 16px',
            borderRadius: '9999px',
            background: 'rgba(11, 15, 25, 0.75)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            fontSize: '0.8rem',
            color: '#fff'
          }}
        >
          {isMuted ? <VolumeX size={14} color="#94a3b8" /> : <Volume2 size={14} color="#34d399" />}
          {isMuted ? 'Muted' : 'Sound On'}
        </button>
      </div>

      {/* Main Center Cinema Content */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        textAlign: 'center',
        maxWidth: '880px',
        padding: '0 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px'
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 18px', background: 'rgba(255, 126, 103, 0.2)', border: '1px solid rgba(255, 126, 103, 0.4)', borderRadius: '9999px' }}>
          <Sparkles size={14} color="#ff7e67" />
          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#ff7e67', letterSpacing: '0.05em' }}>
            A COLLABORATIVE MULTI-AGENT AI PLATFORM FOR STRAY ANIMAL WELFARE
          </span>
        </div>

        <h1 style={{
          fontSize: '3.6rem',
          fontWeight: 800,
          lineHeight: '1.15',
          margin: 0,
          textShadow: '0 10px 30px rgba(0,0,0,0.8)'
        }}>
          Protecting Every Stray <br />
          <span className="gradient-text">With Intelligent Vision AI 🐾</span>
        </h1>

        <p style={{
          fontSize: '1.15rem',
          color: 'rgba(248, 250, 252, 0.88)',
          maxWidth: '680px',
          lineHeight: '1.6',
          margin: '0 auto',
          textShadow: '0 4px 15px rgba(0,0,0,0.6)'
        }}>
          Real-time stray animal detection (Dogs, Cats, Pigs, Cows, etc.), visual re-identification, disease health risk profiling, and automated NGO rescue dispatch.
        </p>

        {/* CTA Button */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
          <button 
            className="btn-primary"
            onClick={scrollToImplementation}
            style={{
              padding: '16px 36px',
              fontSize: '1.15rem',
              borderRadius: '9999px',
              boxShadow: '0 10px 35px rgba(255, 126, 103, 0.5)'
            }}
          >
            <PawPrint size={22} /> Launch Animal Detection Engine
          </button>
        </div>
      </div>

      {/* Bouncing Scroll Down Indicator at Bottom */}
      <div 
        onClick={scrollToImplementation}
        style={{
          position: 'absolute',
          bottom: '30px',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          cursor: 'pointer',
          animation: 'pawFloat 2s infinite ease-in-out'
        }}
      >
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'rgba(255, 255, 255, 0.8)', letterSpacing: '0.05em' }}>
          SCROLL DOWN TO EXPLORE PLATFORM
        </span>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: 'rgba(255, 126, 103, 0.25)',
          border: '1px solid rgba(255, 126, 103, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ff7e67'
        }}>
          <ChevronDown size={20} />
        </div>
      </div>
    </section>
  );
}
