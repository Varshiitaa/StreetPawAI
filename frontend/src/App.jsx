import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import HeroVideoBanner from './components/HeroVideoBanner';
import DetectionCard from './components/DetectionCard';
import MultiAgentWorkflow from './components/MultiAgentWorkflow';
import HotspotMap from './components/HotspotMap';
import AnimalVault from './components/AnimalVault';
import { PawPrint, Sparkles, Heart } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('detect');
  const [apiStatus, setApiStatus] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectionResult, setDetectionResult] = useState(null);

  // Check Backend API Connection on mount
  useEffect(() => {
    fetch('http://localhost:8000/api/health')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'healthy') {
          setApiStatus(true);
        }
      })
      .catch(() => setApiStatus(false));
  }, []);

  const handleAnalyzeImage = async (imageFile) => {
    setIsAnalyzing(true);
    setDetectionResult(null);

    const formData = new FormData();
    formData.append('file', imageFile);

    try {
      if (apiStatus) {
        const response = await fetch('http://localhost:8000/api/detect', {
          method: 'POST',
          body: formData
        });
        const data = await response.json();
        setDetectionResult(data);
      } else {
        // Fallback simulation preview
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const reader = new FileReader();
        reader.onload = (e) => {
          const previewUrl = e.target.result;
          const fileName = imageFile.name.toLowerCase();
          
          let species = "Neither";
          if (fileName.includes('dog')) species = "Dog";
          else if (fileName.includes('cat')) species = "Cat";
          else if (fileName.includes('pig')) species = "Pig";
          else if (fileName.includes('cow')) species = "Cow";
          else if (fileName.includes('human') || fileName.includes('person')) species = "Human";
          else if (fileName.includes('plant')) species = "Plant";

          setDetectionResult({
            success: true,
            processing_time_ms: 128.4,
            total_animals_detected: (species !== "Neither" && species !== "Human" && species !== "Plant") ? 1 : 0,
            annotated_image: previewUrl,
            detections: [
              {
                detection_id: 1,
                animal_id: `${species.toUpperCase().slice(0, 3)}-${Math.floor(1000 + Math.random() * 9000)}`,
                species: species,
                is_animal: (species !== "Neither" && species !== "Human" && species !== "Plant"),
                is_human: (species === "Human"),
                is_plant: (species === "Plant"),
                confidence: species === "Neither" ? 0.0 : 96.8,
                bbox: [80, 60, 480, 340],
                roi_crop: previewUrl,
                message: species === "Human" ? "Human / Person detected." : species === "Plant" ? "Plant detected." : "Stray animal identified.",
                timestamp: new Date().toLocaleString()
              }
            ]
          });
        };
        reader.readAsDataURL(imageFile);
      }
    } catch (err) {
      console.error("Detection error:", err);
      alert("Error communicating with AI detection engine.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetDetection = () => {
    setDetectionResult(null);
  };

  const scrollToImplementation = () => {
    const el = document.getElementById('project-implementation-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 1. FULLSCREEN (100vh) VIDEO HERO LANDING COVER */}
      <HeroVideoBanner onExploreClick={scrollToImplementation} />

      {/* 2. PROJECT IMPLEMENTATION SECTION (SCROLL TARGET) */}
      <div id="project-implementation-section">
        {/* Sticky Header Navbar */}
        <Navbar activeTab={activeTab} setActiveTab={setActiveTab} apiStatus={apiStatus} />

        {/* Implementation Content Container */}
        <main style={{
          flex: 1,
          padding: '36px 32px 48px',
          maxWidth: '1400px',
          margin: '0 auto',
          width: '100%'
        }}>
          {activeTab === 'detect' && (
            <DetectionCard 
              onAnalyze={handleAnalyzeImage}
              isAnalyzing={isAnalyzing}
              resultData={detectionResult}
              resetDetection={resetDetection}
            />
          )}

          {activeTab === 'pipeline' && <MultiAgentWorkflow />}

          {activeTab === 'hotspot' && <HotspotMap />}

          {activeTab === 'vault' && <AnimalVault />}
        </main>
      </div>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid rgba(255,126,103,0.15)',
        padding: '24px 32px',
        background: 'rgba(11, 15, 25, 0.95)',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '0.85rem'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PawPrint size={18} color="#ff7e67" />
            <span>StreetPaw.AI — Department of Computer Science & Engineering</span>
          </div>
          <div>
            Team: Varshita Chauhan, Vrinda M, Y Geyasri, Chinmayee V | Supervised by Prof. Nandini K
          </div>
        </div>
      </footer>
    </div>
  );
}
