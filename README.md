# ComfyUI-Molde-Utils

## Overview
ComfyUI-Molde-Utils is a small custom-node pack for ComfyUI.

It currently includes:
- utility nodes such as text concatenation, hex-to-RGB conversion, bezier mapping, batch image loading, and text saving to an arbitrary path
- S3 image input/output nodes
- S3 ZIP input/output nodes
- a batch image processing node for resize, crop, and pad flows

## Nodes
- `BezierMapping`
- `HexToRGB`
- `TextConcatenate`
- `LoadImageBatch`
- `SaveTextToPath`
- `LoadImageS3API`
- `SaveImageS3API`
- `LoadZipS3API`
- `SaveZipS3API`
- `ProcessZipImages`

## Installation
Clone this repository into your ComfyUI `custom_nodes` directory.

Install the Python dependencies declared in [requirements.txt](/Users/giovani/repos/ComfyUI-Molde-Utils/requirements.txt):

```bash
pip install -r requirements.txt
```

Notes:
- `boto3` and `python-dotenv` are the only extra runtime dependencies declared here.
- other imports such as `torch`, `Pillow`, `numpy`, `matplotlib`, and ComfyUI modules are expected to come from the ComfyUI environment itself

## S3 Configuration
The S3 nodes read credentials from environment variables and call `load_dotenv()`, so a local `.env` file also works.

Required variables:
- `S3_REGION`
- `S3_ACCESS_KEY`
- `S3_SECRET_KEY`

Example:

```env
S3_REGION=us-east-1
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
```

## Notes
- `LoadImageS3API` loads a single image or animated image from an S3 URI.
- `LoadZipS3API` downloads a ZIP from S3, extracts supported images, and returns them as a batch.
- `SaveImageS3API` uploads PNG images to S3 and can embed workflow metadata.
- `SaveZipS3API` writes a ZIP archive locally, then uploads it to S3.
- `SaveTextToPath` writes plain text to a path and creates the parent directory when needed.
