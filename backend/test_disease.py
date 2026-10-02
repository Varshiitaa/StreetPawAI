# -*- coding: utf-8 -*-
"""
StreetPaw.AI -- Dog Disease Classifier Evaluation Script
Evaluates disease_model.pth on the validation split.

Reports:
  - Accuracy
  - Precision (Macro & Class-wise)
  - Recall (Macro & Class-wise)
  - F1-Score (Macro & Class-wise)
  - Confusion Matrix
"""
import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

import os
import time
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import transforms
from torchvision.models import efficientnet_b3
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix
from train_disease import DogDiseaseDataset, collect_dataset_samples, val_transform

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASETS_DIR = os.path.normpath(os.path.join(BASE_DIR, "..", "datasets"))
MODEL_PATH = os.path.join(BASE_DIR, "disease_model.pth")
SEED = 42

def evaluate():
    print("\n" + "="*65)
    print("      StreetPaw.AI Dog Disease Model Evaluation")
    print("="*65)

    if not os.path.exists(MODEL_PATH):
        print(f"[ERROR] Model file not found at: {MODEL_PATH}")
        print("Please train the model first using: python train_disease.py")
        return

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[INFO] Using device: {device}")
    print(f"[INFO] Loading checkpoint from: {MODEL_PATH}")

    checkpoint = torch.load(MODEL_PATH, map_location=device, weights_only=False)
    class_names = checkpoint.get("class_names", ["Demodicosis", "Dermatitis", "Normal / No visible disease"])
    num_classes = checkpoint.get("num_classes", len(class_names))

    # Initialize model
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
    model.to(device)
    model.eval()

    # Collect dataset samples and split identically
    all_samples = collect_dataset_samples(DATASETS_DIR)
    labels = [s[1] for s in all_samples]
    _, val_samples = train_test_split(all_samples, test_size=0.20, random_state=SEED, stratify=labels)

    print(f"[INFO] Evaluating on {len(val_samples)} validation samples...")
    val_dataset = DogDiseaseDataset(val_samples, transform=val_transform)
    val_loader = DataLoader(val_dataset, batch_size=32, shuffle=False, num_workers=0)

    all_preds = []
    all_targets = []
    t0 = time.time()

    with torch.no_grad():
        for inputs, targets in val_loader:
            inputs = inputs.to(device)
            outputs = model(inputs)
            _, preds = outputs.max(1)
            all_preds.extend(preds.cpu().numpy())
            all_targets.extend(targets.numpy())

    elapsed = time.time() - t0
    print(f"[INFO] Inference finished in {elapsed:.2f}s ({len(val_samples)/elapsed:.1f} img/s)\n")

    # Metrics
    acc = accuracy_score(all_targets, all_preds) * 100.0
    macro_prec, macro_rec, macro_f1, _ = precision_recall_fscore_support(all_targets, all_preds, average='macro', zero_division=0)
    prec_cls, rec_cls, f1_cls, support_cls = precision_recall_fscore_support(all_targets, all_preds, average=None, zero_division=0)
    cm = confusion_matrix(all_targets, all_preds)

    print("="*65)
    print("                  METRICS SUMMARY")
    print("="*65)
    print(f"Overall Accuracy : {acc:.2f}%")
    print(f"Macro Precision  : {macro_prec * 100:.2f}%")
    print(f"Macro Recall     : {macro_rec * 100:.2f}%")
    print(f"Macro F1-Score   : {macro_f1 * 100:.2f}%")
    print("-" * 65)

    print("\nClass-wise Performance:")
    print("-" * 65)
    print(f"{'Class Name':<30} | {'Prec (%)':<9} | {'Rec (%)':<9} | {'F1 (%)':<9} | {'Support'}")
    print("-" * 65)
    for i, name in enumerate(class_names):
        print(f"{name:<30} | {prec_cls[i]*100:<9.2f} | {rec_cls[i]*100:<9.2f} | {f1_cls[i]*100:<9.2f} | {support_cls[i]}")
    print("-" * 65)

    print("\nConfusion Matrix (Rows: Ground Truth, Columns: Predicted):")
    header = f"{'':<30} " + " ".join([f"[{c[:5]:>5}]" for c in class_names])
    print(header)
    for i, row in enumerate(cm):
        row_str = " ".join([f"{val:>7d}" for val in row])
        print(f"{class_names[i]:<30} {row_str}")
    print("="*65 + "\n")

if __name__ == "__main__":
    evaluate()
