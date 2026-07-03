"""
Steel Surface Defect Detection — Model Evaluation
====================================================
Evaluate the trained model on the held-out test set.
Generates: accuracy, per-class metrics, confusion matrix, and a model report.

Usage:
    python evaluate.py --checkpoint ../checkpoints/best_model.pt --data_dir ../data/NEU-DET
"""

import os
import json
import argparse

import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import torch
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
)
from tqdm import tqdm

from model import load_trained_model
from dataset import create_dataloaders
from utils import CLASS_NAMES, ensure_dir


@torch.no_grad()
def evaluate_model(model, dataloader, device):
    """
    Run inference on the full dataloader, collecting all predictions and labels.
    
    Returns:
        Tuple of (all_labels, all_predictions, all_confidences).
    """
    model.eval()
    all_labels = []
    all_preds = []
    all_confs = []

    for images, labels in tqdm(dataloader, desc="Evaluating"):
        images = images.to(device)
        outputs = model(images)
        probabilities = torch.softmax(outputs, dim=1)
        confidences, predicted = probabilities.max(1)

        all_labels.extend(labels.numpy())
        all_preds.extend(predicted.cpu().numpy())
        all_confs.extend(confidences.cpu().numpy())

    return (
        np.array(all_labels),
        np.array(all_preds),
        np.array(all_confs),
    )


def plot_confusion_matrix(y_true, y_pred, output_dir):
    """Generate and save a confusion matrix heatmap."""
    cm = confusion_matrix(y_true, y_pred)
    cm_normalized = cm.astype("float") / cm.sum(axis=1, keepdims=True)

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 6))

    # Raw counts
    sns.heatmap(
        cm, annot=True, fmt="d", cmap="Blues",
        xticklabels=CLASS_NAMES, yticklabels=CLASS_NAMES,
        ax=ax1,
    )
    ax1.set_xlabel("Predicted")
    ax1.set_ylabel("Actual")
    ax1.set_title("Confusion Matrix (Counts)")
    ax1.tick_params(axis="x", rotation=45)

    # Normalized
    sns.heatmap(
        cm_normalized, annot=True, fmt=".2f", cmap="Blues",
        xticklabels=CLASS_NAMES, yticklabels=CLASS_NAMES,
        ax=ax2,
    )
    ax2.set_xlabel("Predicted")
    ax2.set_ylabel("Actual")
    ax2.set_title("Confusion Matrix (Normalized)")
    ax2.tick_params(axis="x", rotation=45)

    plt.tight_layout()
    path = os.path.join(output_dir, "confusion_matrix.png")
    plt.savefig(path, dpi=150)
    plt.close()
    print(f"✓ Confusion matrix saved to {path}")


def plot_confidence_distribution(y_true, y_pred, confidences, output_dir):
    """Plot confidence distributions for correct vs incorrect predictions."""
    correct_mask = y_true == y_pred
    correct_conf = confidences[correct_mask]
    incorrect_conf = confidences[~correct_mask]

    fig, ax = plt.subplots(figsize=(8, 5))
    ax.hist(
        correct_conf, bins=30, alpha=0.7, label=f"Correct ({len(correct_conf)})",
        color="#2ecc71", edgecolor="white",
    )
    if len(incorrect_conf) > 0:
        ax.hist(
            incorrect_conf, bins=30, alpha=0.7, label=f"Incorrect ({len(incorrect_conf)})",
            color="#e74c3c", edgecolor="white",
        )
    ax.set_xlabel("Confidence")
    ax.set_ylabel("Count")
    ax.set_title("Prediction Confidence Distribution")
    ax.legend()
    ax.grid(True, alpha=0.3)

    plt.tight_layout()
    path = os.path.join(output_dir, "confidence_distribution.png")
    plt.savefig(path, dpi=150)
    plt.close()
    print(f"✓ Confidence distribution saved to {path}")


def main(args):
    """Main evaluation function."""
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"✓ Using device: {device}")

    output_dir = ensure_dir(args.output_dir)

    # ─── Load Model ───
    print("\n─── Loading Model ───")
    model = load_trained_model(args.checkpoint, num_classes=6, device=device)

    # ─── Load Test Data ───
    print("\n─── Loading Test Data ───")
    _, _, test_loader, _ = create_dataloaders(
        data_dir=args.data_dir,
        batch_size=args.batch_size,
        num_workers=args.num_workers,
    )

    # ─── Evaluate ───
    print("\n─── Running Evaluation ───")
    y_true, y_pred, confidences = evaluate_model(model, test_loader, device)

    # ─── Metrics ───
    accuracy = accuracy_score(y_true, y_pred) * 100
    report = classification_report(
        y_true, y_pred,
        target_names=CLASS_NAMES,
        output_dict=True,
    )
    report_text = classification_report(
        y_true, y_pred,
        target_names=CLASS_NAMES,
    )

    print(f"\n{'='*60}")
    print(f"TEST SET RESULTS")
    print(f"{'='*60}")
    print(f"  Overall Accuracy: {accuracy:.1f}%")
    print(f"  Mean Confidence:  {confidences.mean():.3f}")
    print(f"\n{report_text}")

    # CP3 check
    if accuracy >= 90:
        print("✅ CP3 PASSED: Test accuracy ≥ 90%")
    elif accuracy >= 85:
        print("⚠️  CP2 level (≥85%) but below CP3 target (90%). Consider more fine-tuning.")
    else:
        print("❌ Below CP2 target (85%). Model needs significant improvement.")

    # ─── Visualizations ───
    plot_confusion_matrix(y_true, y_pred, output_dir)
    plot_confidence_distribution(y_true, y_pred, confidences, output_dir)

    # ─── Save Report ───
    model_report = {
        "test_accuracy": round(accuracy, 2),
        "mean_confidence": round(float(confidences.mean()), 4),
        "total_test_samples": len(y_true),
        "per_class_metrics": {
            name: {
                "precision": round(report[name]["precision"], 4),
                "recall": round(report[name]["recall"], 4),
                "f1-score": round(report[name]["f1-score"], 4),
                "support": int(report[name]["support"]),
            }
            for name in CLASS_NAMES
        },
    }

    report_path = os.path.join(output_dir, "model_report.json")
    with open(report_path, "w") as f:
        json.dump(model_report, f, indent=2)
    print(f"\n✓ Model report saved to {report_path}")


def parse_args():
    parser = argparse.ArgumentParser(
        description="Evaluate trained Steel Defect Detection model"
    )
    parser.add_argument(
        "--checkpoint", type=str, default="../checkpoints/best_model.pt",
        help="Path to model checkpoint"
    )
    parser.add_argument(
        "--data_dir", type=str, default="../data/NEU-DET",
        help="Path to NEU-DET dataset directory"
    )
    parser.add_argument(
        "--output_dir", type=str, default="../outputs",
        help="Directory to save evaluation outputs"
    )
    parser.add_argument("--batch_size", type=int, default=32)
    parser.add_argument("--num_workers", type=int, default=4)
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    main(args)
