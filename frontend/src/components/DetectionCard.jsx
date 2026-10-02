import React, { useState, useRef } from 'react';
import CuteDogMascot from './CuteDogMascot';
import { UploadCloud, Camera, CheckCircle2, Download, RefreshCw, Zap, Eye, AlertTriangle, User, Leaf, Heart, Sparkles, Activity, ShieldAlert, Stethoscope, ZoomIn, ZoomOut, Move, RotateCcw, Target } from 'lucide-react';

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
  
  // Interactive Zoom & Lesion Crop State
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imgRef = useRef(null);
  const viewportRef = useRef(null);

  const resetZoom = () => {
    setZoomLevel(1.0);
    setPanPosition({ x: 0, y: 0 });
  };

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
    resetZoom();
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const loadSample = (sampleData, species) => {
    resetZoom();
    fetch(sampleData)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], `${species.toLowerCase()}_sample.svg`, { type: 'image/svg+xml' });
        setSelectedFile(file);
        setSelectedImagePreview(sampleData);
      });
  };

  const handleMouseDown = (e) => {
    if (zoomLevel < 1.25) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || zoomLevel < 1.25) return;
    e.preventDefault();
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    const maxPan = 280 * (zoomLevel - 1);
    setPanPosition({
      x: Math.max(-maxPan, Math.min(maxPan, newX)),
      y: Math.max(-maxPan, Math.min(maxPan, newY))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    if (zoomLevel < 1.25 || !e.touches[0]) return;
    setIsDragging(true);
    setDragStart({ x: e.touches[0].clientX - panPosition.x, y: e.touches[0].clientY - panPosition.y });
  };

  const handleTouchMove = (e) => {
    if (!isDragging || zoomLevel < 1.25 || !e.touches[0]) return;
    const newX = e.touches[0].clientX - dragStart.x;
    const newY = e.touches[0].clientY - dragStart.y;
    const maxPan = 280 * (zoomLevel - 1);
    setPanPosition({
      x: Math.max(-maxPan, Math.min(maxPan, newX)),
      y: Math.max(-maxPan, Math.min(maxPan, newY))
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const extractCroppedRegion = () => {
    return new Promise((resolve) => {
      const img = imgRef.current;
      const viewport = viewportRef.current;
      if (!img || !viewport) {
        resolve(selectedFile);
        return;
      }

      const canvas = document.createElement('canvas');
      const targetSize = 640;
      canvas.width = targetSize;
      canvas.height = targetSize;
      const ctx = canvas.getContext('2d');

      const naturalW = img.naturalWidth || img.width;
      const naturalH = img.naturalHeight || img.height;
      const vRect = viewport.getBoundingClientRect();
      const contW = vRect.width;
      const contH = vRect.height;

      const aspect = naturalW / naturalH;
      let dispW, dispH;
      if (aspect > contW / contH) {
        dispW = contW;
        dispH = contW / aspect;
      } else {
        dispH = contH;
        dispW = contH * aspect;
      }

      const cropW = naturalW / zoomLevel;
      const cropH = naturalH / zoomLevel;

      const pxPerDispX = naturalW / (dispW * zoomLevel);
      const pxPerDispY = naturalH / (dispH * zoomLevel);

      const centerX = (naturalW / 2) - (panPosition.x * pxPerDispX);
      const centerY = (naturalH / 2) - (panPosition.y * pxPerDispY);

      const srcX = Math.max(0, Math.min(naturalW - cropW, centerX - cropW / 2));
      const srcY = Math.max(0, Math.min(naturalH - cropH, centerY - cropH / 2));
      const srcW = Math.min(cropW, naturalW - srcX);
      const srcH = Math.min(cropH, naturalH - srcY);

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, targetSize, targetSize);
      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, targetSize, targetSize);

      canvas.toBlob((blob) => {
        if (blob) {
          const originalName = selectedFile?.name || 'photo.jpg';
          const newName = originalName.replace(/\.[^/.]+$/, "") + "_zoomed_lesion.jpg";
          const file = new File([blob], newName, { type: 'image/jpeg' });
          resolve(file);
        } else {
          resolve(selectedFile);
        }
      }, 'image/jpeg', 0.95);
    });
  };

  const handleRunDetection = async () => {
    if (!selectedFile) return;

    if (zoomLevel >= 1.25 && imgRef.current && viewportRef.current) {
      try {
        const cropped = await extractCroppedRegion();
        if (cropped) {
          onAnalyze(cropped);
          return;
        }
      } catch (err) {
        console.warn("Zoom crop extraction error, fallback to original:", err);
      }
    }
    onAnalyze(selectedFile);
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
              <div 
                ref={viewportRef}
                id="image-scanner-box"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '360px',
                  maxHeight: '360px',
                  overflow: 'hidden',
                  borderRadius: '16px',
                  background: '#090d16',
                  cursor: zoomLevel >= 1.25 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                  userSelect: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <img 
                  ref={imgRef}
                  src={selectedImagePreview} 
                  alt="Uploaded Subject" 
                  draggable={false}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomLevel})`,
                    transformOrigin: 'center center',
                    transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                    pointerEvents: 'none',
                    userSelect: 'none'
                  }} 
                />

                {/* Reticle / Viewfinder Frame when Zoom is Active */}
                {zoomLevel >= 1.25 && (
                  <div style={{
                    position: 'absolute',
                    inset: '16px',
                    border: '1.5px dashed rgba(255, 126, 103, 0.75)',
                    borderRadius: '12px',
                    pointerEvents: 'none',
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.28)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '10px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{
                        background: 'rgba(255, 126, 103, 0.9)',
                        color: '#ffffff',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        letterSpacing: '0.04em',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
                      }}>
                        🎯 LESION FOCUS: {zoomLevel.toFixed(1)}x
                      </span>
                      <span style={{
                        background: 'rgba(0, 0, 0, 0.75)',
                        color: '#f8fafc',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '6px'
                      }}>
                        DRAG TO CENTER
                      </span>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <span style={{
                        background: 'rgba(0, 0, 0, 0.75)',
                        color: '#cbd5e1',
                        fontSize: '0.68rem',
                        padding: '3px 10px',
                        borderRadius: '6px'
                      }}>
                        Crosshair centered on skin lesion patch
                      </span>
                    </div>
                  </div>
                )}

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
                    gap: '12px',
                    zIndex: 20
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

          {/* Interactive Zoom & Focus Control Toolbar */}
          {selectedImagePreview && (
            <div style={{
              marginTop: '14px',
              padding: '12px 16px',
              background: 'rgba(18, 24, 38, 0.85)',
              borderRadius: '14px',
              border: '1px solid rgba(255, 126, 103, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Target size={16} style={{ color: '#ff7e67' }} />
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#f8fafc' }}>
                    Lesion Zoom & Focus Tool
                  </span>
                  <span style={{
                    background: zoomLevel >= 1.25 ? 'rgba(255, 126, 103, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                    color: zoomLevel >= 1.25 ? '#ff7e67' : 'var(--text-muted)',
                    fontSize: '0.72rem',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    fontWeight: 800,
                    fontFamily: 'var(--font-mono)'
                  }}>
                    {zoomLevel.toFixed(1)}x
                  </span>
                </div>

                {/* Preset Zoom Quick Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => { setZoomLevel(1.0); setPanPosition({ x: 0, y: 0 }); }}
                    style={{
                      padding: '4px 9px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      borderRadius: '8px',
                      border: zoomLevel === 1.0 ? '1px solid #ff7e67' : '1px solid rgba(255,255,255,0.1)',
                      background: zoomLevel === 1.0 ? 'rgba(255,126,103,0.2)' : 'rgba(255,255,255,0.05)',
                      color: zoomLevel === 1.0 ? '#ff7e67' : 'var(--text-muted)',
                      cursor: 'pointer'
                    }}
                  >
                    1x Full
                  </button>
                  <button
                    type="button"
                    onClick={() => { setZoomLevel(1.8); setPanPosition({ x: 0, y: 0 }); }}
                    style={{
                      padding: '4px 9px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      borderRadius: '8px',
                      border: zoomLevel === 1.8 ? '1px solid #ff7e67' : '1px solid rgba(255,255,255,0.1)',
                      background: zoomLevel === 1.8 ? 'rgba(255,126,103,0.2)' : 'rgba(255,255,255,0.05)',
                      color: zoomLevel === 1.8 ? '#ff7e67' : 'var(--text-muted)',
                      cursor: 'pointer'
                    }}
                  >
                    1.8x Skin
                  </button>
                  <button
                    type="button"
                    onClick={() => { setZoomLevel(2.5); setPanPosition({ x: 0, y: 0 }); }}
                    style={{
                      padding: '4px 9px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      borderRadius: '8px',
                      border: zoomLevel === 2.5 ? '1px solid #ff7e67' : '1px solid rgba(255,255,255,0.1)',
                      background: zoomLevel === 2.5 ? 'rgba(255,126,103,0.2)' : 'rgba(255,255,255,0.05)',
                      color: zoomLevel === 2.5 ? '#ff7e67' : 'var(--text-muted)',
                      cursor: 'pointer'
                    }}
                  >
                    2.5x Close-up
                  </button>
                </div>
              </div>

              {/* Slider and - / + Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    const next = Math.max(1.0, Math.round((zoomLevel - 0.25) * 10) / 10);
                    setZoomLevel(next);
                    if (next === 1.0) setPanPosition({ x: 0, y: 0 });
                  }}
                  title="Zoom Out"
                  style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                >
                  <ZoomOut size={14} />
                </button>

                <input 
                  type="range"
                  min="1.0"
                  max="3.5"
                  step="0.1"
                  value={zoomLevel}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setZoomLevel(val);
                    if (val === 1.0) setPanPosition({ x: 0, y: 0 });
                  }}
                  style={{ flex: 1, accentColor: '#ff7e67', cursor: 'pointer' }}
                />

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    const next = Math.min(3.5, Math.round((zoomLevel + 0.25) * 10) / 10);
                    setZoomLevel(next);
                  }}
                  title="Zoom In"
                  style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                >
                  <ZoomIn size={14} />
                </button>

                {zoomLevel >= 1.25 && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={resetZoom}
                    title="Reset Zoom"
                    style={{ padding: '6px 10px', fontSize: '0.75rem', color: '#94a3b8' }}
                  >
                    <RotateCcw size={13} /> Reset
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Move size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                  {zoomLevel >= 1.25 
                    ? "Click & drag photo above to center the red skin patch or lesion within the frame." 
                    : "The disease dataset contains close-up skin images. Click '1.8x' or '2.5x' to focus on a skin rash."}
                </span>
              </div>
            </div>
          )}

          {/* Action Button & Demo Buttons */}
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {selectedImagePreview && (
              <button 
                className="btn-primary" 
                onClick={handleRunDetection} 
                disabled={isAnalyzing}
                style={{ width: '100%', padding: '15px', fontSize: '1.08rem' }}
              >
                {isAnalyzing ? (
                  <> <RefreshCw size={20} className="spin" /> Pawly is Analyzing... </>
                ) : zoomLevel >= 1.25 ? (
                  <> <Target size={20} /> Scan Focused Lesion Area ({zoomLevel.toFixed(1)}x Zoom) </>
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {/* ROI + Basic Info Row */}
                      <div style={{ display: 'grid', gridTemplateColumns: det.roi_crop ? '110px 1fr' : '1fr', gap: '16px', alignItems: 'center' }}>
                        {det.roi_crop && (
                          <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255, 126, 103, 0.3)', background: '#000', width: '110px', height: '110px' }}>
                            <img src={det.roi_crop} alt="Cropped ROI" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <span style={{ display: 'block', fontSize: '0.65rem', textAlign: 'center', background: 'rgba(0,0,0,0.85)', color: '#94a3b8', fontWeight: 600 }}>CROPPED ROI</span>
                          </div>
                        )}
                        <div>
<div style={{ marginBottom: '8px' }}>
  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
    Bounding Box Coordinates:
  </span>
  <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#f8fafc', fontSize: '0.9rem', marginTop: '2px' }}>
    [{det.bbox.join(', ')}]
  </p>
</div>

<div>
  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
    Identified Animal:
  </span>

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

                      {/* ── Breed Detection Card (only for Dogs) ───────── */}
                      {det.species === 'Dog' && det.breed_model_ready && det.breed && det.breed !== 'Unknown' && (
                        <div style={{
                          background: 'linear-gradient(135deg, rgba(129,185,16,0.12), rgba(16,185,129,0.08))',
                          border: '1px solid rgba(129,185,16,0.35)',
                          borderRadius: '16px',
                          padding: '18px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px'
                        }}>
                          {/* Header */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '1.3rem' }}>🐾</span>
                              <span style={{ fontSize: '0.72rem', color: '#81b910', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800 }}>
                                Breed Identified (EfficientNet-B3 + TTA)
                              </span>
                            </div>
                          </div>

                          {/* Top Breed */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ffffff', letterSpacing: '0.01em' }}>
                              {det.breed}
                            </span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '1.5rem', color: '#81b910' }}>
                              {det.breed_confidence}%
                            </span>
                          </div>

                          {/* Main confidence bar */}
                          <div style={{ height: '8px', borderRadius: '9999px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%',
                              width: `${det.breed_confidence}%`,
                              borderRadius: '9999px',
                              background: 'linear-gradient(90deg, #81b910, #34d399)',
                              transition: 'width 0.8s ease'
                            }} />
                          </div>

                          {/* Top-3 breakdown */}
                          {det.breed_top3 && det.breed_top3.length > 1 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginTop: '4px' }}>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                                Top Predictions
                              </span>
                              {det.breed_top3.map((b, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <span style={{
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    color: i === 0 ? '#ffffff' : 'var(--text-muted)',
                                    minWidth: '160px'
                                  }}>
                                    {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} {b.breed}
                                  </span>
                                  <div style={{ flex: 1, height: '5px', borderRadius: '9999px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                                    <div style={{
                                      height: '100%',
                                      width: `${b.confidence}%`,
                                      borderRadius: '9999px',
                                      background: i === 0
                                        ? 'linear-gradient(90deg, #81b910, #34d399)'
                                        : i === 1
                                        ? 'rgba(129,185,16,0.55)'
                                        : 'rgba(129,185,16,0.3)'
                                    }} />
                                  </div>
                                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: i === 0 ? '#81b910' : 'var(--text-muted)', minWidth: '44px', textAlign: 'right' }}>
                                    {b.confidence}%
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Model not ready notice */}
                      {det.species === 'Dog' && !det.breed_model_ready && (
                        <div style={{ padding: '12px 16px', borderRadius: '12px', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)' }}>
                          <p style={{ color: '#fbbf24', fontWeight: 600, fontSize: '0.85rem', margin: 0 }}>
                            🔧 Breed model not trained yet. Run <code>train_breed.py</code> to enable breed detection.
                          </p>
                        </div>
                      )}

                      {/* ── Disease Detection Card (only for Dogs) ───────── */}
                      {det.species === 'Dog' && (
                        det.disease_model_ready && det.disease ? (
                          <div style={{
                            background: (det.disease.toLowerCase().includes('demodicosis') || det.disease.toLowerCase().includes('dermatitis'))
                              ? 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(245,158,11,0.08))'
                              : det.disease.toLowerCase().includes('cannot be determined')
                              ? 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(100,116,139,0.08))'
                              : 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(6,182,212,0.08))',
                            border: (det.disease.toLowerCase().includes('demodicosis') || det.disease.toLowerCase().includes('dermatitis'))
                              ? '1px solid rgba(239,68,68,0.35)'
                              : det.disease.toLowerCase().includes('cannot be determined')
                              ? '1px solid rgba(245,158,11,0.35)'
                              : '1px solid rgba(16,185,129,0.35)',
                            borderRadius: '16px',
                            padding: '18px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                          }}>
                            {/* Header */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Stethoscope size={18} style={{ color: (det.disease.toLowerCase().includes('demodicosis') || det.disease.toLowerCase().includes('dermatitis')) ? '#ef4444' : '#10b981' }} />
                                <span style={{
                                  fontSize: '0.72rem',
                                  color: (det.disease.toLowerCase().includes('demodicosis') || det.disease.toLowerCase().includes('dermatitis')) ? '#f87171' : '#34d399',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.08em',
                                  fontWeight: 800
                                }}>
                                  Skin & Health Assessment (EfficientNet-B3)
                                </span>
                              </div>
                            </div>

                            {/* Disease Name & Confidence */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#ffffff' }}>
                                {det.disease}
                              </span>
                              {det.disease_confidence > 0 && !det.disease.toLowerCase().includes('cannot be determined') && (
                                <span style={{
                                  fontFamily: 'var(--font-mono)',
                                  fontWeight: 900,
                                  fontSize: '1.4rem',
                                  color: (det.disease.toLowerCase().includes('demodicosis') || det.disease.toLowerCase().includes('dermatitis')) ? '#f87171' : '#34d399'
                                }}>
                                  {det.disease_confidence}%
                                </span>
                              )}
                            </div>

                            {/* Progress bar */}
                            {det.disease_confidence > 0 && !det.disease.toLowerCase().includes('cannot be determined') && (
                              <div style={{ height: '8px', borderRadius: '9999px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                                <div style={{
                                  height: '100%',
                                  width: `${det.disease_confidence}%`,
                                  borderRadius: '9999px',
                                  background: (det.disease.toLowerCase().includes('demodicosis') || det.disease.toLowerCase().includes('dermatitis'))
                                    ? 'linear-gradient(90deg, #ef4444, #f59e0b)'
                                    : 'linear-gradient(90deg, #10b981, #06b6d4)',
                                  transition: 'width 0.8s ease'
                                }} />
                              </div>
                            )}

                            {/* Top-2 Breakdown */}
                            {det.disease_top2 && det.disease_top2.length > 1 && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginTop: '2px' }}>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                                  Probability Distribution
                                </span>
                                {det.disease_top2.map((d, i) => (
                                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: i === 0 ? '#ffffff' : 'var(--text-muted)', minWidth: '180px' }}>
                                      {i === 0 ? '🔹' : '🔸'} {d.disease}
                                    </span>
                                    <div style={{ flex: 1, height: '5px', borderRadius: '9999px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                                      <div style={{
                                        height: '100%',
                                        width: `${d.confidence}%`,
                                        borderRadius: '9999px',
                                        background: i === 0
                                          ? ((det.disease.toLowerCase().includes('demodicosis') || det.disease.toLowerCase().includes('dermatitis')) ? '#ef4444' : '#10b981')
                                          : 'rgba(255,255,255,0.25)'
                                      }} />
                                    </div>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)', minWidth: '44px', textAlign: 'right' }}>
                                      {d.confidence}%
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Mandatory Medical Disclaimer Banner */}
                            <div style={{
                              marginTop: '6px',
                              padding: '10px 12px',
                              borderRadius: '10px',
                              background: 'rgba(0, 0, 0, 0.35)',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}>
                              <AlertTriangle size={15} style={{ color: '#fbbf24', flexShrink: 0 }} />
                              <span style={{ fontSize: '0.75rem', color: '#e2e8f0', lineHeight: 1.4 }}>
                                <strong>Preliminary AI Assessment — Veterinary confirmation required.</strong> Do not use as a standalone diagnosis.
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div style={{ padding: '12px 16px', borderRadius: '12px', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)' }}>
                            <p style={{ color: '#fbbf24', fontWeight: 600, fontSize: '0.85rem', margin: 0 }}>
                              🩺 Disease model not trained yet. Run <code>train_disease.py</code> to enable skin disease detection.
                            </p>
                          </div>
                        )
                      )}
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
