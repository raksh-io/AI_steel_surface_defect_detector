import torch
print(f"PyTorch: {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"GPU: {torch.cuda.get_device_name(0)}")
import torchvision
print(f"TorchVision: {torchvision.__version__}")
import cv2
print(f"OpenCV: {cv2.__version__}")
from pytorch_grad_cam import GradCAM
print("Grad-CAM: OK")
import sklearn
print(f"scikit-learn: {sklearn.__version__}")
print("\nAll packages verified successfully!")
