"""
Stage-3: Animal Re-ID inference.

Uses fine-tuned OSNet-x0.25 embeddings to identify dogs.

Features:
- Existing gallery identities receive permanent numeric IDs.
- New animals receive new numeric IDs.
- New animals are stored with their embedding.
- The same new animal can be recognized again later.
- CPU compatible.
"""

import argparse
import hashlib
import json
import sys
import time
from pathlib import Path

import numpy as np
import torch
import torch.nn.functional as F
import torchvision.transforms as T
from PIL import Image, ImageOps
from tqdm import tqdm


# ============================== CONFIG ==============================

BACKEND_DIR = Path(__file__).resolve().parent

CHECKPOINT_PATH = BACKEND_DIR / "reid_training_output" / "best.pth"

GALLERY_DIR = Path(
    r"C:\Users\Geyas\OneDrive\Desktop\Streetpaw\Dog Face Recognition"
    r"\DogFaceNet - Dog Face Recognition\test_200_database"
)

CACHE_PATH = BACKEND_DIR / "reid_cache" / "gallery_cache.npz"

REGISTRY_PATH = BACKEND_DIR / "reid_cache" / "animal_registry.json"

TORCHREID_REPO = Path(
    r"C:\Users\Geyas\OneDrive\Desktop\Streetpaw\deep-person-reid"
)

DEFAULT_MODEL_NAME = "osnet_x0_25"

DEFAULT_IMAGE_SIZE = (256, 128)

IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]

# NOTE:
# This threshold is a placeholder.
# You can tune it later using validation data.
DEFAULT_THRESHOLD = 0.50

DEFAULT_TOP_K = 5

BATCH_SIZE = 32

IMAGE_EXTS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".bmp",
    ".webp",
    ".tif",
    ".tiff",
}

# ====================================================================


# ============================== UTILS ===============================

def import_torchreid():
    try:
        import torchreid
        return torchreid
    except ImportError:
        if TORCHREID_REPO.is_dir():
            sys.path.insert(0, str(TORCHREID_REPO))

        try:
            import torchreid
            return torchreid
        except ImportError:
            sys.exit(
                "torchreid not found. Activate your venv or fix TORCHREID_REPO."
            )


def torch_load(path):
    try:
        return torch.load(
            path,
            map_location="cpu",
            weights_only=False
        )
    except TypeError:
        return torch.load(
            path,
            map_location="cpu"
        )


def list_images(folder: Path):
    return sorted(
        p
        for p in folder.iterdir()
        if p.is_file() and p.suffix.lower() in IMAGE_EXTS
    )


def sha1_of_file(path: Path):
    h = hashlib.sha1()

    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)

    return h.hexdigest()


def gallery_fingerprint(gallery_dir: Path):
    h = hashlib.sha1()
    n_imgs = 0

    for d in sorted(
        p for p in gallery_dir.iterdir()
        if p.is_dir()
    ):
        for p in list_images(d):
            h.update(
                f"{d.name}/{p.name}:{p.stat().st_size}\n".encode("utf-8")
            )
            n_imgs += 1

    return h.hexdigest(), n_imgs


# ============================== MODEL ===============================

def load_model(checkpoint_path: Path, device):

    if not checkpoint_path.is_file():
        sys.exit(
            f"Checkpoint not found: {checkpoint_path}"
        )

    torchreid = import_torchreid()

    ckpt = torch_load(checkpoint_path)

    meta = {
        "model_name": ckpt.get(
            "model_name",
            DEFAULT_MODEL_NAME
        ),
        "image_size": tuple(
            ckpt.get(
                "image_size",
                DEFAULT_IMAGE_SIZE
            )
        ),
        "mean": ckpt.get(
            "mean",
            IMAGENET_MEAN
        ),
        "std": ckpt.get(
            "std",
            IMAGENET_STD
        ),
        "epoch": ckpt.get(
            "epoch"
        ),
        "val_rank1": ckpt.get(
            "val_rank1"
        ),
    }

    model = torchreid.models.build_model(
        name=meta["model_name"],
        num_classes=1000,
        loss="softmax",
        pretrained=False
    )

    torchreid.utils.load_pretrained_weights(
        model,
        str(checkpoint_path)
    )

    model.to(device)
    model.eval()

    print(
        f"Device: {device} | "
        f"model: {meta['model_name']} | "
        f"input size: {meta['image_size'][0]}x{meta['image_size'][1]} "
        f"(HxW) | "
        f"checkpoint epoch: {meta['epoch']}"
    )

    return model, meta


