"""
Steel Surface Defect Detection — Training Script
===================================================
Complete training loop with:
  - Two-phase training (frozen backbone → fine-tuning)
  - Learning rate scheduling
  - Early stopping
  - Best model checkpointing
  - Training curves visualization

Usage:
    python train.py --data_dir ../data/NEU-DET --epochs 30 --batch_size 32
"""

import os
import sys
import json
import argparse
import time
from datetime import datetime

import numpy as np
import matplotlib.pyplot as plt
import torch
import torch.nn as nn
from torch.optim import AdamW
from torch.optim.lr_scheduler import ReduceLROnPlateau
from tqdm import tqdm

from model import create_model, unfreeze_backbone, count_parameters
from dataset import create_dataloaders, load_dataset_paths, get_class_weights
from utils import CLASS_NAMES, ensure_dir


def train_one_epoch(
    model: nn.Module,
    dataloader,
    criterion: nn.Module,
    optimizer,
    device: str,
    epoch: int,
) -> dict:
    """Train for one epoch, return metrics."""
    model.train()
    running_loss = 0.0
    correct = 0
    total = 0

    pbar = tqdm(dataloader, desc=f"Train Epoch {epoch}", leave=False)
    for images, labels in pbar:
        images, labels = images.to(device), labels.to(device)

        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()

        running_loss += loss.item() * images.size(0)
        _, predicted = outputs.max(1)
        total += labels.size(0)
        correct += predicted.eq(labels).sum().item()

        pbar.set_postfix({
            "loss": f"{loss.item():.4f}",
            "acc": f"{100.0 * correct / total:.1f}%",
        })

    epoch_loss = running_loss / total
    epoch_acc = 100.0 * correct / total
    return {"loss": epoch_loss, "accuracy": epoch_acc}


@torch.no_grad()
def validate(
    model: nn.Module,
    dataloader,
    criterion: nn.Module,
    device: str,
    epoch: int,
) -> dict:
    """Validate the model, return metrics."""
    model.eval()
    running_loss = 0.0
    correct = 0
    total = 0

    pbar = tqdm(dataloader, desc=f"Val   Epoch {epoch}", leave=False)
    for images, labels in pbar:
        images, labels = images.to(device), labels.to(device)

        outputs = model(images)
        loss = criterion(outputs, labels)

        running_loss += loss.item() * images.size(0)
        _, predicted = outputs.max(1)
        total += labels.size(0)
        correct += predicted.eq(labels).sum().item()

    epoch_loss = running_loss / total
    epoch_acc = 100.0 * correct / total
    return {"loss": epoch_loss, "accuracy": epoch_acc}


def save_checkpoint(
    model: nn.Module,
    optimizer,
    scheduler,
    epoch: int,
    val_metrics: dict,
    path: str,
):
    """Save a training checkpoint."""
    torch.save({
        "epoch": epoch,
        "model_state_dict": model.state_dict(),
        "optimizer_state_dict": optimizer.state_dict(),
        "scheduler_state_dict": scheduler.state_dict() if scheduler else None,
        "val_loss": val_metrics["loss"],
        "val_accuracy": val_metrics["accuracy"],
    }, path)


def plot_training_curves(history: dict, output_dir: str):
    """Save training/validation loss and accuracy curves."""
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

    epochs = range(1, len(history["train_loss"]) + 1)

    # Loss
    ax1.plot(epochs, history["train_loss"], "b-o", label="Train Loss", markersize=3)
    ax1.plot(epochs, history["val_loss"], "r-o", label="Val Loss", markersize=3)
    ax1.set_xlabel("Epoch")
    ax1.set_ylabel("Loss")
    ax1.set_title("Training & Validation Loss")
    ax1.legend()
    ax1.grid(True, alpha=0.3)

    # Accuracy
    ax2.plot(epochs, history["train_acc"], "b-o", label="Train Acc", markersize=3)
    ax2.plot(epochs, history["val_acc"], "r-o", label="Val Acc", markersize=3)
    ax2.axhline(y=85, color="orange", linestyle="--", alpha=0.7, label="CP2 Target (85%)")
    ax2.axhline(y=90, color="green", linestyle="--", alpha=0.7, label="CP3 Target (90%)")
    ax2.set_xlabel("Epoch")
    ax2.set_ylabel("Accuracy (%)")
    ax2.set_title("Training & Validation Accuracy")
    ax2.legend()
    ax2.grid(True, alpha=0.3)

    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, "training_curves.png"), dpi=150)
    plt.close()
    print(f"✓ Training curves saved to {output_dir}/training_curves.png")


