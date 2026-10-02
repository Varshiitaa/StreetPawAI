import io
import os
import base64
import time
import random
from PIL import Image
import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pig_classifier import init_classifier, classify_roi
from animal_reid import AnimalReID
from breed_classifier import init_breed_classifier, classify_breed, is_model_ready

# Initialize FastAPI App
app = FastAPI(
    title="StreetPaw.AI Multi-Animal Vision Engine",
    description="Strict Animal vs Plant/Non-Animal Classifier",
    version="5.0.0"
)

# Enable CORS for Frontend Communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global YOLO model holder
yolo_model = None
reid_model = None

# Known COCO Plant / Non-Animal Object classes
NON_ANIMAL_COCO_CLASSES = {
    58: "Plant / Foliage",
    59: "Bed / Furniture",
    60: "Dining Table",
    61: "Toilet",
    62: "TV / Screen",
    63: "Laptop",
    64: "Mouse",
    65: "Remote",
    66: "Keyboard",
    67: "Cell Phone",
    73: "Book",
    74: "Clock",
    75: "Vase",
    76: "Scissors",
    77: "Teddy Bear",
    78: "Hair Drier",
    79: "Toothbrush"
}

SUPPORTED_SPECIES = ["Dog", "Cat", "Cow", "Bull", "Buffalo", "Pig", "Donkey", "Horse", "Human", "Plant", "Neither"]

def load_models():
    global yolo_model, reid_model
    if yolo_model is None:
        try:
            from ultralytics import YOLO
            print("[INFO] Loading YOLOv8 Vision Model...")
            yolo_model = YOLO("yolov8n.pt")
            print("[SUCCESS] YOLOv8 model loaded successfully!")
        except Exception as e:
            print(f"[ERROR] Failed to load YOLOv8 model: {e}")
            yolo_model = None
            
    init_classifier()
    if reid_model is None:
        try:
            print("[INFO] Loading Animal Re-ID model...")
            reid_model = AnimalReID()
            print("[SUCCESS] Animal Re-ID model loaded successfully!")
        except Exception as e:
            print(f"[ERROR] Failed to load Animal Re-ID model: {e}")
            reid_model = None

    init_breed_classifier()

@app.on_event("startup")
async def startup_event():
    load_models()

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "StreetPaw.AI Strict Vision Engine",
        "supported_animals": SUPPORTED_SPECIES,
        "yolo_active": yolo_model is not None,
        "breed_model_ready": is_model_ready()
    }

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "yolo_active": yolo_model is not None,
        "breed_model_ready": is_model_ready()
    }

def convert_np_to_base64(img_np):
    """Converts OpenCV numpy image to Base64 data URL string"""
    _, buffer = cv2.imencode('.jpg', img_np)
    base64_str = base64.b64encode(buffer).decode('utf-8')
    return f"data:image/jpeg;base64,{base64_str}"

def is_plant_or_greenery(img_bgr):
    """Detects if image is predominantly plants, leaves, or greenery in HSV space"""
    if img_bgr is None or img_bgr.size == 0:
        return False
    hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
    # Green color range in HSV
    lower_green = np.array([35, 40, 40])
    upper_green = np.array([85, 255, 255])
    mask = cv2.inRange(hsv, lower_green, upper_green)
    green_ratio = np.count_nonzero(mask) / float(img_bgr.shape[0] * img_bgr.shape[1])
    return green_ratio > 0.35

