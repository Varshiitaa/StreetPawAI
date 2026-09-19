import React from 'react';
import { Camera, Eye, Dna, Fingerprint, Stethoscope, Bot, LifeBuoy, Database, BarChart3, CheckCircle, ArrowRight } from 'lucide-react';

const AGENTS = [
  { id: 1, name: "Data Acquisition Agent", role: "Captures user image upload, GPS location & timestamp metadata.", icon: Camera, color: "#10b981", status: "Active" },
  { id: 2, name: "Vision Detection Agent", role: "YOLOv8 animal localization (Dog/Cat) & ROI extraction.", icon: Eye, color: "#06b6d4", status: "Active (YOLOv8)" },
  { id: 3, name: "Breed Identification Agent", role: "Extracts breed-specific visual features & classifies breed.", icon: Dna, color: "#8b5cf6", status: "Active" },
  { id: 4, name: "Animal Re-ID Agent", role: "Matches visual embeddings to retrieve existing Animal ID.", icon: Fingerprint, color: "#ec4899", status: "Active" },
  { id: 5, name: "Health Assessment Agent", role: "Detects visible skin infections, mange, wounds & severity.", icon: Stethoscope, color: "#f59e0b", status: "Active" },
  { id: 6, name: "LLM Medical Advisory", role: "Generates first-aid precautions & veterinary guidance.", icon: Bot, color: "#3b82f6", status: "Active" },
  { id: 7, name: "Rescue Coordination Agent", role: "Evaluates emergency priority & dispatches nearby NGO teams.", icon: LifeBuoy, color: "#ef4444", status: "Standby" },
  { id: 8, name: "Knowledge DB Agent", role: "Maintains centralized digital animal profile, history & GPS records.", icon: Database, color: "#10b981", status: "Active" },
  { id: 9, name: "Analytics & Intelligence", role: "Disease hotspot heatmaps & stray population analytics.", icon: BarChart3, color: "#6366f1", status: "Active" }
];

export default function MultiAgentWorkflow() {
  return (
    <div className="glass-panel" style={{ padding: '32px' }}>
      <div style={{ textAlign: 'center', maxWidth: '750px', margin: '0 auto 36px' }}>
        <span className="badge badge-emerald" style={{ marginBottom: '12px' }}>
          <CheckCircle size={12} /> DAYANANDA SAGAR UNIVERSITY MAJOR PROJECT ARCHITECTURE
        </span>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '8px' }}>
          Multi-Agent Collaborative AI Workflow
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>
          StreetPaw.AI coordinates 9 specialized autonomous AI agents working in unison to track, diagnose, and safeguard stray animals.
        </p>
      </div>

      {/* Grid of Agent Nodes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {AGENTS.map((agent) => {
          const IconComp = agent.icon;
          return (
            <div 
              key={agent.id} 
              style={{
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '22px',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.3s ease'
              }}
              className="glass-card-hover"
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: `${agent.color}20`,
                    border: `1px solid ${agent.color}40`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: agent.color
                  }}>
                    <IconComp size={22} />
                  </div>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.72rem',
                    color: agent.color,
                    background: `${agent.color}15`,
                    padding: '3px 10px',
                    borderRadius: '9999px',
                    border: `1px solid ${agent.color}30`
                  }}>
                    AGENT 0{agent.id}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>
                  {agent.name}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', lineHeight: '1.5' }}>
                  {agent.role}
                </p>
              </div>

              <div style={{ marginTop: '18px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Status:</span>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: agent.color, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="pulse-dot" style={{ backgroundColor: agent.color }}></span>
                  {agent.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
