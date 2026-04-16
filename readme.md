# OpenSAMAnnotator

An image annotation tool that uses SAM3 for AI-assisted segmentation, speeding up the labeling process.

## Requirements

- Python 3.10+
- A [HuggingFace](https://huggingface.co/) access token (SAM3 models are gated — you need to request access and provide your token in the app settings or via the `HF_TOKEN` environment variable)

## Quick Start

```bash
uv run app.py
```

This starts the backend (port 8000) and frontend (port 3000). Open http://localhost:3000 in your browser.

## Supported Formats

Detection: YOLO, COCO, Pascal VOC, CreateML, TFRecord, DOTA
Segmentation: COCO, YOLO, LabelMe, Cityscapes, ADE20K
