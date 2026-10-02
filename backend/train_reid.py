"""
Stage-2: fine-tune pretrained OSNet-x0.25 on the DogFaceNet `train/` identities.
 
Loss     : label-smoothed cross-entropy (identity classification)
           + batch-hard triplet loss on L2-normalised 512-d embeddings.
Sampling : P identities x K images per batch (handles unequal images/identity).
Split    : IDENTITY-level hold-out (validation dogs are never seen in training).
Never touches test_200_database / test_200_single_img (reserved for final eval).
 
Run     : python backend/train_reid.py
Resume  : python backend/train_reid.py --resume
Quick   : python backend/train_reid.py --smoke-test
"""
 
import argparse
import json
import os
import random
import sys
import time
from pathlib import Path
 
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.transforms as T
from PIL import Image
from torch.utils.data import DataLoader, Dataset, Sampler
from tqdm import tqdm
 
 
# =============================== CONFIG ===============================
class Config:
    # ---- paths ----
    DATASET_ROOT = Path(r"C:\Users\Geyas\OneDrive\Desktop\Streetpaw\Dog Face Recognition"
                        r"\DogFaceNet - Dog Face Recognition")
    TRAIN_SUBDIR = "train"                       # only this folder is used
    OUTPUT_DIR = Path(__file__).resolve().parent / "reid_training_output"
    # Local clone of torchreid (added to sys.path only if it exists)
    TORCHREID_REPO = Path(r"C:\Users\Geyas\OneDrive\Desktop\Streetpaw\deep-person-reid")
 
    # ---- model ----
    MODEL_NAME = "osnet_x0_25"
    USE_PRETRAINED = True                        # torchreid ImageNet weights (same as Stage 1)
    IMAGE_SIZE = (256, 128)         # (height, width). Must match at inference!
 
    # ---- training (conservative CPU defaults) ----
    BATCH_SIZE = 32                              # = P identities x K images
    K_INSTANCES = 4                              # images per identity in a batch
    EPOCHS = 20
    ITERS_PER_EPOCH = 150                        # an "epoch" = this many batches
    LR = 3.5e-4
    CLASSIFIER_LR_MULT = 10.0                    # new classifier head learns faster
    WEIGHT_DECAY = 5e-4
    FREEZE_BACKBONE_EPOCHS = 1                   # first epoch: only train new classifier
    LABEL_SMOOTH = 0.1
    TRIPLET_MARGIN = 0.3
    TRIPLET_WEIGHT = 1.0
    NUM_WORKERS = 2                              # set 0 if DataLoader gives Windows errors
    NUM_THREADS = None                           # None = PyTorch default CPU threads
 
    # ---- augmentation ----
    HFLIP_PROB = 0.5                             # set 0.0 if coat/face asymmetry matters
    ERASE_PROB = 0.25
 
    # ---- validation (held-out identities) ----
    VAL_FRACTION = 0.10
    VAL_BATCH_SIZE = 64
    SEED = 42
 
    # ---- checkpoints ----
    SAVE_EVERY = 5                               # extra snapshot every N epochs
# =====================================================================
 
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]
 
 
# ------------------------------ utilities ------------------------------
def seed_everything(seed):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
 
 
def import_torchreid(cfg):
    try:
        import torchreid  # noqa: F401
    except ImportError:
        if cfg.TORCHREID_REPO.is_dir():
            sys.path.insert(0, str(cfg.TORCHREID_REPO))
        try:
            import torchreid  # noqa: F401
        except ImportError:
            sys.exit("torchreid not found. Install it or fix Config.TORCHREID_REPO.")
    import torchreid
    return torchreid
 
 
def torch_load(path):
    try:
        return torch.load(path, map_location="cpu", weights_only=False)
    except TypeError:  # older torch without weights_only
        return torch.load(path, map_location="cpu")
 
 
def atomic_save(obj, path: Path):
    """Write to a temp file then rename, so Ctrl+C mid-save can't corrupt a checkpoint."""
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    torch.save(obj, tmp)
    os.replace(tmp, path)
 
 
