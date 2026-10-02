# -*- coding: utf-8 -*-
"""
StreetPaw.AI -- Dog Disease Classifier Training Script
Architecture : EfficientNet-B3 (Transfer Learning)
Classes      : 
  0: Demodicosis
  1: Dermatitis
  2: Normal / No visible disease
Strategy     : Class-weighted CrossEntropy + Two-phase fine-tuning + Stratified split
"""
import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace', line_buffering=True)
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace', line_buffering=True)

import os
import copy
import time
import random
import numpy as np
from PIL import Image
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from torchvision.models import efficientnet_b3, EfficientNet_B3_Weights
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix

# ─────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASETS_DIR = os.path.normpath(os.path.join(BASE_DIR, "..", "datasets"))
MODEL_SAVE_PATH = os.path.join(BASE_DIR, "disease_model.pth")

CLASS_NAMES = ["Demodicosis", "Dermatitis", "Normal / No visible disease"]
NUM_CLASSES = len(CLASS_NAMES)
IMG_SIZE = 300
BATCH_SIZE = 32
NUM_WORKERS = 0  # Safe on Windows
PHASE1_EPOCHS = 2   # Train head with frozen backbone
PHASE2_EPOCHS = 3   # Fine-tune top backbone blocks
LR_PHASE1 = 1e-3
LR_PHASE2 = 1e-4
WEIGHT_DECAY = 1e-4
SEED = 42

def set_seed(seed=42):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)

set_seed(SEED)

# Maximize multi-threaded CPU performance
if os.cpu_count():
    torch.set_num_threads(min(10, os.cpu_count()))

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"[INFO] Using device: {device} (torch threads={torch.get_num_threads()})", flush=True)

# ─────────────────────────────────────────────
# Custom Dataset
# ─────────────────────────────────────────────
class DogDiseaseDataset(Dataset):
    def __init__(self, samples, transform=None):
        self.samples = samples  # list of (filepath, label_idx)
        self.transform = transform

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        path, label = self.samples[idx]
        try:
            with Image.open(path) as img:
                img = img.convert("RGB")
                if self.transform:
                    img = self.transform(img)
                return img, label
        except Exception as e:
            dummy = Image.new("RGB", (IMG_SIZE, IMG_SIZE), (0, 0, 0))
            if self.transform:
                dummy = self.transform(dummy)
            return dummy, label


def collect_dataset_samples(datasets_dir):
    """
    Collects all samples from:
      - datasets/Diseases/Demodicosis -> 0
      - datasets/Diseases/Dermatitis  -> 1
      - datasets/Normal dogs/**       -> 2
    """
    samples = []
    exts = ('.jpg', '.jpeg', '.png', '.bmp', '.webp')

    # 1. Demodicosis
    demo_dir = os.path.join(datasets_dir, "Diseases", "Demodicosis")
    if os.path.exists(demo_dir):
        for root, _, files in os.walk(demo_dir):
            for f in files:
                if f.lower().endswith(exts):
                    samples.append((os.path.join(root, f), 0))

    # 2. Dermatitis
    derm_dir = os.path.join(datasets_dir, "Diseases", "Dermatitis")
    if os.path.exists(derm_dir):
        for root, _, files in os.walk(derm_dir):
            for f in files:
                if f.lower().endswith(exts):
                    samples.append((os.path.join(root, f), 1))

    # 3. Normal dogs
    normal_dir = os.path.join(datasets_dir, "Normal dogs")
    if os.path.exists(normal_dir):
        for root, _, files in os.walk(normal_dir):
            for f in files:
                if f.lower().endswith(exts):
                    samples.append((os.path.join(root, f), 2))

    return samples

# ─────────────────────────────────────────────
# Transforms
# ─────────────────────────────────────────────
train_transform = transforms.Compose([
    transforms.Resize((IMG_SIZE + 24, IMG_SIZE + 24)),
    transforms.RandomCrop(IMG_SIZE),
    transforms.RandomHorizontalFlip(),
    transforms.RandomRotation(15),
    transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2, hue=0.03),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225]),
])

val_transform = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225]),
])

