# ComfyUI-GFUtils

## Overview
ComfyUI-GFUtils is a small custom-node pack for ComfyUI.

It currently includes:
- utility nodes such as text concatenation, hex-to-RGB conversion, bezier mapping, batch image loading, and text saving to an arbitrary path
- a local image save node that writes directly to an absolute file path
- a torch-based masked video recombine node for frame-by-frame foreground/background merges
- a separate debug variant for inspecting processed masks and masked layers without baking that cost into the main node
- a frontend cleanup tool for selecting muted or unused nodes
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

## Node Selection Cleanup
This package includes a small frontend-only ComfyUI extension that adds selection helpers for muted and unused nodes. It does not delete nodes directly; inspect the selection and use the normal LiteGraph delete flow if you want to remove them.

Features:
- Select muted nodes
- Select nodes with no outputs
- Select nodes with no outputs or only muted outputs
- Select nodes with no outputs or only bypassed outputs
- Select nodes with no outputs or only inactive outputs

Usage:
Right-click the canvas/background and use:
- Select muted nodes
- Select nodes with no outputs
- Select nodes with no outputs or only muted outputs
- Select nodes with no outputs or only bypassed outputs
- Select nodes with no outputs or only inactive outputs

Unused node detection:
- The extension walks backward from every output node through input links.
- KJNodes `SetNode`/`GetNode` pairs are also followed by matching the first widget value as a same-graph virtual link when exactly one matching `SetNode` exists.
- Nodes that do not feed any output are selected by every unused-node mode.
- Nodes that only feed muted outputs are selected when the mode includes muted outputs.
- Nodes that only feed bypassed outputs are selected when the mode includes bypassed outputs.
- Nodes that feed at least one active output are preserved.
- If the workflow has no output nodes, the whole visible graph is selected.

Output modes:
- No outputs selects only nodes that do not reach any output.
- No outputs or only muted outputs also selects branches whose reachable outputs are all muted (`mode === 2`).
- No outputs or only bypassed outputs also selects branches whose reachable outputs are all bypassed (`mode === 4`).
- No outputs or only inactive outputs also selects branches whose reachable outputs are all muted or bypassed.

Safety:
- The extension only selects nodes; it does not delete anything directly.
- Muted selection only selects nodes with `mode === 2`.
- Subgraph internals are not traversed; the extension only operates on the main visible graph.
- Unused-node selection depends on output metadata exposed by the ComfyUI frontend and LiteGraph links.
- Duplicate KJNodes `SetNode` names are not traversed virtually, which avoids preserving an ambiguous branch by mistake.

Undo:
- Use the normal ComfyUI/LiteGraph selection and deletion behavior after reviewing selected nodes.

Tested with:
- Automated core tests: Node.js v23.11.0
- Repository test suite: Python `unittest`
- ComfyUI frontend/browser: not manually verified in this workspace

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
- `Node Selection Cleanup` is frontend-only and registers as `giovani.nodeSelectionCleanup`.