# ------------------------------ dataset ------------------------------
def scan_identities(train_dir: Path):
    """Return {identity_name: [image paths]} for every identity folder in train/."""
    if not train_dir.is_dir():
        sys.exit(f"Training folder not found: {train_dir}")
    id_to_paths = {}
    for d in sorted(p for p in train_dir.iterdir() if p.is_dir()):
        imgs = sorted(p for p in d.iterdir()
                      if p.is_file() and p.suffix.lower() in IMAGE_EXTS)
        if imgs:
            id_to_paths[d.name] = imgs
    if not id_to_paths:
        sys.exit(f"No identity folders with images found in {train_dir}")
    return id_to_paths
 
 
def split_identities(id_to_paths, val_fraction, seed):
    """Identity-level split. Val identities need >=2 images (leave-one-out query/gallery)."""
    ids = sorted(id_to_paths)
    eligible = [i for i in ids if len(id_to_paths[i]) >= 2]
    n_val = max(1, int(round(val_fraction * len(ids))))
    n_val = min(n_val, len(eligible))
    val_ids = sorted(random.Random(seed).sample(eligible, n_val))
    val_set = set(val_ids)
    train_ids = [i for i in ids if i not in val_set]
    return train_ids, val_ids
 
 
def make_samples(id_to_paths, identities):
    """-> (samples[(path,label)], class_names). Labels are contiguous 0..C-1."""
    class_names = list(identities)
    samples = [(p, lbl) for lbl, name in enumerate(class_names) for p in id_to_paths[name]]
    return samples, class_names
 
 
class ReIDDataset(Dataset):
    def __init__(self, samples, transform):
        self.samples = samples
        self.transform = transform
        self.by_label = {}
        for idx, (_, lbl) in enumerate(samples):
            self.by_label.setdefault(lbl, []).append(idx)
        self.corrupt = set()
 
    def __len__(self):
        return len(self.samples)
 
    def _load(self, idx):
        with Image.open(self.samples[idx][0]) as im:
            return self.transform(im.convert("RGB"))
 
    def __getitem__(self, idx):
        label = self.samples[idx][1]
        try:
            return self._load(idx), label
        except Exception as e:
            # Corrupt image: fall back to another image of the same identity.
            print(f"\n[WARN] unreadable image skipped: {self.samples[idx][0]} ({e})")
            for alt in random.sample(self.by_label[label], k=len(self.by_label[label])):
                if alt != idx:
                    try:
                        return self._load(alt), label
                    except Exception:
                        continue
            raise
 
 
class PKBatchSampler(Sampler):
    """Each batch = P random identities x K images (with replacement if identity has < K).
    Identities are drawn uniformly, so identities with many images don't dominate."""
 
    def __init__(self, dataset, p, k, iters, seed):
        self.by_label = dataset.by_label
        self.labels = sorted(self.by_label)
        self.p, self.k, self.iters, self.seed = p, k, iters, seed
        self.epoch = 0
        assert len(self.labels) >= p, "Fewer training identities than P per batch"
 
    def set_epoch(self, epoch):
        self.epoch = epoch
 
    def __len__(self):
        return self.iters
 
    def __iter__(self):
        rng = random.Random(self.seed + self.epoch)
        pool = []
        for _ in range(self.iters):
            if len(pool) < self.p:
                extra = self.labels[:]
                rng.shuffle(extra)
                pool.extend(extra)
            chosen, pool = pool[:self.p], pool[self.p:]
            batch = []
            for lbl in chosen:
                idxs = self.by_label[lbl]
                batch.extend(rng.sample(idxs, self.k) if len(idxs) >= self.k
                             else rng.choices(idxs, k=self.k))
            yield batch
 
 
def build_transforms(cfg, train):
    h, w = cfg.IMAGE_SIZE
    norm = T.Normalize(IMAGENET_MEAN, IMAGENET_STD)
    if not train:
        return T.Compose([T.Resize((h, w)), T.ToTensor(), norm])
    return T.Compose([
        T.Resize((int(h * 1.1), int(w * 1.1))),
        T.RandomRotation(10),
        T.RandomCrop((h, w)),
        T.RandomHorizontalFlip(cfg.HFLIP_PROB),
        T.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.1),
        T.ToTensor(),
        norm,
        T.RandomErasing(p=cfg.ERASE_PROB, scale=(0.02, 0.15)),
    ])
 
 
