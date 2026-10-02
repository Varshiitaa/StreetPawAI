"""
StreetPaw.AI — Breed Classifier Inference Module
Loads trained EfficientNet-B3 and classifies dog breed from a cropped ROI.
Supports Test Time Augmentation (TTA) for higher accuracy.
"""

import os
import torch
import torch.nn as nn
import torchvision.transforms as transforms
from PIL import Image
import timm

# ─────────────────────────────────────────────
# Globals
# ─────────────────────────────────────────────
_breed_model      = None
_class_names      = None
_img_size         = 300
MODEL_PATH        = os.path.join(os.path.dirname(__file__), "breed_model.pth")

# ─────────────────────────────────────────────
# Transforms for inference
# ─────────────────────────────────────────────
def _get_base_transform(img_size):
    return transforms.Compose([
        transforms.Resize((img_size, img_size)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406],
                             [0.229, 0.224, 0.225]),
    ])

# TTA: 5 different crops/flips averaged
def _get_tta_transforms(img_size):
    return [
        transforms.Compose([
            transforms.Resize((img_size, img_size)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ]),
        transforms.Compose([
            transforms.Resize((img_size + 20, img_size + 20)),
            transforms.CenterCrop(img_size),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ]),
        transforms.Compose([
            transforms.Resize((img_size, img_size)),
            transforms.RandomHorizontalFlip(p=1.0),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ]),
        transforms.Compose([
            transforms.Resize((img_size + 20, img_size + 20)),
            transforms.RandomCrop(img_size),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ]),
        transforms.Compose([
            transforms.Resize((img_size, img_size)),
            transforms.ColorJitter(brightness=0.1, contrast=0.1),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ]),
    ]

# ─────────────────────────────────────────────
# Init — loads model from disk once
# ─────────────────────────────────────────────
def init_breed_classifier():
    global _breed_model, _class_names, _img_size
    if _breed_model is not None:
        return True

    if not os.path.exists(MODEL_PATH):
        print(f"[WARNING] Breed model not found at {MODEL_PATH}. Run train_breed.py first.")
        return False

    try:
        print("[INFO] Loading breed classifier (EfficientNet-B3)...")
        checkpoint = torch.load(MODEL_PATH, map_location="cpu", weights_only=False)
        _class_names = checkpoint["class_names"]
        _img_size    = checkpoint.get("img_size", 300)
        num_classes  = checkpoint["num_classes"]

        _breed_model = timm.create_model("efficientnet_b3", pretrained=False, num_classes=num_classes)
        _breed_model.load_state_dict(checkpoint["model_state_dict"])
        _breed_model.eval()

        val_acc = checkpoint.get("best_val_acc", "N/A")
        print(f"[SUCCESS] Breed classifier loaded! Classes: {_class_names}")
        print(f"          Best val accuracy during training: {val_acc:.2f}%")
        return True
    except Exception as e:
        print(f"[ERROR] Failed to load breed model: {e}")
        _breed_model = None
        return False

# ─────────────────────────────────────────────
# Inference with TTA
# ─────────────────────────────────────────────
def classify_breed(pil_img_crop, use_tta=True):
    """
    Classify dog breed from a PIL image crop.

    Args:
        pil_img_crop : PIL.Image — cropped dog ROI from YOLO
        use_tta      : bool — use Test Time Augmentation (default True)

    Returns:
        dict with:
          breed        : str  — top predicted breed
          confidence   : float — confidence % (0–100)
          top3         : list of {breed, confidence} dicts
          model_ready  : bool
    """
    if _breed_model is None or not init_breed_classifier():
        return {
            "breed": "Unknown",
            "confidence": 0.0,
            "top3": [],
            "model_ready": False
        }

    if pil_img_crop is None:
        return {
            "breed": "Unknown",
            "confidence": 0.0,
            "top3": [],
            "model_ready": True
        }

    # Convert to RGB (handles grayscale, RGBA, etc.)
    pil_img_crop = pil_img_crop.convert("RGB")

    try:
        if use_tta:
            tta_tfms = _get_tta_transforms(_img_size)
            probs_sum = None
            with torch.no_grad():
                for tfm in tta_tfms:
                    tensor = tfm(pil_img_crop).unsqueeze(0)
                    logits = _breed_model(tensor)
                    probs  = torch.softmax(logits, dim=1).squeeze(0)
                    probs_sum = probs if probs_sum is None else probs_sum + probs
            avg_probs = probs_sum / len(tta_tfms)
        else:
            tfm = _get_base_transform(_img_size)
            with torch.no_grad():
                tensor = tfm(pil_img_crop).unsqueeze(0)
                logits = _breed_model(tensor)
                avg_probs = torch.softmax(logits, dim=1).squeeze(0)

        top_probs, top_idxs = torch.topk(avg_probs, min(3, len(_class_names)))
        top3 = [
            {
                "breed": _class_names[idx.item()].replace("_", " ").title(),
                "confidence": round(float(prob.item()) * 100, 2)
            }
            for prob, idx in zip(top_probs, top_idxs)
        ]

        return {
            "breed": top3[0]["breed"],
            "confidence": top3[0]["confidence"],
            "top3": top3,
            "model_ready": True
        }

    except Exception as e:
        print(f"[ERROR in classify_breed]: {e}")
        return {
            "breed": "Unknown",
            "confidence": 0.0,
            "top3": [],
            "model_ready": True
        }

def is_model_ready():
    """Returns True if breed model is loaded and ready."""
    return _breed_model is not None
