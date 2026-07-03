"""
NEU-DET Dataset Download Script
=================================
Downloads the NEU Surface Defect Database from Kaggle.

Prerequisites:
    pip install kaggle
    Set up Kaggle API credentials (~/.kaggle/kaggle.json or %USERPROFILE%\.kaggle\kaggle.json)
    
    To get credentials:
    1. Go to https://www.kaggle.com/settings
    2. Click "Create New Token" under the API section
    3. Save the downloaded kaggle.json to ~/.kaggle/

Usage:
    python download_dataset.py
"""

import os
import sys
import zipfile
import shutil


def download_from_kaggle(data_dir: str):
    """Download NEU-DET dataset using Kaggle API."""
    try:
        from kaggle.api.kaggle_api_extended import KaggleApi
    except ImportError:
        print("[-] kaggle package not found. Install it with:")
        print("   pip install kaggle")
        sys.exit(1)

    dataset_slug = "kaustubhdikshit/neu-surface-defect-database"

    print(f"Downloading NEU Surface Defect Database...")
    print(f"   Source: kaggle.com/datasets/{dataset_slug}")
    print(f"   Target: {data_dir}")

    api = KaggleApi()
    api.authenticate()

    # Download to data directory
    os.makedirs(data_dir, exist_ok=True)
    api.dataset_download_files(dataset_slug, path=data_dir, unzip=True)

    print(f"Dataset downloaded to {data_dir}")

    # Verify and restructure if needed
    restructure_dataset(data_dir)


def restructure_dataset(data_dir: str):
    """
    Ensure the dataset is in the expected structure:
        NEU-DET/
        ├── Crazing/
        ├── Inclusion/
        ├── Patches/
        ├── Pitted_Surface/
        ├── Rolled-in_Scale/
        └── Scratches/
    
    The Kaggle download may have nested directories.
    """
    expected_classes = [
        "Crazing", "Inclusion", "Patches",
        "Pitted_Surface", "Rolled-in_Scale", "Scratches",
    ]

    neu_det_dir = os.path.join(data_dir, "NEU-DET")

    # Check if classes already exist at the expected level
    if all(os.path.isdir(os.path.join(neu_det_dir, c)) for c in expected_classes):
        print("Dataset structure verified")
        print_dataset_stats(neu_det_dir)
        return

    # Search for the class directories recursively
    print("Searching for class directories...")
    for root, dirs, files in os.walk(data_dir):
        if any(c in dirs for c in expected_classes):
            # Found the parent of class directories
            if root != neu_det_dir:
                print(f"  Moving from {root} to {neu_det_dir}")
                os.makedirs(neu_det_dir, exist_ok=True)
                for cls_name in expected_classes:
                    src = os.path.join(root, cls_name)
                    dst = os.path.join(neu_det_dir, cls_name)
                    if os.path.isdir(src) and not os.path.isdir(dst):
                        shutil.move(src, dst)
            break

    # Also check for alternate naming conventions
    alt_names = {
        "RS": "Rolled-in_Scale",
        "Pa": "Patches", 
        "Cr": "Crazing",
        "PS": "Pitted_Surface",
        "In": "Inclusion",
        "Sc": "Scratches",
        "rolled-in_scale": "Rolled-in_Scale",
        "pitted_surface": "Pitted_Surface",
        "crazing": "Crazing",
        "inclusion": "Inclusion",
        "patches": "Patches",
        "scratches": "Scratches",
    }

    for alt, canonical in alt_names.items():
        alt_path = os.path.join(neu_det_dir, alt)
        canonical_path = os.path.join(neu_det_dir, canonical)
        if os.path.isdir(alt_path) and not os.path.isdir(canonical_path):
            print(f"  Renaming {alt} -> {canonical}")
            shutil.move(alt_path, canonical_path)

    # Final verification
    found = [c for c in expected_classes if os.path.isdir(os.path.join(neu_det_dir, c))]
    missing = [c for c in expected_classes if c not in found]

    if missing:
        print(f"\nMissing class directories: {missing}")
        print(f"  Contents of {data_dir}:")
        for item in os.listdir(data_dir):
            item_path = os.path.join(data_dir, item)
            if os.path.isdir(item_path):
                sub_items = os.listdir(item_path)
                print(f"    {item}/ ({len(sub_items)} items)")
            else:
                print(f"    {item}")
        print("\n  Please manually organize the dataset into the expected structure.")
    else:
        print("Dataset structure verified")
        print_dataset_stats(neu_det_dir)


def print_dataset_stats(neu_det_dir: str):
    """Print dataset statistics."""
    print(f"\n--- Dataset Statistics ---")
    total = 0
    for cls_name in sorted(os.listdir(neu_det_dir)):
        cls_dir = os.path.join(neu_det_dir, cls_name)
        if os.path.isdir(cls_dir):
            count = len([
                f for f in os.listdir(cls_dir)
                if f.lower().endswith((".bmp", ".jpg", ".jpeg", ".png"))
            ])
            total += count
            print(f"  {cls_name:20s}: {count:4d} images")
    print(f"  {'TOTAL':20s}: {total:4d} images")


if __name__ == "__main__":
    # Default data directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(script_dir, "..", "data")

    download_from_kaggle(data_dir)