# ------------------------------ model ------------------------------
def build_model(torchreid, cfg, num_classes, device):
    # loss='triplet' makes the model return (logits, 512-d features) in train mode.
    # In eval mode it returns the 512-d embedding.
    model = torchreid.models.build_model(
        name=cfg.MODEL_NAME,
        num_classes=num_classes,
        loss="triplet",
        pretrained=cfg.USE_PRETRAINED,
    )
    return model.to(device)
 
 
def set_backbone_trainable(model, trainable):
    for name, p in model.named_parameters():
        if not name.startswith("classifier"):
            p.requires_grad = trainable
 
 
def freeze_backbone_bn(model):
    """While the backbone is frozen, keep its BatchNorm statistics fixed too."""
    for name, m in model.named_modules():
        if not name.startswith("classifier") and isinstance(m, nn.modules.batchnorm._BatchNorm):
            m.eval()
 
 
def build_optimizer(model, cfg):
    head = [p for n, p in model.named_parameters() if n.startswith("classifier")]
    body = [p for n, p in model.named_parameters() if not n.startswith("classifier")]
    return torch.optim.Adam(
        [{"params": body, "lr": cfg.LR},
         {"params": head, "lr": cfg.LR * cfg.CLASSIFIER_LR_MULT}],
        weight_decay=cfg.WEIGHT_DECAY,
    )
 
 
# ------------------------------ losses ------------------------------
def batch_hard_triplet_loss(features, labels, margin):
    """Hardest positive / hardest negative per anchor, on L2-normalised embeddings
    (Euclidean distance on the unit sphere is monotonic with cosine similarity)."""
    f = F.normalize(features, dim=1)
    dist = torch.sqrt((2.0 - 2.0 * (f @ f.t())).clamp(min=1e-12))
    same = labels[:, None] == labels[None, :]
    eye = torch.eye(len(labels), dtype=torch.bool, device=labels.device)
    hardest_pos = dist.masked_fill(~(same & ~eye), -1e9).max(dim=1).values
    hardest_neg = dist.masked_fill(same, 1e9).min(dim=1).values
    return F.relu(hardest_pos - hardest_neg + margin).mean()
 
 
# ------------------------------ validation ------------------------------
@torch.no_grad()
def extract_embeddings(model, loader, device, desc="Embedding"):
    model.eval()
    embs, labels = [], []
    for images, lbls in tqdm(loader, desc=desc, unit="batch", leave=False):
        feats = F.normalize(model(images.to(device)), p=2, dim=1)
        embs.append(feats.cpu().numpy())
        labels.append(lbls.numpy())
    return np.concatenate(embs), np.concatenate(labels)
 
 
def compute_rank_metrics(embs, labels):
    """Leave-one-out identification on held-out identities.
    Every image is a query; the gallery for each identity = normalised mean embedding of its
    OTHER images (query image itself excluded for its own identity). Same mean-embedding
    matching as Stage 1."""
    n, d = embs.shape
    c = int(labels.max()) + 1
    sums = np.zeros((c, d), dtype=np.float64)
    np.add.at(sums, labels, embs)
    means = sums / np.linalg.norm(sums, axis=1, keepdims=True).clip(1e-12)
    sims = embs @ means.T                                   # (N, C)
    own = sums[labels] - embs                               # own identity minus the query
    own /= np.linalg.norm(own, axis=1, keepdims=True).clip(1e-12)
    idx = np.arange(n)
    sims[idx, labels] = (embs * own).sum(axis=1)
    true = sims[idx, labels]
    ranks = 1 + (sims > true[:, None]).sum(axis=1)
    return {"rank1": float((ranks <= 1).mean()),
            "rank5": float((ranks <= 5).mean()),
            "num_queries": int(n), "num_identities": c}
 
 
def validate(model, val_loader, device, desc="Validation"):
    embs, labels = extract_embeddings(model, val_loader, device, desc)
    return compute_rank_metrics(embs, labels)
 
 