def build_transform(image_size, mean, std):

    h, w = image_size

    return T.Compose([
        T.Resize((h, w)),
        T.ToTensor(),
        T.Normalize(mean, std)
    ])


def preprocess_image(
    img: Image.Image,
    transform
):

    img = ImageOps.exif_transpose(
        img
    ).convert("RGB")

    return transform(img)


@torch.no_grad()
def extract_embedding(
    model,
    batch: torch.Tensor,
    device
):

    features = model(
        batch.to(device)
    )

    return F.normalize(
        features,
        p=2,
        dim=1
    ).cpu().numpy()


def _l2(v: np.ndarray):

    norm = float(
        np.linalg.norm(v)
    )

    return v / max(
        norm,
        1e-12
    )


# ============================== GALLERY =============================

def build_gallery(
    model,
    gallery_dir: Path,
    transform,
    device
):

    if not gallery_dir.is_dir():
        sys.exit(
            f"Gallery folder not found: {gallery_dir}"
        )

    paths = []
    labels = []

    for d in sorted(
        p for p in gallery_dir.iterdir()
        if p.is_dir()
    ):

        for p in list_images(d):

            paths.append(p)
            labels.append(d.name)

    if not paths:
        sys.exit(
            f"No gallery images found in {gallery_dir}"
        )

    per_id = {}
    failed = []

    for i in tqdm(
        range(
            0,
            len(paths),
            BATCH_SIZE
        ),
        desc="Building gallery",
        unit="batch"
    ):

        tensors = []
        ok = []

        batch_paths = paths[
            i:i + BATCH_SIZE
        ]

        batch_labels = labels[
            i:i + BATCH_SIZE
        ]

        for p, lbl in zip(
            batch_paths,
            batch_labels
        ):

            try:

                with Image.open(p) as im:

                    tensors.append(
                        preprocess_image(
                            im,
                            transform
                        )
                    )

                ok.append(lbl)

            except Exception as e:

                failed.append(
                    (
                        p,
                        str(e)
                    )
                )

        if tensors:

            embs = extract_embedding(
                model,
                torch.stack(tensors),
                device
            )

            for emb, lbl in zip(
                embs,
                ok
            ):

                per_id.setdefault(
                    lbl,
                    []
                ).append(emb)

    names = sorted(
        per_id
    )

    matrix = np.stack([
        _l2(
            np.mean(
                per_id[name],
                axis=0
            )
        )
        for name in names
    ]).astype(
        np.float32
    )

    counts = np.array(
        [
            len(per_id[name])
            for name in names
        ],
        dtype=np.int32
    )

    return (
        names,
        matrix,
        counts,
        failed
    )


