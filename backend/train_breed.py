# -*- coding: utf-8 -*-
"""
StreetPaw.AI -- Dog Breed Classifier Training Script
Architecture : EfficientNet-B3 (timm) -- Fine-tuned on 10 custom breeds
Strategy     : Two-phase training + Mixup + CutMix + RandAugment + TTA
"""
import sys
# Force unbuffered UTF-8 output so logs appear in real-time on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

import os
import copy
import time
import random
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, WeightedRandomSampler
from torchvision import datasets, transforms
import timm
from timm.data.mixup import Mixup
from timm.loss import SoftTargetCrossEntropy, LabelSmoothingCrossEntropy

# ─────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────
BREEDS_DIR   = os.path.join(os.path.dirname(__file__), "..", "Breeds")
MODEL_SAVE   = os.path.join(os.path.dirname(__file__), "breed_model.pth")
EXCLUDE      = {"Boxer"}                  # excluded breed folders
IMG_SIZE     = 300                        # EfficientNet-B3 native size
BATCH_SIZE   = 16                         # safe for CPU
NUM_WORKERS  = 0                          # 0 = main process (Windows safe)
PHASE1_EPOCHS = 5                         # frozen backbone
PHASE2_EPOCHS = 20                        # unfrozen fine-tune
LR_PHASE1    = 1e-3
LR_PHASE2    = 5e-5
SEED         = 42

def set_seed(s):
    random.seed(s)
    np.random.seed(s)
    torch.manual_seed(s)

set_seed(SEED)
device = torch.device("cpu")
print(f"[INFO] Device: {device}")

# ─────────────────────────────────────────────
# Transforms
# ─────────────────────────────────────────────
train_transform = transforms.Compose([
    transforms.Resize((IMG_SIZE + 20, IMG_SIZE + 20)),
    transforms.RandomCrop(IMG_SIZE),
    transforms.RandomHorizontalFlip(),
    transforms.RandomRotation(15),
    transforms.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.3, hue=0.05),
    transforms.RandomPerspective(distortion_scale=0.2, p=0.3),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225]),
    transforms.RandomErasing(p=0.25, scale=(0.02, 0.15)),
])

val_transform = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225]),
])

# ─────────────────────────────────────────────
# Dataset — filter out excluded breeds
# ─────────────────────────────────────────────
class FilteredImageFolder(datasets.ImageFolder):
    def __init__(self, root, exclude_classes, transform=None):
        super().__init__(root, transform=transform)
        # Filter out excluded class indices
        excluded_idx = {self.class_to_idx[c] for c in exclude_classes if c in self.class_to_idx}
        self.samples = [(p, l) for p, l in self.samples if l not in excluded_idx]
        self.targets = [l for _, l in self.samples]
        # Remap class indices to be contiguous
        kept_classes = sorted(set(self.targets))
        self.old_to_new = {old: new for new, old in enumerate(kept_classes)}
        self.samples = [(p, self.old_to_new[l]) for p, l in self.samples]
        self.targets = [l for _, l in self.samples]
        self.classes = [c for c in self.classes if c not in exclude_classes]
        self.class_to_idx = {c: i for i, c in enumerate(self.classes)}

def build_datasets(breeds_dir, exclude, val_split=0.2):
    full_ds = FilteredImageFolder(breeds_dir, exclude, transform=None)
    classes = full_ds.classes
    num_classes = len(classes)
    print(f"[INFO] Classes ({num_classes}): {classes}")

    # Split per-class to keep balanced val set
    from collections import defaultdict
    class_indices = defaultdict(list)
    for idx, (_, label) in enumerate(full_ds.samples):
        class_indices[label].append(idx)

    train_idx, val_idx = [], []
    for label, idxs in class_indices.items():
        random.shuffle(idxs)
        split = max(1, int(len(idxs) * val_split))
        val_idx.extend(idxs[:split])
        train_idx.extend(idxs[split:])

    from torch.utils.data import Subset
    train_samples = [full_ds.samples[i] for i in train_idx]
    val_samples   = [full_ds.samples[i] for i in val_idx]

    # Build proper datasets with transforms
    train_ds = FilteredImageFolder(breeds_dir, exclude, transform=train_transform)
    val_ds   = FilteredImageFolder(breeds_dir, exclude, transform=val_transform)
    train_ds.samples = train_samples
    train_ds.targets = [l for _, l in train_samples]
    val_ds.samples   = val_samples
    val_ds.targets   = [l for _, l in val_samples]

    return train_ds, val_ds, classes, num_classes

train_ds, val_ds, CLASS_NAMES, NUM_CLASSES = build_datasets(BREEDS_DIR, EXCLUDE)
print(f"[INFO] Train: {len(train_ds)} | Val: {len(val_ds)}")

# Weighted sampler for class imbalance
from collections import Counter
label_counts = Counter(train_ds.targets)
weights = [1.0 / label_counts[l] for _, l in train_ds.samples]
sampler = WeightedRandomSampler(weights, num_samples=len(weights), replacement=True)

train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, sampler=sampler,
                          num_workers=NUM_WORKERS, pin_memory=False, drop_last=True)
val_loader   = DataLoader(val_ds,   batch_size=BATCH_SIZE, shuffle=False,
                          num_workers=NUM_WORKERS, pin_memory=False)

# ─────────────────────────────────────────────
# Model
# ─────────────────────────────────────────────
print("[INFO] Loading EfficientNet-B3 pretrained weights...")
model = timm.create_model("efficientnet_b3", pretrained=True, num_classes=NUM_CLASSES)
model = model.to(device)

criterion = LabelSmoothingCrossEntropy(smoothing=0.1)

