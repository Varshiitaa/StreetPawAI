import React from 'react';
import { MapPin, AlertCircle, ShieldCheck, Flame, Navigation } from 'lucide-react';

const DEMO_SIGHTINGS = [
  { id: "PAW-8492", animal: "Stray Dog (Indie)", lat: "12.9716° N", lng: "77.5946° E", location: "Koramangala 5th Block, Bengaluru", health: "Healthy", time: "10 mins ago", priority: "Low" },
  { id: "PAW-3105", animal: "Stray Cat (Tabby)", lat: "12.9250° N", lng: "77.5897° E", location: "Jayanagar 4th Block, Bengaluru", health: "Eye Infection", time: "32 mins ago", priority: "Medium" },
  { id: "PAW-9201", animal: "Stray Pup (Desi)", lat: "12.9081° N", lng: "77.6476° E", location: "HSR Layout Sector 2, Bengaluru", health: "Minor Leg Wound", time: "1 hour ago", priority: "High (Rescue Dispatched)" }
];

export default function HotspotMap() {
  return (
    <div className="glass-panel" style={{ padding: '28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <span className="badge badge-amber"><Flame size={12} /> REAL-TIME SIGHTING MAP</span>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '6px' }}>Stray Animal Sighting & Disease Hotspots</h2>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-secondary" style={{ fontSize: '0.8rem' }}><Navigation size={14} /> My Location</button>
          <button className="btn-primary" style={{ fontSize: '0.8rem' }}><MapPin size={14} /> Filter Hotspots</button>
        </div>
      </div>

      {/* Simulated Interactive Map Display */}
      <div style={{
        height: '380px',
        borderRadius: '16px',
        background: '#0d1322 url("https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=1200&auto=format&fit=crop") center/cover',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid var(--border-glow)'
      }}>
        {/* Dark overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(9, 13, 22, 0.75)', backdropFilter: 'blur(2px)' }} />

        {/* Hotspot Radar Pulse */}
        <div style={{
          position: 'absolute',
          top: '40%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '180px',
          height: '180px',
          borderRadius: '50%',
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          animation: 'pulseDot 3s infinite'
        }} />

        {/* Pin Markers */}
        {DEMO_SIGHTINGS.map((s, idx) => (
          <div key={idx} style={{
            position: 'absolute',
            top: idx === 0 ? '35%' : idx === 1 ? '55%' : '42%',
            left: idx === 0 ? '32%' : idx === 1 ? '68%' : '48%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(15, 23, 42, 0.9)',
            border: `2px solid ${s.priority.includes('High') ? '#ef4444' : s.priority.includes('Medium') ? '#f59e0b' : '#10b981'}`,
            borderRadius: '12px',
            padding: '8px 12px',
            color: '#fff',
            boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
            zIndex: 10
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 700 }}>
              <MapPin size={14} color={s.priority.includes('High') ? '#ef4444' : s.priority.includes('Medium') ? '#f59e0b' : '#10b981'} />
              {s.id} ({s.animal})
            </div>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{s.location}</span>
          </div>
        ))}
      </div>

      {/* Sighting List */}
      <div style={{ marginTop: '24px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '14px' }}>Recent Stray Animal Reports</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
          {DEMO_SIGHTINGS.map((item, idx) => (
            <div key={idx} style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#10b981' }}>{item.id}</span>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{item.time}</span>
              </div>
              <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.animal}</p>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{item.location}</p>
              <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <span>Health: <strong style={{ color: '#fbbf24' }}>{item.health}</strong></span>
                <span>Priority: <strong style={{ color: item.priority.includes('High') ? '#ef4444' : '#34d399' }}>{item.priority}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