# ─────────────────────────────────────────────
# Build Model
# ─────────────────────────────────────────────
def build_model(num_classes=3):
    print("[INFO] Initializing EfficientNet-B3 with pre-trained weights...", flush=True)
    weights = EfficientNet_B3_Weights.DEFAULT
    model = efficientnet_b3(weights=weights)

    in_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.35, inplace=True),
        nn.Linear(in_features, 256),
        nn.SiLU(),
        nn.Dropout(p=0.25, inplace=True),
        nn.Linear(256, num_classes)
    )
    return model

# ─────────────────────────────────────────────
# Training Loop
# ─────────────────────────────────────────────
def save_checkpoint(model_state, best_acc, best_f1):
    checkpoint = {
        "model_state_dict": model_state,
        "class_names": CLASS_NAMES,
        "num_classes": NUM_CLASSES,
        "img_size": IMG_SIZE,
        "best_val_acc": best_acc,
        "best_val_f1": best_f1,
        "architecture": "efficientnet_b3",
        "timestamp": time.time()
    }
    torch.save(checkpoint, MODEL_SAVE_PATH)
    print(f"[CHECKPOINT] Model saved to {MODEL_SAVE_PATH} (Val Acc: {best_acc:.2f}%, F1: {best_f1:.4f})", flush=True)


