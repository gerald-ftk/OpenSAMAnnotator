"""
Format Converter - Convert between different CV annotation formats
"""

import os
import json
import yaml
import xml.etree.ElementTree as ET
from xml.dom import minidom
import csv
import shutil
from pathlib import Path
from typing import Dict, List, Any, Optional
from PIL import Image


class FormatConverter:
    """Convert between different annotation formats"""
    
    SUPPORTED_FORMATS = {
        "yolo": {"name": "YOLO/YOLOv5/v8/v9/v10/v11", "extensions": [".txt"], "task": ["detection", "segmentation"]},
        "yolov8-obb": {"name": "YOLOv8 OBB", "extensions": [".txt"], "task": ["obb-detection"]},
        "coco": {"name": "COCO JSON", "extensions": [".json"], "task": ["detection", "segmentation", "keypoint"]},
        "pascal-voc": {"name": "Pascal VOC XML", "extensions": [".xml"], "task": ["detection"]},
        "createml": {"name": "CreateML JSON", "extensions": [".json"], "task": ["detection"]},
        "tensorflow-csv": {"name": "TensorFlow CSV", "extensions": [".csv"], "task": ["detection"]},
        "labelme": {"name": "LabelMe JSON", "extensions": [".json"], "task": ["detection", "segmentation"]},
        "classification-folder": {"name": "Classification Folders", "extensions": [], "task": ["classification"]},
    }
    
    IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".gif", ".webp", ".tiff", ".tif"}
    
    def list_formats(self) -> List[Dict[str, Any]]:
        """List all supported formats"""
        return [
            {"id": fmt_id, **fmt_info}
            for fmt_id, fmt_info in self.SUPPORTED_FORMATS.items()
        ]
    
    def convert(
        self,
        source_path: Path,
        output_path: Path,
        source_format: str,
        target_format: str
    ):
        """Convert a dataset from one format to another"""
        source_path = Path(source_path)
        output_path = Path(output_path)
        output_path.mkdir(parents=True, exist_ok=True)
        
        # First, load the dataset into a unified internal format
        unified_data = self._load_unified(source_path, source_format)
        
        # Then, export to target format
        self._export_unified(unified_data, output_path, target_format)
        
        # Copy images
        self._copy_images(source_path, output_path, unified_data, target_format)
    
    def _load_unified(self, path: Path, format_name: str) -> Dict[str, Any]:
        """Load dataset into unified internal format"""
        loaders = {
            "yolo": self._load_yolo,
            "yolov5": self._load_yolo,
            "yolov8": self._load_yolo,
            "yolov9": self._load_yolo,
            "yolov10": self._load_yolo,
            "yolov11": self._load_yolo,
            "yolov12": self._load_yolo,
            "yolo_seg": self._load_yolo,
            "yolo-seg": self._load_yolo,
            "coco": self._load_coco,
            "pascal-voc": self._load_voc,
            "voc": self._load_voc,
            "createml": self._load_createml,
            "tensorflow-csv": self._load_tensorflow_csv,
            "csv": self._load_tensorflow_csv,
            "labelme": self._load_labelme,
            "classification-folder": self._load_classification,
            "classification": self._load_classification,
        }
        
        loader = loaders.get(format_name, self._load_generic)
        return loader(path)
    
    def _export_unified(self, data: Dict[str, Any], output_path: Path, format_name: str):
        """Export unified data to target format"""
        exporters = {
            "yolo": self._export_yolo,
            "yolov5": self._export_yolo,
            "yolov8": self._export_yolo,
            "yolov9": self._export_yolo,
            "yolov10": self._export_yolo,
            "yolov11": self._export_yolo,
            "yolov12": self._export_yolo,
            "yolo_seg": self._export_yolo,
            "yolo-seg": self._export_yolo,
            "coco": self._export_coco,
            "pascal-voc": self._export_voc,
            "voc": self._export_voc,
            "createml": self._export_createml,
            "tensorflow-csv": self._export_tensorflow_csv,
            "csv": self._export_tensorflow_csv,
            "labelme": self._export_labelme,
            "classification-folder": self._export_classification,
            "classification": self._export_classification,
        }
        
        exporter = exporters.get(format_name, self._export_yolo)
        exporter(data, output_path)
    
    # ============== LOADERS ==============
    
    def _load_yolo(self, path: Path) -> Dict[str, Any]:
        """Load YOLO format into unified format"""
        data = {
            "classes": [],
            "images": []
        }
        
        # Load classes from yaml
        for yaml_file in list(path.glob("*.yaml")) + list(path.glob("*.yml")):
            try:
                with open(yaml_file) as f:
                    config = yaml.safe_load(f)
                    if "names" in config:
                        if isinstance(config["names"], dict):
                            data["classes"] = list(config["names"].values())
                        else:
                            data["classes"] = config["names"]
                    break
            except:
                pass
        
        # Find images and labels
        image_dirs = ["images", "train/images", "val/images", "test/images", ""]
        
        for img_dir in image_dirs:
            img_path = path / img_dir if img_dir else path
            if not img_path.exists():
                continue
            
            label_dir = str(img_dir).replace("images", "labels") if img_dir else "labels"
            label_path = path / label_dir if label_dir else path
            
            for img_file in img_path.iterdir():
                if img_file.suffix.lower() in self.IMAGE_EXTENSIONS:
                    # Get image dimensions
                    try:
                        with Image.open(img_file) as img:
                            width, height = img.size
                    except:
                        width, height = 0, 0
                    
                    image_data = {
                        "id": img_file.stem,
                        "filename": img_file.name,
                        "path": str(img_file.relative_to(path)),
                        "width": width,
                        "height": height,
                        "annotations": []
                    }
                    
                    # Load annotations
                    label_file = label_path / f"{img_file.stem}.txt"
                    if label_file.exists():
                        with open(label_file) as f:
                            for line in f:
                                parts = line.strip().split()
                                if len(parts) >= 5:
                                    class_id = int(parts[0])
                                    
                                    if len(parts) == 5:
                                        # Bounding box: class x_center y_center width height
                                        x_center = float(parts[1])
                                        y_center = float(parts[2])
                                        w = float(parts[3])
                                        h = float(parts[4])
                                        
                                        # Convert to absolute coordinates
                                        x_min = (x_center - w/2) * width
                                        y_min = (y_center - h/2) * height
                                        x_max = (x_center + w/2) * width
                                        y_max = (y_center + h/2) * height
                                        
                                        image_data["annotations"].append({
                                            "type": "bbox",
                                            "class_id": class_id,
                                            "class_name": data["classes"][class_id] if class_id < len(data["classes"]) else f"class_{class_id}",
                                            "bbox": [x_min, y_min, x_max - x_min, y_max - y_min]
                                        })
                                    else:
                                        # Polygon segmentation
                                        points = [float(p) for p in parts[1:]]
                                        # Convert normalized to absolute
                                        abs_points = []
                                        for i in range(0, len(points), 2):
                                            abs_points.append(points[i] * width)
                                            abs_points.append(points[i+1] * height)
                                        
                                        image_data["annotations"].append({
                                            "type": "polygon",
                                            "class_id": class_id,
                                            "class_name": data["classes"][class_id] if class_id < len(data["classes"]) else f"class_{class_id}",
                                            "segmentation": [abs_points]
                                        })
                    
                    data["images"].append(image_data)
        
        return data
    
    def _load_coco(self, path: Path) -> Dict[str, Any]:
        """Load COCO format into unified format"""
        data = {
            "classes": [],
            "images": []
        }
        
        for json_file in list(path.glob("*.json")) + list(path.glob("annotations/*.json")):
            try:
                with open(json_file) as f:
                    coco_data = json.load(f)
                
                if all(key in coco_data for key in ["images", "annotations", "categories"]):
                    # Build class list
                    cat_map = {}
                    for cat in coco_data["categories"]:
                        cat_map[cat["id"]] = len(data["classes"])
                        data["classes"].append(cat["name"])
                    
                    # Build annotation map
                    ann_map = {}
                    for ann in coco_data["annotations"]:
                        img_id = ann["image_id"]
                        if img_id not in ann_map:
                            ann_map[img_id] = []
                        
                        annotation = {
                            "class_id": cat_map.get(ann["category_id"], 0),
                            "class_name": data["classes"][cat_map.get(ann["category_id"], 0)] if cat_map.get(ann["category_id"], 0) < len(data["classes"]) else "unknown",
                            "bbox": ann.get("bbox", [])
                        }
                        
                        if ann.get("segmentation"):
                            annotation["type"] = "polygon"
                            annotation["segmentation"] = ann["segmentation"]
                        else:
                            annotation["type"] = "bbox"
                        
                        ann_map[img_id].append(annotation)
                    
                    # Build image list
                    for img in coco_data["images"]:
                        data["images"].append({
                            "id": str(img["id"]),
                            "filename": img["file_name"],
                            "path": img["file_name"],
                            "width": img.get("width", 0),
                            "height": img.get("height", 0),
                            "annotations": ann_map.get(img["id"], [])
                        })
                    
                    break
            except:
                pass
        
        return data
    
    def _load_voc(self, path: Path) -> Dict[str, Any]:
        """Load Pascal VOC format into unified format"""
        data = {
            "classes": [],
            "images": []
        }
        
        class_set = set()
        
        for xml_file in path.glob("**/*.xml"):
            try:
                tree = ET.parse(xml_file)
                root = tree.getroot()
                
                if root.tag == "annotation":
                    filename_elem = root.find("filename")
                    size_elem = root.find("size")
                    
                    if filename_elem is not None:
                        width = int(size_elem.find("width").text) if size_elem is not None else 0
                        height = int(size_elem.find("height").text) if size_elem is not None else 0
                        
                        image_data = {
                            "id": xml_file.stem,
                            "filename": filename_elem.text,
                            "path": filename_elem.text,
                            "width": width,
                            "height": height,
                            "annotations": []
                        }
                        
                        for obj in root.findall("object"):
                            name = obj.find("name")
                            bndbox = obj.find("bndbox")
                            
                            if name is not None and bndbox is not None:
                                class_name = name.text
                                class_set.add(class_name)
                                
                                x_min = int(float(bndbox.find("xmin").text))
                                y_min = int(float(bndbox.find("ymin").text))
                                x_max = int(float(bndbox.find("xmax").text))
                                y_max = int(float(bndbox.find("ymax").text))
                                
                                image_data["annotations"].append({
                                    "type": "bbox",
                                    "class_name": class_name,
                                    "bbox": [x_min, y_min, x_max - x_min, y_max - y_min]
                                })
                        
                        data["images"].append(image_data)
            except:
                pass
        
        data["classes"] = sorted(list(class_set))
        
        # Update class IDs
        class_to_id = {name: idx for idx, name in enumerate(data["classes"])}
        for img in data["images"]:
            for ann in img["annotations"]:
                ann["class_id"] = class_to_id.get(ann["class_name"], 0)
        
        return data
    
    def _load_createml(self, path: Path) -> Dict[str, Any]:
        """Load CreateML format into unified format"""
        data = {
            "classes": [],
            "images": []
        }
        
        class_set = set()
        
        for json_file in path.glob("*.json"):
            try:
                with open(json_file) as f:
                    createml_data = json.load(f)
                
                if isinstance(createml_data, list):
                    for item in createml_data:
                        if "image" in item:
                            image_data = {
                                "id": Path(item["image"]).stem,
                                "filename": item["image"],
                                "path": item["image"],
                                "width": 0,
                                "height": 0,
                                "annotations": []
                            }
                            
                            for ann in item.get("annotations", []):
                                class_name = ann.get("label", "unknown")
                                class_set.add(class_name)
                                
                                coords = ann.get("coordinates", {})
                                x = coords.get("x", 0)
                                y = coords.get("y", 0)
                                w = coords.get("width", 0)
                                h = coords.get("height", 0)
                                
                                image_data["annotations"].append({
                                    "type": "bbox",
                                    "class_name": class_name,
                                    "bbox": [x - w/2, y - h/2, w, h]
                                })
                            
                            data["images"].append(image_data)
            except:
                pass
        
        data["classes"] = sorted(list(class_set))
        
        # Update class IDs
        class_to_id = {name: idx for idx, name in enumerate(data["classes"])}
        for img in data["images"]:
            for ann in img["annotations"]:
                ann["class_id"] = class_to_id.get(ann["class_name"], 0)
        
        return data
    
    def _load_tensorflow_csv(self, path: Path) -> Dict[str, Any]:
        """Load TensorFlow CSV format into unified format"""
        data = {
            "classes": [],
            "images": []
        }
        
        class_set = set()
        image_map = {}
        
        for csv_file in path.glob("*.csv"):
            try:
                with open(csv_file) as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        filename = row.get("filename", "")
                        class_name = row.get("class", "unknown")
                        class_set.add(class_name)
                        
                        if filename not in image_map:
                            image_map[filename] = {
                                "id": Path(filename).stem,
                                "filename": filename,
                                "path": filename,
                                "width": int(row.get("width", 0)),
                                "height": int(row.get("height", 0)),
                                "annotations": []
                            }
                        
                        image_map[filename]["annotations"].append({
                            "type": "bbox",
                            "class_name": class_name,
                            "bbox": [
                                int(row.get("xmin", 0)),
                                int(row.get("ymin", 0)),
                                int(row.get("xmax", 0)) - int(row.get("xmin", 0)),
                                int(row.get("ymax", 0)) - int(row.get("ymin", 0))
                            ]
                        })
            except:
                pass
        
        data["classes"] = sorted(list(class_set))
        data["images"] = list(image_map.values())
        
        # Update class IDs
        class_to_id = {name: idx for idx, name in enumerate(data["classes"])}
        for img in data["images"]:
            for ann in img["annotations"]:
                ann["class_id"] = class_to_id.get(ann["class_name"], 0)
        
        return data
    
    def _load_labelme(self, path: Path) -> Dict[str, Any]:
        """Load LabelMe format into unified format"""
        data = {
            "classes": [],
            "images": []
        }
        
        class_set = set()
        
        for json_file in path.glob("**/*.json"):
            try:
                with open(json_file) as f:
                    labelme_data = json.load(f)
                
                if "shapes" in labelme_data:
                    image_data = {
                        "id": json_file.stem,
                        "filename": labelme_data.get("imagePath", json_file.stem),
                        "path": labelme_data.get("imagePath", ""),
                        "width": labelme_data.get("imageWidth", 0),
                        "height": labelme_data.get("imageHeight", 0),
                        "annotations": []
                    }
                    
                    for shape in labelme_data["shapes"]:
                        class_name = shape.get("label", "unknown")
                        class_set.add(class_name)
                        
                        shape_type = shape.get("shape_type", "polygon")
                        points = shape.get("points", [])
                        
                        annotation = {
                            "class_name": class_name
                        }
                        
                        if shape_type == "rectangle" and len(points) >= 2:
                            x_min = min(points[0][0], points[1][0])
                            y_min = min(points[0][1], points[1][1])
                            x_max = max(points[0][0], points[1][0])
                            y_max = max(points[0][1], points[1][1])
                            annotation["type"] = "bbox"
                            annotation["bbox"] = [x_min, y_min, x_max - x_min, y_max - y_min]
                        else:
                            flat_points = []
                            for pt in points:
                                flat_points.extend(pt)
                            annotation["type"] = "polygon"
                            annotation["segmentation"] = [flat_points]
                        
                        image_data["annotations"].append(annotation)
                    
                    data["images"].append(image_data)
            except:
                pass
        
        data["classes"] = sorted(list(class_set))
        
        # Update class IDs
        class_to_id = {name: idx for idx, name in enumerate(data["classes"])}
        for img in data["images"]:
            for ann in img["annotations"]:
                ann["class_id"] = class_to_id.get(ann["class_name"], 0)
        
        return data
    
    def _load_classification(self, path: Path) -> Dict[str, Any]:
        """Load classification folder format into unified format"""
        data = {
            "classes": [],
            "images": []
        }
        
        for subdir in sorted(path.iterdir()):
            if subdir.is_dir() and not subdir.name.startswith("."):
                class_name = subdir.name
                class_id = len(data["classes"])
                data["classes"].append(class_name)
                
                for img_file in subdir.iterdir():
                    if img_file.suffix.lower() in self.IMAGE_EXTENSIONS:
                        data["images"].append({
                            "id": img_file.stem,
                            "filename": img_file.name,
                            "path": str(img_file.relative_to(path)),
                            "width": 0,
                            "height": 0,
                            "annotations": [{
                                "type": "classification",
                                "class_id": class_id,
                                "class_name": class_name
                            }]
                        })
        
        return data
    
    def _load_generic(self, path: Path) -> Dict[str, Any]:
        """Load generic/unknown format"""
        data = {
            "classes": [],
            "images": []
        }
        
        for img_file in path.glob("**/*"):
            if img_file.suffix.lower() in self.IMAGE_EXTENSIONS:
                data["images"].append({
                    "id": img_file.stem,
                    "filename": img_file.name,
                    "path": str(img_file.relative_to(path)),
                    "width": 0,
                    "height": 0,
                    "annotations": []
                })
        
        return data
    
    # ============== EXPORTERS ==============
    
    def _export_yolo(self, data: Dict[str, Any], output_path: Path):
        """Export to YOLO format"""
        images_dir = output_path / "images"
        labels_dir = output_path / "labels"
        images_dir.mkdir(parents=True, exist_ok=True)
        labels_dir.mkdir(parents=True, exist_ok=True)
        
        # Create data.yaml
        yaml_data = {
            "path": str(output_path.absolute()),
            "train": "images",
            "val": "images",
            "names": {i: name for i, name in enumerate(data["classes"])}
        }
        
        with open(output_path / "data.yaml", "w") as f:
            yaml.dump(yaml_data, f, default_flow_style=False)
        
        # Create label files
        class_to_id = {name: idx for idx, name in enumerate(data["classes"])}
        
        for img in data["images"]:
            if not img["annotations"]:
                continue
            
            width = img.get("width", 1) or 1
            height = img.get("height", 1) or 1
            
            label_file = labels_dir / f"{img['id']}.txt"
            with open(label_file, "w") as f:
                for ann in img["annotations"]:
                    class_id = ann.get("class_id", class_to_id.get(ann.get("class_name", ""), 0))
                    
                    if ann.get("type") == "polygon" and ann.get("segmentation"):
                        # Segmentation
                        points = ann["segmentation"][0] if ann["segmentation"] else []
                        normalized = []
                        for i in range(0, len(points), 2):
                            normalized.append(points[i] / width)
                            normalized.append(points[i+1] / height)
                        
                        f.write(f"{class_id} " + " ".join(f"{p:.6f}" for p in normalized) + "\n")
                    elif ann.get("bbox"):
                        # Bounding box
                        bbox = ann["bbox"]
                        x_center = (bbox[0] + bbox[2]/2) / width
                        y_center = (bbox[1] + bbox[3]/2) / height
                        w = bbox[2] / width
                        h = bbox[3] / height
                        
                        f.write(f"{class_id} {x_center:.6f} {y_center:.6f} {w:.6f} {h:.6f}\n")
    
    def _export_coco(self, data: Dict[str, Any], output_path: Path):
        """Export to COCO format"""
        images_dir = output_path / "images"
        images_dir.mkdir(parents=True, exist_ok=True)
        
        coco_data = {
            "images": [],
            "annotations": [],
            "categories": []
        }
        
        # Add categories
        for idx, class_name in enumerate(data["classes"]):
            coco_data["categories"].append({
                "id": idx,
                "name": class_name,
                "supercategory": "none"
            })
        
        # Add images and annotations
        ann_id = 1
        class_to_id = {name: idx for idx, name in enumerate(data["classes"])}
        
        for img_idx, img in enumerate(data["images"]):
            img_id = img_idx + 1
            
            coco_data["images"].append({
                "id": img_id,
                "file_name": img["filename"],
                "width": img.get("width", 0),
                "height": img.get("height", 0)
            })
            
            for ann in img["annotations"]:
                class_id = ann.get("class_id", class_to_id.get(ann.get("class_name", ""), 0))
                
                coco_ann = {
                    "id": ann_id,
                    "image_id": img_id,
                    "category_id": class_id,
                    "iscrowd": 0
                }
                
                if ann.get("bbox"):
                    coco_ann["bbox"] = ann["bbox"]
                    coco_ann["area"] = ann["bbox"][2] * ann["bbox"][3]
                
                if ann.get("segmentation"):
                    coco_ann["segmentation"] = ann["segmentation"]
                
                coco_data["annotations"].append(coco_ann)
                ann_id += 1
        
        with open(output_path / "annotations.json", "w") as f:
            json.dump(coco_data, f, indent=2)
    
    def _export_voc(self, data: Dict[str, Any], output_path: Path):
        """Export to Pascal VOC format"""
        annotations_dir = output_path / "Annotations"
        images_dir = output_path / "JPEGImages"
        annotations_dir.mkdir(parents=True, exist_ok=True)
        images_dir.mkdir(parents=True, exist_ok=True)
        
        for img in data["images"]:
            # Create XML annotation
            annotation = ET.Element("annotation")
            
            folder = ET.SubElement(annotation, "folder")
            folder.text = "JPEGImages"
            
            filename = ET.SubElement(annotation, "filename")
            filename.text = img["filename"]
            
            size = ET.SubElement(annotation, "size")
            width_elem = ET.SubElement(size, "width")
            width_elem.text = str(img.get("width", 0))
            height_elem = ET.SubElement(size, "height")
            height_elem.text = str(img.get("height", 0))
            depth = ET.SubElement(size, "depth")
            depth.text = "3"
            
            for ann in img["annotations"]:
                if ann.get("bbox"):
                    obj = ET.SubElement(annotation, "object")
                    
                    name = ET.SubElement(obj, "name")
                    name.text = ann.get("class_name", "unknown")
                    
                    pose = ET.SubElement(obj, "pose")
                    pose.text = "Unspecified"
                    
                    truncated = ET.SubElement(obj, "truncated")
                    truncated.text = "0"
                    
                    difficult = ET.SubElement(obj, "difficult")
                    difficult.text = "0"
                    
                    bndbox = ET.SubElement(obj, "bndbox")
                    bbox = ann["bbox"]
                    
                    xmin = ET.SubElement(bndbox, "xmin")
                    xmin.text = str(int(bbox[0]))
                    ymin = ET.SubElement(bndbox, "ymin")
                    ymin.text = str(int(bbox[1]))
                    xmax = ET.SubElement(bndbox, "xmax")
                    xmax.text = str(int(bbox[0] + bbox[2]))
                    ymax = ET.SubElement(bndbox, "ymax")
                    ymax.text = str(int(bbox[1] + bbox[3]))
            
            # Pretty print XML
            xml_str = minidom.parseString(ET.tostring(annotation)).toprettyxml(indent="  ")
            with open(annotations_dir / f"{img['id']}.xml", "w") as f:
                f.write(xml_str)
    
    def _export_createml(self, data: Dict[str, Any], output_path: Path):
        """Export to CreateML format"""
        images_dir = output_path / "images"
        images_dir.mkdir(parents=True, exist_ok=True)
        
        createml_data = []
        
        for img in data["images"]:
            item = {
                "image": img["filename"],
                "annotations": []
            }
            
            for ann in img["annotations"]:
                if ann.get("bbox"):
                    bbox = ann["bbox"]
                    item["annotations"].append({
                        "label": ann.get("class_name", "unknown"),
                        "coordinates": {
                            "x": bbox[0] + bbox[2]/2,
                            "y": bbox[1] + bbox[3]/2,
                            "width": bbox[2],
                            "height": bbox[3]
                        }
                    })
            
            createml_data.append(item)
        
        with open(output_path / "annotations.json", "w") as f:
            json.dump(createml_data, f, indent=2)
    
    def _export_tensorflow_csv(self, data: Dict[str, Any], output_path: Path):
        """Export to TensorFlow CSV format"""
        images_dir = output_path / "images"
        images_dir.mkdir(parents=True, exist_ok=True)
        
        rows = []
        for img in data["images"]:
            for ann in img["annotations"]:
                if ann.get("bbox"):
                    bbox = ann["bbox"]
                    rows.append({
                        "filename": img["filename"],
                        "width": img.get("width", 0),
                        "height": img.get("height", 0),
                        "class": ann.get("class_name", "unknown"),
                        "xmin": int(bbox[0]),
                        "ymin": int(bbox[1]),
                        "xmax": int(bbox[0] + bbox[2]),
                        "ymax": int(bbox[1] + bbox[3])
                    })
        
        with open(output_path / "annotations.csv", "w", newline="") as f:
            if rows:
                writer = csv.DictWriter(f, fieldnames=rows[0].keys())
                writer.writeheader()
                writer.writerows(rows)
    
    def _export_labelme(self, data: Dict[str, Any], output_path: Path):
        """Export to LabelMe format"""
        images_dir = output_path / "images"
        images_dir.mkdir(parents=True, exist_ok=True)
        
        for img in data["images"]:
            labelme_data = {
                "version": "5.0.0",
                "flags": {},
                "shapes": [],
                "imagePath": img["filename"],
                "imageData": None,
                "imageHeight": img.get("height", 0),
                "imageWidth": img.get("width", 0)
            }
            
            for ann in img["annotations"]:
                shape = {
                    "label": ann.get("class_name", "unknown"),
                    "flags": {},
                    "group_id": None
                }
                
                if ann.get("type") == "polygon" and ann.get("segmentation"):
                    points = ann["segmentation"][0] if ann["segmentation"] else []
                    shape["shape_type"] = "polygon"
                    shape["points"] = [[points[i], points[i+1]] for i in range(0, len(points), 2)]
                elif ann.get("bbox"):
                    bbox = ann["bbox"]
                    shape["shape_type"] = "rectangle"
                    shape["points"] = [
                        [bbox[0], bbox[1]],
                        [bbox[0] + bbox[2], bbox[1] + bbox[3]]
                    ]
                else:
                    continue
                
                labelme_data["shapes"].append(shape)
            
            with open(output_path / f"{img['id']}.json", "w") as f:
                json.dump(labelme_data, f, indent=2)
    
    def _export_classification(self, data: Dict[str, Any], output_path: Path):
        """Export to classification folder format"""
        for class_name in data["classes"]:
            (output_path / class_name).mkdir(parents=True, exist_ok=True)
    
    def _copy_images(self, source_path: Path, output_path: Path, data: Dict[str, Any], target_format: str):
        """Copy images to output directory"""
        if target_format == "pascal-voc":
            dest_dir = output_path / "JPEGImages"
        elif target_format == "classification-folder":
            # Images copied to class folders
            for img in data["images"]:
                if img["annotations"]:
                    class_name = img["annotations"][0].get("class_name", "unknown")
                    dest_dir = output_path / class_name
                    dest_dir.mkdir(parents=True, exist_ok=True)
                    
                    src_file = source_path / img["path"]
                    if src_file.exists():
                        shutil.copy(src_file, dest_dir / img["filename"])
            return
        else:
            dest_dir = output_path / "images"
        
        dest_dir.mkdir(parents=True, exist_ok=True)
        
        for img in data["images"]:
            src_file = source_path / img["path"]
            if src_file.exists():
                shutil.copy(src_file, dest_dir / img["filename"])
            else:
                # Try to find the image
                for found_file in source_path.glob(f"**/{img['filename']}"):
                    shutil.copy(found_file, dest_dir / img["filename"])
                    break
    
    def update_data_yaml(
        self, 
        dataset_path: Path, 
        classes: List[str],
        train_path: str = "train/images",
        val_path: str = "val/images",
        test_path: Optional[str] = "test/images"
    ):
        """Create or update data.yaml file for YOLO-format datasets"""
        dataset_path = Path(dataset_path)
        
        # Check if train/val/test directories exist
        has_train = (dataset_path / "train").exists()
        has_val = (dataset_path / "val").exists() or (dataset_path / "valid").exists()
        has_test = (dataset_path / "test").exists()
        
        yaml_data = {
            "path": str(dataset_path.absolute()),
            "nc": len(classes),
            "names": {i: name for i, name in enumerate(classes)}
        }
        
        if has_train:
            yaml_data["train"] = train_path
        if has_val:
            val_dir = "val" if (dataset_path / "val").exists() else "valid"
            yaml_data["val"] = f"{val_dir}/images"
        if has_test and test_path:
            yaml_data["test"] = test_path
        
        # If no splits, use root images folder
        if not has_train and not has_val:
            yaml_data["train"] = "images"
            yaml_data["val"] = "images"
        
        with open(dataset_path / "data.yaml", "w") as f:
            yaml.dump(yaml_data, f, default_flow_style=False, sort_keys=False)
        
        return yaml_data