# ------------------------------ training ------------------------------
def train_one_epoch(model, loader, optimizer, ce_loss, cfg, device, epoch, frozen):
    model.train()
    if frozen:
        freeze_backbone_bn(model)
    tot = ce_sum = tri_sum = acc_sum = 0.0
    n = 0
    bar = tqdm(loader, desc=f"Epoch {epoch:02d}/{cfg.EPOCHS}", unit="it")
    for images, labels in bar:
        images, labels = images.to(device), labels.to(device)
        logits, feats = model(images)
        ce = ce_loss(logits, labels)
        tri = batch_hard_triplet_loss(feats, labels, cfg.TRIPLET_MARGIN)
        loss = ce + cfg.TRIPLET_WEIGHT * tri
        optimizer.zero_grad(set_to_none=True)
        loss.backward()
        optimizer.step()
 
        n += 1
        tot += loss.item()
        ce_sum += ce.item()
        tri_sum += tri.item()
        acc_sum += (logits.argmax(1) == labels).float().mean().item()
        bar.set_postfix(loss=f"{tot / n:.3f}", ce=f"{ce_sum / n:.3f}", tri=f"{tri_sum / n:.3f}")
    return {"loss": tot / n, "ce": ce_sum / n, "triplet": tri_sum / n, "train_acc": acc_sum / n}
 
 
def export_inference_weights(model, path: Path, cfg, epoch, val):
    """Small file for later inference: backbone + 512-d head, no classifier.
    Contains only tensors/numbers/strings (safe with torch.load weights_only=True)."""
    state = {k: v.detach().cpu() for k, v in model.state_dict().items()
             if not k.startswith("classifier")}
    atomic_save({
        "state_dict": state,
        "model_name": cfg.MODEL_NAME,
        "embedding_dim": 512,
        "image_size": [int(cfg.IMAGE_SIZE[0]), int(cfg.IMAGE_SIZE[1])],
        "mean": IMAGENET_MEAN,
        "std": IMAGENET_STD,
        "epoch": int(epoch),
        "val_rank1": float(val["rank1"]),
        "val_rank5": float(val["rank5"]),
    }, path)
 
 
def plot_history(history, path: Path):
    if not history:
        return
    ep = [h["epoch"] for h in history]
    fig, ax = plt.subplots(1, 2, figsize=(11, 4))
    ax[0].plot(ep, [h["loss"] for h in history], label="total")
    ax[0].plot(ep, [h["ce"] for h in history], label="cross-entropy")
    ax[0].plot(ep, [h["triplet"] for h in history], label="triplet")
    ax[0].set_xlabel("epoch"); ax[0].set_title("Training loss"); ax[0].legend(); ax[0].grid(alpha=.3)
    ax[1].plot(ep, [h["val_rank1"] * 100 for h in history], marker="o", label="val Rank-1")
    ax[1].plot(ep, [h["val_rank5"] * 100 for h in history], marker="o", label="val Rank-5")
    ax[1].set_xlabel("epoch"); ax[1].set_ylabel("%"); ax[1].set_title("Held-out identities")
    ax[1].legend(); ax[1].grid(alpha=.3)
    fig.tight_layout(); fig.savefig(path, dpi=130); plt.close(fig)
 
 
# ------------------------------ main ------------------------------
def parse_args():
    ap = argparse.ArgumentParser(description="Fine-tune OSNet-x0.25 for dog Re-ID (Stage 2)")
    ap.add_argument("--resume", action="store_true", help="resume from OUTPUT_DIR/last.pth")
    ap.add_argument("--smoke-test", action="store_true",
                    help="tiny run (2 epochs x 5 iterations) to verify everything works")
    ap.add_argument("--dataset-root", type=str, default=None)
    ap.add_argument("--output-dir", type=str, default=None)
    return ap.parse_args()
 
 
