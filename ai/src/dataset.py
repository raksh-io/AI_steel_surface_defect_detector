"""
Steel Surface Defect Detection — PyTorch Dataset
==================================================
Custom Dataset class for the NEU Steel Surface Defect Database.
Handles loading, splitting, and augmentation of the 6-class dataset.

NEU-DET Structure (expected):
    NEU-DET/
    ├── Crazing/
    │   ├── Crazing_1.bmp
    │   ├── Crazing_2.bmp
    │   └── ...
    ├── Inclusion/
    ├── Patches/
    ├── Pitted_Surface/
    ├── Rolled-in_Scale/
    └── Scratches/

Each class has 300 images (200×200 grayscale .bmp), totaling 1800 images.
"""

import os
from typing import Optional, Tuple, Dict, List

import numpy as np
from PIL import Image
from sklearn.model_selection import train_test_split
from torch.utils.data import Dataset, DataLoader

from utils import (
    CLASS_NAMES,
    get_train_transform,
    get_val_transform,
)


class SteelDefectDataset(Dataset):
    """
    PyTorch Dataset for NEU Steel Surface Defect Database.
    
    Args:
        image_paths: List of image file paths.
        labels: List of integer class labels.
        transform: torchvision transform to apply to each image.
    """

    def __init__(
        self,
        image_paths: List[str],
        labels: List[int],
        transform=None,
    ):
        self.image_paths = image_paths
        self.labels = labels
        self.transform = transform

    def __len__(self) -> int:
        return len(self.image_paths)

    def __getitem__(self, idx: int) -> Tuple:
        image_path = self.image_paths[idx]
        label = self.labels[idx]

        # Load image and convert to RGB (NEU-DET images are grayscale .bmp)
        image = Image.open(image_path).convert("RGB")

        if self.transform:
            image = self.transform(image)

        return image, label


def load_dataset_paths(
    data_dir: str,
) -> Tuple[List[str], List[int], Dict[str, int]]:
    """
    Scan the NEU-DET directory and collect all image paths with their labels.
    
    Args:
        data_dir: Path to the root NEU-DET directory containing class folders.
    
    Returns:
        Tuple of (image_paths, labels, class_to_idx mapping).
    
    Raises:
        FileNotFoundError: If data_dir doesn't exist.
        ValueError: If no valid class directories are found.
    """
    if not os.path.isdir(data_dir):
        raise FileNotFoundError(
            f"Dataset directory not found: {data_dir}\n"
            f"Please download NEU-DET and place it at: {data_dir}\n"
            f"Download from: http://faculty.neu.edu.cn/songkechen/en/zdylm/263265/list/"
        )

    image_paths = []
    labels = []

    # Build class_to_idx mapping based on expected CLASS_NAMES order
    class_to_idx = {name: idx for idx, name in enumerate(CLASS_NAMES)}

    # Scan for class directories
    found_classes = []
    for class_name in CLASS_NAMES:
        class_dir = os.path.join(data_dir, class_name)
        if not os.path.isdir(class_dir):
            print(f"⚠ Warning: Class directory not found: {class_dir}")
            continue

        found_classes.append(class_name)
        class_idx = class_to_idx[class_name]

        # Collect all image files
        for filename in sorted(os.listdir(class_dir)):
            if filename.lower().endswith((".bmp", ".jpg", ".jpeg", ".png")):
                image_paths.append(os.path.join(class_dir, filename))
                labels.append(class_idx)

    if not found_classes:
        raise ValueError(
            f"No valid class directories found in {data_dir}.\n"
            f"Expected subdirectories: {CLASS_NAMES}"
        )

    print(f"✓ Found {len(image_paths)} images across {len(found_classes)} classes")
    for cls_name in found_classes:
        count = sum(1 for l in labels if l == class_to_idx[cls_name])
        print(f"  • {cls_name}: {count} images")

    return image_paths, labels, class_to_idx


