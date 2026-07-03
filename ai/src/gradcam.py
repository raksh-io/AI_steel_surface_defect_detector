"""
Steel Surface Defect Detection — Grad-CAM Visualization
=========================================================
Generate Grad-CAM heatmaps for model predictions using pytorch-grad-cam.
Targets the last MBConv block of EfficientNet-B0 for optimal visualization.

Usage:
    python gradcam.py --checkpoint ../checkpoints/best_model.pt --image_path sample.jpg
"""

import os
import argparse
import base64
from io import BytesIO
from typing import Optional, Tuple

import cv2
import numpy as np
import torch
from PIL import Image
from pytorch_grad_cam import GradCAM
from pytorch_grad_cam.utils.image import show_cam_on_image

from model import load_trained_model, get_target_layer
from utils import (
    CLASS_NAMES,
    get_inference_transform,
    inverse_normalize,
    ensure_dir,
    load_image,
)


class GradCAMGenerator:
    """
    Reusable Grad-CAM generator that wraps pytorch-grad-cam.
    Designed to be loaded once and used for multiple predictions.
    """

    def __init__(
        self,
        model: torch.nn.Module,
        device: str = "cpu",
    ):
        """
        Initialize the Grad-CAM generator.
        
        Args:
            model: Trained EfficientNet-B0 model in eval mode.
            device: Device for inference.
        """
        self.model = model
        self.device = device
        self.transform = get_inference_transform()

        # Get the target layer for Grad-CAM
        target_layer = get_target_layer(model)
        self.cam = GradCAM(
            model=model,
            target_layers=[target_layer],
        )
        print("✓ Grad-CAM generator initialized")

    def generate(
        self,
        image: Image.Image,
        target_class: Optional[int] = None,
    ) -> Tuple[str, np.ndarray, int, float]:
        """
        Generate a Grad-CAM heatmap overlay for an image.
        
        Args:
            image: PIL Image (RGB).
            target_class: If None, uses the predicted class. 
                         If specified, generates Grad-CAM for that class.
        
        Returns:
            Tuple of:
                - class_name: Predicted class name
                - overlay: Grad-CAM overlay image (numpy, uint8, HWC, RGB)
                - class_idx: Predicted class index
                - confidence: Prediction confidence (0-1)
        """
        # Preprocess
        input_tensor = self.transform(image).unsqueeze(0).to(self.device)

        # Get prediction
        with torch.no_grad():
            output = self.model(input_tensor)
            probabilities = torch.softmax(output, dim=1)
            confidence, predicted_class = probabilities.max(1)

        class_idx = predicted_class.item()
        conf_value = confidence.item()
        class_name = CLASS_NAMES[class_idx]

        # Use target_class for Grad-CAM if specified, else use predicted
        cam_target_class = target_class if target_class is not None else class_idx

        # Generate Grad-CAM
        # pytorch-grad-cam expects targets as a list of callables or None
        from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget
        targets = [ClassifierOutputTarget(cam_target_class)]

        grayscale_cam = self.cam(
            input_tensor=input_tensor,
            targets=targets,
        )
        grayscale_cam = grayscale_cam[0, :]  # Get first (and only) image

        # Create overlay on the original (non-normalized) image
        # Resize original image to match the cam size
        original_resized = image.resize((224, 224))
        original_np = np.array(original_resized).astype(np.float32) / 255.0

        overlay = show_cam_on_image(
            original_np,
            grayscale_cam,
            use_rgb=True,
            colormap=cv2.COLORMAP_JET,
        )

        return class_name, overlay, class_idx, conf_value

    def generate_base64(
        self,
        image: Image.Image,
        target_class: Optional[int] = None,
    ) -> dict:
        """
        Generate Grad-CAM and return result as a dict with base64-encoded images.
        Suitable for API responses.
        
        Returns:
            Dict with: class_name, class_idx, confidence, gradcam_base64, original_base64
        """
        class_name, overlay, class_idx, confidence = self.generate(
            image, target_class
        )

        # Encode Grad-CAM overlay as base64
        overlay_pil = Image.fromarray(overlay)
        buffer = BytesIO()
        overlay_pil.save(buffer, format="PNG")
        gradcam_b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

        # Encode original (resized) as base64
        original_resized = image.resize((224, 224))
        buffer2 = BytesIO()
        original_resized.save(buffer2, format="PNG")
        original_b64 = base64.b64encode(buffer2.getvalue()).decode("utf-8")

        return {
            "class_name": class_name,
            "class_idx": class_idx,
            "confidence": round(confidence, 4),
            "gradcam_base64": gradcam_b64,
            "original_base64": original_b64,
        }


