# 🐾 StreetPaw.AI — Collaborative Multi-Agent AI Platform for Stray Animal Care & Welfare

> **Dayananda Sagar University — School of Engineering**  
> Department of Computer Science & Engineering | Major Project Phase-I (2026-2027)  
> **Supervised by**: Prof. Nandini K  
> **Team**: Varshita Chauhan (ENG23CS0492), Vrinda M (ENG23CS0499), Y Geyasri (ENG23CS0500), Chinmayee V (ENG23CS0540)

---

## 🌟 Overview
**StreetPaw.AI** is a state-of-the-art, multi-agent AI system engineered for real-time stray animal (dogs and cats) detection, health monitoring, visual re-identification, breed classification, and automated rescue dispatch.

---

## 🤖 Multi-Agent AI Architecture
StreetPaw.AI utilizes 9 collaborative autonomous AI agents:

1. **Data Acquisition Agent**: Captures uploaded photo, timestamp, and GPS metadata.
2. **Vision Detection Agent**: Executes **YOLOv8** deep learning model to localize stray dogs and cats, extract bounding boxes, and crop Regions of Interest (ROI).
3. **Breed Identification Agent**: Predicts breed classification (e.g., *Indian Pariah / Desi*, *Street Mongrel*, *Tabby Short Hair*).
4. **Animal Re-Identification Agent**: Generates visual embeddings to match animals across multiple sightings and eliminate duplicate records.
5. **Health Assessment Agent**: Detects visible health risks (mange, skin infections, wounds, eye inflammation).
6. **LLM Medical Advisory Agent**: Generates preliminary first-aid advice and precautionary steps.
7. **Rescue Coordination Agent**: Assesses case severity and notifies nearby NGOs and rescue teams.
8. **Knowledge & Profile Management Agent**: Maintains centralized digital health records and vaccination/sterilization history.
9. **Analytics & Decision Intelligence Agent**: Generates stray animal population heatmaps and welfare dashboards.

---

## 🚀 Getting Started

### 1. Run AI Detection Backend (Python / FastAPI / YOLOv8)
```bash
# Navigate to backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Start FastAPI backend server
python main.py
```
The backend API will run at `http://localhost:8000`.

### 2. Run Web Frontend (React / Vite)
```bash
# Navigate to frontend directory
cd frontend

# Install frontend dependencies
npm install

# Start Vite dev server
npm run dev
```
The frontend UI will launch at `http://localhost:5173`.

---

## 📂 Dataset Integration
The model is pre-configured with **YOLOv8n** pre-trained weights for instant animal detection. To fine-tune or train custom weights on your Google Drive dataset (`Detection of Animal(dog/cat) DS`):
1. Place dataset images/labels in `datasets/Detection_of_Animal_Dog_Cat/`.
2. Run custom training:
```bash
yolo task=detect mode=train model=yolov8n.pt data=dataset.yaml epochs=50 imgsz=640
```

---

## 🔗 Repository & Branch
- GitHub Repo: [https://github.com/Varshiitaa/StreetPawAI](https://github.com/Varshiitaa/StreetPawAI)
- Feature Branch: `feature/animal-detection`
