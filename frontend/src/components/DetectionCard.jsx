import React, { useState } from 'react';
import { UploadCloud, Camera, CheckCircle2, Download, RefreshCw, Zap, Eye, AlertTriangle, Tag } from 'lucide-react';

// Demo sample SVGs for testing all supported species
const SAMPLE_DOG = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'><rect width='600' height='400' fill='%231e293b'/><circle cx='300' cy='180' r='90' fill='%23d97706'/><polygon points='230,120 200,50 270,100' fill='%23b45309'/><polygon points='370,120 400,50 330,100' fill='%23b45309'/><circle cx='270' cy='170' r='12' fill='%23000'/><circle cx='330' cy='170' r='12' fill='%23000'/><text x='300' y='360' font-family='Arial' font-size='20' font-weight='bold' fill='%23ffffff' text-anchor='middle'>STRAY DOG SAMPLE PHOTO</text></svg>";

const SAMPLE_CAT = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'><rect width='600' height='400' fill='%230f172a'/><circle cx='300' cy='190' r='80' fill='%2394a3b8'/><polygon points='230,140 210,60 270,120' fill='%23475569'/><polygon points='370,140 390,60 330,120' fill='%23475569'/><ellipse cx='265' cy='180' rx='12' ry='16' fill='%2322c55e'/><ellipse cx='335' cy='180' rx='12' ry='16' fill='%2322c55e'/><text x='300' y='360' font-family='Arial' font-size='20' font-weight='bold' fill='%23ffffff' text-anchor='middle'>STRAY CAT SAMPLE PHOTO</text></svg>";

const SAMPLE_PIG = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'><rect width='600' height='400' fill='%23831843'/><ellipse cx='300' cy='200' rx='110' ry='80' fill='%23f472b6'/><ellipse cx='300' cy='220' rx='35' ry='25' fill='%23db2777'/><circle cx='290' cy='220' r='6' fill='%23831843'/><circle cx='310' cy='220' r='6' fill='%23831843'/><circle cx='250' cy='170' r='10' fill='%23000'/><circle cx='350' cy='170' r='10' fill='%23000'/><text x='300' y='360' font-family='Arial' font-size='20' font-weight='bold' fill='%23ffffff' text-anchor='middle'>STRAY PIG SAMPLE PHOTO</text></svg>";

const SAMPLE_COW = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'><rect width='600' height='400' fill='%2314532d'/><ellipse cx='300' cy='200' rx='130' ry='90' fill='%23f8fafc'/><circle cx='240' cy='180' r='30' fill='%230f172a'/><circle cx='340' cy='230' r='25' fill='%230f172a'/><text x='300' y='360' font-family='Arial' font-size='20' font-weight='bold' fill='%23ffffff' text-anchor='middle'>STRAY COW SAMPLE PHOTO</text></svg>";

const SAMPLE_DONKEY = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'><rect width='600' height='400' fill='%23581c87'/><ellipse cx='300' cy='210' rx='90' ry='70' fill='%2394a3b8'/><polygon points='230,150 200,30 260,120' fill='%2364748b'/><polygon points='370,150 400,30 340,120' fill='%2364748b'/><text x='300' y='360' font-family='Arial' font-size='20' font-weight='bold' fill='%23ffffff' text-anchor='middle'>STRAY DONKEY SAMPLE PHOTO</text></svg>";

const SAMPLE_OTHER = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'><rect width='600' height='400' fill='%23334155'/><rect x='150' y='180' width='300' height='120' rx='10' fill='%2364748b'/><circle cx='220' cy='300' r='30' fill='%230f172a'/><circle cx='380' cy='300' r='30' fill='%230f172a'/><text x='300' y='360' font-family='Arial' font-size='18' font-weight='bold' fill='%23ffffff' text-anchor='middle'>CAR / OBJECT (NEITHER ANIMAL)</text></svg>";

