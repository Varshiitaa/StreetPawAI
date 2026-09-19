import React from 'react';
import { PawPrint, Cpu, ShieldCheck, Activity, MapPin } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, apiStatus }) {
  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'rgba(9, 13, 22, 0.85)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
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
        {/* Brand Logo & Tagline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)',
            color: '#000'
          }}>
            <PawPrint size={28} strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }} className="gradient-text">
                STREETPAW.AI
              </h1>
              <span className="badge badge-emerald">v1.0 Vision Engine</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
              Multi-Agent AI Platform for Stray Animal Care & Welfare
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.03)', padding: '6px', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
          <button 
            className={`nav-tab ${activeTab === 'detect' ? 'active' : ''}`}
            onClick={() => setActiveTab('detect')}
          >
            <Cpu size={18} /> Animal Detection (YOLOv8)
          </button>
          <button 
            className={`nav-tab ${activeTab === 'pipeline' ? 'active' : ''}`}
            onClick={() => setActiveTab('pipeline')}
          >
            <Activity size={18} /> Multi-Agent AI Workflow
          </button>
          <button 
            className={`nav-tab ${activeTab === 'hotspot' ? 'active' : ''}`}
            onClick={() => setActiveTab('hotspot')}
          >
            <MapPin size={18} /> Stray Hotspot Map
          </button>
          <button 
            className={`nav-tab ${activeTab === 'vault' ? 'active' : ''}`}
            onClick={() => setActiveTab('vault')}
          >
            <ShieldCheck size={18} /> Digital Animal Vault
          </button>
        </nav>

        {/* Live System Status Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '9999px',
            background: apiStatus ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
            border: `1px solid ${apiStatus ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
            fontSize: '0.8rem',
            fontFamily: 'var(--font-mono)'
          }}>
            <span className="pulse-dot" style={{ backgroundColor: apiStatus ? '#10b981' : '#f59e0b' }}></span>
            <span style={{ color: apiStatus ? '#34d399' : '#fbbf24', fontWeight: 600 }}>
              {apiStatus ? 'AI MESH ONLINE' : 'SIMULATION MODE'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