def generate_samples(
    checkpoint_path: str,
    image_dir: str,
    output_dir: str,
    num_samples: int = 10,
    device: str = "cpu",
):
    """
    Generate Grad-CAM visualizations for a set of sample images.
    Saves side-by-side comparisons (original | Grad-CAM).
    
    Used for CP3 validation: visually verify Grad-CAM on ≥10 test images.
    """
    import matplotlib.pyplot as plt

    output_dir = ensure_dir(os.path.join(output_dir, "gradcam_samples"))

    # Load model
    model = load_trained_model(checkpoint_path, num_classes=6, device=device)
    generator = GradCAMGenerator(model, device)

    # Collect sample images
    image_paths = []
    for class_name in CLASS_NAMES:
        class_dir = os.path.join(image_dir, class_name)
        if os.path.isdir(class_dir):
            files = sorted(os.listdir(class_dir))
            # Take a couple from each class
            samples_per_class = max(1, num_samples // len(CLASS_NAMES))
            for f in files[:samples_per_class]:
                if f.lower().endswith((".bmp", ".jpg", ".jpeg", ".png")):
                    image_paths.append((os.path.join(class_dir, f), class_name))

    if not image_paths:
        print("⚠ No images found for Grad-CAM sample generation")
        return

    print(f"\n─── Generating Grad-CAM for {len(image_paths)} samples ───")

    correct = 0
    total = len(image_paths)

    for i, (img_path, true_class) in enumerate(image_paths):
        image = load_image(img_path)
        class_name, overlay, class_idx, confidence = generator.generate(image)

        is_correct = class_name == true_class
        if is_correct:
            correct += 1

        # Create side-by-side visualization
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(10, 4))

        original_resized = image.resize((224, 224))
        ax1.imshow(original_resized)
        ax1.set_title(f"Original\nTrue: {true_class}")
        ax1.axis("off")

        ax2.imshow(overlay)
        status = "✓" if is_correct else "✗"
        ax2.set_title(
            f"Grad-CAM\nPred: {class_name} ({confidence:.1%}) {status}"
        )
        ax2.axis("off")

        plt.tight_layout()
        save_path = os.path.join(output_dir, f"gradcam_{i+1:02d}_{true_class}.png")
        plt.savefig(save_path, dpi=150)
        plt.close()

    print(f"\n✓ Grad-CAM samples saved to {output_dir}")
    print(f"  Accuracy on samples: {correct}/{total} ({100*correct/total:.0f}%)")

    if total >= 10:
        print("✅ CP3 Grad-CAM validation: ≥10 samples generated")
    else:
        print(f"⚠  Only {total} samples generated. CP3 requires ≥10.")


def parse_args():
    parser = argparse.ArgumentParser(
        description="Generate Grad-CAM visualizations for steel defect predictions"
    )
    parser.add_argument(
        "--checkpoint", type=str, default="../checkpoints/best_model.pt",
        help="Path to model checkpoint"
    )
    parser.add_argument(
        "--data_dir", type=str, default="../data/NEU-DET",
        help="Path to NEU-DET dataset directory (for sample generation)"
    )
    parser.add_argument(
        "--image_path", type=str, default=None,
        help="Path to a single image for Grad-CAM (optional)"
    )
    parser.add_argument(
        "--output_dir", type=str, default="../outputs",
        help="Directory to save outputs"
    )
    parser.add_argument(
        "--num_samples", type=int, default=12,
        help="Number of sample Grad-CAM images to generate"
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    device = "cuda" if torch.cuda.is_available() else "cpu"

    if args.image_path:
        # Single image mode
        model = load_trained_model(args.checkpoint, device=device)
        generator = GradCAMGenerator(model, device)
        image = load_image(args.image_path)
        result = generator.generate_base64(image)
        print(f"\nPrediction: {result['class_name']}")
        print(f"Confidence: {result['confidence']:.1%}")
        print(f"Grad-CAM base64 length: {len(result['gradcam_base64'])} chars")
    else:
        # Batch sample generation mode
        generate_samples(
            args.checkpoint,
            args.data_dir,
            args.output_dir,
            num_samples=args.num_samples,
            device=device,
        )