def train_disease_model():
    print(f"\n==========================================", flush=True)
    print(f" StreetPaw.AI Disease Classifier Training ", flush=True)
    print(f"==========================================\n", flush=True)
    print(f"Dataset root: {DATASETS_DIR}", flush=True)

    all_samples = collect_dataset_samples(DATASETS_DIR)
    if not all_samples:
        raise RuntimeError(f"No samples found in {DATASETS_DIR}!")

    labels = [s[1] for s in all_samples]
    class_counts = {c: labels.count(c) for c in range(NUM_CLASSES)}

    print(f"Total samples collected: {len(all_samples)}", flush=True)
    for idx, name in enumerate(CLASS_NAMES):
        print(f"  Class {idx} [{name}]: {class_counts.get(idx, 0)} images", flush=True)

    # Stratified 80 / 20 Train-Val Split
    train_samples, val_samples = train_test_split(
        all_samples, test_size=0.20, random_state=SEED, stratify=labels
    )
    print(f"\nTrain set: {len(train_samples)} images | Val set: {len(val_samples)} images", flush=True)

    # Class Weights for CrossEntropyLoss to counter class imbalance
    train_labels = [s[1] for s in train_samples]
    total_train = len(train_labels)
    class_weights = []
    for c in range(NUM_CLASSES):
        count_c = train_labels.count(c)
        w = total_train / (NUM_CLASSES * max(count_c, 1))
        class_weights.append(w)
    
    weights_tensor = torch.tensor(class_weights, dtype=torch.float32).to(device)
    print(f"[INFO] Computed Class Weights for Loss: {[round(w, 3) for w in class_weights]}", flush=True)

    criterion = nn.CrossEntropyLoss(weight=weights_tensor)

    # DataLoaders
    train_dataset = DogDiseaseDataset(train_samples, transform=train_transform)
    val_dataset = DogDiseaseDataset(val_samples, transform=val_transform)

    train_loader = DataLoader(
        train_dataset, batch_size=BATCH_SIZE, shuffle=True,
        num_workers=NUM_WORKERS, pin_memory=False
    )
    val_loader = DataLoader(
        val_dataset, batch_size=BATCH_SIZE, shuffle=False,
        num_workers=NUM_WORKERS, pin_memory=False
    )

    model = build_model(num_classes=NUM_CLASSES).to(device)

    best_val_f1 = 0.0
    best_val_acc = 0.0
    best_model_wts = copy.deepcopy(model.state_dict())

    # ─────────────────────────────────────────
    # Phase 1: Train Head Only (Frozen Backbone)
    # ─────────────────────────────────────────
    print(f"\n--- Phase 1: Feature Extractor Frozen (Epochs: {PHASE1_EPOCHS}, LR: {LR_PHASE1}) ---", flush=True)
    for param in model.features.parameters():
        param.requires_grad = False
    for param in model.classifier.parameters():
        param.requires_grad = True

    optimizer_p1 = optim.AdamW(model.classifier.parameters(), lr=LR_PHASE1, weight_decay=WEIGHT_DECAY)
    scheduler_p1 = optim.lr_scheduler.CosineAnnealingLR(optimizer_p1, T_max=PHASE1_EPOCHS)

    for epoch in range(1, PHASE1_EPOCHS + 1):
        t0 = time.time()
        model.train()
        running_loss = 0.0
        correct = 0
        total = 0

        for batch_idx, (inputs, targets) in enumerate(train_loader):
            inputs, targets = inputs.to(device), targets.to(device)
            optimizer_p1.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, targets)
            loss.backward()
            optimizer_p1.step()

            running_loss += loss.item() * inputs.size(0)
            _, preds = outputs.max(1)
            correct += preds.eq(targets).sum().item()
            total += targets.size(0)

            if (batch_idx + 1) % 15 == 0 or (batch_idx + 1) == len(train_loader):
                print(f"  [P1 E{epoch}/{PHASE1_EPOCHS}] Batch {batch_idx+1}/{len(train_loader)} - Loss: {running_loss/total:.4f} - Acc: {100.0*correct/total:.2f}%", flush=True)

        scheduler_p1.step()
        train_loss = running_loss / total
        train_acc = 100.0 * correct / total

        # Validation
        val_loss, val_acc, val_f1, _, _, _ = evaluate_model(model, val_loader, criterion, device)
        elapsed = time.time() - t0
        print(f"[P1 E{epoch}/{PHASE1_EPOCHS}] Train Loss: {train_loss:.4f} | Train Acc: {train_acc:.2f}% | Val Loss: {val_loss:.4f} | Val Acc: {val_acc:.2f}% | Val F1: {val_f1:.4f} | Time: {elapsed:.1f}s", flush=True)

        if val_f1 > best_val_f1:
            best_val_f1 = val_f1
            best_val_acc = val_acc
            best_model_wts = copy.deepcopy(model.state_dict())
            save_checkpoint(best_model_wts, best_val_acc, best_val_f1)

    # ─────────────────────────────────────────
    # Phase 2: Fine-Tuning (Unfreeze Top Layers)
    # ─────────────────────────────────────────
    print(f"\n--- Phase 2: Fine-Tuning Top Blocks (Epochs: {PHASE2_EPOCHS}, LR: {LR_PHASE2}) ---", flush=True)
    model.load_state_dict(best_model_wts)
    
    # Unfreeze the last 3 stages of features (blocks 5, 6, 7 and conv_head)
    for i, child in enumerate(model.features.children()):
        if i >= 5:  # unfreeze top blocks
            for param in child.parameters():
                param.requires_grad = True
        else:
            for param in child.parameters():
                param.requires_grad = False

    optimizer_p2 = optim.AdamW([
        {"params": [p for i, child in enumerate(model.features.children()) if i >= 5 for p in child.parameters()], "lr": LR_PHASE2 * 0.5},
        {"params": model.classifier.parameters(), "lr": LR_PHASE2}
    ], weight_decay=WEIGHT_DECAY)

    scheduler_p2 = optim.lr_scheduler.CosineAnnealingLR(optimizer_p2, T_max=PHASE2_EPOCHS)

    for epoch in range(1, PHASE2_EPOCHS + 1):
        t0 = time.time()
        model.train()
        running_loss = 0.0
        correct = 0
        total = 0

        for batch_idx, (inputs, targets) in enumerate(train_loader):
            inputs, targets = inputs.to(device), targets.to(device)
            optimizer_p2.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, targets)
            loss.backward()
            optimizer_p2.step()

            running_loss += loss.item() * inputs.size(0)
            _, preds = outputs.max(1)
            correct += preds.eq(targets).sum().item()
            total += targets.size(0)

            if (batch_idx + 1) % 15 == 0 or (batch_idx + 1) == len(train_loader):
                print(f"  [P2 E{epoch}/{PHASE2_EPOCHS}] Batch {batch_idx+1}/{len(train_loader)} - Loss: {running_loss/total:.4f} - Acc: {100.0*correct/total:.2f}%", flush=True)

        scheduler_p2.step()
        train_loss = running_loss / total
        train_acc = 100.0 * correct / total

        val_loss, val_acc, val_f1, _, _, _ = evaluate_model(model, val_loader, criterion, device)
        elapsed = time.time() - t0
        print(f"[P2 E{epoch}/{PHASE2_EPOCHS}] Train Loss: {train_loss:.4f} | Train Acc: {train_acc:.2f}% | Val Loss: {val_loss:.4f} | Val Acc: {val_acc:.2f}% | Val F1: {val_f1:.4f} | Time: {elapsed:.1f}s", flush=True)

        if val_f1 > best_val_f1:
            best_val_f1 = val_f1
            best_val_acc = val_acc
            best_model_wts = copy.deepcopy(model.state_dict())
            save_checkpoint(best_model_wts, best_val_acc, best_val_f1)

    # ─────────────────────────────────────────
    # Final Evaluation Report
    # ─────────────────────────────────────────
    print(f"\n[SUCCESS] Training finished! Best Val Acc: {best_val_acc:.2f}% | Best Val F1: {best_val_f1:.4f}", flush=True)
    model.load_state_dict(best_model_wts)
    print_evaluation_summary(model, val_loader, criterion, device)