def train(args):
    """Main training function."""
    # ─── Setup ───
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"✓ Using device: {device}")

    checkpoint_dir = ensure_dir(args.checkpoint_dir)
    output_dir = ensure_dir(args.output_dir)

    # ─── Data ───
    print("\n─── Loading Dataset ───")
    train_loader, val_loader, test_loader, class_to_idx = create_dataloaders(
        data_dir=args.data_dir,
        batch_size=args.batch_size,
        num_workers=args.num_workers,
    )

    # Compute class weights for imbalanced data
    all_paths, all_labels, _ = load_dataset_paths(args.data_dir)
    class_weights = get_class_weights(all_labels, num_classes=6)
    class_weights_tensor = torch.tensor(class_weights, dtype=torch.float32).to(device)
    print(f"  Class weights: {class_weights.round(3)}")

    # ─── Model ───
    print("\n─── Creating Model ───")
    model = create_model(
        num_classes=6,
        pretrained=True,
        freeze_backbone=True,
    )
    model.to(device)

    params = count_parameters(model)
    print(f"  Total params: {params['total']:,}")
    print(f"  Trainable:    {params['trainable']:,}")
    print(f"  Frozen:       {params['frozen']:,}")

    # ─── Training Config ───
    criterion = nn.CrossEntropyLoss(weight=class_weights_tensor)
    optimizer = AdamW(
        filter(lambda p: p.requires_grad, model.parameters()),
        lr=args.lr,
        weight_decay=args.weight_decay,
    )
    scheduler = ReduceLROnPlateau(
        optimizer, mode="min", factor=0.5, patience=3
    )

    # ─── Training History ───
    history = {
        "train_loss": [], "train_acc": [],
        "val_loss": [], "val_acc": [],
    }

    best_val_acc = 0.0
    best_val_loss = float("inf")
    patience_counter = 0

    # ─── Phase 1: Train classifier head (backbone frozen) ───
    print(f"\n{'='*60}")
    print(f"PHASE 1: Training classifier head (backbone frozen)")
    print(f"  Epochs: {args.frozen_epochs}")
    print(f"{'='*60}")

    for epoch in range(1, args.frozen_epochs + 1):
        train_metrics = train_one_epoch(
            model, train_loader, criterion, optimizer, device, epoch
        )
        val_metrics = validate(model, val_loader, criterion, device, epoch)

        history["train_loss"].append(train_metrics["loss"])
        history["train_acc"].append(train_metrics["accuracy"])
        history["val_loss"].append(val_metrics["loss"])
        history["val_acc"].append(val_metrics["accuracy"])

        scheduler.step(val_metrics["loss"])

        print(
            f"  Epoch {epoch:3d} | "
            f"Train Loss: {train_metrics['loss']:.4f} Acc: {train_metrics['accuracy']:.1f}% | "
            f"Val Loss: {val_metrics['loss']:.4f} Acc: {val_metrics['accuracy']:.1f}%"
        )

        # Save best model
        if val_metrics["accuracy"] > best_val_acc:
            best_val_acc = val_metrics["accuracy"]
            best_val_loss = val_metrics["loss"]
            save_checkpoint(
                model, optimizer, scheduler, epoch, val_metrics,
                os.path.join(checkpoint_dir, "best_model.pt"),
            )
            print(f"  ✓ New best model saved (val acc: {best_val_acc:.1f}%)")
            patience_counter = 0
        else:
            patience_counter += 1

        # Save latest model (every epoch)
        save_checkpoint(
            model, optimizer, scheduler, epoch, val_metrics,
            os.path.join(checkpoint_dir, "latest_model.pt"),
        )

    # ─── Phase 2: Fine-tune entire model (unfreeze backbone) ───
    print(f"\n{'='*60}")
    print(f"PHASE 2: Fine-tuning (backbone unfrozen)")
    print(f"  Epochs: {args.finetune_epochs}")
    print(f"{'='*60}")

    unfreeze_backbone(model, unfreeze_from=-3)

    # Reset optimizer with lower LR for fine-tuning
    optimizer = AdamW(
        model.parameters(),
        lr=args.lr * 0.1,  # 10x lower LR for fine-tuning
        weight_decay=args.weight_decay,
    )
    scheduler = ReduceLROnPlateau(
        optimizer, mode="min", factor=0.5, patience=3
    )
    patience_counter = 0

    params = count_parameters(model)
    print(f"  Trainable params now: {params['trainable']:,}")

    total_epoch = args.frozen_epochs
    for epoch in range(1, args.finetune_epochs + 1):
        total_epoch += 1
        train_metrics = train_one_epoch(
            model, train_loader, criterion, optimizer, device, total_epoch
        )
        val_metrics = validate(model, val_loader, criterion, device, total_epoch)

        history["train_loss"].append(train_metrics["loss"])
        history["train_acc"].append(train_metrics["accuracy"])
        history["val_loss"].append(val_metrics["loss"])
        history["val_acc"].append(val_metrics["accuracy"])

        scheduler.step(val_metrics["loss"])

        print(
            f"  Epoch {total_epoch:3d} | "
            f"Train Loss: {train_metrics['loss']:.4f} Acc: {train_metrics['accuracy']:.1f}% | "
            f"Val Loss: {val_metrics['loss']:.4f} Acc: {val_metrics['accuracy']:.1f}%"
        )

        # Save best model
        if val_metrics["accuracy"] > best_val_acc:
            best_val_acc = val_metrics["accuracy"]
            best_val_loss = val_metrics["loss"]
            save_checkpoint(
                model, optimizer, scheduler, total_epoch, val_metrics,
                os.path.join(checkpoint_dir, "best_model.pt"),
            )
            print(f"  ✓ New best model saved (val acc: {best_val_acc:.1f}%)")
            patience_counter = 0
        else:
            patience_counter += 1
            if patience_counter >= args.patience:
                print(f"\n  ⚠ Early stopping triggered (patience={args.patience})")
                break

        # Save latest model (every epoch)
        save_checkpoint(
            model, optimizer, scheduler, total_epoch, val_metrics,
            os.path.join(checkpoint_dir, "latest_model.pt"),
        )

    # ─── Results ───
    print(f"\n{'='*60}")
    print(f"TRAINING COMPLETE")
    print(f"  Best validation accuracy: {best_val_acc:.1f}%")
    print(f"  Best validation loss:     {best_val_loss:.4f}")
    print(f"{'='*60}")

    # Save final model checkpoint
    save_checkpoint(
        model, optimizer, scheduler, total_epoch, val_metrics,
        os.path.join(checkpoint_dir, "final_model.pt"),
    )
    print("  ✓ Final model checkpoint saved to final_model.pt")

    # Save training history
    plot_training_curves(history, output_dir)

    history_path = os.path.join(output_dir, "training_history.json")
    with open(history_path, "w") as f:
        json.dump(history, f, indent=2)
    print(f"✓ Training history saved to {history_path}")

    # CP2 check
    if best_val_acc >= 85:
        print("\n✅ CP2 PASSED: Val accuracy ≥ 85%")
    else:
        print("\n❌ CP2 FAILED: Val accuracy < 85% — FIX THE MODEL BEFORE PROCEEDING!")

    return best_val_acc


def parse_args():
    parser = argparse.ArgumentParser(
        description="Train EfficientNet-B0 for Steel Defect Detection"
    )
    parser.add_argument(
        "--data_dir", type=str, default="../data/NEU-DET",
        help="Path to NEU-DET dataset directory"
    )
    parser.add_argument(
        "--checkpoint_dir", type=str, default="../checkpoints",
        help="Directory to save model checkpoints"
    )
    parser.add_argument(
        "--output_dir", type=str, default="../outputs",
        help="Directory to save training outputs (curves, history)"
    )
    parser.add_argument("--batch_size", type=int, default=32)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument("--weight_decay", type=float, default=1e-4)
    parser.add_argument(
        "--frozen_epochs", type=int, default=10,
        help="Epochs to train with frozen backbone"
    )
    parser.add_argument(
        "--finetune_epochs", type=int, default=20,
        help="Epochs for fine-tuning with unfrozen backbone"
    )
    parser.add_argument(
        "--patience", type=int, default=7,
        help="Early stopping patience (fine-tuning phase only)"
    )
    parser.add_argument("--num_workers", type=int, default=4)
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    train(args)
