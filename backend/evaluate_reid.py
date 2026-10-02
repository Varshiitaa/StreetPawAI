"""
Stage-1 zero-shot Re-ID baseline: pretrained OSNet-x0.25, no training.
Gallery = test_200_database/<identity>/*.jpg
Query   = test_200_single_img/<identity>.jpg  (identity taken from filename stem)
"""

import csv
import re
import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")  # no display needed
import matplotlib.pyplot as plt
import numpy as np
import torch
import torchvision.transforms as T
from PIL import Image
from tqdm import tqdm

# ============================ CONFIG ============================
# Script lives in Streetpaw/StreetPawAI/backend/ -> dataset is 3 levels up.
DATASET_ROOT = Path(r"C:\Users\Geyas\OneDrive\Desktop\Streetpaw\Dog Face Recognition\DogFaceNet - Dog Face Recognition")
GALLERY_DIR = DATASET_ROOT / "test_200_database"
QUERY_DIR = DATASET_ROOT / "test_200_single_img"
OUTPUT_DIR = Path(__file__).resolve().parent / "reid_results"

MODEL_NAME = "osnet_x0_25"
# None -> torchreid's ImageNet-pretrained weights (auto-download).
# Or a path to a Re-ID checkpoint, e.g. r"C:\...\osnet_x0_25_msmt17.pth"
WEIGHTS_PATH = r"C:\Users\Geyas\OneDrive\Desktop\Streetpaw\StreetPawAI\backend\reid_training_output\best.pth"

INPUT_HEIGHT, INPUT_WIDTH = 256, 128   # standard OSNet Re-ID input size (H, W)
BATCH_SIZE = 32
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tif", ".tiff"}

# Optional regex removed from the query filename stem to get the identity,
# e.g. r"_\d+$" turns "Adagio_1" into "Adagio". None = use stem as-is.
QUERY_STEM_STRIP_REGEX = None

MAX_PLOT_RANK = 50   # x-axis limit of the CMC plot
# ================================================================

_TRANSFORM = T.Compose([
    T.Resize((INPUT_HEIGHT, INPUT_WIDTH)),
    T.ToTensor(),
    T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])


def list_images(folder: Path):
    return sorted(p for p in folder.iterdir()
                  if p.is_file() and p.suffix.lower() in IMAGE_EXTS)


def load_model(device):
    try:
        import torchreid
    except ImportError:
        sys.exit("torchreid is not installed. See the install instructions.")

    model = torchreid.models.build_model(
        name=MODEL_NAME,
        num_classes=1000,               # classifier head is unused in eval mode
        loss="softmax",
        pretrained=(WEIGHTS_PATH is None),
    )
    if WEIGHTS_PATH is not None:
        torchreid.utils.load_pretrained_weights(model, str(WEIGHTS_PATH))
        print(f"Loaded weights from: {WEIGHTS_PATH}")
    else:
        print("Using torchreid ImageNet-pretrained weights.")
    model.to(device).eval()
    return model


def preprocess_image(path: Path) -> torch.Tensor:
    """Open, convert to RGB, resize, normalize. Raises on corrupt files."""
    with Image.open(path) as img:
        img = img.convert("RGB")
        return _TRANSFORM(img)


@torch.no_grad()
def extract_embedding(model, batch: torch.Tensor, device) -> np.ndarray:
    """batch: (B,3,H,W) -> L2-normalized (B,512) numpy array."""
    feats = model(batch.to(device))           # eval mode returns 512-d features
    feats = torch.nn.functional.normalize(feats, p=2, dim=1)
    return feats.cpu().numpy()


def embed_paths(model, paths, device, desc):
    """Embed many images in batches. Returns (embeddings, ok_paths, failed_paths)."""
    embs, ok, failed = [], [], []
    for i in tqdm(range(0, len(paths), BATCH_SIZE), desc=desc, unit="batch"):
        tensors, batch_ok = [], []
        for p in paths[i:i + BATCH_SIZE]:
            try:
                tensors.append(preprocess_image(p))
                batch_ok.append(p)
            except Exception as e:
                failed.append((p, str(e)))
        if tensors:
            embs.append(extract_embedding(model, torch.stack(tensors), device))
            ok.extend(batch_ok)
    embs = np.concatenate(embs, axis=0) if embs else np.zeros((0, 512), np.float32)
    return embs, ok, failed


def _normalize(v: np.ndarray) -> np.ndarray:
    return v / max(np.linalg.norm(v), 1e-12)


def build_gallery(model, gallery_dir: Path, device):
    """Returns (identity_names, gallery_matrix[N,512], n_images, failed)."""
    if not gallery_dir.is_dir():
        sys.exit(f"Gallery folder not found: {gallery_dir}")

    paths, labels = [], []
    for identity_dir in sorted(d for d in gallery_dir.iterdir() if d.is_dir()):
        for p in list_images(identity_dir):
            paths.append(p)
            labels.append(identity_dir.name)
    if not paths:
        sys.exit(f"No gallery images found in {gallery_dir}")

    embs, ok_paths, failed = embed_paths(model, paths, device, "Gallery")
    label_of = dict(zip(paths, labels))

    per_identity = {}
    for e, p in zip(embs, ok_paths):
        per_identity.setdefault(label_of[p], []).append(e)

    names = sorted(per_identity)
    matrix = np.stack([_normalize(np.mean(per_identity[n], axis=0)) for n in names])

    empty = sorted(set(labels) - set(names))
    if empty:
        print(f"[WARN] {len(empty)} gallery identities had no readable images "
              f"and were skipped: {empty}")
    return names, matrix, len(ok_paths), failed


