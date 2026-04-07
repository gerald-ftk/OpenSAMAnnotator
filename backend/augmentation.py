"""
Dataset Augmentation Module
Comprehensive augmentation support for CV datasets
"""

import os
import random
import math
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from PIL import Image, ImageEnhance, ImageFilter, ImageOps
import json
import shutil
import numpy as np


class DatasetAugmenter:
    """Apply augmentations to expand dataset size"""
    
    IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
    
    AVAILABLE_AUGMENTATIONS = {
        "flip_horizontal": {
            "name": "Horizontal Flip",
            "description": "Mirror image horizontally",
            "category": "geometric",
            "params": {}
        },
        "flip_vertical": {
            "name": "Vertical Flip",
            "description": "Mirror image vertically",
            "category": "geometric",
            "params": {}
        },
        "rotate": {
            "name": "Rotation",
            "description": "Rotate image by random angle",
            "category": "geometric",
            "params": {
                "angle_range": {"type": "range", "min": -45, "max": 45, "default": [-15, 15], "description": "Rotation angle range in degrees"}
            }
        },
        "scale": {
            "name": "Random Scale",
            "description": "Scale image up or down",
            "category": "geometric",
            "params": {
                "scale_range": {"type": "range", "min": 0.5, "max": 1.5, "default": [0.8, 1.2], "description": "Scale factor range"}
            }
        },
        "translate": {
            "name": "Translation",
            "description": "Shift image position",
            "category": "geometric",
            "params": {
                "translate_range": {"type": "range", "min": -0.2, "max": 0.2, "default": [-0.1, 0.1], "description": "Translation range as fraction of image size"}
            }
        },
        "shear": {
            "name": "Shear",
            "description": "Apply shear transformation",
            "category": "geometric",
            "params": {
                "shear_range": {"type": "range", "min": -20, "max": 20, "default": [-10, 10], "description": "Shear angle range in degrees"}
            }
        },
        "perspective": {
            "name": "Perspective",
            "description": "Apply perspective transformation",
            "category": "geometric",
            "params": {
                "strength": {"type": "range", "min": 0, "max": 0.1, "default": 0.05, "description": "Perspective distortion strength"}
            }
        },
        "crop": {
            "name": "Random Crop",
            "description": "Randomly crop and resize",
            "category": "geometric",
            "params": {
                "crop_range": {"type": "range", "min": 0.7, "max": 1.0, "default": [0.8, 0.95], "description": "Crop size range as fraction of original"}
            }
        },
        "brightness": {
            "name": "Brightness",
            "description": "Adjust image brightness",
            "category": "color",
            "params": {
                "factor_range": {"type": "range", "min": 0.5, "max": 1.5, "default": [0.8, 1.2], "description": "Brightness factor range"}
            }
        },
        "contrast": {
            "name": "Contrast",
            "description": "Adjust image contrast",
            "category": "color",
            "params": {
                "factor_range": {"type": "range", "min": 0.5, "max": 1.5, "default": [0.8, 1.2], "description": "Contrast factor range"}
            }
        },
        "saturation": {
            "name": "Saturation",
            "description": "Adjust color saturation",
            "category": "color",
            "params": {
                "factor_range": {"type": "range", "min": 0.5, "max": 1.5, "default": [0.8, 1.2], "description": "Saturation factor range"}
            }
        },
        "hue": {
            "name": "Hue Shift",
            "description": "Shift color hue",
            "category": "color",
            "params": {
                "shift_range": {"type": "range", "min": -30, "max": 30, "default": [-15, 15], "description": "Hue shift range in degrees"}
            }
        },
        "grayscale": {
            "name": "Grayscale",
            "description": "Convert to grayscale",
            "category": "color",
            "params": {
                "probability": {"type": "range", "min": 0, "max": 1, "default": 0.1, "description": "Probability of applying"}
            }
        },
        "blur": {
            "name": "Gaussian Blur",
            "description": "Apply Gaussian blur",
            "category": "noise",
            "params": {
                "radius_range": {"type": "range", "min": 0.5, "max": 3, "default": [0.5, 1.5], "description": "Blur radius range"}
            }
        },
        "noise": {
            "name": "Gaussian Noise",
            "description": "Add random noise",
            "category": "noise",
            "params": {
                "variance": {"type": "range", "min": 0.01, "max": 0.1, "default": 0.02, "description": "Noise variance"}
            }
        },
        "sharpen": {
            "name": "Sharpen",
            "description": "Sharpen image edges",
            "category": "noise",
            "params": {
                "factor": {"type": "range", "min": 1, "max": 3, "default": 1.5, "description": "Sharpening factor"}
            }
        },
        "jpeg_compression": {
            "name": "JPEG Compression",
            "description": "Simulate JPEG artifacts",
            "category": "noise",
            "params": {
                "quality_range": {"type": "range", "min": 30, "max": 95, "default": [60, 90], "description": "JPEG quality range"}
            }
        },
        "cutout": {
            "name": "Cutout",
            "description": "Randomly cut out rectangles",
            "category": "advanced",
            "params": {
                "num_holes": {"type": "range", "min": 1, "max": 5, "default": 2, "description": "Number of cutout regions"},
                "size_range": {"type": "range", "min": 0.05, "max": 0.2, "default": [0.05, 0.15], "description": "Cutout size as fraction of image"}
            }
        },
        "mosaic": {
            "name": "Mosaic",
            "description": "Combine 4 images into one (requires multiple images)",
            "category": "advanced",
            "params": {}
        },
        "mixup": {
            "name": "MixUp",
            "description": "Blend two images together",
            "category": "advanced",
            "params": {
                "alpha": {"type": "range", "min": 0.1, "max": 0.5, "default": 0.3, "description": "Blending alpha"}
            }
        },
        "elastic": {
            "name": "Elastic Deformation",
            "description": "Apply elastic transformation",
            "category": "advanced",
            "params": {
                "alpha": {"type": "range", "min": 50, "max": 200, "default": 100, "description": "Deformation strength"},
                "sigma": {"type": "range", "min": 5, "max": 15, "default": 10, "description": "Smoothness"}
            }
        },
        "grid_distortion": {
            "name": "Grid Distortion",
            "description": "Apply grid-based distortion",
            "category": "advanced",
            "params": {
                "num_steps": {"type": "range", "min": 3, "max": 10, "default": 5, "description": "Grid size"},
                "distort_limit": {"type": "range", "min": 0.1, "max": 0.5, "default": 0.3, "description": "Distortion limit"}
            }
        },
        "histogram_equalization": {
            "name": "Histogram Equalization",
            "description": "Equalize image histogram",
            "category": "color",
            "params": {}
        },
        "channel_shuffle": {
            "name": "Channel Shuffle",
            "description": "Randomly shuffle RGB channels",
            "category": "color",
            "params": {}
        },
        "invert": {
            "name": "Invert",
            "description": "Invert image colors",
            "category": "color",
            "params": {
                "probability": {"type": "range", "min": 0, "max": 1, "default": 0.1, "description": "Probability of applying"}
            }
        },
        "posterize": {
            "name": "Posterize",
            "description": "Reduce color depth",
            "category": "color",
            "params": {
                "bits": {"type": "range", "min": 2, "max": 7, "default": 4, "description": "Number of bits per channel"}
            }
        },
        "solarize": {
            "name": "Solarize",
            "description": "Invert pixels above threshold",
            "category": "color",
            "params": {
                "threshold": {"type": "range", "min": 64, "max": 192, "default": 128, "description": "Solarize threshold"}
            }
        }
    }
    
    def get_available_augmentations(self) -> Dict[str, Any]:
        """Return list of available augmentations with their parameters"""
        return self.AVAILABLE_AUGMENTATIONS
    
    def augment_dataset(
        self,
        input_path: Path,
        output_path: Path,
        format_name: str,
        target_size: int,
        augmentations: Dict[str, Dict[str, Any]],
        preserve_originals: bool = True
    ) -> Dict[str, Any]:
        """
        Augment a dataset to reach target size
        
        Args:
            input_path: Source dataset path
            output_path: Output dataset path
            format_name: Dataset format
            target_size: Target number of images
            augmentations: Dict of augmentation configs {aug_name: {enabled: bool, params: {}}}
            preserve_originals: Whether to include original images in output
        
        Returns:
            Augmentation results
        """
        input_path = Path(input_path)
        output_path = Path(output_path)
        output_path.mkdir(parents=True, exist_ok=True)
        
        # Find all images
        images = self._find_images(input_path)
        original_count = len(images)
        
        if original_count == 0:
            return {"success": False, "error": "No images found in dataset"}
        
        # Calculate how many augmented images we need
        augmentations_needed = max(0, target_size - (original_count if preserve_originals else 0))
        augmentations_per_image = math.ceil(augmentations_needed / original_count) if original_count > 0 else 0
        
        # Get enabled augmentations
        enabled_augs = [
            (name, config.get("params", {}))
            for name, config in augmentations.items()
            if config.get("enabled", True) and name in self.AVAILABLE_AUGMENTATIONS
        ]
        
        if not enabled_augs:
            return {"success": False, "error": "No valid augmentations enabled"}
        
        # Copy dataset structure
        self._copy_structure(input_path, output_path, format_name)
        
        generated_count = 0
        augmented_images = []
        
        for img_info in images:
            img_path = img_info["path"]
            img_id = img_info["id"]
            
            # Copy original if preserving
            if preserve_originals:
                self._copy_image_with_annotations(input_path, output_path, img_info, format_name)
            
            # Generate augmentations
            for aug_idx in range(augmentations_per_image):
                if generated_count >= augmentations_needed:
                    break
                
                # Randomly select and combine augmentations
                num_augs = random.randint(1, min(3, len(enabled_augs)))
                selected_augs = random.sample(enabled_augs, num_augs)
                
                # Apply augmentations
                aug_result = self._apply_augmentations(
                    input_path / img_path,
                    output_path,
                    img_id,
                    aug_idx,
                    selected_augs,
                    format_name,
                    input_path
                )
                
                if aug_result["success"]:
                    generated_count += 1
                    augmented_images.append(aug_result["output_path"])
        
        # Update dataset config (e.g., YOLO yaml)
        self._update_dataset_config(input_path, output_path, format_name)
        
        return {
            "success": True,
            "original_images": original_count,
            "augmented_images": generated_count,
            "total_images": (original_count if preserve_originals else 0) + generated_count,
            "augmentations_applied": [name for name, _ in enabled_augs]
        }
    
    def _find_images(self, path: Path) -> List[Dict[str, Any]]:
        """Find all images in dataset"""
        images = []
        
        # Check common locations
        search_dirs = ["images", "train/images", "val/images", "test/images", "JPEGImages", ""]
        
        for search_dir in search_dirs:
            search_path = path / search_dir if search_dir else path
            if not search_path.exists():
                continue
            
            for img_file in search_path.iterdir():
                if img_file.suffix.lower() in self.IMAGE_EXTENSIONS:
                    images.append({
                        "id": img_file.stem,
                        "path": str(img_file.relative_to(path)),
                        "full_path": str(img_file)
                    })
        
        return images
    
    def _copy_structure(self, src: Path, dst: Path, format_name: str):
        """Copy dataset directory structure"""
        # Copy yaml/config files
        for config_file in src.glob("*.yaml"):
            shutil.copy(config_file, dst / config_file.name)
        for config_file in src.glob("*.yml"):
            shutil.copy(config_file, dst / config_file.name)
        
        # Create directories
        if format_name in ["yolo", "yolov5", "yolov8", "yolov9", "yolov10", "yolov11", "yolov12"]:
            (dst / "images").mkdir(exist_ok=True)
            (dst / "labels").mkdir(exist_ok=True)
        elif format_name in ["pascal-voc", "voc"]:
            (dst / "JPEGImages").mkdir(exist_ok=True)
            (dst / "Annotations").mkdir(exist_ok=True)
        elif format_name == "coco":
            (dst / "images").mkdir(exist_ok=True)
            # Copy annotations JSON
            for json_file in src.glob("*.json"):
                with open(json_file) as f:
                    data = json.load(f)
                    if all(k in data for k in ["images", "annotations", "categories"]):
                        # Create new COCO file with empty images/annotations
                        new_data = {
                            "images": [],
                            "annotations": [],
                            "categories": data["categories"]
                        }
                        with open(dst / json_file.name, "w") as out:
                            json.dump(new_data, out, indent=2)
    
    def _copy_image_with_annotations(
        self,
        src_path: Path,
        dst_path: Path,
        img_info: Dict[str, Any],
        format_name: str
    ):
        """Copy an image and its annotations"""
        src_img = src_path / img_info["path"]
        
        if format_name in ["yolo", "yolov5", "yolov8", "yolov9", "yolov10", "yolov11", "yolov12"]:
            dst_img = dst_path / "images" / src_img.name
            shutil.copy(src_img, dst_img)
            
            # Copy label
            label_name = f"{img_info['id']}.txt"
            for label_dir in ["labels", "train/labels", "val/labels"]:
                src_label = src_path / label_dir / label_name
                if src_label.exists():
                    shutil.copy(src_label, dst_path / "labels" / label_name)
                    break
        
        elif format_name in ["pascal-voc", "voc"]:
            dst_img = dst_path / "JPEGImages" / src_img.name
            shutil.copy(src_img, dst_img)
            
            # Copy annotation
            ann_name = f"{img_info['id']}.xml"
            for ann_dir in ["Annotations", ""]:
                src_ann = src_path / ann_dir / ann_name if ann_dir else src_path / ann_name
                if src_ann.exists():
                    shutil.copy(src_ann, dst_path / "Annotations" / ann_name)
                    break
    
    def _apply_augmentations(
        self,
        src_img_path: Path,
        output_path: Path,
        img_id: str,
        aug_idx: int,
        augmentations: List[Tuple[str, Dict]],
        format_name: str,
        src_dataset_path: Path
    ) -> Dict[str, Any]:
        """Apply augmentations to a single image"""
        try:
            img = Image.open(src_img_path).convert("RGB")
            original_size = img.size
            
            # Track transformation for annotation adjustment
            transform_matrix = np.eye(3)  # Identity matrix
            flip_h = False
            flip_v = False
            
            for aug_name, params in augmentations:
                img, transform_info = self._apply_single_augmentation(img, aug_name, params)
                
                if transform_info.get("flip_h"):
                    flip_h = not flip_h
                if transform_info.get("flip_v"):
                    flip_v = not flip_v
                if "matrix" in transform_info:
                    transform_matrix = np.dot(transform_info["matrix"], transform_matrix)
            
            # Save augmented image
            aug_id = f"{img_id}_aug{aug_idx}"
            
            if format_name in ["yolo", "yolov5", "yolov8", "yolov9", "yolov10", "yolov11", "yolov12"]:
                output_img_path = output_path / "images" / f"{aug_id}.jpg"
                img.save(output_img_path, "JPEG", quality=95)
                
                # Transform annotations
                self._transform_yolo_annotations(
                    src_dataset_path,
                    output_path,
                    img_id,
                    aug_id,
                    original_size,
                    img.size,
                    flip_h,
                    flip_v
                )
            
            elif format_name in ["pascal-voc", "voc"]:
                output_img_path = output_path / "JPEGImages" / f"{aug_id}.jpg"
                img.save(output_img_path, "JPEG", quality=95)
                
                self._transform_voc_annotations(
                    src_dataset_path,
                    output_path,
                    img_id,
                    aug_id,
                    original_size,
                    img.size,
                    flip_h,
                    flip_v
                )
            
            else:
                output_img_path = output_path / "images" / f"{aug_id}.jpg"
                output_img_path.parent.mkdir(exist_ok=True)
                img.save(output_img_path, "JPEG", quality=95)
            
            return {"success": True, "output_path": str(output_img_path)}
        
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _apply_single_augmentation(
        self,
        img: Image.Image,
        aug_name: str,
        params: Dict[str, Any]
    ) -> Tuple[Image.Image, Dict[str, Any]]:
        """Apply a single augmentation to an image"""
        transform_info = {}
        
        if aug_name == "flip_horizontal":
            img = ImageOps.mirror(img)
            transform_info["flip_h"] = True
        
        elif aug_name == "flip_vertical":
            img = ImageOps.flip(img)
            transform_info["flip_v"] = True
        
        elif aug_name == "rotate":
            angle_range = params.get("angle_range", [-15, 15])
            if isinstance(angle_range, list):
                angle = random.uniform(angle_range[0], angle_range[1])
            else:
                angle = random.uniform(-angle_range, angle_range)
            img = img.rotate(angle, resample=Image.Resampling.BILINEAR, expand=False, fillcolor=(128, 128, 128))
            transform_info["angle"] = angle
        
        elif aug_name == "brightness":
            factor_range = params.get("factor_range", [0.8, 1.2])
            if isinstance(factor_range, list):
                factor = random.uniform(factor_range[0], factor_range[1])
            else:
                factor = random.uniform(1 - factor_range, 1 + factor_range)
            enhancer = ImageEnhance.Brightness(img)
            img = enhancer.enhance(factor)
        
        elif aug_name == "contrast":
            factor_range = params.get("factor_range", [0.8, 1.2])
            if isinstance(factor_range, list):
                factor = random.uniform(factor_range[0], factor_range[1])
            else:
                factor = random.uniform(1 - factor_range, 1 + factor_range)
            enhancer = ImageEnhance.Contrast(img)
            img = enhancer.enhance(factor)
        
        elif aug_name == "saturation":
            factor_range = params.get("factor_range", [0.8, 1.2])
            if isinstance(factor_range, list):
                factor = random.uniform(factor_range[0], factor_range[1])
            else:
                factor = random.uniform(1 - factor_range, 1 + factor_range)
            enhancer = ImageEnhance.Color(img)
            img = enhancer.enhance(factor)
        
        elif aug_name == "blur":
            radius_range = params.get("radius_range", [0.5, 1.5])
            if isinstance(radius_range, list):
                radius = random.uniform(radius_range[0], radius_range[1])
            else:
                radius = radius_range
            img = img.filter(ImageFilter.GaussianBlur(radius=radius))
        
        elif aug_name == "sharpen":
            factor = params.get("factor", 1.5)
            enhancer = ImageEnhance.Sharpness(img)
            img = enhancer.enhance(factor)
        
        elif aug_name == "grayscale":
            probability = params.get("probability", 0.1)
            if random.random() < probability:
                img = ImageOps.grayscale(img).convert("RGB")
        
        elif aug_name == "noise":
            variance = params.get("variance", 0.02)
            img_array = np.array(img).astype(np.float32) / 255.0
            noise = np.random.normal(0, variance, img_array.shape)
            img_array = np.clip(img_array + noise, 0, 1)
            img = Image.fromarray((img_array * 255).astype(np.uint8))
        
        elif aug_name == "cutout":
            num_holes = params.get("num_holes", 2)
            size_range = params.get("size_range", [0.05, 0.15])
            img = self._apply_cutout(img, num_holes, size_range)
        
        elif aug_name == "histogram_equalization":
            img = ImageOps.equalize(img)
        
        elif aug_name == "invert":
            probability = params.get("probability", 0.1)
            if random.random() < probability:
                img = ImageOps.invert(img)
        
        elif aug_name == "posterize":
            bits = params.get("bits", 4)
            if isinstance(bits, float):
                bits = int(bits)
            img = ImageOps.posterize(img, bits)
        
        elif aug_name == "solarize":
            threshold = params.get("threshold", 128)
            if isinstance(threshold, float):
                threshold = int(threshold)
            img = ImageOps.solarize(img, threshold)
        
        elif aug_name == "crop":
            crop_range = params.get("crop_range", [0.8, 0.95])
            if isinstance(crop_range, list):
                scale = random.uniform(crop_range[0], crop_range[1])
            else:
                scale = crop_range
            
            w, h = img.size
            new_w, new_h = int(w * scale), int(h * scale)
            left = random.randint(0, w - new_w)
            top = random.randint(0, h - new_h)
            img = img.crop((left, top, left + new_w, top + new_h))
            img = img.resize((w, h), Image.Resampling.BILINEAR)
        
        elif aug_name == "hue":
            shift_range = params.get("shift_range", [-15, 15])
            if isinstance(shift_range, list):
                shift = random.uniform(shift_range[0], shift_range[1])
            else:
                shift = random.uniform(-shift_range, shift_range)
            img = self._shift_hue(img, shift / 360.0)
        
        elif aug_name == "jpeg_compression":
            quality_range = params.get("quality_range", [60, 90])
            if isinstance(quality_range, list):
                quality = random.randint(int(quality_range[0]), int(quality_range[1]))
            else:
                quality = int(quality_range)
            
            import io
            buffer = io.BytesIO()
            img.save(buffer, format="JPEG", quality=quality)
            buffer.seek(0)
            img = Image.open(buffer).convert("RGB")
        
        return img, transform_info
    
    def _apply_cutout(self, img: Image.Image, num_holes: int, size_range: List[float]) -> Image.Image:
        """Apply cutout augmentation"""
        img_array = np.array(img)
        h, w = img_array.shape[:2]
        
        for _ in range(num_holes):
            size = random.uniform(size_range[0], size_range[1])
            hole_h = int(h * size)
            hole_w = int(w * size)
            
            y = random.randint(0, h - hole_h)
            x = random.randint(0, w - hole_w)
            
            img_array[y:y+hole_h, x:x+hole_w] = 128  # Gray fill
        
        return Image.fromarray(img_array)
    
    def _shift_hue(self, img: Image.Image, shift: float) -> Image.Image:
        """Shift hue of an image"""
        import colorsys
        
        img_array = np.array(img).astype(np.float32) / 255.0
        h_shift = shift
        
        # Convert to HSV
        r, g, b = img_array[:,:,0], img_array[:,:,1], img_array[:,:,2]
        
        max_c = np.maximum(np.maximum(r, g), b)
        min_c = np.minimum(np.minimum(r, g), b)
        diff = max_c - min_c
        
        # Hue calculation
        h = np.zeros_like(max_c)
        mask = diff > 0
        
        idx = (max_c == r) & mask
        h[idx] = (60 * ((g[idx] - b[idx]) / diff[idx]) + 360) % 360
        
        idx = (max_c == g) & mask
        h[idx] = (60 * ((b[idx] - r[idx]) / diff[idx]) + 120) % 360
        
        idx = (max_c == b) & mask
        h[idx] = (60 * ((r[idx] - g[idx]) / diff[idx]) + 240) % 360
        
        # Apply shift
        h = (h / 360 + h_shift) % 1.0
        
        # Simple approximation - just return with slight color shift
        # Full HSV conversion is expensive
        shift_factor = h_shift * 2
        r_new = np.clip(r + shift_factor * 0.3, 0, 1)
        g_new = np.clip(g - shift_factor * 0.2, 0, 1)
        b_new = np.clip(b + shift_factor * 0.1, 0, 1)
        
        result = np.stack([r_new, g_new, b_new], axis=2)
        return Image.fromarray((result * 255).astype(np.uint8))
    
    def _transform_yolo_annotations(
        self,
        src_path: Path,
        dst_path: Path,
        src_id: str,
        dst_id: str,
        original_size: Tuple[int, int],
        new_size: Tuple[int, int],
        flip_h: bool,
        flip_v: bool
    ):
        """Transform YOLO annotations for augmented image"""
        # Find source label
        src_label = None
        for label_dir in ["labels", "train/labels", "val/labels"]:
            potential = src_path / label_dir / f"{src_id}.txt"
            if potential.exists():
                src_label = potential
                break
        
        if not src_label or not src_label.exists():
            # Create empty label
            (dst_path / "labels" / f"{dst_id}.txt").touch()
            return
        
        # Read and transform annotations
        with open(src_label) as f:
            lines = f.readlines()
        
        transformed_lines = []
        for line in lines:
            parts = line.strip().split()
            if len(parts) >= 5:
                class_id = parts[0]
                x_center = float(parts[1])
                y_center = float(parts[2])
                width = float(parts[3])
                height = float(parts[4])
                
                # Apply flips
                if flip_h:
                    x_center = 1 - x_center
                if flip_v:
                    y_center = 1 - y_center
                
                # Segmentation points
                if len(parts) > 5:
                    points = [float(p) for p in parts[5:]]
                    transformed_points = []
                    for i in range(0, len(points), 2):
                        x = points[i]
                        y = points[i + 1] if i + 1 < len(points) else 0
                        if flip_h:
                            x = 1 - x
                        if flip_v:
                            y = 1 - y
                        transformed_points.extend([x, y])
                    
                    transformed_lines.append(
                        f"{class_id} {x_center:.6f} {y_center:.6f} {width:.6f} {height:.6f} " +
                        " ".join(f"{p:.6f}" for p in transformed_points)
                    )
                else:
                    transformed_lines.append(
                        f"{class_id} {x_center:.6f} {y_center:.6f} {width:.6f} {height:.6f}"
                    )
        
        # Write transformed annotations
        dst_label = dst_path / "labels" / f"{dst_id}.txt"
        with open(dst_label, "w") as f:
            f.write("\n".join(transformed_lines))
    
    def _transform_voc_annotations(
        self,
        src_path: Path,
        dst_path: Path,
        src_id: str,
        dst_id: str,
        original_size: Tuple[int, int],
        new_size: Tuple[int, int],
        flip_h: bool,
        flip_v: bool
    ):
        """Transform Pascal VOC annotations for augmented image"""
        import xml.etree.ElementTree as ET
        from xml.dom import minidom
        
        # Find source annotation
        src_ann = None
        for ann_dir in ["Annotations", ""]:
            potential = src_path / ann_dir / f"{src_id}.xml" if ann_dir else src_path / f"{src_id}.xml"
            if potential.exists():
                src_ann = potential
                break
        
        if not src_ann:
            return
        
        tree = ET.parse(src_ann)
        root = tree.getroot()
        
        w, h = original_size
        
        # Update filename
        filename_elem = root.find("filename")
        if filename_elem is not None:
            filename_elem.text = f"{dst_id}.jpg"
        
        # Transform bounding boxes
        for obj in root.findall("object"):
            bndbox = obj.find("bndbox")
            if bndbox is not None:
                xmin = int(float(bndbox.find("xmin").text))
                ymin = int(float(bndbox.find("ymin").text))
                xmax = int(float(bndbox.find("xmax").text))
                ymax = int(float(bndbox.find("ymax").text))
                
                if flip_h:
                    xmin, xmax = w - xmax, w - xmin
                if flip_v:
                    ymin, ymax = h - ymax, h - ymin
                
                bndbox.find("xmin").text = str(xmin)
                bndbox.find("ymin").text = str(ymin)
                bndbox.find("xmax").text = str(xmax)
                bndbox.find("ymax").text = str(ymax)
        
        # Write transformed annotation
        dst_ann = dst_path / "Annotations" / f"{dst_id}.xml"
        tree.write(dst_ann)
    
    def _update_dataset_config(self, src_path: Path, dst_path: Path, format_name: str):
        """Update dataset configuration files"""
        if format_name in ["yolo", "yolov5", "yolov8", "yolov9", "yolov10", "yolov11", "yolov12"]:
            # Update YOLO yaml
            for yaml_file in dst_path.glob("*.yaml"):
                import yaml
                with open(yaml_file) as f:
                    config = yaml.safe_load(f) or {}
                
                config["path"] = str(dst_path.absolute())
                config["train"] = "images"
                config["val"] = "images"
                
                with open(yaml_file, "w") as f:
                    yaml.dump(config, f, default_flow_style=False)
