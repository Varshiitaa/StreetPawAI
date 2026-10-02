import React, { useState } from 'react';
import CuteDogMascot from './CuteDogMascot';
import { UploadCloud, Camera, CheckCircle2, Download, RefreshCw, Zap, Eye, AlertTriangle, User, Leaf, Heart, Sparkles } from 'lucide-react';

// Demo sample SVGs for testing species + human + plant
const SAMPLE_DOG = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'><rect width='600' height='400' fill='%231e293b'/><circle cx='300' cy='180' r='90' fill='%23d97706'/><polygon points='230,120 200,50 270,100' fill='%23b45309'/><polygon points='370,120 400,50 330,100' fill='%23b45309'/><circle cx='270' cy='170' r='12' fill='%23000'/><circle cx='330' cy='170' r='12' fill='%23000'/><text x='300' y='360' font-family='Arial' font-size='20' font-weight='bold' fill='%23ffffff' text-anchor='middle'>STRAY DOG SAMPLE PHOTO 🐾</text></svg>";

const SAMPLE_CAT = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'><rect width='600' height='400' fill='%230f172a'/><circle cx='300' cy='190' r='80' fill='%2394a3b8'/><polygon points='230,140 210,60 270,120' fill='%23475569'/><polygon points='370,140 390,60 330,120' fill='%23475569'/><ellipse cx='265' cy='180' rx='12' ry='16' fill='%2322c55e'/><ellipse cx='335' cy='180' rx='12' ry='16' fill='%2322c55e'/><text x='300' y='360' font-family='Arial' font-size='20' font-weight='bold' fill='%23ffffff' text-anchor='middle'>STRAY CAT SAMPLE PHOTO 🐱</text></svg>";

const SAMPLE_PIG = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'><rect width='600' height='400' fill='%23831843'/><ellipse cx='300' cy='200' rx='110' ry='80' fill='%23f472b6'/><ellipse cx='300' cy='220' rx='35' ry='25' fill='%23db2777'/><circle cx='290' cy='220' r='6' fill='%23831843'/><circle cx='310' cy='220' r='6' fill='%23831843'/><circle cx='250' cy='170' r='10' fill='%23000'/><circle cx='350' cy='170' r='10' fill='%23000'/><text x='300' y='360' font-family='Arial' font-size='20' font-weight='bold' fill='%23ffffff' text-anchor='middle'>STRAY PIG SAMPLE PHOTO 🐷</text></svg>";

const SAMPLE_PLANT = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'><rect width='600' height='400' fill='%23064e3b'/><ellipse cx='300' cy='220' rx='120' ry='120' fill='%2310b981'/><path d='M 300 100 Q 250 220 300 340 M 300 100 Q 350 220 300 340' stroke='%23047857' stroke-width='8'/><text x='300' y='360' font-family='Arial' font-size='20' font-weight='bold' fill='%23ffffff' text-anchor='middle'>PLANT / LEAF / FLOWER PHOTO 🌱</text></svg>";

const SAMPLE_HUMAN = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'><rect width='600' height='400' fill='%23312e81'/><circle cx='300' cy='150' r='60' fill='%23fed7aa'/><path d='M 180 340 C 180 230, 420 230, 420 340 Z' fill='%234338ca'/><text x='300' y='360' font-family='Arial' font-size='20' font-weight='bold' fill='%23ffffff' text-anchor='middle'>HUMAN / PERSON SAMPLE PHOTO 👤</text></svg>";