def evaluate_model(model, val_loader, criterion, device):
    model.eval()
    running_loss = 0.0
    all_preds = []
    all_targets = []

    with torch.no_grad():
        for inputs, targets in val_loader:
            inputs, targets = inputs.to(device), targets.to(device)
            outputs = model(inputs)
            loss = criterion(outputs, targets)
            running_loss += loss.item() * inputs.size(0)

            _, preds = outputs.max(1)
            all_preds.extend(preds.cpu().numpy())
            all_targets.extend(targets.cpu().numpy())

    total = len(all_targets)
    val_loss = running_loss / total
    val_acc = accuracy_score(all_targets, all_preds) * 100.0
    precision, recall, f1, _ = precision_recall_fscore_support(all_targets, all_preds, average='macro', zero_division=0)

    return val_loss, val_acc, f1, all_targets, all_preds, precision


def print_evaluation_summary(model, val_loader, criterion, device):
    _, val_acc, macro_f1, targets, preds, macro_prec = evaluate_model(model, val_loader, criterion, device)
    precision_cls, recall_cls, f1_cls, support_cls = precision_recall_fscore_support(targets, preds, average=None, zero_division=0)
    cm = confusion_matrix(targets, preds)

    print("\n" + "="*60, flush=True)
    print("      FINAL VALIDATION PERFORMANCE REPORT", flush=True)
    print("="*60, flush=True)
    print(f"Overall Accuracy : {val_acc:.2f}%", flush=True)
    print(f"Macro Precision  : {macro_prec*100:.2f}%", flush=True)
    print(f"Macro Recall     : {sum(recall_cls)/len(recall_cls)*100:.2f}%", flush=True)
    print(f"Macro F1-Score   : {macro_f1*100:.2f}%", flush=True)
    print("\nClass-wise Performance:", flush=True)
    print("-" * 60, flush=True)
    print(f"{'Class Name':<30} | {'Prec (%)':<9} | {'Rec (%)':<9} | {'F1 (%)':<9} | {'Support'}", flush=True)
    print("-" * 60, flush=True)
    for i, name in enumerate(CLASS_NAMES):
        print(f"{name:<30} | {precision_cls[i]*100:<9.2f} | {recall_cls[i]*100:<9.2f} | {f1_cls[i]*100:<9.2f} | {support_cls[i]}", flush=True)
    print("-" * 60, flush=True)

    print("\nConfusion Matrix (Rows: Ground Truth, Columns: Predicted):", flush=True)
    print(f"{'':<30} " + " ".join([f"[{c[:5]:>5}]" for c in CLASS_NAMES]), flush=True)
    for i, row in enumerate(cm):
        row_str = " ".join([f"{val:>7d}" for val in row])
        print(f"{CLASS_NAMES[i]:<30} {row_str}", flush=True)
    print("="*60 + "\n", flush=True)


if __name__ == "__main__":
    train_disease_model()
