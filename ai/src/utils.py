"""
Steel Surface Defect Detection — Utility Functions
====================================================
Image loading, preprocessing, inverse-normalization, and helper functions
used across the AI module.
"""

import os
import numpy as np
from PIL import Image
import torch
from torchvision import transforms


# ─── Constants ───
# ImageNet normalization stats (used for EfficientNet pretrained weights)
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]

# NEU-DET defect class names (alphabetical order as per dataset)
CLASS_NAMES = [
    "Crazing",
    "Inclusion",
    "No_Defect",
    "Patches",
    "Pitted_Surface",
    "Rolled-in_Scale",
    "Scratches",
]

# Input image size for EfficientNet-B0
INPUT_SIZE = 224


# ─── Transforms ───
def get_inference_transform():
    """
    Returns the transform pipeline for inference (no augmentation).
    Resize → CenterCrop → Tensor → Normalize.
    """
    return transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(INPUT_SIZE),
        transforms.ToTensor(),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
    ])


def get_train_transform():
    """
    Returns the augmentation + transform pipeline for training.
    Includes random flips, rotations, color jitter, and random crops.
    """
    return transforms.Compose([
        transforms.Resize(256),
        transforms.RandomResizedCrop(INPUT_SIZE, scale=(0.8, 1.0)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomVerticalFlip(p=0.3),
        transforms.RandomRotation(degrees=15),
        transforms.ColorJitter(
            brightness=0.2,
            contrast=0.2,
            saturation=0.1,
            hue=0.05,
        ),
        transforms.ToTensor(),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
    ])


def get_val_transform():
    """
    Returns the transform pipeline for validation (same as inference).
    """
    return get_inference_transform()


# ─── Image Utilities ───
def load_image(image_path: str) -> Image.Image:
    """
    Load an image from disk and convert to RGB.
    
    Args:
        image_path: Path to the image file.
    
    Returns:
        PIL Image in RGB mode.
    """
    img = Image.open(image_path).convert("RGB")
    return img


def preprocess_image(image: Image.Image) -> torch.Tensor:
    """
    Preprocess a PIL image for model inference.
    
    Args:
        image: PIL Image in RGB.
    
    Returns:
        Preprocessed tensor with batch dimension [1, 3, 224, 224].
    """
    transform = get_inference_transform()
    tensor = transform(image).unsqueeze(0)  # Add batch dimension
    return tensor


def inverse_normalize(tensor: torch.Tensor) -> np.ndarray:
    """
    Reverse ImageNet normalization on a tensor for display purposes.
    
    Args:
        tensor: Normalized image tensor [C, H, W] or [B, C, H, W].
    
    Returns:
        Numpy array [H, W, C] with values in [0, 1].
    """
    if tensor.dim() == 4:
        tensor = tensor.squeeze(0)
    
    mean = torch.tensor(IMAGENET_MEAN).view(3, 1, 1)
    std = torch.tensor(IMAGENET_STD).view(3, 1, 1)
    
    tensor = tensor.cpu() * std + mean
    tensor = torch.clamp(tensor, 0.0, 1.0)
    
    # Convert to HWC numpy
    return tensor.permute(1, 2, 0).numpy()


def tensor_to_numpy(tensor: torch.Tensor) -> np.ndarray:
    """
    Convert a tensor to a displayable numpy array (with inverse normalization).
    """
    return (inverse_normalize(tensor) * 255).astype(np.uint8)


def get_class_name(class_idx: int) -> str:
    """
    Get the human-readable class name from a class index.
    
    Args:
        class_idx: Integer class index (0-5).
    
    Returns:
        Class name string.
    """
    if 0 <= class_idx < len(CLASS_NAMES):
        return CLASS_NAMES[class_idx]
    return f"Unknown ({class_idx})"


def ensure_dir(path: str) -> str:
    """
    Create a directory if it doesn't exist. Returns the path.
    """
    os.makedirs(path, exist_ok=True)
    return path