def create_splits(
    image_paths: List[str],
    labels: List[int],
    val_ratio: float = 0.15,
    test_ratio: float = 0.15,
    random_state: int = 42,
) -> Dict[str, Tuple[List[str], List[int]]]:
    """
    Split dataset into train/val/test sets using stratified sampling.
    
    Args:
        image_paths: List of image file paths.
        labels: List of integer labels.
        val_ratio: Fraction for validation set.
        test_ratio: Fraction for test set.
        random_state: Random seed for reproducibility.
    
    Returns:
        Dictionary with 'train', 'val', 'test' keys, each containing
        a tuple of (image_paths, labels).
    """
    # First split: separate out the test set
    train_val_paths, test_paths, train_val_labels, test_labels = train_test_split(
        image_paths,
        labels,
        test_size=test_ratio,
        stratify=labels,
        random_state=random_state,
    )

    # Second split: separate train from val
    relative_val_ratio = val_ratio / (1 - test_ratio)
    train_paths, val_paths, train_labels, val_labels = train_test_split(
        train_val_paths,
        train_val_labels,
        test_size=relative_val_ratio,
        stratify=train_val_labels,
        random_state=random_state,
    )

    splits = {
        "train": (train_paths, train_labels),
        "val": (val_paths, val_labels),
        "test": (test_paths, test_labels),
    }

    print(f"\n✓ Dataset splits created:")
    for split_name, (paths, lbls) in splits.items():
        print(f"  • {split_name}: {len(paths)} images")

    return splits


def create_dataloaders(
    data_dir: str,
    batch_size: int = 32,
    num_workers: int = 4,
    val_ratio: float = 0.15,
    test_ratio: float = 0.15,
    random_state: int = 42,
) -> Tuple[DataLoader, DataLoader, DataLoader, Dict[str, int]]:
    """
    End-to-end: load paths → split → create Datasets → wrap in DataLoaders.
    
    Args:
        data_dir: Path to NEU-DET root directory.
        batch_size: Batch size for dataloaders.
        num_workers: Number of data loading workers.
        val_ratio: Fraction for validation set.
        test_ratio: Fraction for test set.
        random_state: Random seed.
    
    Returns:
        Tuple of (train_loader, val_loader, test_loader, class_to_idx).
    """
    # Load all paths and labels
    image_paths, labels, class_to_idx = load_dataset_paths(data_dir)

    # Create stratified splits
    splits = create_splits(
        image_paths, labels,
        val_ratio=val_ratio,
        test_ratio=test_ratio,
        random_state=random_state,
    )

    # Create datasets with appropriate transforms
    train_dataset = SteelDefectDataset(
        *splits["train"], transform=get_train_transform()
    )
    val_dataset = SteelDefectDataset(
        *splits["val"], transform=get_val_transform()
    )
    test_dataset = SteelDefectDataset(
        *splits["test"], transform=get_val_transform()
    )

    # Create dataloaders
    train_loader = DataLoader(
        train_dataset,
        batch_size=batch_size,
        shuffle=True,
        num_workers=num_workers,
        pin_memory=True,
        drop_last=True,
    )
    val_loader = DataLoader(
        val_dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=True,
    )
    test_loader = DataLoader(
        test_dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=True,
    )

    return train_loader, val_loader, test_loader, class_to_idx


def get_class_weights(labels: List[int], num_classes: int = 7) -> np.ndarray:
    """
    Compute class weights inversely proportional to class frequency.
    Useful for handling class imbalance in the loss function.
    
    Args:
        labels: List of integer class labels.
        num_classes: Total number of classes.
    
    Returns:
        Numpy array of shape [num_classes] with class weights.
    """
    counts = np.bincount(labels, minlength=num_classes).astype(float)
    # Inverse frequency weighting
    weights = 1.0 / (counts + 1e-6)
    # Normalize so weights sum to num_classes
    weights = weights / weights.sum() * num_classes
    return weights
