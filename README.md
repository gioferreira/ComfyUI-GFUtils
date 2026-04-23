# ComfyUI-GFUtils

## Overview
ComfyUI-GFUtils is a small custom-node pack for ComfyUI.

It currently includes:
- utility nodes such as text concatenation, hex-to-RGB conversion, bezier mapping, batch image loading, and text saving to an arbitrary path
- a local image save node that writes directly to an absolute file path
- a torch-based masked video recombine node for frame-by-frame foreground/background merges
- a separate debug variant for inspecting processed masks and masked layers without baking that cost into the main node
- S3 image input/output nodes
- S3 ZIP input/output nodes
- a batch image processing node for resize, crop, and pad flows
- FlowMatch scheduler nodes extracted from `ComfyUI-Workarounds` without pulling in that repo's broader dependency set

## Nodes
- `BezierMapping`
- `HexToRGB`
- `TextConcatenate`
- `LoadImageBatch`
- `SaveTextToPath`
- `SaveImageAbsolutePath`
- `VideoMaskedRecombine`
- `VideoMaskedRecombineDebug`
- `LoadImageS3API`
- `SaveImageS3API`
- `LoadZipS3API`
- `SaveZipS3API`
- `ProcessZipImages`
- `FlowMatchScheduler`
- `FlowMatchSchedulerPresets`
- `FlowMatchAutoConfig`
- `FlowMatchGuide`

## Installation
Clone this repository into your ComfyUI `custom_nodes` directory.

Install the Python dependencies declared in `requirements.txt`:

```bash
pip install -r requirements.txt
```

Notes:
- `boto3` and `python-dotenv` are the only extra runtime dependencies declared here.
- `torch` is intentionally not pinned here; these nodes are meant to use the version already required by your ComfyUI installation
- other imports such as `Pillow`, `numpy`, `matplotlib`, and ComfyUI modules are expected to come from the ComfyUI environment itself

## FlowMatch Note
This repo vendors only the FlowMatch scheduler nodes from `ComfyUI-Workarounds` instead of depending on that full package.

Why:
- these are the only nodes from that project that we want here
- the rest of that package is mostly focused on face overlay and landmark tooling
- its pinned requirements include packages like `opencv-python`, `mediapipe`, `scipy`, `protobuf`, and `torch`, which can conflict with modern ComfyUI installations
- keeping the FlowMatch nodes local avoids pulling in unrelated nodes and fragile dependency pins

Included FlowMatch nodes:
- `FlowMatchScheduler`
- `FlowMatchSchedulerPresets`
- `FlowMatchAutoConfig`
- `FlowMatchGuide`

Source:
- `ComfyUI-Workarounds` by Alisson Anjos (MIT): [github.com/alisson-anjos/ComfyUI-Workarounds](https://github.com/alisson-anjos/ComfyUI-Workarounds)

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
- `SaveImageAbsolutePath` writes an image directly to a full absolute file path such as `D:\DevRev\Select_PNG\005_AGENTESTUDIO\Agent_00006_pose.png` on Windows or `/home/user/output/image.png` on macOS/Linux.
- `VideoMaskedRecombine` normalizes RGB/RGBA inputs to RGB, resizes the mask if needed, and returns a single merged image batch.
- `VideoMaskedRecombineDebug` runs the same recombine path but also returns `processed_mask`, `foreground_masked`, and `background_masked` for inspection.