def load_or_build_gallery(
    model,
    gallery_dir,
    transform,
    device,
    cache_path,
    cache_key,
    use_cache,
    rebuild
):

    if (
        use_cache
        and not rebuild
        and cache_path.is_file()
    ):

        try:

            with np.load(
                cache_path,
                allow_pickle=False
            ) as z:

                if str(
                    z["key"]
                ) == cache_key:

                    print(
                        f"Gallery loaded from cache: "
                        f"{cache_path}"
                    )

                    return (
                        list(z["names"]),
                        z["embeddings"],
                        z["counts"]
                    )

            print(
                "Gallery cache is out of date - rebuilding."
            )

        except Exception as e:

            print(
                f"[WARN] Could not read gallery cache "
                f"({e}) - rebuilding."
            )

    (
        names,
        matrix,
        counts,
        failed
    ) = build_gallery(
        model,
        gallery_dir,
        transform,
        device
    )

    if failed:

        print(
            f"[WARN] Skipped {len(failed)} "
            f"unreadable gallery images."
        )

    if use_cache:

        cache_path.parent.mkdir(
            parents=True,
            exist_ok=True
        )

        tmp = cache_path.with_suffix(
            ".tmp.npz"
        )

        np.savez(
            tmp,
            names=np.array(names),
            embeddings=matrix,
            counts=counts,
            key=np.array(cache_key)
        )

        tmp.replace(
            cache_path
        )

        print(
            f"Gallery cache saved: {cache_path}"
        )

    return (
        names,
        matrix,
        counts
    )


# ============================== MAIN API ============================