def save_best_checkpoint(acc, state_dict):
    torch.save({
        "model_state_dict": state_dict,
        "class_names": CLASS_NAMES,
        "num_classes": NUM_CLASSES,
        "img_size": IMG_SIZE,
        "arch": "efficientnet_b3",
        "best_val_acc": acc,
    }, MODEL_SAVE)
    print(f"  [SAVED] Checkpoint written to {MODEL_SAVE} ({acc:.2f}%)")

# ─────────────────────────────────────────────
# Training loop helper
# ─────────────────────────────────────────────
def train_epoch(model, loader, optimizer):
    model.train()
    running_loss, correct, total = 0.0, 0, 0
    for imgs, labels in loader:
        imgs, labels = imgs.to(device), labels.to(device)
        outputs = model(imgs)
        loss = criterion(outputs, labels)
        optimizer.zero_grad()
        loss.backward()
        nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
        optimizer.step()
        _, predicted = outputs.max(1)
        correct += predicted.eq(labels).sum().item()
        running_loss += loss.item()
        total += labels.size(0)
    return running_loss / len(loader), 100.0 * correct / total

def val_epoch(model, loader):
    model.eval()
    running_loss, correct, total = 0.0, 0, 0
    with torch.no_grad():
        for imgs, labels in loader:
            imgs, labels = imgs.to(device), labels.to(device)
            outputs = model(imgs)
            loss = criterion(outputs, labels)
            _, predicted = outputs.max(1)
            correct += predicted.eq(labels).sum().item()
            running_loss += loss.item()
            total += labels.size(0)
    return running_loss / len(loader), 100.0 * correct / total

# ─────────────────────────────────────────────
# Phase 1 & 2 Execution
# ─────────────────────────────────────────────
best_acc = 0.0
best_model = copy.deepcopy(model.state_dict())

if os.path.exists(MODEL_SAVE):
    print(f"[INFO] Found existing checkpoint at {MODEL_SAVE}! Loading Phase 1 weights...")
    ckpt = torch.load(MODEL_SAVE, map_location=device, weights_only=False)
    model.load_state_dict(ckpt["model_state_dict"])
    best_acc = ckpt.get("best_val_acc", 0.0)
    best_model = copy.deepcopy(model.state_dict())
    print(f"[INFO] Resuming from baseline val accuracy: {best_acc:.2f}% (Skipping Phase 1)")
    PHASE1_EPOCHS = 0
else:
    PHASE1_EPOCHS = 5

if PHASE1_EPOCHS > 0:
    print("\n" + "="*55)
    print("PHASE 1 -- Feature Extraction (backbone frozen)")
    print("="*55)
    for name, param in model.named_parameters():
        if "classifier" not in name:
            param.requires_grad = False

    optimizer1 = optim.AdamW(filter(lambda p: p.requires_grad, model.parameters()),
                             lr=LR_PHASE1, weight_decay=1e-4)
    scheduler1 = optim.lr_scheduler.CosineAnnealingLR(optimizer1, T_max=PHASE1_EPOCHS)

    for epoch in range(1, PHASE1_EPOCHS + 1):
        t0 = time.time()
        tl, ta = train_epoch(model, train_loader, optimizer1)
        vl, va = val_epoch(model, val_loader)
        scheduler1.step()
        elapsed = time.time() - t0
        print(f"Epoch {epoch:02d}/{PHASE1_EPOCHS} | "
              f"Train Loss: {tl:.4f} Acc: {ta:.1f}% | "
              f"Val Loss: {vl:.4f} Acc: {va:.1f}% | "
              f"Time: {elapsed:.0f}s")
        if va > best_acc:
            best_acc = va
            best_model = copy.deepcopy(model.state_dict())
            print(f"  [BEST] New best val acc: {best_acc:.1f}%")
            save_best_checkpoint(best_acc, best_model)

# ─────────────────────────────────────────────
# Phase 2 -- Unfreeze all, fine-tune (5 Epochs)
# ─────────────────────────────────────────────
print("\n" + "="*55)
print("PHASE 2 -- Full Fine-tuning (5 Epochs Requested)")
print("="*55)
for param in model.parameters():
    param.requires_grad = True

optimizer2 = optim.AdamW(model.parameters(), lr=LR_PHASE2, weight_decay=1e-4)
scheduler2 = optim.lr_scheduler.CosineAnnealingWarmRestarts(
    optimizer2, T_0=5, T_mult=1, eta_min=1e-6
)

PHASE2_EPOCHS = 5

for epoch in range(1, PHASE2_EPOCHS + 1):
    t0 = time.time()
    tl, ta = train_epoch(model, train_loader, optimizer2)
    vl, va = val_epoch(model, val_loader)
    scheduler2.step()
    elapsed = time.time() - t0
    print(f"Phase 2 Epoch {epoch:02d}/{PHASE2_EPOCHS} | "
          f"Train Loss: {tl:.4f} Acc: {ta:.1f}% | "
          f"Val Loss: {vl:.4f} Acc: {va:.1f}% | "
          f"Time: {elapsed:.0f}s")
    if va > best_acc:
        best_acc = va
        best_model = copy.deepcopy(model.state_dict())
        print(f"  [BEST] New best val acc: {best_acc:.1f}%")
        save_best_checkpoint(best_acc, best_model)

print(f"\n{'='*55}")
print(f"[DONE] Training Complete!")
print(f"   Best Val Accuracy : {best_acc:.2f}%")
print(f"   Classes           : {CLASS_NAMES}")
print(f"   Model saved to    : {MODEL_SAVE}")
print(f"{'='*55}")
