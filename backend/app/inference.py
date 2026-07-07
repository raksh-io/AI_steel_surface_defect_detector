"""
Inference Service
=================
Loads the trained EfficientNet-B0 model once at startup and exposes
a single `run_inference()` function for the API routers to call.

Wraps the logic from ai/src/model.py and ai/src/gradcam.py — no circular
imports, no sys.path hacks. All AI utilities are re-implemented inline
so the backend is self-contained.
"""

import base64
import logging
from io import BytesIO
from typing import Optional, Tuple

import cv2
import numpy as np
import torch
import torch.nn as nn
from PIL import Image
from pytorch_grad_cam import GradCAM
from pytorch_grad_cam.utils.image import show_cam_on_image
from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget
from torchvision.models import efficientnet_b0
from torchvision import transforms

from app.config import settings

logger = logging.getLogger(__name__)

# ─── Constants ───
CLASS_NAMES = [
    "Crazing",
    "Inclusion",
    "No_Defect",
    "Patches",
    "Pitted_Surface",
    "Rolled-in_Scale",
    "Scratches",
]

IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD  = [0.229, 0.224, 0.225]
INPUT_SIZE    = 224

INFERENCE_TRANSFORM = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(INPUT_SIZE),
    transforms.ToTensor(),
    transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
])


# ─── Model Singleton ───
_model: Optional[nn.Module] = None
_gradcam: Optional[GradCAM] = None
_device: str = "cpu"


def _build_model(num_classes: int = 6) -> nn.Module:
    """Create EfficientNet-B0 with a custom 6-class head."""
    model = efficientnet_b0(weights=None)
    in_features = model.classifier[1].in_features  # 1280
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.3, inplace=True),
        nn.Linear(in_features, num_classes),
    )
    return model


def load_model() -> None:
    """
    Load the trained model from disk and initialise the Grad-CAM wrapper.
    Called once during FastAPI startup.
    """
    global _model, _gradcam, _device

    _device = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info(f"Inference device: {_device}")

    model_path = settings.MODEL_PATH
    logger.info(f"Loading model from: {model_path}")

    model = _build_model(num_classes=settings.NUM_CLASSES)

    checkpoint = torch.load(model_path, map_location=_device, weights_only=True)
    if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
        model.load_state_dict(checkpoint["model_state_dict"])
        logger.info(f"Loaded checkpoint (epoch {checkpoint.get('epoch', '?')})")
    else:
        model.load_state_dict(checkpoint)

    model.to(_device)
    model.eval()
    _model = model

    # Initialise Grad-CAM on the last MBConv block
    target_layer = model.features[-1]
    _gradcam = GradCAM(model=model, target_layers=[target_layer])

    logger.info("✓ Model and Grad-CAM initialised")


def get_model() -> nn.Module:
    if _model is None:
        raise RuntimeError("Model not loaded. Call load_model() first.")
    return _model


# ─── Core inference function ───
def run_inference(image: Image.Image) -> dict:
    """
    Run inference + Grad-CAM on a PIL Image.

    Args:
        image: PIL Image (will be converted to RGB internally).

    Returns:
        dict with keys:
            class_name, class_index, confidence,
            gradcam_base64, original_base64
    """
    if _model is None or _gradcam is None:
        raise RuntimeError("Model not loaded. Call load_model() at startup.")

    image = image.convert("RGB")

    # ── Preprocess ──
    input_tensor = INFERENCE_TRANSFORM(image).unsqueeze(0).to(_device)

    # ── Forward pass ──
    with torch.no_grad():
        output = _model(input_tensor)
        probs  = torch.softmax(output, dim=1)
        confidence_t, predicted_t = probs.max(1)

    class_idx    = int(predicted_t.item())
    confidence   = float(confidence_t.item())
    class_name   = CLASS_NAMES[class_idx]

    # ── Grad-CAM ──
    targets      = [ClassifierOutputTarget(class_idx)]
    grayscale_cam = _gradcam(input_tensor=input_tensor, targets=targets)[0]  # H×W

    # Overlay on original image
    original_resized = image.resize((INPUT_SIZE, INPUT_SIZE))
    original_np      = np.array(original_resized).astype(np.float32) / 255.0
    overlay          = show_cam_on_image(
        original_np,
        grayscale_cam,
        use_rgb=True,
        colormap=cv2.COLORMAP_JET,
    )

    # ── Encode to base64 ──
    def _to_b64(arr_or_pil) -> str:
        if isinstance(arr_or_pil, np.ndarray):
            pil = Image.fromarray(arr_or_pil)
        else:
            pil = arr_or_pil
        buf = BytesIO()
        pil.save(buf, format="PNG")
        return base64.b64encode(buf.getvalue()).decode("utf-8")

    buf_orig = BytesIO()
    original_resized.save(buf_orig, format="PNG")
    original_b64 = base64.b64encode(buf_orig.getvalue()).decode("utf-8")

    return {
        "class_name":      class_name,
        "class_index":     class_idx,
        "confidence":      round(confidence, 4),
        "gradcam_base64":  _to_b64(overlay),
        "original_base64": original_b64,
    }