def main():
    args = parse_args()
    cfg = Config()
    if args.dataset_root:
        cfg.DATASET_ROOT = Path(args.dataset_root)
    if args.output_dir:
        cfg.OUTPUT_DIR = Path(args.output_dir)
    if args.smoke_test:
        cfg.EPOCHS, cfg.ITERS_PER_EPOCH, cfg.SAVE_EVERY = 2, 5, 1
        cfg.FREEZE_BACKBONE_EPOCHS = 1
        cfg.OUTPUT_DIR = cfg.OUTPUT_DIR.parent / (cfg.OUTPUT_DIR.name + "_smoketest")
 
    assert cfg.BATCH_SIZE % cfg.K_INSTANCES == 0, "BATCH_SIZE must be divisible by K_INSTANCES"
    p_ids = cfg.BATCH_SIZE // cfg.K_INSTANCES
 
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    if cfg.NUM_THREADS:
        torch.set_num_threads(cfg.NUM_THREADS)
    seed_everything(cfg.SEED)
    torchreid = import_torchreid(cfg)
 
    out = cfg.OUTPUT_DIR
    last_path, best_path = out / "last.pth", out / "best.pth"
    if last_path.exists() and not args.resume and not args.smoke_test:
        sys.exit(f"{last_path} already exists.\n"
                 f"  -> continue that run:   python backend/train_reid.py --resume\n"
                 f"  -> or start over: rename/delete '{out}' first (nothing was overwritten).")
    out.mkdir(parents=True, exist_ok=True)
 
    print(f"Device        : {device}  (threads: {torch.get_num_threads()})")
    print(f"Dataset       : {cfg.DATASET_ROOT / cfg.TRAIN_SUBDIR}")
    print(f"Output        : {out}")
 
    # ---------- data ----------
    id_to_paths = scan_identities(cfg.DATASET_ROOT / cfg.TRAIN_SUBDIR)
    counts = np.array([len(v) for v in id_to_paths.values()])
    print(f"Identities    : {len(id_to_paths)} | images: {counts.sum()} | per identity "
          f"min/median/max = {counts.min()}/{int(np.median(counts))}/{counts.max()}")
 
    split_file = out / "split.json"
    if args.resume and split_file.exists():
        sp = json.loads(split_file.read_text(encoding="utf-8"))
        train_ids, val_ids = sp["train_ids"], sp["val_ids"]
        missing = [i for i in train_ids + val_ids if i not in id_to_paths]
        if missing:
            sys.exit(f"Saved split refers to identities no longer on disk: {missing[:5]}...")
    else:
        train_ids, val_ids = split_identities(id_to_paths, cfg.VAL_FRACTION, cfg.SEED)
        if args.smoke_test:
            train_ids, val_ids = train_ids[:max(p_ids, 12)], val_ids[:10]
        split_file.write_text(json.dumps({"train_ids": train_ids, "val_ids": val_ids}, indent=1),
                              encoding="utf-8")
    assert not set(train_ids) & set(val_ids), "identity leakage between train and val!"
 
    train_samples, class_names = make_samples(id_to_paths, train_ids)
    val_samples, _ = make_samples(id_to_paths, val_ids)
    print(f"Train         : {len(train_ids)} identities / {len(train_samples)} images")
    print(f"Validation    : {len(val_ids)} held-out identities / {len(val_samples)} images "
          f"(no identity overlap with train)")
 
    train_ds = ReIDDataset(train_samples, build_transforms(cfg, train=True))
    val_ds = ReIDDataset(val_samples, build_transforms(cfg, train=False))
    sampler = PKBatchSampler(train_ds, p_ids, cfg.K_INSTANCES, cfg.ITERS_PER_EPOCH, cfg.SEED)
    pin = device.type == "cuda"
    nw = cfg.NUM_WORKERS
    train_loader = DataLoader(train_ds, batch_sampler=sampler, num_workers=nw, pin_memory=pin,
                              persistent_workers=nw > 0)
    val_loader = DataLoader(val_ds, batch_size=cfg.VAL_BATCH_SIZE, shuffle=False,
                            num_workers=nw, pin_memory=pin)
 
    # ---------- model / optimiser ----------
    model = build_model(torchreid, cfg, len(class_names), device)
    optimizer = build_optimizer(model, cfg)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=cfg.EPOCHS,
                                                           eta_min=1e-6)
    ce_loss = nn.CrossEntropyLoss(label_smoothing=cfg.LABEL_SMOOTH)
 
    start_epoch, best, history = 1, (-1.0, -1.0), []
    if args.resume:
        if not last_path.exists():
            sys.exit(f"Nothing to resume: {last_path} not found.")
        ck = torch_load(last_path)
        if (ck["num_classes"] != len(class_names) or ck["model_name"] != cfg.MODEL_NAME
                or list(ck["image_size"]) != list(cfg.IMAGE_SIZE)):
            sys.exit("Checkpoint does not match current MODEL_NAME / IMAGE_SIZE / identities. "
                     "Restore the original settings to resume.")
        model.load_state_dict(ck["model"])
        optimizer.load_state_dict(ck["optimizer"])
        scheduler.load_state_dict(ck["scheduler"])
        start_epoch, best, history = ck["epoch"] + 1, tuple(ck["best"]), ck["history"]
        print(f"Resumed from epoch {ck['epoch']} (best val Rank-1 so far: {best[0] * 100:.2f}%)")
        if start_epoch > cfg.EPOCHS:
            print("Training already completed for the configured EPOCHS. "
                  "Increase Config.EPOCHS to train further.")
    else:
        base = validate(model, val_loader, device, "Baseline validation")
        print(f"[Epoch 0 | zero-shot pretrained] val Rank-1 {base['rank1'] * 100:.2f}% | "
              f"Rank-5 {base['rank5'] * 100:.2f}%  <- the number training must beat")
        (out / "baseline_val.json").write_text(json.dumps(base, indent=1), encoding="utf-8")
 
    # ---------- train loop ----------
    print(f"\nTraining {cfg.EPOCHS} epochs x {cfg.ITERS_PER_EPOCH} iterations "
          f"(batch {cfg.BATCH_SIZE} = {p_ids} ids x {cfg.K_INSTANCES} imgs). Ctrl+C is safe; "
          f"resume with --resume.\n")
    t0 = time.time()
    epoch = start_epoch - 1
    try:
        for epoch in range(start_epoch, cfg.EPOCHS + 1):
            frozen = epoch <= cfg.FREEZE_BACKBONE_EPOCHS
            set_backbone_trainable(model, not frozen)
            sampler.set_epoch(epoch)
            if frozen:
                print("(backbone frozen this epoch - warming up the new classifier head)")
            stats = train_one_epoch(model, train_loader, optimizer, ce_loss, cfg, device,
                                    epoch, frozen)
            scheduler.step()
            val = validate(model, val_loader, device)
            history.append({"epoch": epoch, **stats,
                            "val_rank1": val["rank1"], "val_rank5": val["rank5"]})
 
            score = (val["rank1"], val["rank5"])
            is_best = score > tuple(best)
            if is_best:
                best = score
                export_inference_weights(model, best_path, cfg, epoch, val)
            atomic_save({
                "model": model.state_dict(), "optimizer": optimizer.state_dict(),
                "scheduler": scheduler.state_dict(), "epoch": epoch, "best": list(best),
                "history": history, "num_classes": len(class_names),
                "model_name": cfg.MODEL_NAME, "image_size": list(cfg.IMAGE_SIZE),
            }, last_path)
            if cfg.SAVE_EVERY and epoch % cfg.SAVE_EVERY == 0:
                export_inference_weights(model, out / f"epoch_{epoch:03d}.pth", cfg, epoch, val)
            plot_history(history, out / "training_curves.png")
            (out / "history.json").write_text(json.dumps(history, indent=1), encoding="utf-8")
 
            done = epoch - start_epoch + 1
            eta = (time.time() - t0) / done * (cfg.EPOCHS - epoch) / 60
            print(f"Epoch {epoch:02d} | loss {stats['loss']:.3f} (ce {stats['ce']:.3f}, "
                  f"tri {stats['triplet']:.3f}) | train-acc {stats['train_acc'] * 100:.1f}% | "
                  f"val Rank-1 {val['rank1'] * 100:.2f}% Rank-5 {val['rank5'] * 100:.2f}%"
                  f"{'  * best' if is_best else ''} | ETA ~{eta:.0f} min\n")
    except KeyboardInterrupt:
        print(f"\nInterrupted. Progress up to epoch {epoch - 1} is saved in {last_path}.\n"
              f"Continue later with:  python backend/train_reid.py --resume")
        return
 
    if history:
        last_val = {"rank1": history[-1]["val_rank1"], "rank5": history[-1]["val_rank5"]}
        export_inference_weights(model, out / "final.pth", cfg, history[-1]["epoch"], last_val)
        print("================ TRAINING FINISHED ================")
        print(f"Best val Rank-1 / Rank-5 : {best[0] * 100:.2f}% / {best[1] * 100:.2f}%")
        print(f"Best model  : {best_path}")
        print(f"Final model : {out / 'final.pth'}")
        print(f"Curves      : {out / 'training_curves.png'}")
 
 
if __name__ == "__main__":
    main()
 