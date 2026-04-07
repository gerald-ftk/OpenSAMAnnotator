# CV Dataset Manager - Complete Documentation

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dataset Management](#dataset-management)
3. [Sorting & Filtering](#sorting--filtering)
4. [Annotation Tools](#annotation-tools)
5. [Class Management](#class-management)
6. [Data Augmentation](#data-augmentation)
7. [Video Frame Extraction](#video-frame-extraction)
8. [Duplicate Detection](#duplicate-detection)
9. [Dataset Splitting](#dataset-splitting)
10. [Format Conversion](#format-conversion)
11. [Dataset Merging](#dataset-merging)
12. [Model Management](#model-management)
13. [Training](#training)
14. [Settings](#settings)
15. [API Reference](#api-reference)

---

## Getting Started

### System Requirements

**Minimum:**
- CPU: Intel i5 / AMD Ryzen 5 or equivalent
- RAM: 8 GB
- Storage: 10 GB free space
- OS: Windows 10+, macOS 11+, Ubuntu 20.04+

**Recommended (for training):**
- CPU: Intel i7 / AMD Ryzen 7 or better
- RAM: 16 GB+
- GPU: NVIDIA RTX 3060+ with 8GB+ VRAM
- Storage: SSD with 50GB+ free space

### First Launch

1. Start the application:
   ```bash
   ./scripts/start.sh
   ```

2. The application opens at `http://localhost:3000`

3. **First step**: Go to **Settings** and verify the backend connection shows "Connected"

4. **Load your first dataset**: Click "Datasets" → "Open Local Folder" → Navigate to your dataset

### Understanding the Interface

The interface is divided into:

- **Sidebar (Left)**: Navigation between different views
- **Main Area (Center)**: The active view content
- **Dataset Indicator**: Shows currently selected dataset

---

## Dataset Management

### Loading a Dataset

**From Local Folder (Recommended):**
1. Go to **Datasets** view
2. Click **"Open Local Folder"**
3. Browse to your dataset directory
4. The system auto-detects the format
5. Click **"Load"**

**By Uploading:**
1. Go to **Datasets** view
2. Click **"Upload Dataset"**
3. Drag & drop or select a ZIP file
4. Wait for upload and processing

### Supported Dataset Structures

**YOLO Format:**
```
dataset/
├── data.yaml           # Classes and paths
├── images/
│   ├── train/
│   │   ├── image1.jpg
│   │   └── image2.jpg
│   └── val/
│       └── image3.jpg
└── labels/
    ├── train/
    │   ├── image1.txt
    │   └── image2.txt
    └── val/
        └── image3.txt
```

**COCO Format:**
```
dataset/
├── annotations/
│   ├── instances_train.json
│   └── instances_val.json
├── train/
│   ├── image1.jpg
│   └── image2.jpg
└── val/
    └── image3.jpg
```

**Pascal VOC Format:**
```
dataset/
├── Annotations/
│   ├── image1.xml
│   └── image2.xml
├── ImageSets/
│   └── Main/
│       ├── train.txt
│       └── val.txt
└── JPEGImages/
    ├── image1.jpg
    └── image2.jpg
```

**Classification (ImageNet-style):**
```
dataset/
├── train/
│   ├── cat/
│   │   ├── cat1.jpg
│   │   └── cat2.jpg
│   └── dog/
│       ├── dog1.jpg
│       └── dog2.jpg
└── val/
    ├── cat/
    └── dog/
```

### Dataset Dashboard

After loading a dataset, the dashboard shows:

- **Total Images**: Number of images in dataset
- **Total Annotations**: Number of annotation objects
- **Classes**: List of all classes with counts
- **Train/Val/Test Split**: Distribution chart
- **Annotation Coverage**: % of images with annotations
- **Format**: Detected format type

---

## Sorting & Filtering

The sorting view lets you quickly review and clean your dataset.

### Basic Usage

1. Select a dataset from the Datasets view
2. Navigate to **Sort & Filter**
3. Images display one at a time with annotations overlaid
4. Use arrow keys:
   - **← Left Arrow**: Mark for deletion
   - **→ Right Arrow**: Keep image
5. Progress bar shows your position
6. Click **"Apply Changes"** to finalize deletions

### Advanced Filtering

**Filter by Annotation Status:**
- All images
- Annotated only
- Unannotated only

**Filter by Class:**
- Select specific classes to review
- Useful for checking annotation quality per class

**Filter by Confidence:**
- If annotations have confidence scores
- Set minimum threshold

### Batch Operations

- **Select Multiple**: Shift+click to select range
- **Delete Selected**: Remove all selected images
- **Move Selected**: Move to different split (train → val)

---

## Annotation Tools

### Tool Overview

| Tool | Shortcut | Use Case |
|------|----------|----------|
| Bounding Box | B | Object detection |
| Polygon | P | Instance segmentation |
| Brush | - | Semantic segmentation |
| Point | L | Keypoint detection |
| Select | V | Edit existing annotations |

### Creating Bounding Boxes

1. Press **B** or select Bounding Box tool
2. Click and drag to create rectangle
3. Release to complete
4. Select class from sidebar
5. Annotation auto-saves

### Creating Polygons

1. Press **P** or select Polygon tool
2. Click to add vertices
3. Double-click or press Enter to complete
4. Polygon automatically closes
5. Select class from sidebar

### Editing Annotations

1. Press **V** or select Select tool
2. Click on annotation to select
3. Drag corners/edges to resize
4. Drag center to move
5. Press **Delete** to remove

### Annotation History

Every action is recorded:
- **Ctrl+Z**: Undo last action
- **Ctrl+Y**: Redo
- View full history in sidebar panel
- Click any history item to jump to that state

### Auto-Annotation

1. Ensure a model is loaded (see Model Management)
2. Click **"Auto-Annotate"** button
3. Configure:
   - **Model**: Select loaded model
   - **Confidence**: Minimum confidence threshold (0.1-1.0)
   - **Classes**: Which classes to detect (or all)
4. Click **"Run"**
5. Review results in Sort view

---

## Class Management

### Viewing Classes

1. Go to **Classes** view
2. See all classes in current dataset
3. Each class shows:
   - Name
   - Color (for visualization)
   - Annotation count
   - Image count

### Extract Classes to New Dataset

Extract specific classes into a separate dataset:

1. Select classes to extract (checkbox)
2. Click **"Extract Selected"**
3. Enter new dataset name
4. Choose output format
5. Click **"Extract"**

**Use Case**: You have a dataset with 80 classes but only need 5 for your project.

### Delete Classes

Remove unwanted classes and their annotations:

1. Select classes to delete
2. Click **"Delete Selected"**
3. Confirm the action
4. All annotations of those classes are removed

**Use Case**: Remove background detections or irrelevant classes.

### Merge Classes

Combine multiple classes into one:

1. Select classes to merge (2+)
2. Click **"Merge Selected"**
3. Enter target class name
4. Choose which class name to use, or enter new
5. Click **"Merge"**

**Use Case**: Merge "car", "automobile", "vehicle" into single "vehicle" class.

### Rename Classes

Rename a single class:

1. Click the edit icon next to class name
2. Enter new name
3. Press Enter or click Save

### Add New Classes

Add classes for manual annotation:

1. Click **"+ Add Class"**
2. Enter class name
3. Optionally set color
4. Class is now available in annotation tools

---

## Data Augmentation

### Overview

Data augmentation artificially increases dataset size by applying transformations.

### Available Augmentations

**Geometric:**
| Augmentation | Description | Parameters |
|--------------|-------------|------------|
| Horizontal Flip | Mirror left-right | Probability |
| Vertical Flip | Mirror top-bottom | Probability |
| Rotation | Rotate image | Angle range (-180 to 180) |
| Random Crop | Crop portion | Min/max scale |
| Resize | Change dimensions | Target size |
| Perspective | 3D perspective change | Strength |

**Color:**
| Augmentation | Description | Parameters |
|--------------|-------------|------------|
| Brightness | Lighter/darker | Range (-1 to 1) |
| Contrast | Increase/decrease contrast | Range (0.5 to 2.0) |
| Saturation | Color intensity | Range (0 to 2.0) |
| Hue Shift | Shift color wheel | Range (-180 to 180) |

**Noise & Blur:**
| Augmentation | Description | Parameters |
|--------------|-------------|------------|
| Gaussian Blur | Soft blur | Kernel size |
| Motion Blur | Directional blur | Kernel size, angle |
| Gaussian Noise | Random noise | Mean, variance |

**Advanced:**
| Augmentation | Description | Parameters |
|--------------|-------------|------------|
| Mosaic | Combine 4 images | - |
| MixUp | Blend 2 images | Alpha |
| CutOut | Random erasing | Size, count |

### Creating an Augmentation Pipeline

1. Go to **Augmentation** view
2. Select source dataset
3. Set target size:
   - **Exact count**: e.g., 10,000 images
   - **Multiplier**: e.g., 5x current size
4. Enable desired augmentations
5. Configure strength/parameters
6. Click **"Preview"** to see examples
7. Click **"Apply"** to generate

### Presets

Quick presets for common scenarios:

- **Light**: Flip + small rotation + brightness
- **Medium**: Light + crop + color jitter + blur
- **Heavy**: All transforms at moderate strength

### Best Practices

- Always keep **"Preserve Originals"** checked
- Start with light augmentation, increase if needed
- Don't over-augment (2-5x is usually sufficient)
- Match augmentations to real-world conditions

---

## Video Frame Extraction

### Overview

Create image datasets from video files by extracting frames.

### Extraction Modes

**Every Nth Frame:**
- Extract every 30th frame (1 frame per second at 30fps)
- Good for: Continuous footage with slow changes

**Uniform Distribution:**
- Extract exactly N frames spread evenly across video
- Good for: Getting representative sample of video

**Keyframe Detection:**
- Extract frames at scene changes
- Good for: Videos with distinct scenes

**Manual Selection:**
- Scrub through video and mark frames
- Good for: Precise control over what's extracted

### How to Extract

1. Go to **Video Frames** view
2. Click **"Select Video"** or drag & drop
3. Video preview loads
4. Choose extraction mode
5. Configure:
   - Frame interval or count
   - Start/end time (optional)
   - Maximum frames (optional)
6. Click **"Extract"**
7. New dataset is created with extracted frames

### Supported Video Formats

- MP4 (H.264, H.265)
- AVI
- MOV
- MKV
- WebM

---

## Duplicate Detection

### Overview

Find and remove duplicate or near-duplicate images to clean your dataset.

### Detection Methods

**MD5 Hash:**
- Detects **exact** duplicates only
- Fastest method
- Use when: You suspect exact copies exist

**Perceptual Hash (pHash):**
- Detects **visually similar** images
- Robust to resizing, minor edits
- Use when: Similar but not identical images

**Average Hash (aHash):**
- Faster than pHash, less accurate
- Good for quick scanning
- Use when: Large datasets, initial pass

**CLIP Embeddings:**
- AI-powered semantic similarity
- Finds images with similar content, not just appearance
- Use when: Finding conceptually similar images

### How to Find Duplicates

1. Go to **Datasets** view
2. Select dataset
3. Click **"Find Duplicates"**
4. Choose method
5. Set similarity threshold:
   - Higher = stricter matching
   - Lower = more matches found
6. Click **"Scan"**
7. Review duplicate groups
8. Choose keep strategy:
   - **First**: Keep first image in group
   - **Largest**: Keep highest resolution
   - **Smallest**: Keep smallest file size
9. Click **"Remove Duplicates"**

---

## Dataset Splitting

### Overview

Split a single dataset into train/validation/test sets.

### How to Split

1. Go to **Convert** view
2. Select dataset
3. Enable **"Create Splits"**
4. Set ratios:
   - Train: 70% (default)
   - Validation: 20% (default)
   - Test: 10% (default)
5. Options:
   - **Shuffle**: Randomize order (recommended)
   - **Seed**: For reproducible splits
   - **Stratified**: Maintain class distribution
6. Click **"Split"**

### Stratified Splitting

When enabled, each split will have approximately the same class distribution as the original dataset.

Example:
- Original: 60% cats, 40% dogs
- Train: 60% cats, 40% dogs
- Val: 60% cats, 40% dogs
- Test: 60% cats, 40% dogs

---

## Format Conversion

### Overview

Convert datasets between any supported formats.

### Supported Conversions

| From/To | YOLO | COCO | VOC | CSV | JSON |
|---------|------|------|-----|-----|------|
| YOLO | - | Yes | Yes | Yes | Yes |
| COCO | Yes | - | Yes | Yes | Yes |
| VOC | Yes | Yes | - | Yes | Yes |
| CSV | Yes | Yes | Yes | - | Yes |
| JSON | Yes | Yes | Yes | Yes | - |

### How to Convert

1. Go to **Convert** view
2. Select source dataset
3. Choose target format
4. Configure options:
   - Output name
   - Include images (copy) or just annotations
   - Split ratios (optional)
5. Click **"Convert"**
6. New dataset is created in target format

### Format-Specific Options

**YOLO:**
- Image path style (relative/absolute)
- Create data.yaml

**COCO:**
- Include segmentation masks
- Category ID starting number

**Pascal VOC:**
- Include difficult flag
- Folder structure style

---

## Dataset Merging

### Overview

Combine multiple datasets into one unified dataset.

### How to Merge

1. Go to **Merge** view
2. Click **"+ Add Dataset"**
3. Select first dataset
4. Repeat for additional datasets
5. Configure:
   - Output name
   - Output format
   - Class mapping (if needed)
6. Click **"Merge"**

### Class Mapping

When merging datasets with different class names:

1. View the class mapping table
2. For each source class, choose:
   - Map to existing class
   - Create new class
   - Exclude (don't include)
3. Resolve conflicts

Example:
```
Dataset 1: cat, dog, bird
Dataset 2: feline, canine, avian

Mapping:
- cat → cat
- feline → cat
- dog → dog
- canine → dog
- bird → bird
- avian → bird
```

---

## Model Management

### Overview

Load, manage, and download models for auto-annotation and training.

### Available Models

**YOLO Family:**
- YOLOv8n (3.2M params, 6.3 MB)
- YOLOv8s (11.2M params, 22 MB)
- YOLOv8m (25.9M params, 52 MB)
- YOLOv8l (43.7M params, 87 MB)
- YOLOv8x (68.2M params, 136 MB)

**SAM (Segment Anything):**
- SAM ViT-B (91M params, 375 MB)
- SAM ViT-L (308M params, 1.2 GB)
- SAM ViT-H (636M params, 2.4 GB)

**RT-DETR:**
- RT-DETR-L (32M params, 64 MB)
- RT-DETR-X (67M params, 134 MB)

### Downloading Models

1. Go to **Models** view
2. Find model in "Download Models" section
3. Click download icon
4. Wait for download (progress shown)
5. Model appears in "Your Models"

### Importing Custom Models

1. Go to **Models** view
2. Click **"Import Model"**
3. Select model file (.pt, .pth, .onnx)
4. Configure:
   - Model name
   - Type (detection/segmentation)
   - Class names (if known)
5. Click **"Import"**

### Loading/Unloading Models

- **Load**: Click "Load" to make model available for inference
- **Unload**: Click "Unload" to free GPU memory
- Only loaded models can be used for auto-annotation

---

## Training

### Overview

Train object detection and segmentation models locally.

### Supported Architectures

- YOLOv8 (n/s/m/l/x)
- YOLOv9 (c/e)
- RT-DETR (l/x)

### Training Configuration

**Dataset:**
- Select from loaded datasets
- Must be in compatible format

**Model:**
- Choose architecture
- Use pretrained weights (recommended)

**Hyperparameters:**
- **Epochs**: Training iterations (10-500)
- **Batch Size**: Images per batch (1-64)
- **Image Size**: Input resolution (320-1280)
- **Learning Rate**: Step size (0.001-0.1)
- **Patience**: Early stopping patience

**Augmentation:**
- Enable/disable training augmentation
- Uses sensible defaults when enabled

### Starting Training

1. Go to **Training** view
2. Select dataset
3. Choose model architecture
4. Configure hyperparameters
5. Click **"Start Training"**

### Monitoring Training

Real-time metrics displayed:
- **Loss**: Should decrease over time
- **Accuracy**: Should increase over time
- **Validation Loss**: Watch for overfitting
- **Learning Rate**: Current LR after scheduling

System metrics:
- GPU usage percentage
- Memory usage
- Training speed (iterations/second)
- ETA (estimated time remaining)

### Training Controls

- **Pause**: Temporarily stop training
- **Resume**: Continue paused training
- **Stop**: End training and save checkpoint

### Exporting Trained Models

After training completes:
1. Find model in **Models** view
2. Click **"Export"**
3. Choose format:
   - PyTorch (.pt)
   - ONNX (.onnx)
   - TensorRT (.engine)
4. Download or save to path

---

## Settings

### Backend Connection

Configure the Python backend URL:
- Default: `http://localhost:8000`
- Click "Test" to verify connection

### Storage Paths

Set default directories:
- **Models Directory**: Where to save downloaded/trained models
- **Datasets Directory**: Default dataset storage location
- **Output Directory**: Where to save exports

### Hardware

Configure compute settings:
- **Use GPU**: Enable CUDA/MPS acceleration
- **GPU Device**: Select GPU if multiple available

### Preferences

- **Dark Mode**: Toggle dark/light theme
- **Auto-Save**: Automatically save annotation progress
- **Notifications**: Show completion alerts

---

## API Reference

### Base URL
```
http://localhost:8000/api
```

### Authentication
No authentication required for local use.

### Endpoints

#### Datasets

**List Datasets**
```
GET /datasets
Response: { datasets: Dataset[] }
```

**Load Local Dataset**
```
POST /datasets/load-local
Body: { folder_path: string, format_hint?: string }
Response: { success: boolean, dataset: Dataset }
```

**Get Dataset**
```
GET /datasets/{id}
Response: Dataset
```

**Delete Dataset**
```
DELETE /datasets/{id}
Response: { success: boolean }
```

#### Images

**List Images**
```
GET /datasets/{id}/images
Query: ?page=1&limit=50&filter=annotated
Response: { images: Image[], total: number }
```

**Get Image**
```
GET /datasets/{id}/images/{image_id}
Response: Image with annotations
```

**Update Annotations**
```
PUT /datasets/{id}/images/{image_id}/annotations
Body: { annotations: Annotation[] }
Response: { success: boolean }
```

#### Classes

**Extract Classes**
```
POST /datasets/{id}/extract-classes
Body: { classes: string[], output_name: string }
Response: { success: boolean, new_dataset: Dataset }
```

**Delete Classes**
```
POST /datasets/{id}/delete-classes
Body: { classes: string[] }
Response: { success: boolean, deleted_count: number }
```

**Merge Classes**
```
POST /datasets/{id}/merge-classes
Body: { source_classes: string[], target_class: string }
Response: { success: boolean, merged_count: number }
```

#### Augmentation

**List Augmentations**
```
GET /augmentations/list
Response: { augmentations: AugmentationOption[] }
```

**Apply Augmentation**
```
POST /datasets/{id}/augment-enhanced
Body: { 
  output_name: string,
  target_size: number,
  augmentations: { [key: string]: AugmentationConfig }
}
Response: { success: boolean, new_dataset: Dataset }
```

#### Video

**Extract Frames**
```
POST /video/extract
Body: {
  video_path: string,
  output_name: string,
  nth_frame: number,
  max_frames?: number
}
Response: { success: boolean, dataset: Dataset, extracted_frames: number }
```

#### Duplicates

**Find Duplicates**
```
POST /datasets/{id}/find-duplicates
Body: { method: string, threshold: number }
Response: { groups: DuplicateGroup[] }
```

**Remove Duplicates**
```
POST /datasets/{id}/remove-duplicates
Body: { groups: DuplicateGroup[], keep_strategy: string }
Response: { success: boolean, removed_count: number }
```

#### Training

**Start Training**
```
POST /training/start
Body: {
  dataset_id: string,
  model_arch: string,
  epochs: number,
  batch_size: number,
  ...config
}
Response: { job_id: string }
```

**Get Training Status**
```
GET /training/{job_id}/status
Response: { status: string, metrics: TrainingMetrics }
```

---

## Troubleshooting

### Common Issues

**"Backend not connected"**
1. Ensure Python backend is running
2. Check port 8000 is not in use
3. Verify firewall allows connection

**"Dataset format not recognized"**
1. Check folder structure matches supported formats
2. Try specifying format manually
3. Ensure annotation files are valid

**"Out of memory during training"**
1. Reduce batch size
2. Reduce image size
3. Use smaller model architecture
4. Close other GPU applications

**"Model not loading"**
1. Check model file is not corrupted
2. Verify model format is supported
3. Ensure sufficient GPU memory

### Getting Help

- GitHub Issues: Report bugs and request features
- Documentation: This file and README.md
- API Docs: http://localhost:8000/docs

---

*Documentation version 2.0.0*
