import os
from PIL import Image
from breed_classifier import init_breed_classifier, classify_breed

print("[INFO] Testing Breed Classifier...")
success = init_breed_classifier()
print(f"[INFO] Initialized: {success}")

test_classes = ["Indian breed", "Golden_retriever", "Pug", "German_shepherd"]
base_dir = os.path.join(os.path.dirname(__file__), "..", "Breeds")

for breed_name in test_classes:
    folder = os.path.join(base_dir, breed_name)
    if os.path.exists(folder):
        files = [f for f in os.listdir(folder) if f.lower().endswith(('.jpg', '.png'))]
        if files:
            img_path = os.path.join(folder, files[0])
            img = Image.open(img_path)
            res = classify_breed(img, use_tta=True)
            print("="*45)
            print(f"Ground Truth : {breed_name}")
            print(f"Predicted    : {res['breed']} ({res['confidence']}%)")
            print(f"Top 3        : {res['top3']}")
