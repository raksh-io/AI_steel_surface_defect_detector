import os
import cv2
import numpy as np

def generate_healthy_steel(output_dir, num_images):
    os.makedirs(output_dir, exist_ok=True)
    for i in range(num_images):
        # Base gray (varies slightly per image)
        base = np.random.randint(110, 150)
        img = np.full((200, 200), base, dtype=np.float32)
        
        # Add gaussian noise
        noise = np.random.normal(0, 15, (200, 200))
        img = img + noise
        
        # Smooth it slightly to mimic steel surface grain
        img = cv2.GaussianBlur(img, (3, 3), 0)
        
        # Add random subtle lighting gradient
        gradient_val = np.random.randint(-20, 20)
        gradient_x = np.tile(np.linspace(0, gradient_val, 200), (200, 1))
        img = img + gradient_x
        
        # Random vertical gradient too
        gradient_val_y = np.random.randint(-20, 20)
        gradient_y = np.tile(np.linspace(0, gradient_val_y, 200), (200, 1)).T
        img = img + gradient_y
        
        # Clip to 0-255 and convert to uint8
        img = np.clip(img, 0, 255).astype(np.uint8)
        
        filename = f"no_defect_{i:04d}.jpg"
        cv2.imwrite(os.path.join(output_dir, filename), img)
        
    print(f"Generated {num_images} images in {output_dir}")

if __name__ == "__main__":
    base_dir = r"D:\Personal_projects\AI_Steel_Surface_Defect_Detection\ai\data\NEU-DET"
    train_dir = os.path.join(base_dir, "train", "images", "no_defect")
    val_dir = os.path.join(base_dir, "val", "images", "no_defect")
    
    print("Generating synthetic No Defect steel images...")
    generate_healthy_steel(train_dir, 300)
    generate_healthy_steel(val_dir, 60)
    print("Done!")