export default function DetectionCard({ onAnalyze, isAnalyzing, resultData, resetDetection }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedImagePreview, setSelectedImagePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file) => {
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const loadSample = (sampleData, species) => {
    fetch(sampleData)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], `${species.toLowerCase()}_sample.svg`, { type: 'image/svg+xml' });
        setSelectedFile(file);
        setSelectedImagePreview(sampleData);
      });
  };

  const handleRunDetection = () => {
    if (selectedFile) {
      onAnalyze(selectedFile);
    }
  };

  const getSpeciesBadgeStyle = (species) => {
    switch (species) {
      case 'Dog': return { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', icon: '🐶' };
      case 'Cat': return { bg: 'rgba(6, 182, 212, 0.15)', text: '#38bdf8', border: '1px solid rgba(6, 182, 212, 0.3)', icon: '🐱' };
      case 'Pig': return { bg: 'rgba(236, 72, 153, 0.15)', text: '#f472b6', border: '1px solid rgba(236, 72, 153, 0.3)', icon: '🐷' };
      case 'Cow': return { bg: 'rgba(34, 197, 94, 0.15)', text: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.3)', icon: '🐮' };
      case 'Bull': return { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', icon: '🐂' };
      case 'Buffalo': return { bg: 'rgba(148, 163, 184, 0.15)', text: '#cbd5e1', border: '1px solid rgba(148, 163, 184, 0.3)', icon: '🐃' };
      case 'Donkey': return { bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)', icon: '🫏' };
      case 'Horse': return { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)', icon: '🐴' };
      default: return { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)', icon: '⚠️' };
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: resultData ? '1fr 1fr' : '1fr', gap: '28px' }}>
      {/* Upload & Input Panel */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Camera size={24} style={{ color: '#10b981' }} /> Multi-Species Animal Detection
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Detects: <strong>Dog, Cat, Cow, Bull, Buffalo, Pig, Donkey, Horse</strong>.
            </p>
          </div>
          {selectedImagePreview && (
            <button className="btn-secondary" onClick={() => { setSelectedImagePreview(null); setSelectedFile(null); resetDetection(); }} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
              <RefreshCw size={14} /> Clear
            </button>
          )}
        </div>

        {/* Drag and drop area */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`scan-container ${dragActive ? 'glass-card-glow' : ''}`}
          style={{
            border: `2px dashed ${dragActive ? '#10b981' : 'rgba(255, 255, 255, 0.15)'}`,
            borderRadius: '16px',
            padding: '32px 20px',
            textAlign: 'center',
            background: dragActive ? 'rgba(16, 185, 129, 0.08)' : 'rgba(15, 23, 42, 0.4)',
            cursor: 'pointer',
            position: 'relative',
            minHeight: '280px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {isAnalyzing && <div className="scan-laser" />}

          {selectedImagePreview ? (
            <div style={{ position: 'relative', width: '100%', maxHeight: '360px', overflow: 'hidden', borderRadius: '12px' }}>
              <img 
                src={selectedImagePreview} 
                alt="Uploaded Animal" 
                style={{ width: '100%', maxHeight: '360px', objectFit: 'contain', borderRadius: '12px' }} 
              />
              {isAnalyzing && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(9, 13, 22, 0.65)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px'
                }}>
                  <Zap size={36} style={{ color: '#10b981', animation: 'spin 1s linear infinite' }} />
                  <p style={{ fontWeight: 700, color: '#34d399', letterSpacing: '0.05em' }}>ANALYZING ANIMAL SPECIES...</p>
                </div>
              )}
            </div>
          ) : (
            <>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
                color: '#10b981'
              }}>
                <UploadCloud size={32} />
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '6px' }}>
                Upload Any Animal Photo
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '18px' }}>
                Accurately classifies Dog, Cat, Pig, Cow, Bull, Buffalo, Donkey, Horse
              </p>
              <label className="btn-primary">
                Choose Image File
                <input type="file" accept="image/*" onChange={handleChange} style={{ display: 'none' }} />
              </label>
            </>
          )}
        </div>

        {/* Action Button & Demo Buttons */}
        <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {selectedImagePreview && (
            <button 
              className="btn-primary" 
              onClick={handleRunDetection} 
              disabled={isAnalyzing}
              style={{ width: '100%', padding: '14px', fontSize: '1.05rem' }}
            >
              {isAnalyzing ? (
                <> <RefreshCw size={20} className="spin" /> Executing Vision Classifier... </>
              ) : (
                <> <Zap size={20} /> Detect Animal Species </>
              )}
            </button>
          )}

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 600 }}>
              QUICK SPECIES DEMOS:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              <button className="btn-secondary" onClick={() => loadSample(SAMPLE_DOG, 'Dog')} style={{ padding: '6px', fontSize: '0.75rem' }}>🐶 Dog</button>
              <button className="btn-secondary" onClick={() => loadSample(SAMPLE_CAT, 'Cat')} style={{ padding: '6px', fontSize: '0.75rem' }}>🐱 Cat</button>
              <button className="btn-secondary" onClick={() => loadSample(SAMPLE_PIG, 'Pig')} style={{ padding: '6px', fontSize: '0.75rem' }}>🐷 Pig</button>
              <button className="btn-secondary" onClick={() => loadSample(SAMPLE_COW, 'Cow')} style={{ padding: '6px', fontSize: '0.75rem' }}>🐮 Cow</button>
              <button className="btn-secondary" onClick={() => loadSample(SAMPLE_DONKEY, 'Donkey')} style={{ padding: '6px', fontSize: '0.75rem' }}>🫏 Donkey</button>
              <button className="btn-secondary" onClick={() => loadSample(SAMPLE_OTHER, 'Other')} style={{ padding: '6px', fontSize: '0.75rem' }}>⚠️ Neither</button>
            </div>
          </div>
        </div>
      </div>

      {/* Detection Results Output Panel */}
      {resultData && (
        <div className="glass-panel glass-card-glow" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span className="badge badge-emerald">
                <CheckCircle2 size={12} /> ANIMAL SPECIES ANALYZED
              </span>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginTop: '6px' }}>
                Detection Results
              </h2>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Latency</span>
              <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#34d399' }}>
                {resultData.processing_time_ms} ms
              </p>
            </div>
          </div>

          {/* Annotated Image Preview */}
          <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(16, 185, 129, 0.4)', background: '#000' }}>
            <img 
              src={resultData.annotated_image} 
              alt="YOLOv8 Detection Result" 
              style={{ width: '100%', maxHeight: '320px', objectFit: 'contain' }}
            />
          </div>

          {/* Detections */}
          {resultData.detections && resultData.detections.map((det, index) => {
            const badgeStyle = getSpeciesBadgeStyle(det.species);
            return (
              <div key={index} style={{
                background: 'rgba(15, 23, 42, 0.7)',
                borderRadius: '14px',
                padding: '18px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{
                    background: badgeStyle.bg,
                    color: badgeStyle.text,
                    border: badgeStyle.border,
                    padding: '6px 16px',
                    borderRadius: '9999px',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span>{badgeStyle.icon}</span> {det.species.toUpperCase()} DETECTED
                  </div>
                  {det.is_animal && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Confidence:</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#34d399', fontSize: '1.1rem' }}>
                        {det.confidence}%
                      </span>
                    </div>
                  )}
                </div>

                {det.is_animal ? (
                  <div style={{ display: 'grid', gridTemplateColumns: det.roi_crop ? '110px 1fr' : '1fr', gap: '16px', alignItems: 'center' }}>
                    {det.roi_crop && (
                      <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.2)', background: '#000', width: '110px', height: '110px' }}>
                        <img src={det.roi_crop} alt="Cropped ROI" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <span style={{ display: 'block', fontSize: '0.65rem', textAlign: 'center', background: 'rgba(0,0,0,0.85)', color: '#94a3b8', fontWeight: 600 }}>CROPPED ROI</span>
                      </div>
                    )}
                    <div>
                      <div style={{ marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bounding Box Coordinates:</span>
                        <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#f8fafc', fontSize: '0.9rem', marginTop: '2px' }}>
                          [{det.bbox.join(', ')}]
                        </p>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Species Identified:</span>
                        <p style={{ fontWeight: 600, color: badgeStyle.text, fontSize: '0.95rem', marginTop: '2px' }}>
                          {det.species} (Confirmed Stray Animal)
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                    <p style={{ color: '#fbbf24', fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>
                      ⚠️ {det.message}
                    </p>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                  <button 
                    className="btn-primary" 
                    style={{ width: '100%', padding: '8px', fontSize: '0.82rem', justifyContent: 'center' }}
                    onClick={() => {
                      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(resultData, null, 2));
                      const downloadAnchor = document.createElement('a');
                      downloadAnchor.setAttribute("href", dataStr);
                      downloadAnchor.setAttribute("download", `animal_detection_${det.species.toLowerCase()}_${Date.now()}.json`);
                      document.body.appendChild(downloadAnchor);
                      downloadAnchor.click();
                      downloadAnchor.remove();
                    }}
                  >
                    <Download size={14} /> Download Detection Data (.JSON)
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