def load_queries(query_dir: Path):
    if not query_dir.is_dir():
        sys.exit(f"Query folder not found: {query_dir}")
    paths = list_images(query_dir)
    if not paths:
        sys.exit(f"No query images found in {query_dir}")
    return paths


def query_identity(path: Path) -> str:
    stem = path.stem
    if QUERY_STEM_STRIP_REGEX:
        stem = re.sub(QUERY_STEM_STRIP_REGEX, "", stem)
    return stem


def evaluate_queries(model, query_paths, names, gallery, device):
    """Returns (rows, ranks_of_matched, unmatched, failed)."""
    embs, ok_paths, failed = embed_paths(model, query_paths, device, "Queries")
    lookup = {n.lower(): i for i, n in enumerate(names)}

    rows, ranks, unmatched = [], [], []
    for q_emb, path in tqdm(list(zip(embs, ok_paths)), desc="Ranking", unit="query"):
        sims = gallery @ q_emb                       # cosine similarity
        order = np.argsort(-sims)
        gt = query_identity(path)
        gt_idx = lookup.get(gt.lower())

        if gt_idx is None:
            unmatched.append((path.name, gt))
            rank = ""
        else:
            rank = int(np.where(order == gt_idx)[0][0]) + 1
            ranks.append(rank)

        rows.append({
            "query_filename": path.name,
            "ground_truth_identity": gt,
            "predicted_identity": names[order[0]],
            "top_similarity_score": f"{sims[order[0]]:.6f}",
            "rank_of_correct_identity": rank,
        })
    return rows, ranks, unmatched, failed


def calculate_rank_metrics(ranks, num_gallery_ids):
    ranks = np.asarray(ranks)
    if ranks.size == 0:
        return {"rank1": float("nan"), "rank5": float("nan"),
                "cmc": np.zeros(num_gallery_ids)}
    cmc = np.array([(ranks <= k).mean() for k in range(1, num_gallery_ids + 1)])
    return {
        "rank1": float((ranks <= 1).mean()),
        "rank5": float((ranks <= 5).mean()),
        "cmc": cmc,
    }


def save_results(rows, cmc, output_dir: Path):
    output_dir.mkdir(parents=True, exist_ok=True)
    csv_path = output_dir / "reid_results.csv"
    png_path = output_dir / "cmc_curve.png"

    fields = ["query_filename", "ground_truth_identity", "predicted_identity",
              "top_similarity_score", "rank_of_correct_identity"]
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(rows)

    k = min(MAX_PLOT_RANK, len(cmc))
    plt.figure(figsize=(7, 5))
    plt.plot(range(1, k + 1), cmc[:k] * 100, marker="o", markersize=3)
    plt.xlabel("Rank")
    plt.ylabel("Identification rate (%)")
    plt.title("CMC curve - zero-shot OSNet-x0.25")
    plt.ylim(0, 100)
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(png_path, dpi=150)
    plt.close()
    return csv_path, png_path


def main():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device}")
    print(f"Gallery: {GALLERY_DIR}\nQueries: {QUERY_DIR}\n")

    model = load_model(device)
    names, gallery, n_gallery_imgs, gallery_failed = build_gallery(model, GALLERY_DIR, device)
    query_paths = load_queries(QUERY_DIR)
    rows, ranks, unmatched, query_failed = evaluate_queries(
        model, query_paths, names, gallery, device)
    metrics = calculate_rank_metrics(ranks, len(names))
    csv_path, png_path = save_results(rows, metrics["cmc"], OUTPUT_DIR)

    for label, failed in (("gallery", gallery_failed), ("query", query_failed)):
        if failed:
            print(f"\n[WARN] Skipped {len(failed)} unreadable {label} image(s):")
            for p, err in failed:
                print(f"  - {p}  ({err})")
    if unmatched:
        print(f"\n[WARN] {len(unmatched)} query(ies) have no matching gallery "
              f"identity (excluded from accuracy):")
        for fname, gt in unmatched:
            print(f"  - {fname}  (parsed identity: '{gt}')")

    print("\n================ RESULTS ================")
    print(f"Gallery identities      : {len(names)}")
    print(f"Gallery images          : {n_gallery_imgs}")
    print(f"Query images (total)    : {len(query_paths)}")
    print(f"Successfully matched    : {len(ranks)}")
    print(f"Rank-1 accuracy         : {metrics['rank1'] * 100:.2f}%")
    print(f"Rank-5 accuracy         : {metrics['rank5'] * 100:.2f}%")
    print(f"CSV saved to            : {csv_path}")
    print(f"CMC plot saved to       : {png_path}")


if __name__ == "__main__":
    main()