export default function DetectionCard({ onAnalyze, isAnalyzing, resultData, animalIdResult, resetDetection }) {
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
      case 'Plant': return { bg: 'rgba(34, 197, 94, 0.2)', text: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.4)', icon: '🌱' };
      case 'Human': return { bg: 'rgba(99, 102, 241, 0.2)', text: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.4)', icon: '👤' };
      case 'Dog': return { bg: 'rgba(16, 185, 129, 0.18)', text: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)', icon: '🐶' };
      case 'Cat': return { bg: 'rgba(6, 182, 212, 0.18)', text: '#38bdf8', border: '1px solid rgba(6, 182, 212, 0.4)', icon: '🐱' };
      case 'Pig': return { bg: 'rgba(236, 72, 153, 0.18)', text: '#f472b6', border: '1px solid rgba(236, 72, 153, 0.4)', icon: '🐷' };
      case 'Cow': return { bg: 'rgba(34, 197, 94, 0.18)', text: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.4)', icon: '🐮' };
      case 'Bull': return { bg: 'rgba(239, 68, 68, 0.18)', text: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)', icon: '🐂' };
      case 'Buffalo': return { bg: 'rgba(148, 163, 184, 0.18)', text: '#cbd5e1', border: '1px solid rgba(148, 163, 184, 0.4)', icon: '🐃' };
      case 'Donkey': return { bg: 'rgba(168, 85, 247, 0.18)', text: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.4)', icon: '🫏' };
      case 'Horse': return { bg: 'rgba(245, 158, 11, 0.18)', text: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.4)', icon: '🐴' };
      default: return { bg: 'rgba(245, 158, 11, 0.18)', text: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.4)', icon: '⚠️' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Cute Mascot Header Bar */}
      <CuteDogMascot 
        message={
          isAnalyzing 
            ? "Sniffing out the image with YOLOv8 & PyTorch... 🐾"
            : resultData 
            ? `Analysis complete! Found ${resultData.detections[0]?.species || 'species'}! 🐶`
            : "Drop any street photo here! I'll tell you if it's a dog, cat, pig, cow, human, or plant!"
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: resultData ? '1fr 1fr' : '1fr', gap: '28px' }}>
        {/* Upload & Input Panel */}
        <div className="glass-panel" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Camera size={24} style={{ color: '#ff7e67' }} /> Stray Animal Vision Scanner
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Upload any street photo to accurately identify stray animals & filter plants or humans.
              </p>
            </div>
            {selectedImagePreview && (
              <button className="btn-secondary" onClick={() => { setSelectedImagePreview(null); setSelectedFile(null); resetDetection(); }} style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
                <RefreshCw size={14} /> Clear
              </button>
            )}
          </div>

          {/* Pretty Drag and drop area */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`scan-container ${dragActive ? 'glass-card-glow' : ''}`}
            style={{
              border: `2px dashed ${dragActive ? '#ff7e67' : 'rgba(255, 126, 103, 0.3)'}`,
              borderRadius: '20px',
              padding: '36px 20px',
              textAlign: 'center',
              background: dragActive ? 'rgba(255, 126, 103, 0.12)' : 'rgba(18, 24, 38, 0.5)',
              cursor: 'pointer',
              position: 'relative',
              minHeight: '290px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'inset 0 0 20px rgba(0,0,0,0.3)'
            }}
          >
            {isAnalyzing && <div className="scan-laser" />}

            {selectedImagePreview ? (
              <div style={{ position: 'relative', width: '100%', maxHeight: '360px', overflow: 'hidden', borderRadius: '16px' }}>
                <img 
                  src={selectedImagePreview} 
                  alt="Uploaded Subject" 
                  style={{ width: '100%', maxHeight: '360px', objectFit: 'contain', borderRadius: '16px' }} 
                />
                {isAnalyzing && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(11, 15, 25, 0.75)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px'
                  }}>
                    <Zap size={38} style={{ color: '#ff7e67', animation: 'spin 1s linear infinite' }} />
                    <p style={{ fontWeight: 800, color: '#ff7e67', letterSpacing: '0.05em', fontSize: '1.05rem' }}>
                      PAWLY IS SCANNING PHOTO... 🐾
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  background: 'rgba(255, 126, 103, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                  color: '#ff7e67',
                  boxShadow: '0 0 20px rgba(255, 126, 103, 0.3)'
                }}>
                  <UploadCloud size={34} />
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>
                  Drag & Drop Photo Here 🐾
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
                  Select a photo of a stray dog, cat, pig, cow, donkey, or horse
                </p>
                <label className="btn-primary">
                  Choose Photo File
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
                style={{ width: '100%', padding: '15px', fontSize: '1.08rem' }}
              >
                {isAnalyzing ? (
                  <> <RefreshCw size={20} className="spin" /> Pawly is Analyzing... </>
                ) : (
                  <> <Sparkles size={20} /> Run AI Animal Vision Scan </>
                )}
              </button>
            )}

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Heart size={14} color="#ff7e67" fill="#ff7e67" /> QUICK SPECIES TEST SAMPLES:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                <button className="btn-secondary" onClick={() => loadSample(SAMPLE_DOG, 'Dog')} style={{ padding: '8px 4px', fontSize: '0.78rem', justifyContent: 'center' }}>🐶 Dog</button>
                <button className="btn-secondary" onClick={() => loadSample(SAMPLE_CAT, 'Cat')} style={{ padding: '8px 4px', fontSize: '0.78rem', justifyContent: 'center' }}>🐱 Cat</button>
                <button className="btn-secondary" onClick={() => loadSample(SAMPLE_PIG, 'Pig')} style={{ padding: '8px 4px', fontSize: '0.78rem', justifyContent: 'center' }}>🐷 Pig</button>
                <button className="btn-secondary" onClick={() => loadSample(SAMPLE_PLANT, 'Plant')} style={{ padding: '8px 4px', fontSize: '0.78rem', justifyContent: 'center' }}>🌱 Plant</button>
                <button className="btn-secondary" onClick={() => loadSample(SAMPLE_HUMAN, 'Human')} style={{ padding: '8px 4px', fontSize: '0.78rem', justifyContent: 'center' }}>👤 Human</button>
              </div>
            </div>
          </div>
        </div>

        {/* Detection Results Output Panel */}
        {resultData && (
          <div className="glass-panel glass-card-glow" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span className="badge badge-coral">
                  <CheckCircle2 size={12} /> VISION SCAN RESULT
                </span>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '6px' }}>
                  Classification Output
                </h2>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Scan Speed</span>
                <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#ff7e67' }}>
                  {resultData.processing_time_ms} ms
                </p>
              </div>
            </div>

            {/* Annotated Image Preview */}
            <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255, 126, 103, 0.4)', background: '#000', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
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
                  background: 'rgba(18, 24, 38, 0.8)',
                  borderRadius: '18px',
                  padding: '20px',
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
                      padding: '7px 18px',
                      borderRadius: '9999px',
                      fontWeight: 800,
                      fontSize: '0.98rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                    }}>
                      <span>{badgeStyle.icon}</span> {det.species.toUpperCase()} DETECTED
                    </div>
                    {det.confidence > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Confidence:</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#34d399', fontSize: '1.15rem' }}>
                          {det.confidence}%
                        </span>
                      </div>
                    )}
                  </div>

                  {det.is_plant ? (
                    <div style={{ padding: '14px', borderRadius: '14px', background: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                      <p style={{ color: '#4ade80', fontWeight: 700, fontSize: '0.95rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Leaf size={18} /> Plant / Foliage Detected (No Animal)
                      </p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '4px' }}>
                        The image contains plants, leaves, or greenery. No stray animal was found in this photo.
                      </p>
                    </div>
                  ) : det.is_human ? (
                    <div style={{ padding: '14px', borderRadius: '14px', background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                      <p style={{ color: '#a5b4fc', fontWeight: 700, fontSize: '0.95rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <User size={18} /> Human / Person Detected
                      </p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '4px' }}>
                        The image contains a Human/Person. StreetPaw.AI correctly differentiates humans from stray animals.
                      </p>
                    </div>
                  ) : det.is_animal ? (
                    <div style={{ display: 'grid', gridTemplateColumns: det.roi_crop ? '110px 1fr' : '1fr', gap: '16px', alignItems: 'center' }}>
                      {det.roi_crop && (
                        <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255, 126, 103, 0.3)', background: '#000', width: '110px', height: '110px' }}>
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
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Identified Animal:</span>
                          <p style={{ fontWeight: 700, color: badgeStyle.text, fontSize: '1rem', marginTop: '2px' }}>
                            {det.species} (Confirmed Stray Animal)
                          </p>
                          {animalIdResult && det.species === 'Dog' && (
  <div style={{
    marginTop: '14px',
    padding: '14px',
    borderRadius: '14px',
    background: 'rgba(59, 130, 246, 0.12)',
    border: '1px solid rgba(59, 130, 246, 0.3)'
  }}>
    <p style={{
      color: '#60a5fa',
      fontWeight: 800,
      fontSize: '0.95rem',
      margin: 0
    }}>
      🆔 Animal ID: {animalIdResult.animal_id}
    </p>

    <p style={{
      color: 'var(--text-muted)',
      fontSize: '0.82rem',
      marginTop: '6px'
    }}>
       {(animalIdResult.similarity * 100).toFixed(2)}%
    </p>

    <p style={{
      color: animalIdResult.is_unknown ? '#fbbf24' : '#34d399',
      fontWeight: 700,
      fontSize: '0.82rem',
      marginTop: '4px'
    }}>
      {animalIdResult.is_unknown ? 'Unknown / New Animal' : 'Known Animal'}
    </p>
  </div>
)}
                          
                        </div>
                      </div>
                    </div>
                  ) : (
               <div style={{ padding: '12px 16px', borderRadius: '12px', background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
                      <p style={{ color: '#fbbf24', fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>
                        ⚠️ {det.message}
                      </p>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
                    <button 
                      className="btn-primary" 
                      style={{ width: '100%', padding: '10px', fontSize: '0.85rem', justifyContent: 'center' }}
                      onClick={() => {
                        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(resultData, null, 2));
                        const downloadAnchor = document.createElement('a');
                        downloadAnchor.setAttribute("href", dataStr);
                        downloadAnchor.setAttribute("download", `paw_analysis_${det.species.toLowerCase()}_${Date.now()}.json`);
                        document.body.appendChild(downloadAnchor);
                        downloadAnchor.click();
                        downloadAnchor.remove();
                      }}
                    >
                      <Download size={14} /> Download Analysis Report (.JSON)
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
