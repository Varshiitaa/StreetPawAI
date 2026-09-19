import React, { useState } from 'react';
import { UploadCloud, Camera, CheckCircle2, Download, RefreshCw, Zap, Eye, ShieldAlert, Heart, Tag, MapPin } from 'lucide-react';

// Built-in sample test images
const SAMPLE_DOG_DATA = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'><rect width='600' height='400' fill='%231e293b'/><circle cx='300' cy='180' r='90' fill='%23d97706'/><polygon points='230,120 200,50 270,100' fill='%23b45309'/><polygon points='370,120 400,50 330,100' fill='%23b45309'/><circle cx='270' cy='170' r='12' fill='%23000'/><circle cx='330' cy='170' r='12' fill='%23000'/><ellipse cx='300' cy='210' rx='25' ry='18' fill='%2378350f'/><path d='M 285 225 Q 300 245 315 225' stroke='%23ef4444' stroke-width='6' fill='none'/><rect x='150' y='250' width='300' height='120' rx='20' fill='%23d97706'/><text x='300' y='360' font-family='Arial' font-size='20' font-weight='bold' fill='%23ffffff' text-anchor='middle'>STRAY DOG SAMPLE PHOTO</text></svg>";

const SAMPLE_CAT_DATA = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'><rect width='600' height='400' fill='%230f172a'/><circle cx='300' cy='190' r='80' fill='%2394a3b8'/><polygon points='230,140 210,60 270,120' fill='%23475569'/><polygon points='370,140 390,60 330,120' fill='%23475569'/><ellipse cx='265' cy='180' rx='12' ry='16' fill='%2322c55e'/><ellipse cx='335' cy='180' rx='12' ry='16' fill='%2322c55e'/><polygon points='300,200 290,215 310,215' fill='%23f43f5e'/><path d='M 230 195 L 160 190 M 230 205 L 160 210 M 370 195 L 440 190 M 370 205 L 440 210' stroke='%23cbd5e1' stroke-width='3'/><text x='300' y='360' font-family='Arial' font-size='20' font-weight='bold' fill='%23ffffff' text-anchor='middle'>STRAY CAT SAMPLE PHOTO</text></svg>";

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
        const file = new File([blob], `sample_${species.toLowerCase()}.svg`, { type: 'image/svg+xml' });
        setSelectedFile(file);
        setSelectedImagePreview(sampleData);
      });
  };

  const handleRunDetection = () => {
    if (selectedFile) {
      onAnalyze(selectedFile);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: resultData ? '1fr 1fr' : '1fr', gap: '28px' }}>
      {/* Upload & Input Panel */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Camera size={24} style={{ color: '#10b981' }} /> Step 1: Detect Animal (Dog / Cat)
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Upload any photo of a dog or cat to run real-time YOLOv8 bounding box detection.
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
                alt="Uploaded Stray Animal" 
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
                  <p style={{ fontWeight: 700, color: '#34d399', letterSpacing: '0.05em' }}>DETECTING ANIMAL (DOG / CAT)...</p>
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
                Drag & Drop Photo Here to Detect Animal
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '18px' }}>
                Supports JPG, PNG, WEBP files
              </p>
              <label className="btn-primary">
                Upload Animal Photo
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
                <> <RefreshCw size={20} className="spin" /> Executing Animal Detection... </>
              ) : (
                <> <Zap size={20} /> Detect Dog / Cat </>
              )}
            </button>
          )}

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 600 }}>
              TEST WITH DEMO PHOTOS:
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                className="btn-secondary" 
                onClick={() => loadSample(SAMPLE_DOG_DATA, 'Dog')}
                style={{ flex: 1, padding: '8px 12px', fontSize: '0.82rem' }}
              >
                <Eye size={14} style={{ color: '#10b981' }} /> Dog Photo Demo
              </button>
              <button 
                className="btn-secondary" 
                onClick={() => loadSample(SAMPLE_CAT_DATA, 'Cat')}
                style={{ flex: 1, padding: '8px 12px', fontSize: '0.82rem' }}
              >
                <Eye size={14} style={{ color: '#06b6d4' }} /> Cat Photo Demo
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Detection Results Output Panel */}
      {resultData && (
        <div className="glass-panel glass-card-glow" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header Badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span className="badge badge-emerald">
                <CheckCircle2 size={12} /> ANIMAL DETECTED
              </span>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginTop: '6px' }}>
                Detection Results
              </h2>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Detection Time</span>
              <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#34d399' }}>
                {resultData.processing_time_ms} ms
              </p>
            </div>
          </div>

          {/* Annotated Image Preview with Bounding Boxes */}
          <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(16, 185, 129, 0.4)', background: '#000' }}>
            <img 
              src={resultData.annotated_image} 
              alt="YOLOv8 Detection Result" 
              style={{ width: '100%', maxHeight: '320px', objectFit: 'contain' }}
            />
          </div>

          {/* Detection Items */}
          {resultData.detections && resultData.detections.map((det, index) => (
            <div key={index} style={{
              background: 'rgba(15, 23, 42, 0.7)',
              borderRadius: '14px',
              padding: '18px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}>
              {/* Species & ID Row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className={`badge ${det.species === 'Dog' ? 'badge-emerald' : 'badge-cyan'}`} style={{ fontSize: '0.95rem', padding: '6px 16px' }}>
                    {det.species.toUpperCase()} DETECTED
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#f8fafc', fontSize: '0.85rem' }}>
                    ID: {det.animal_id}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Confidence:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#34d399', fontSize: '1.1rem' }}>
                    {det.confidence}%
                  </span>
                </div>
              </div>

              {/* Crop ROI Preview & Bounding Box Details */}
              <div style={{ display: 'grid', gridTemplateColumns: det.roi_crop ? '110px 1fr' : '1fr', gap: '16px', alignItems: 'center' }}>
                {det.roi_crop && (
                  <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.2)', background: '#000', width: '110px', height: '110px' }}>
                    <img src={det.roi_crop} alt="Cropped ROI" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <span style={{ display: 'block', fontSize: '0.65rem', textAlign: 'center', background: 'rgba(0,0,0,0.85)', color: '#94a3b8', fontWeight: 600 }}>CROPPED ROI</span>
                  </div>
                )}
                <div>
                  <div style={{ marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bounding Box Bounding Coordinates:</span>
                    <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#f8fafc', fontSize: '0.9rem', marginTop: '2px' }}>
                      [{det.bbox.join(', ')}]
                    </p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status:</span>
                    <p style={{ fontWeight: 600, color: '#34d399', fontSize: '0.88rem', marginTop: '2px' }}>
                      Animal Identified Successfully (Step 1 Complete)
                    </p>
                  </div>
                </div>
              </div>

              {/* Download & Save Buttons */}
              <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                <button 
                  className="btn-secondary" 
                  style={{ flex: 1, padding: '8px', fontSize: '0.82rem' }}
                  onClick={() => alert(`Detection Record ${det.animal_id} saved!`)}
                >
                  <Tag size={14} style={{ color: '#10b981' }} /> Save Sighting ID
                </button>
                <button 
                  className="btn-primary" 
                  style={{ flex: 1, padding: '8px', fontSize: '0.82rem' }}
                  onClick={() => {
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(resultData, null, 2));
                    const downloadAnchor = document.createElement('a');
                    downloadAnchor.setAttribute("href", dataStr);
                    downloadAnchor.setAttribute("download", `animal_detection_${det.animal_id}.json`);
                    document.body.appendChild(downloadAnchor);
                    downloadAnchor.click();
                    downloadAnchor.remove();
                  }}
                >
                  <Download size={14} /> Download Detection Data
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
