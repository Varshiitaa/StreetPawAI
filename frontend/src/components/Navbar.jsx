import React from 'react';
import { PawPrint, Cpu, ShieldCheck, Activity, MapPin, Heart } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, apiStatus }) {
  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'rgba(11, 15, 25, 0.88)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255, 126, 103, 0.15)',
      padding: '16px 32px'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        {/* Cute Brand Logo & Tagline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }} onClick={() => setActiveTab('detect')}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #ff7e67 0%, #10b981 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 25px rgba(255, 126, 103, 0.45)',
            color: '#fff',
            animation: 'pawFloat 3s infinite ease-in-out'
          }}>
            <PawPrint size={28} strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0 }} className="gradient-text">
                STREETPAW.AI 🐾
              </h1>
              <span className="badge badge-coral">v2.0 Vision Engine</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
              Stray Animal Care & Welfare Platform <Heart size={12} fill="#ff7e67" color="#ff7e67" />
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.04)', padding: '6px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
          <button 
            className={`nav-tab ${activeTab === 'detect' ? 'active' : ''}`}
            onClick={() => setActiveTab('detect')}
          >
            <Cpu size={18} /> Animal Detector
          </button>
          <button 
            className={`nav-tab ${activeTab === 'pipeline' ? 'active' : ''}`}
            onClick={() => setActiveTab('pipeline')}
          >
            <Activity size={18} /> AI Pipeline
          </button>
          <button 
            className={`nav-tab ${activeTab === 'hotspot' ? 'active' : ''}`}
            onClick={() => setActiveTab('hotspot')}
          >
            <MapPin size={18} /> Stray Map
          </button>
          <button 
            className={`nav-tab ${activeTab === 'vault' ? 'active' : ''}`}
            onClick={() => setActiveTab('vault')}
          >
            <ShieldCheck size={18} /> Animal Vault
          </button>
        </nav>

        {/* Live System Status Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '7px 16px',
            borderRadius: '9999px',
            background: apiStatus ? 'rgba(16, 185, 129, 0.15)' : 'rgba(251, 191, 36, 0.15)',
            border: `1px solid ${apiStatus ? 'rgba(16, 185, 129, 0.4)' : 'rgba(251, 191, 36, 0.4)'}`,
            fontSize: '0.8rem',
            fontFamily: 'var(--font-mono)'
          }}>
            <span className="pulse-dot" style={{ backgroundColor: apiStatus ? '#10b981' : '#fbbf24' }}></span>
            <span style={{ color: apiStatus ? '#34d399' : '#fbbf24', fontWeight: 700 }}>
              {apiStatus ? 'AI MESH ONLINE 🐾' : 'LOCAL ENGINE READY'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
