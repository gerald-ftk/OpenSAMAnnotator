"""
Annotation Tools - Manual annotation management
"""

import os
import json
import yaml
import xml.etree.ElementTree as ET
from xml.dom import minidom
from pathlib import Path
from typing import Dict, List, Any, Optional
from PIL import Image
import shutil


class AnnotationManager:
    """Manage annotations for datasets"""
    
    IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".gif", ".webp", ".tiff", ".tif"}
    
    def update_annotations(
        self,
        dataset_path: Path,
        format_name: str,
        image_id: str,
        annotations: List[Dict[str, Any]]
    ):
        """Update annotations for a specific image"""
        dataset_path = Path(dataset_path)
        
        updaters = {
            "yolo": self._update_yolo_annotations,
            "yolov5": self._update_yolo_annotations,
            "yolov8": self._update_yolo_annotations,
            "yolov9": self._update_yolo_annotations,
            "yolov10": self._update_yolo_annotations,
            "yolov11": self._update_yolo_annotations,
            "yolov12": self._update_yolo_annotations,
            "coco": self._update_coco_annotations,
            "pascal-voc": self._update_voc_annotations,
            "voc": self._update_voc_annotations,
            "labelme": self._update_labelme_annotations,
        }
        
        updater = updaters.get(format_name)
        if updater:
            updater(dataset_path, image_id, annotations)
    
    def _find_dataset_root(self, path: Path) -> Path:
        """Descend into single-child directories (handles ZIP-extracted nesting)."""
        for _ in range(2):
            children = [c for c in path.iterdir()
                        if not c.name.startswith(".") and c.name != "dataset_metadata.json"]
            subdirs = [c for c in children if c.is_dir()]
            files   = [c for c in children if c.is_file()]
            if not files and len(subdirs) == 1:
                path = subdirs[0]
            else:
                break
        return path

    def _update_yolo_annotations(
        self,
        dataset_path: Path,
        image_id: str,
        annotations: List[Dict[str, Any]]
    ):
        """Update YOLO format annotations"""
        dataset_path = Path(dataset_path)
        root = self._find_dataset_root(dataset_path)

        # Find image file anywhere under root
        image_file = None
        for ext in self.IMAGE_EXTENSIONS:
            for found in root.glob(f"**/{image_id}{ext}"):
                image_file = found
                break
            if image_file:
                break

        if not image_file:
            return

        with Image.open(image_file) as img:
            width, height = img.size

        # Label file lives beside the image but in a sibling "labels" folder
        # e.g. root/train/images/foo.jpg  →  root/train/labels/foo.txt
        img_parent = image_file.parent
        if img_parent.name == "images":
            label_dir = img_parent.parent / "labels"
        else:
            label_dir = img_parent.parent / "labels"
        label_dir.mkdir(parents=True, exist_ok=True)
        label_file = label_dir / f"{image_id}.txt"

        # Load class mapping from yaml
        classes: List[str] = []
        for yaml_file in list(root.glob("*.yaml")) + list(root.glob("*.yml")):
            try:
                with open(yaml_file) as f:
                    config = yaml.safe_load(f)
                    if "names" in config:
                        names = config["names"]
                        classes = list(names.values()) if isinstance(names, dict) else list(names)
                    break
            except Exception:
                pass

        class_to_id = {name: idx for idx, name in enumerate(classes)}

        with open(label_file, "w") as f:
            for ann in annotations:
                class_name = ann.get("class_name", "unknown")
                class_id = ann.get("class_id", class_to_id.get(class_name, 0))

                if ann.get("type") == "polygon" and ann.get("points"):
                    pts = ann["points"]
                    if ann.get("normalized"):
                        # Already in [0,1] — write as-is
                        norm = [float(p) for p in pts]
                    else:
                        # Pixel coordinates — normalize
                        norm = []
                        for i in range(0, len(pts) - 1, 2):
                            norm.append(float(pts[i]) / width)
                            norm.append(float(pts[i + 1]) / height)
                    if norm:
                        f.write(f"{class_id} " + " ".join(f"{p:.6f}" for p in norm) + "\n")

                elif ann.get("x_center") is not None:
                    # Already-normalized bbox (loaded from YOLO label)
                    xc = float(ann["x_center"])
                    yc = float(ann["y_center"])
                    w  = float(ann["width"])
                    h  = float(ann["height"])
                    f.write(f"{class_id} {xc:.6f} {yc:.6f} {w:.6f} {h:.6f}\n")

                elif ann.get("bbox"):
                    # Pixel-coordinate bbox drawn by user: [x, y, w, h]
                    bbox = ann["bbox"]
                    xc = (float(bbox[0]) + float(bbox[2]) / 2) / width
                    yc = (float(bbox[1]) + float(bbox[3]) / 2) / height
                    w  = float(bbox[2]) / width
                    h  = float(bbox[3]) / height
                    f.write(f"{class_id} {xc:.6f} {yc:.6f} {w:.6f} {h:.6f}\n")
    
    def _update_coco_annotations(
        self,
        dataset_path: Path,
        image_id: str,
        annotations: List[Dict[str, Any]]
    ):
        """Update COCO format annotations"""
        # Find COCO JSON file
        json_file = None
        for jf in list(dataset_path.glob("*.json")) + list(dataset_path.glob("annotations/*.json")):
            try:
                with open(jf) as f:
                    data = json.load(f)
                    if all(key in data for key in ["images", "annotations", "categories"]):
                        json_file = jf
                        break
            except:
                pass
        
        if not json_file:
            return
        
        with open(json_file) as f:
            coco_data = json.load(f)
        
        # Find image ID
        img_id = None
        for img in coco_data["images"]:
            if str(img["id"]) == image_id or img.get("file_name", "").startswith(image_id):
                img_id = img["id"]
                break
        
        if img_id is None:
            return
        
        # Build category map
        cat_name_to_id = {cat["name"]: cat["id"] for cat in coco_data["categories"]}
        
        # Remove existing annotations for this image
        coco_data["annotations"] = [
            ann for ann in coco_data["annotations"]
            if ann["image_id"] != img_id
        ]
        
        # Add new annotations
        max_ann_id = max([ann["id"] for ann in coco_data["annotations"]], default=0)
        
        for ann in annotations:
            max_ann_id += 1
            class_name = ann.get("class_name", "unknown")
            category_id = cat_name_to_id.get(class_name, 0)
            
            coco_ann = {
                "id": max_ann_id,
                "image_id": img_id,
                "category_id": category_id,
                "iscrowd": 0
            }
            
            if ann.get("bbox"):
                coco_ann["bbox"] = ann["bbox"]
                coco_ann["area"] = ann["bbox"][2] * ann["bbox"][3]
            
            if ann.get("segmentation"):
                coco_ann["segmentation"] = ann["segmentation"]
            
            coco_data["annotations"].append(coco_ann)
        
        with open(json_file, "w") as f:
            json.dump(coco_data, f, indent=2)
    
    def _update_voc_annotations(
        self,
        dataset_path: Path,
        image_id: str,
        annotations: List[Dict[str, Any]]
    ):
        """Update Pascal VOC format annotations"""
        # Find XML file
        xml_file = None
        for xf in dataset_path.glob(f"**/{image_id}.xml"):
            xml_file = xf
            break
        
        if not xml_file:
            xml_file = dataset_path / "Annotations" / f"{image_id}.xml"
            xml_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Find corresponding image
        image_file = None
        for ext in self.IMAGE_EXTENSIONS:
            for pattern in [f"**/{image_id}{ext}"]:
                for found in dataset_path.glob(pattern):
                    image_file = found
                    break
                if image_file:
                    break
            if image_file:
                break
        
        # Get image dimensions
        width, height = 0, 0
        if image_file:
            try:
                with Image.open(image_file) as img:
                    width, height = img.size
            except:
                pass
        
        # Create XML
        annotation_elem = ET.Element("annotation")
        
        folder = ET.SubElement(annotation_elem, "folder")
        folder.text = "JPEGImages"
        
        filename = ET.SubElement(annotation_elem, "filename")
        filename.text = image_file.name if image_file else f"{image_id}.jpg"
        
        size = ET.SubElement(annotation_elem, "size")
        width_elem = ET.SubElement(size, "width")
        width_elem.text = str(width)
        height_elem = ET.SubElement(size, "height")
        height_elem.text = str(height)
        depth = ET.SubElement(size, "depth")
        depth.text = "3"
        
        for ann in annotations:
            obj = ET.SubElement(annotation_elem, "object")
            
            name = ET.SubElement(obj, "name")
            name.text = ann.get("class_name", "unknown")
            
            pose = ET.SubElement(obj, "pose")
            pose.text = "Unspecified"
            
            truncated = ET.SubElement(obj, "truncated")
            truncated.text = "0"
            
            difficult = ET.SubElement(obj, "difficult")
            difficult.text = "0"
            
            if ann.get("bbox"):
                bndbox = ET.SubElement(obj, "bndbox")
                bbox = ann["bbox"]
                
                xmin = ET.SubElement(bndbox, "xmin")
                xmin.text = str(int(bbox[0] if len(bbox) > 0 else 0))
                ymin = ET.SubElement(bndbox, "ymin")
                ymin.text = str(int(bbox[1] if len(bbox) > 1 else 0))
                xmax = ET.SubElement(bndbox, "xmax")
                xmax.text = str(int(bbox[2] if len(bbox) > 2 else 0))
                ymax = ET.SubElement(bndbox, "ymax")
                ymax.text = str(int(bbox[3] if len(bbox) > 3 else 0))
        
        xml_str = minidom.parseString(ET.tostring(annotation_elem)).toprettyxml(indent="  ")
        with open(xml_file, "w") as f:
            f.write(xml_str)
    
    def _update_labelme_annotations(
        self,
        dataset_path: Path,
        image_id: str,
        annotations: List[Dict[str, Any]]
    ):
        """Update LabelMe format annotations"""
        # Find JSON file
        json_file = None
        for jf in dataset_path.glob(f"**/{image_id}.json"):
            json_file = jf
            break
        
        if not json_file:
            json_file = dataset_path / f"{image_id}.json"
        
        # Find corresponding image
        image_file = None
        image_path = ""
        for ext in self.IMAGE_EXTENSIONS:
            for found in dataset_path.glob(f"**/{image_id}{ext}"):
                image_file = found
                image_path = found.name
                break
            if image_file:
                break
        
        # Get image dimensions
        width, height = 0, 0
        if image_file:
            try:
                with Image.open(image_file) as img:
                    width, height = img.size
            except:
                pass
        
        # Load existing or create new
        if json_file.exists():
            with open(json_file) as f:
                labelme_data = json.load(f)
        else:
            labelme_data = {
                "version": "5.0.0",
                "flags": {},
                "shapes": [],
                "imagePath": image_path,
                "imageData": None,
                "imageHeight": height,
                "imageWidth": width
            }
        
        # Update shapes
        labelme_data["shapes"] = []
        
        for ann in annotations:
            shape = {
                "label": ann.get("class_name", "unknown"),
                "flags": {},
                "group_id": None
            }
            
            if ann.get("type") == "polygon" and ann.get("points"):
                points = ann["points"]
                shape["shape_type"] = "polygon"
                shape["points"] = [[points[i], points[i+1]] for i in range(0, len(points), 2)]
            elif ann.get("bbox"):
                bbox = ann["bbox"]
                shape["shape_type"] = "rectangle"
                if len(bbox) == 4:
                    shape["points"] = [
                        [bbox[0], bbox[1]],
                        [bbox[0] + bbox[2], bbox[1] + bbox[3]]
                    ]
                else:
                    shape["points"] = [[0, 0], [100, 100]]
            else:
                continue
            
            labelme_data["shapes"].append(shape)
        
        with open(json_file, "w") as f:
            json.dump(labelme_data, f, indent=2)
    
    def add_image(
        self,
        dataset_path: Path,
        format_name: str,
        file
    ) -> str:
        """Add a new image to the dataset"""
        dataset_path = Path(dataset_path)
        
        # Determine image directory
        if format_name in ["yolo", "yolov5", "yolov8", "yolov9", "yolov10", "yolov11", "yolov12"]:
            images_dir = dataset_path / "images"
        elif format_name in ["pascal-voc", "voc"]:
            images_dir = dataset_path / "JPEGImages"
        elif format_name == "coco":
            images_dir = dataset_path / "images"
        else:
            images_dir = dataset_path / "images"
        
        images_dir.mkdir(parents=True, exist_ok=True)
        
        # Save image
        image_path = images_dir / file.filename
        with open(image_path, "wb") as f:
            content = file.file.read()
            f.write(content)
        
        return str(image_path.relative_to(dataset_path))
    
    def add_classes(
        self,
        dataset_path: Path,
        format_name: str,
        new_classes: List[str]
    ):
        """Add new classes to a dataset"""
        dataset_path = Path(dataset_path)
        
        if format_name in ["yolo", "yolov5", "yolov8", "yolov9", "yolov10", "yolov11", "yolov12"]:
            self._add_yolo_classes(dataset_path, new_classes)
        elif format_name == "coco":
            self._add_coco_classes(dataset_path, new_classes)
    
    def _add_yolo_classes(self, dataset_path: Path, new_classes: List[str]):
        """Add classes to YOLO dataset"""
        # Find yaml config
        yaml_file = None
        for yf in list(dataset_path.glob("*.yaml")) + list(dataset_path.glob("*.yml")):
            yaml_file = yf
            break
        
        if not yaml_file:
            yaml_file = dataset_path / "data.yaml"
        
        # Load existing config
        if yaml_file.exists():
            with open(yaml_file) as f:
                config = yaml.safe_load(f) or {}
        else:
            config = {
                "path": str(dataset_path.absolute()),
                "train": "images",
                "val": "images"
            }
        
        # Get existing classes
        if "names" in config:
            if isinstance(config["names"], dict):
                existing = list(config["names"].values())
            else:
                existing = config["names"]
        else:
            existing = []
        
        # Add new classes
        for cls in new_classes:
            if cls not in existing:
                existing.append(cls)
        
        config["names"] = {i: name for i, name in enumerate(existing)}
        config["nc"] = len(existing)
        
        with open(yaml_file, "w") as f:
            yaml.dump(config, f, default_flow_style=False)
    
    def _add_coco_classes(self, dataset_path: Path, new_classes: List[str]):
        """Add classes to COCO dataset"""
        # Find COCO JSON file
        json_file = None
        for jf in list(dataset_path.glob("*.json")) + list(dataset_path.glob("annotations/*.json")):
            try:
                with open(jf) as f:
                    data = json.load(f)
                    if all(key in data for key in ["images", "annotations", "categories"]):
                        json_file = jf
                        break
            except:
                pass
        
        if not json_file:
            return
        
        with open(json_file) as f:
            coco_data = json.load(f)
        
        # Get existing class names
        existing = {cat["name"] for cat in coco_data["categories"]}
        max_id = max([cat["id"] for cat in coco_data["categories"]], default=0)
        
        # Add new classes
        for cls in new_classes:
            if cls not in existing:
                max_id += 1
                coco_data["categories"].append({
                    "id": max_id,
                    "name": cls,
                    "supercategory": "none"
                })
        
        with open(json_file, "w") as f:
            json.dump(coco_data, f, indent=2)
    
    def create_empty_annotation(
        self,
        dataset_path: Path,
        format_name: str,
        image_id: str,
        image_filename: str,
        width: int,
        height: int
    ):
        """Create an empty annotation file for an image"""
        dataset_path = Path(dataset_path)
        
        if format_name in ["yolo", "yolov5", "yolov8", "yolov9", "yolov10", "yolov11", "yolov12"]:
            labels_dir = dataset_path / "labels"
            labels_dir.mkdir(parents=True, exist_ok=True)
            (labels_dir / f"{image_id}.txt").touch()
        
        elif format_name == "coco":
            # Add to COCO JSON
            json_file = None
            for jf in list(dataset_path.glob("*.json")) + list(dataset_path.glob("annotations/*.json")):
                try:
                    with open(jf) as f:
                        data = json.load(f)
                        if all(key in data for key in ["images", "annotations", "categories"]):
                            json_file = jf
                            break
                except:
                    pass
            
            if json_file:
                with open(json_file) as f:
                    coco_data = json.load(f)
                
                max_img_id = max([img["id"] for img in coco_data["images"]], default=0)
                coco_data["images"].append({
                    "id": max_img_id + 1,
                    "file_name": image_filename,
                    "width": width,
                    "height": height
                })
                
                with open(json_file, "w") as f:
                    json.dump(coco_data, f, indent=2)
        
        elif format_name in ["pascal-voc", "voc"]:
            ann_dir = dataset_path / "Annotations"
            ann_dir.mkdir(parents=True, exist_ok=True)
            
            annotation = ET.Element("annotation")
            
            folder = ET.SubElement(annotation, "folder")
            folder.text = "JPEGImages"
            
            filename = ET.SubElement(annotation, "filename")
            filename.text = image_filename
            
            size = ET.SubElement(annotation, "size")
            width_elem = ET.SubElement(size, "width")
            width_elem.text = str(width)
            height_elem = ET.SubElement(size, "height")
            height_elem.text = str(height)
            depth = ET.SubElement(size, "depth")
            depth.text = "3"
            
            xml_str = minidom.parseString(ET.tostring(annotation)).toprettyxml(indent="  ")
            with open(ann_dir / f"{image_id}.xml", "w") as f:
                f.write(xml_str)
        
        elif format_name == "labelme":
            labelme_data = {
                "version": "5.0.0",
                "flags": {},
                "shapes": [],
                "imagePath": image_filename,
                "imageData": None,
                "imageHeight": height,
                "imageWidth": width
            }
            
            with open(dataset_path / f"{image_id}.json", "w") as f:
                json.dump(labelme_data, f, indent=2)
