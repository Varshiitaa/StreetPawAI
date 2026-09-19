import React, { useState } from 'react';
import { Heart, Sparkles, Volume2 } from 'lucide-react';

export default function CuteDogMascot({ mood = "happy", message = "Woof! I'm Pawly, your AI Stray Welfare Buddy! 🐾" }) {
  const [isWagging, setIsWagging] = useState(true);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      background: 'linear-gradient(135deg, rgba(255, 126, 103, 0.12) 0%, rgba(16, 185, 129, 0.12) 100%)',
      padding: '16px 22px',
      borderRadius: '24px',
      border: '1px solid rgba(255, 126, 103, 0.3)',
      boxShadow: '0 10px 30px rgba(255, 126, 103, 0.15)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated Dog SVG Mascot */}
      <div 
        style={{ position: 'relative', width: '70px', height: '70px', cursor: 'pointer', flexShrink: 0 }}
        onClick={() => setIsWagging(!isWagging)}
        title="Click to pet me! 🐾"
      >
        <svg viewBox="0 0 200 200" width="70" height="70">
          {/* Tail */}
          <path 
            d="M 160 110 Q 185 80 170 60 Q 155 75 145 95" 
            fill="#d97706" 
            style={{
              transformOrigin: '145px 95px',
              animation: isWagging ? 'wagTail 0.4s ease-in-out infinite alternate' : 'none'
            }}
          />
          {/* Body */}
          <ellipse cx="110" cy="130" rx="50" ry="40" fill="#f59e0b" />
          <ellipse cx="110" cy="140" rx="30" ry="25" fill="#fef3c7" />

          {/* Back Paws */}
          <ellipse cx="75" cy="165" rx="15" ry="10" fill="#d97706" />
          <ellipse cx="145" cy="165" rx="15" ry="10" fill="#d97706" />

          {/* Head */}
          <circle cx="90" cy="85" r="42" fill="#f59e0b" />
          {/* Muzzle */}
          <ellipse cx="90" cy="98" rx="22" ry="16" fill="#fef3c7" />

          {/* Ears */}
          <ellipse 
            cx="55" cy="70" rx="16" ry="30" fill="#b45309" 
            style={{ animation: 'bounceEar 1.2s ease-in-out infinite alternate' }}
          />
          <ellipse 
            cx="125" cy="70" rx="16" ry="30" fill="#b45309" 
            style={{ animation: 'bounceEar 1.2s ease-in-out 0.2s infinite alternate' }}
          />

          {/* Nose */}
          <ellipse cx="90" cy="90" rx="9" ry="6" fill="#1e293b" />

          {/* Eyes with twinkling spark */}
          <circle cx="76" cy="76" r="6" fill="#0f172a" />
          <circle cx="78" cy="74" r="2.5" fill="#ffffff" />
          
          <circle cx="104" cy="76" r="6" fill="#0f172a" />
          <circle cx="106" cy="74" r="2.5" fill="#ffffff" />

          {/* Happy Mouth & Tongue */}
          <path d="M 82 98 Q 90 106 98 98" stroke="#1e293b" strokeWidth="3" fill="none" />
          <path d="M 86 102 Q 90 114 94 102" fill="#f43f5e" />

          {/* Collar with Paw Charm */}
          <path d="M 62 110 Q 90 120 118 110" stroke="#f43f5e" strokeWidth="6" fill="none" />
          <circle cx="90" cy="116" r="6" fill="#fbbf24" />
        </svg>

        {/* Floating Heart Effect */}
        <Heart 
          size={16} 
          style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            color: '#f43f5e',
            fill: '#f43f5e',
            animation: 'floatHeart 2s infinite ease-in-out'
          }} 
        />
      </div>

      {/* Speech Bubble */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
          <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#ff7e67' }}>Pawly the Mascot</span>
          <span className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>
            <Sparkles size={10} /> Active Companion
          </span>
        </div>
        <p style={{ color: '#f8fafc', fontSize: '0.88rem', fontWeight: 500, margin: 0 }}>
          {message}
        </p>
      </div>
    </div>
  );
}
