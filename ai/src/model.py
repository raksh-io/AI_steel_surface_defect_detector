"""
Steel Surface Defect Detection — EfficientNet-B0 Model
========================================================
Model definition, loading, and configuration for steel defect classification.
Uses transfer learning from ImageNet-pretrained EfficientNet-B0.
"""

import torch
import torch.nn as nn
from torchvision.models import efficientnet_b0, EfficientNet_B0_Weights


def create_model(
    num_classes: int = 7,
    pretrained: bool = True,
    freeze_backbone: bool = True,
) -> nn.Module:
    """
    Create an EfficientNet-B0 model configured for steel defect classification.
    
    Args:
        num_classes: Number of defect classes (6 for NEU-DET).
        pretrained: Whether to load ImageNet pretrained weights.
        freeze_backbone: Whether to freeze the backbone (feature extractor) layers.
    
    Returns:
        Configured EfficientNet-B0 model.
    """
    # Load pretrained EfficientNet-B0
    if pretrained:
        weights = EfficientNet_B0_Weights.IMAGENET1K_V1
        model = efficientnet_b0(weights=weights)
        print("✓ Loaded EfficientNet-B0 with ImageNet pretrained weights")
    else:
        model = efficientnet_b0(weights=None)
        print("✓ Created EfficientNet-B0 without pretrained weights")

    # Freeze backbone if requested (for initial training phase)
    if freeze_backbone:
        for param in model.features.parameters():
            param.requires_grad = False
        print("✓ Backbone frozen — only classifier head will be trained")

    # Replace the classifier head
    # EfficientNet-B0 classifier: Sequential(Dropout(0.2), Linear(1280, 1000))
    in_features = model.classifier[1].in_features  # 1280
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.3, inplace=True),
        nn.Linear(in_features, num_classes),
    )
    print(f"✓ Classifier head replaced: {in_features} → {num_classes}")

    return model


def unfreeze_backbone(model: nn.Module, unfreeze_from: int = -3) -> None:
    """
    Unfreeze the last N blocks of the backbone for fine-tuning.
    
    EfficientNet-B0 has 9 feature blocks (indices 0-8).
    Unfreezing from -3 means the last 3 blocks become trainable.
    
    Args:
        model: The EfficientNet model.
        unfreeze_from: Negative index — how many blocks from the end to unfreeze.
    """
    # model.features is a Sequential of 9 blocks
    num_blocks = len(model.features)
    unfreeze_start = max(0, num_blocks + unfreeze_from)

    unfrozen_count = 0
    for idx in range(unfreeze_start, num_blocks):
        for param in model.features[idx].parameters():
            param.requires_grad = True
            unfrozen_count += 1

    print(
        f"✓ Unfroze backbone blocks [{unfreeze_start}:{num_blocks}] "
        f"({unfrozen_count} parameters now trainable)"
    )


def get_target_layer(model: nn.Module):
    """
    Get the target convolutional layer for Grad-CAM.
    For EfficientNet-B0, this is the last MBConv block (features[-1]).
    
    Args:
        model: The EfficientNet model.
    
    Returns:
        The target layer for Grad-CAM.
    """
    # The last block in EfficientNet-B0's features Sequential
    return model.features[-1]


def load_trained_model(
    checkpoint_path: str,
    num_classes: int = 7,
    device: str = "cpu",
) -> nn.Module:
    """
    Load a trained model from a checkpoint file.
    
    Args:
        checkpoint_path: Path to the .pt checkpoint file.
        num_classes: Number of output classes.
        device: Device to load the model onto.
    
    Returns:
        Model loaded with trained weights, in eval mode.
    """
    model = create_model(num_classes=num_classes, pretrained=False, freeze_backbone=False)

    checkpoint = torch.load(checkpoint_path, map_location=device, weights_only=True)

    # Handle both full checkpoint dicts and raw state_dicts
    if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
        model.load_state_dict(checkpoint["model_state_dict"])
        print(f"✓ Loaded model from checkpoint (epoch {checkpoint.get('epoch', '?')})")
    else:
        model.load_state_dict(checkpoint)
        print(f"✓ Loaded model state dict from {checkpoint_path}")

    model.to(device)
    model.eval()
    return model


def count_parameters(model: nn.Module) -> dict:
    """
    Count total and trainable parameters in the model.
    
    Returns:
        Dict with 'total', 'trainable', and 'frozen' parameter counts.
    """
    total = sum(p.numel() for p in model.parameters())
    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    return {
        "total": total,
        "trainable": trainable,
        "frozen": total - trainable,
    }