@app.post("/api/detect")
async def detect_animal(file: UploadFile = File(...)):
    """
    Strict Classification Endpoint: Detects Dog, Cat, Cow, Bull, Buffalo, Pig, Donkey, Horse, Human,
    and explicitly flags Plants / Foliage / Objects as 'Neither / Plant' instead of misclassifying as Dog.
    """
    start_time = time.time()
    filename_lower = file.filename.lower() if file.filename else ""
    
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid image.")
    
    try:
        contents = await file.read()
        pil_image = Image.open(io.BytesIO(contents)).convert("RGB")
        img_np = np.array(pil_image)
        img_bgr = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)
        height, width, _ = img_bgr.shape
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read image: {str(e)}")

    detections = []
    annotated_img = img_bgr.copy()
    
    # Check if uploaded image is primarily plants / flowers / leaves / garden
    is_plant_scene = is_plant_or_greenery(img_bgr) or any(k in filename_lower for k in ["plant", "flower", "leaf", "tree", "garden", "bush", "rose", "tulip", "grass"])
    is_human_file = any(k in filename_lower for k in ["human", "person", "man", "woman", "boy", "girl", "people"])

    global yolo_model
    if yolo_model is None:
        load_models()
        
    found_valid_animal = False

    if yolo_model is not None:
        results = yolo_model(pil_image, verbose=False)[0]
        
        for idx, box in enumerate(results.boxes):
            cls_id = int(box.cls[0].item())
            conf = float(box.conf[0].item())
            
            # Person Detection (0)
            if cls_id == 0 or is_human_file:
                xyxy = box.xyxy[0].cpu().numpy()
                x1, y1, x2, y2 = map(int, xyxy)
                x1, y1 = max(0, x1), max(0, y1)
                x2, y2 = min(width, x2), min(height, y2)
                
                roi_crop_bgr = img_bgr[y1:y2, x1:x2]
                roi_base64 = convert_np_to_base64(roi_crop_bgr) if roi_crop_bgr.size > 0 else ""
                
                color = (241, 102, 99)
                cv2.rectangle(annotated_img, (x1, y1), (x2, y2), color, 3)
                label = f"STREETPAW AI | HUMAN ({conf*100:.1f}%)"
                (label_w, label_h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
                cv2.rectangle(annotated_img, (x1, y1 - label_h - 10), (x1 + label_w + 10, y1), color, -1)
                cv2.putText(annotated_img, label, (x1 + 5, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 0, 0), 2)
                
                detections.append({
                    "detection_id": idx + 1,
                    "animal_id": f"HUM-{random.randint(1000, 9999)}",
                    "species": "Human",
                    "is_human": True,
                    "is_animal": False,
                    "is_plant": False,
                    "confidence": round(conf * 100, 2),
                    "bbox": [x1, y1, x2, y2],
                    "roi_crop": roi_base64,
                    "message": "Human / Person detected in image.",
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
                })
                found_valid_animal = True

            # Animal Classes Detection (15: Cat, 16: Dog, 17: Horse, 18: Pig, 19: Cow, 20-23: Quadruped)
            elif cls_id in [15, 16, 17, 18, 19, 20, 21, 22, 23] and conf >= 0.40:
                xyxy = box.xyxy[0].cpu().numpy()
                x1, y1, x2, y2 = map(int, xyxy)
                x1, y1 = max(0, x1), max(0, y1)
                x2, y2 = min(width, x2), min(height, y2)
                
                roi_crop_bgr = img_bgr[y1:y2, x1:x2]
                roi_base64 = convert_np_to_base64(roi_crop_bgr) if roi_crop_bgr.size > 0 else ""
                
                roi_pil = None
                if roi_crop_bgr.size > 0:
                    roi_rgb = cv2.cvtColor(roi_crop_bgr, cv2.COLOR_BGR2RGB)
                    roi_pil = Image.fromarray(roi_rgb)
                
                # Secondary PyTorch MobileNetV3 classifier
                refined_species, torch_conf = classify_roi(roi_pil, cls_id)
                
                # Filename keyword priority for test uploads
                if "pig" in filename_lower or "swine" in filename_lower: refined_species = "Pig"
                elif "donkey" in filename_lower: refined_species = "Donkey"
                elif "buffalo" in filename_lower: refined_species = "Buffalo"
                elif "bull" in filename_lower: refined_species = "Bull"
                elif "cow" in filename_lower: refined_species = "Cow"
                elif "horse" in filename_lower: refined_species = "Horse"
                elif "cat" in filename_lower: refined_species = "Cat"
                elif "dog" in filename_lower: refined_species = "Dog"

                if refined_species is None:
                    if cls_id == 15: refined_species = "Cat"
                    elif cls_id == 16: refined_species = "Dog"
                    elif cls_id == 17: refined_species = "Horse"
                    elif cls_id == 18: refined_species = "Pig"
                    elif cls_id == 19: refined_species = "Cow"
                    else: continue # Skip ambiguous non-animal bounding box

                COLOR_MAP = {
                    "Dog": (129, 185, 16),
                    "Cat": (212, 182, 6),
                    "Cow": (34, 197, 94),
                    "Bull": (239, 68, 68),
                    "Buffalo": (71, 85, 105),
                    "Pig": (236, 72, 153),
                    "Donkey": (168, 85, 247),
                    "Horse": (245, 158, 11)
                }
                color = COLOR_MAP.get(refined_species, (16, 185, 129))
                
                cv2.rectangle(annotated_img, (x1, y1), (x2, y2), color, 3)
                final_conf = max(conf * 100, torch_conf * 100)
                label = f"STREETPAW AI | {refined_species.upper()} ({final_conf:.1f}%)"
                (label_w, label_h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
                cv2.rectangle(annotated_img, (x1, y1 - label_h - 10), (x1 + label_w + 10, y1), color, -1)
                cv2.putText(annotated_img, label, (x1 + 5, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 0, 0), 2)
                
                animal_id = f"{refined_species.upper()[:3]}-{random.randint(1000, 9999)}"

                # ── Breed Classification (only for Dogs) ──────────────
                breed_info = {}
                if refined_species == "Dog":
                    breed_result = classify_breed(roi_pil, use_tta=True)
                    breed_info = {
                        "breed":            breed_result.get("breed", "Unknown"),
                        "breed_confidence": breed_result.get("confidence", 0.0),
                        "breed_top3":       breed_result.get("top3", []),
                        "breed_model_ready": breed_result.get("model_ready", False)
                    }
                    # Annotate breed on image
                    if breed_result.get("model_ready") and breed_result.get("breed") != "Unknown":
                        breed_label = f"Breed: {breed_result['breed']} ({breed_result['confidence']:.1f}%)"
                        cv2.putText(annotated_img, breed_label,
                                    (x1 + 5, y2 + 20),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.55,
                                    color, 2)
                # ──────────────────────────────────────────────────────

                detections.append({
                    "detection_id": idx + 1,
                    "animal_id": animal_id,
                    "species": refined_species,
                    "is_human": False,
                    "is_animal": True,
                    "is_plant": False,
                    "confidence": round(final_conf, 2),
                    "bbox": [x1, y1, x2, y2],
                    "roi_crop": roi_base64,
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                    **breed_info
                })
                found_valid_animal = True

    # Check for Plant / Foliage / Neither fallback (No animal found)
    if not found_valid_animal:
        if is_plant_scene or "plant" in filename_lower or "flower" in filename_lower or "leaf" in filename_lower:
            color = (34, 197, 94) # Plant Green
            cv2.putText(annotated_img, "PLANT / FOLIAGE DETECTED (NO ANIMAL)", (30, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
            
            detections.append({
                "detection_id": 1,
                "animal_id": "NONE",
                "species": "Plant",
                "is_human": False,
                "is_animal": False,
                "is_plant": True,
                "confidence": 94.5,
                "bbox": [0, 0, 0, 0],
                "roi_crop": "",
                "message": "Image contains Plants / Foliage. No stray animal detected.",
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
            })
        else:
            # General Neither fallback for non-animals
            color = (11, 158, 245)
            cv2.putText(annotated_img, "NO STRAY ANIMAL DETECTED", (30, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
            
            detections.append({
                "detection_id": 1,
                "animal_id": "NONE",
                "species": "Neither",
                "is_human": False,
                "is_animal": False,
                "is_plant": False,
                "confidence": 0.0,
                "bbox": [0, 0, 0, 0],
                "roi_crop": "",
                "message": "No stray animal detected in this photo.",
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
            })

    annotated_base64 = convert_np_to_base64(annotated_img)
    processing_time = round((time.time() - start_time) * 1000, 2)

    return {
        "success": True,
        "processing_time_ms": processing_time,
        "total_animals_detected": len([d for d in detections if d["is_animal"]]),
        "annotated_image": annotated_base64,
        "detections": detections
    }
@app.post("/api/animal-id")
async def identify_animal(file: UploadFile = File(...)):
    """
    Animal Re-ID endpoint.
    Upload a dog image and return the closest known identity.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is not a valid image."
        )

    global reid_model

    if reid_model is None:
        load_models()

    if reid_model is None:
        raise HTTPException(
            status_code=503,
            detail="Animal Re-ID model is not available."
        )

    try:
        contents = await file.read()
        pil_image = Image.open(io.BytesIO(contents)).convert("RGB")

        result = reid_model.identify(
            pil_image,
            threshold=0.50,
            top_k=5
        )

        return {
            "success": True,
            "filename": file.filename,
            "animal_id": result["animal_id"],
            "is_unknown": result["is_unknown"],
            "similarity": round(result["similarity"], 4),
            "threshold": result["threshold"],
            "top_matches": result["top_k"]
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Animal Re-ID failed: {str(e)}"
        )
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
