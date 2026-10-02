# -*- coding: utf-8 -*-
"""
StreetPaw.AI -- Dog Disease Classifier Inference Module
Loads trained EfficientNet-B3 and classifies dog skin condition from a cropped ROI.

Possible outputs:
  1. Demodicosis
  2. Dermatitis
  3. Normal / No visible disease
  4. Disease cannot be determined reliably from this image.
"""
import os
import torch
import torch.nn as nn
import torchvision.transforms as transforms
from torchvision.models import efficientnet_b3
from PIL import Image

# ─────────────────────────────────────────────
# Globals
# ─────────────────────────────────────────────
_disease_model = None
_class_names   = None
_img_size      = 300
MODEL_PATH     = os.path.join(os.path.dirname(__file__), "disease_model.pth")

# Thresholds
CONFIDENCE_THRESHOLD = 0.55   # Minimum top confidence to declare a specific disease
MARGIN_THRESHOLD     = 0.12   # Minimum margin between top-1 and top-2 for disease declaration
REJECTION_THRESHOLD  = 0.40   # Below this, declare unable to determine reliably

def _get_base_transform(img_size=300):
    return transforms.Compose([
        transforms.Resize((img_size, img_size)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406],
                             std=[0.229, 0.224, 0.225]),
    ])

def _get_tta_transforms(img_size=300):
    return [
        transforms.Compose([
            transforms.Resize((img_size, img_size)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ]),
        transforms.Compose([
            transforms.Resize((img_size + 20, img_size + 20)),
            transforms.CenterCrop(img_size),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ]),
        transforms.Compose([
            transforms.Resize((img_size, img_size)),
            transforms.RandomHorizontalFlip(p=1.0),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ]),
    ]

def is_disease_model_ready():
    return _disease_model is not None or os.path.exists(MODEL_PATH)

def init_disease_classifier():
    global _disease_model, _class_names, _img_size
    if _disease_model is not None:
        return True

    if not os.path.exists(MODEL_PATH):
        print(f"[WARNING] Disease model not found at {MODEL_PATH}. Run train_disease.py first.")
        return False

    try:
        print("[INFO] Loading disease classifier (EfficientNet-B3)...")
        checkpoint = torch.load(MODEL_PATH, map_location="cpu", weights_only=False)
        _class_names = checkpoint.get("class_names", ["Demodicosis", "Dermatitis", "Normal / No visible disease"])
        _img_size    = checkpoint.get("img_size", 300)
        num_classes  = checkpoint.get("num_classes", len(_class_names))

        model = efficientnet_b3(weights=None)
        in_features = model.classifier[1].in_features
        model.classifier = nn.Sequential(
            nn.Dropout(p=0.35, inplace=True),
            nn.Linear(in_features, 256),
            nn.SiLU(),
            nn.Dropout(p=0.25, inplace=True),
            nn.Linear(256, num_classes)
        )

        model.load_state_dict(checkpoint["model_state_dict"])
        model.eval()
        _disease_model = model

        val_acc = checkpoint.get("best_val_acc", "N/A")
        val_f1  = checkpoint.get("best_val_f1", "N/A")
        print(f"[SUCCESS] Disease classifier loaded! Classes: {_class_names}")
        if isinstance(val_acc, (int, float)):
            print(f"          Best val accuracy: {val_acc:.2f}% | F1: {val_f1:.4f}")
        return True
    except Exception as e:
        print(f"[ERROR] Failed to load disease model: {e}")
        _disease_model = None
        return False

def classify_disease(roi_pil, use_tta=True):
    """
    Classifies cropped dog ROI image for diseases.

    Returns dict:
      {
         "disease": str,
         "disease_confidence": float (0-100),
         "disease_top2": list of dicts,
         "disease_model_ready": bool,
         "status": "normal" | "disease_detected" | "uncertain"
      }
    """
    if _disease_model is None:
        if not init_disease_classifier():
            return {
                "disease": "Disease model not loaded",
                "disease_confidence": 0.0,
                "disease_top2": [],
                "disease_model_ready": False,
                "status": "unavailable"
            }

    if roi_pil is None:
        return {
            "disease": "Disease cannot be determined reliably from this image.",
            "disease_confidence": 0.0,
            "disease_top2": [],
            "disease_model_ready": True,
            "status": "uncertain"
        }

    try:
        roi_pil = roi_pil.convert("RGB")
        w, h = roi_pil.size
        if w < 32 or h < 32:
            return {
                "disease": "Disease cannot be determined reliably from this image.",
                "disease_confidence": 0.0,
                "disease_top2": [],
                "disease_model_ready": True,
                "status": "uncertain"
            }

        def _eval_patch(patch_img, transforms_to_use):
            all_p = []
            with torch.no_grad():
                for t in transforms_to_use:
                    tensor = t(patch_img).unsqueeze(0)
                    logits = _disease_model(tensor)
                    probs = torch.softmax(logits, dim=1).squeeze(0).cpu().numpy()
                    all_p.append(probs)
            return sum(all_p) / len(all_p)

        # Select transforms
        transforms_list = _get_tta_transforms(_img_size) if use_tta else [_get_base_transform(_img_size)]
        avg_probs = _eval_patch(roi_pil, transforms_list)

        # Sorted predictions
        ranked_indices = avg_probs.argsort()[::-1]
        top1_idx = ranked_indices[0]
        top2_idx = ranked_indices[1]

        top1_prob = float(avg_probs[top1_idx])
        top2_prob = float(avg_probs[top2_idx])
        top1_name = _class_names[top1_idx]
        top2_name = _class_names[top2_idx]

        # Multi-patch lesion scan: If full ROI returned Normal, but image is large enough,
        # inspect focused sub-regions to check for localized skin lesions (ears, muzzle, cheeks, neck)
        if top1_name == "Normal / No visible disease" and w >= 80 and h >= 80:
            patch_boxes = [
                (0, 0, int(w * 0.52), int(h * 0.52)),                 # Top-left quadrant (ear/eye)
                (int(w * 0.48), 0, w, int(h * 0.52)),                 # Top-right quadrant (ear/eye)
                (0, int(h * 0.45), int(w * 0.55), h),                 # Bottom-left quadrant (cheek/neck)
                (int(w * 0.45), int(h * 0.45), w, h),                 # Bottom-right quadrant (cheek/neck)
                (int(w * 0.22), int(h * 0.20), int(w * 0.78), int(h * 0.78)),  # Center face
                (int(w * 0.28), int(h * 0.35), int(w * 0.72), int(h * 0.82)),  # Snout / muzzle
                (int(w * 0.15), int(h * 0.48), int(w * 0.85), h),     # Lower neck / chest
                (int(w * 0.25), int(h * 0.05), int(w * 0.75), int(h * 0.50)),  # Forehead / crown
            ]
            valid_boxes = [b for b in patch_boxes if (b[2] - b[0]) >= 32 and (b[3] - b[1]) >= 32]
            if valid_boxes:
                base_tf = _get_base_transform(_img_size)
                patch_tensors = [base_tf(roi_pil.crop(b)) for b in valid_boxes]
                batch_tensor = torch.stack(patch_tensors)
                with torch.no_grad():
                    logits = _disease_model(batch_tensor)
                    batch_probs = torch.softmax(logits, dim=1).cpu().numpy()

                derm_hits = [p for p in batch_probs if _class_names[p.argmax()] == 'Dermatitis' and p[1] >= 0.65 and (p[1] - p[2]) >= 0.12]
                demod_hits = [p for p in batch_probs if _class_names[p.argmax()] == 'Demodicosis' and p[0] >= 0.65 and (p[0] - p[2]) >= 0.12]

                # Adopt localized disease if:
                # A) Full image had ambiguous/borderline Normal (< 0.85) AND at least 1 lesion patch confirmed disease, OR
                # B) Multiple independent patches (>= 2) confirm the same disease across the dog's body
                chosen_probs = None
                if len(derm_hits) >= 2 or (len(derm_hits) >= 1 and avg_probs[2] < 0.85):
                    best_derm = max(derm_hits, key=lambda p: p[1])
                    chosen_probs = best_derm
                elif len(demod_hits) >= 2 or (len(demod_hits) >= 1 and avg_probs[2] < 0.85):
                    best_demod = max(demod_hits, key=lambda p: p[0])
                    chosen_probs = best_demod

                if chosen_probs is not None:
                    p_ranked = chosen_probs.argsort()[::-1]
                    top1_idx = p_ranked[0]
                    top2_idx = p_ranked[1]
                    top1_prob = float(chosen_probs[top1_idx])
                    top2_prob = float(chosen_probs[top2_idx])
                    top1_name = _class_names[top1_idx]
                    top2_name = _class_names[top2_idx]

        disease_top2 = [
            {"disease": top1_name, "confidence": round(top1_prob * 100, 2)},
            {"disease": top2_name, "confidence": round(top2_prob * 100, 2)}
        ]

        # ── Conservative / Safety Decision Logic ─────────────────────
        # 1. Very low confidence (< 0.48) or highly ambiguous (margin < 0.08)
        margin = top1_prob - top2_prob
        if top1_prob < 0.48 or margin < 0.08:
            return {
                "disease": "Disease cannot be determined reliably from this image.",
                "disease_confidence": round(top1_prob * 100, 2),
                "disease_top2": disease_top2,
                "disease_model_ready": True,
                "status": "uncertain"
            }

        # 2. Predicted as Normal / Healthy
        if top1_name == "Normal / No visible disease":
            return {
                "disease": "Normal / No visible disease",
                "disease_confidence": round(top1_prob * 100, 2),
                "disease_top2": disease_top2,
                "disease_model_ready": True,
                "status": "normal"
            }

        # 3. Predicted as Demodicosis or Dermatitis
        # Disease declaration requires strong visual evidence
        if top1_prob < CONFIDENCE_THRESHOLD or margin < MARGIN_THRESHOLD:
            # Low confidence or ambiguous: safe conservative fallback to Normal
            return {
                "disease": "Normal / No visible disease",
                "disease_confidence": round(top1_prob * 100, 2),
                "disease_top2": disease_top2,
                "disease_model_ready": True,
                "status": "normal"
            }

        # 4. Confident disease detection
        return {
            "disease": top1_name,
            "disease_confidence": round(top1_prob * 100, 2),
            "disease_top2": disease_top2,
            "disease_model_ready": True,
            "status": "disease_detected"
        }

    except Exception as e:
        print(f"[ERROR] Disease inference error: {e}")
        return {
            "disease": "Disease cannot be determined reliably from this image.",
            "disease_confidence": 0.0,
            "disease_top2": [],
            "disease_model_ready": True,
            "status": "uncertain"
        }