class AnimalReID:

    def __init__(
        self,
        checkpoint_path=CHECKPOINT_PATH,
        gallery_dir=GALLERY_DIR,
        cache_path=CACHE_PATH,
        image_size=None,
        use_cache=True,
        rebuild_cache=False,
        device=None
    ):

        self.device = torch.device(
            device
            or (
                "cuda"
                if torch.cuda.is_available()
                else "cpu"
            )
        )

        self.checkpoint_path = Path(
            checkpoint_path
        )

        self.gallery_dir = Path(
            gallery_dir
        )

        self.model, meta = load_model(
            self.checkpoint_path,
            self.device
        )

        self.image_size = (
            tuple(image_size)
            if image_size
            else tuple(meta["image_size"])
        )

        self.transform = build_transform(
            self.image_size,
            meta["mean"],
            meta["std"]
        )

        if not self.gallery_dir.is_dir():

            sys.exit(
                f"Gallery folder not found: "
                f"{self.gallery_dir}"
            )

        fp, n_imgs = gallery_fingerprint(
            self.gallery_dir
        )

        cache_key = hashlib.sha1(
            (
                f"{sha1_of_file(self.checkpoint_path)}"
                f"|{fp}"
                f"|{self.image_size}"
            ).encode()
        ).hexdigest()

        (
            self.names,
            self.gallery,
            self.counts
        ) = load_or_build_gallery(
            self.model,
            self.gallery_dir,
            self.transform,
            self.device,
            Path(cache_path),
            cache_key,
            use_cache,
            rebuild_cache
        )

        print(
            f"Gallery: {len(self.names)} identities, "
            f"{int(self.counts.sum())} images\n"
        )

        self._load_registry()


    # ========================== EMBEDDING ==========================

    def embed(
        self,
        img: Image.Image
    ) -> np.ndarray:

        tensor = preprocess_image(
            img,
            self.transform
        ).unsqueeze(0)

        embedding = extract_embedding(
            self.model,
            tensor,
            self.device
        )[0]

        return _l2(
            embedding
        ).astype(
            np.float32
        )


    # ========================== REGISTRY ===========================

    def _load_registry(self):

        self.registry = {}

        if REGISTRY_PATH.is_file():

            try:

                with open(
                    REGISTRY_PATH,
                    "r",
                    encoding="utf-8"
                ) as f:

                    data = json.load(f)

                if isinstance(
                    data,
                    dict
                ) and "animals" in data:

                    self.registry = data["animals"]

                elif isinstance(
                    data,
                    dict
                ):

                    # Convert old format
                    for identity, animal_id in data.items():

                        self.registry[identity] = {
                            "animal_id": int(animal_id),
                            "embedding": None
                        }

            except Exception as e:

                print(
                    f"[WARN] Could not load registry: {e}"
                )

                self.registry = {}

        # Add all gallery identities
        # with permanent numeric IDs.

        next_id = 1

        for identity, embedding in zip(
            self.names,
            self.gallery
        ):

            if identity not in self.registry:

                self.registry[identity] = {
                    "animal_id": next_id,
                    "embedding": embedding.tolist()
                }

                next_id += 1

            else:

                existing = self.registry[identity]

                if isinstance(
                    existing,
                    int
                ):

                    self.registry[identity] = {
                        "animal_id": existing,
                        "embedding": embedding.tolist()
                    }

                elif (
                    isinstance(existing, dict)
                    and existing.get("embedding") is None
                ):

                    existing["embedding"] = (
                        embedding.tolist()
                    )

        # Find highest ID

        existing_ids = []

        for value in self.registry.values():

            if isinstance(
                value,
                dict
            ):

                if "animal_id" in value:

                    try:

                        existing_ids.append(
                            int(
                                value["animal_id"]
                            )
                        )

                    except Exception:
                        pass

            elif isinstance(
                value,
                int
            ):

                existing_ids.append(
                    int(value)
                )

        self.next_animal_id = (
            max(existing_ids, default=0) + 1
        )

        self._save_registry()


    def _save_registry(self):

        REGISTRY_PATH.parent.mkdir(
            parents=True,
            exist_ok=True
        )

        data = {
            "animals": self.registry
        }

        with open(
            REGISTRY_PATH,
            "w",
            encoding="utf-8"
        ) as f:

            json.dump(
                data,
                f,
                indent=2
            )


    # ========================== IDENTIFY ============================

    def identify(
        self,
        img: Image.Image,
        threshold=DEFAULT_THRESHOLD,
        top_k=DEFAULT_TOP_K
    ):

        """
        Identify an animal and assign a persistent numeric Animal ID.
        """

        query_embedding = self.embed(
            img
        )

        # ------------------------------------------------------------
        # Compare query against every registered animal.
        # This includes:
        # 1. Original gallery animals
        # 2. Newly created animals
        # ------------------------------------------------------------

        identities = []
        embeddings = []

        for identity, info in self.registry.items():

            if not isinstance(
                info,
                dict
            ):
                continue

            embedding = info.get(
                "embedding"
            )

            if embedding is None:
                continue

            try:

                emb = np.asarray(
                    embedding,
                    dtype=np.float32
                )

                emb = _l2(
                    emb
                )

                identities.append(
                    identity
                )

                embeddings.append(
                    emb
                )

            except Exception:
                continue

        # Safety fallback
        if not embeddings:

            identities = list(
                self.names
            )

            embeddings = [
                e
                for e in self.gallery
            ]

        registry_matrix = np.stack(
            embeddings
        ).astype(
            np.float32
        )

        # Cosine similarity
        similarities = (
            registry_matrix
            @ query_embedding
        )

        order = np.argsort(
            -similarities
        )[
            :max(
                1,
                min(
                    top_k,
                    len(identities)
                )
            )
        ]

        top = []

        for i in order:

            top.append({
                "identity": identities[i],
                "similarity": float(
                    similarities[i]
                )
            })

        best_similarity = float(
            top[0]["similarity"]
        )

        closest_identity = (
            top[0]["identity"]
        )

        # ------------------------------------------------------------
        # UNKNOWN / NEW ANIMAL
        # ------------------------------------------------------------

        if best_similarity < threshold:

            animal_id = (
                self.next_animal_id
            )

            self.next_animal_id += 1

            identity = (
                f"animal_{animal_id}"
            )

            self.registry[identity] = {
                "animal_id": animal_id,
                "embedding": query_embedding.tolist()
            }

            self._save_registry()

            print(
                f"[NEW ANIMAL] "
                f"Created Animal ID: {animal_id}"
            )

            return {
                "label": "Unknown / New Animal",
                "animal_id": animal_id,
                "is_unknown": True,
                "closest_identity": identity,
                "similarity": best_similarity,
                "threshold": float(threshold),
                "top_k": top
            }

        # ------------------------------------------------------------
        # KNOWN ANIMAL
        # ------------------------------------------------------------

        info = self.registry.get(
            closest_identity
        )

        if isinstance(
            info,
            dict
        ):

            animal_id = info.get(
                "animal_id"
            )

        else:

            animal_id = None

        # If somehow the identity has no ID,
        # assign one.

        if animal_id is None:

            animal_id = (
                self.next_animal_id
            )

            self.next_animal_id += 1

            self.registry[
                closest_identity
            ] = {
                "animal_id": animal_id,
                "embedding": query_embedding.tolist()
            }

            self._save_registry()

        return {
            "label": closest_identity,
            "animal_id": int(animal_id),
            "is_unknown": False,
            "closest_identity": closest_identity,
            "similarity": best_similarity,
            "threshold": float(threshold),
            "top_k": top
        }


