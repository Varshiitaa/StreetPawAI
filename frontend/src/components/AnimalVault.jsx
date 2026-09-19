import React from 'react';
import { ShieldCheck, Syringe, Scissors, Calendar, CheckCircle2, Search, Heart } from 'lucide-react';

const RE_ID_PROFILES = [
  { id: "PAW-8492", name: "Sheru", species: "Dog (Indie)", breed: "Indian Pariah", vax: "Rabies Done", sterilization: "Sterilized (Ear Notch)", status: "Active Care", sightings: 4 },
  { id: "PAW-3105", name: "Manoo", species: "Cat (Tabby)", breed: "Domestic Short Hair", vax: "Pending", sterilization: "Not Sterilized", status: "Under Observation", sightings: 2 },
  { id: "PAW-9201", name: "Brownie", species: "Dog (Pupi)", breed: "Street Mongrel", vax: "Core Done", sterilization: "Puppy (<6 Mo)", status: "Rescue Clinic", sightings: 1 }
];

export default function AnimalVault() {
  return (
    <div className="glass-panel" style={{ padding: '28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <span className="badge badge-emerald"><ShieldCheck size={12} /> RE-IDENTIFICATION & KNOWLEDGE VAULT</span>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '6px' }}>Digital Stray Animal Profiles</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '6px 12px', border: '1px solid var(--border-color)' }}>
          <Search size={16} style={{ color: '#94a3b8', marginRight: '8px' }} />
          <input type="text" placeholder="Search Animal ID / Breed..." style={{ background: 'transparent', border: 'none', color: '#fff', outline: 'none', fontSize: '0.85rem' }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {RE_ID_PROFILES.map((prof, idx) => (
          <div key={idx} style={{ background: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#34d399', fontSize: '1.05rem' }}>{prof.id}</span>
              <span className="badge badge-emerald">{prof.status}</span>
            </div>

            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>{prof.name} ({prof.species})</h3>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '14px' }}>Breed: {prof.breed}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Syringe size={16} color="#10b981" /> Vaccination: <strong style={{ color: '#fff' }}>{prof.vax}</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Scissors size={16} color="#06b6d4" /> Sterilization: <strong style={{ color: '#fff' }}>{prof.sterilization}</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={16} color="#f59e0b" /> Total Sightings Recorded: <strong style={{ color: '#fff' }}>{prof.sightings} times</strong>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