# ============================== CLI ================================

def parse_args():

    ap = argparse.ArgumentParser(
        description="Animal Re-ID inference"
    )

    ap.add_argument(
        "--query",
        required=True,
        help="path to query image"
    )

    ap.add_argument(
        "--threshold",
        type=float,
        default=DEFAULT_THRESHOLD,
        help="cosine similarity threshold"
    )

    ap.add_argument(
        "--top-k",
        type=int,
        default=DEFAULT_TOP_K
    )

    ap.add_argument(
        "--checkpoint",
        type=str,
        default=str(CHECKPOINT_PATH)
    )

    ap.add_argument(
        "--gallery-dir",
        type=str,
        default=str(GALLERY_DIR)
    )

    ap.add_argument(
        "--cache-path",
        type=str,
        default=str(CACHE_PATH)
    )

    ap.add_argument(
        "--image-size",
        type=int,
        nargs=2,
        metavar=("H", "W"),
        default=None
    )

    ap.add_argument(
        "--rebuild-cache",
        action="store_true"
    )

    ap.add_argument(
        "--no-cache",
        action="store_true"
    )

    return ap.parse_args()


def main():

    args = parse_args()

    query_path = Path(
        args.query
    ).expanduser()

    if not query_path.is_file():

        sys.exit(
            f"Query image not found: "
            f"{query_path}"
        )

    try:

        with Image.open(
            query_path
        ) as im:

            query_img = im.convert(
                "RGB"
            )

    except Exception as e:

        sys.exit(
            f"Could not read query image: {e}"
        )

    t0 = time.time()

    reid = AnimalReID(
        checkpoint_path=args.checkpoint,
        gallery_dir=args.gallery_dir,
        cache_path=args.cache_path,
        image_size=args.image_size,
        use_cache=not args.no_cache,
        rebuild_cache=args.rebuild_cache
    )

    t1 = time.time()

    result = reid.identify(
        query_img,
        threshold=args.threshold,
        top_k=args.top_k
    )

    t2 = time.time()

    print(
        "\n================ RESULT ================"
    )

    print(
        f"Query       : {query_path.name}"
    )

    print(
        f"Animal ID   : {result['animal_id']}"
    )

    print(
        f"Decision    : {result['label']}"
    )

    print(
        f"Similarity  : {result['similarity']:.4f}"
    )

    print(
        f"Unknown     : {result['is_unknown']}"
    )

    print(
        f"Threshold   : {result['threshold']:.4f}"
    )

    print(
        f"\nTop-{len(result['top_k'])} matches:"
    )

    for rank, item in enumerate(
        result["top_k"],
        1
    ):

        print(
            f"  {rank}. "
            f"{item['identity']:<20s} "
            f"{item['similarity']:.4f}"
        )

    print(
        f"\nTiming: setup "
        f"{t1 - t0:.1f}s | "
        f"identification "
        f"{t2 - t1:.2f}s"
    )


if __name__ == "__main__":
    main()