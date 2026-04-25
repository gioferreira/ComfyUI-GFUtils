# Import existing nodes
from .bezier_node import BezierMapping
from .hex_to_rgb import HexToRGB
from .save_image_absolute_path import SaveImageAbsolutePath
from .save_text_to_path import SaveTextToPath
from .video_masked_recombine import VideoMaskedRecombine, VideoMaskedRecombineDebug
from .was_fork import GFTextConcatenate, GFLoadImageBatch
from .flowmatch_scheduler import (
    FlowMatchAutoConfig,
    FlowMatchGuide,
    FlowMatchScheduler,
    FlowMatchSchedulerPresets,
)

# Import new S3 nodes
from .s3_nodes.api_load_image import LoadImageS3API
from .s3_nodes.api_save_image import SaveImageS3API

# Import new ZIP-related S3 nodes
from .s3_nodes.api_load_zip import LoadZipS3API
from .s3_nodes.api_save_zip import SaveZipS3API
from .s3_nodes.process_zip import ProcessZipImages

# Initialize or extend the NODE_CLASS_MAPPINGS and NODE_DISPLAY_NAME_MAPPINGS dictionaries
NODE_CLASS_MAPPINGS = NODE_CLASS_MAPPINGS if "NODE_CLASS_MAPPINGS" in globals() else {}
NODE_DISPLAY_NAME_MAPPINGS = (
    NODE_DISPLAY_NAME_MAPPINGS if "NODE_DISPLAY_NAME_MAPPINGS" in globals() else {}
)

# Update the mappings for existing nodes
NODE_CLASS_MAPPINGS.update(
    {
        "BezierMapping": BezierMapping,
    }
)
NODE_DISPLAY_NAME_MAPPINGS.update(
    {
        "Bezier Mapping": "BezierMapping",
    }
)

NODE_CLASS_MAPPINGS.update(
    {
        "HexToRGB": HexToRGB,
    }
)
NODE_DISPLAY_NAME_MAPPINGS.update(
    {
        "HEX to RGB": "HexToRGB",
    }
)

NODE_CLASS_MAPPINGS.update(
    {
        "TextConcatenate": GFTextConcatenate,
    }
)
NODE_DISPLAY_NAME_MAPPINGS.update(
    {
        "Text Concatenate": "TextConcatenate",
    }
)

NODE_CLASS_MAPPINGS.update(
    {
        "LoadImageBatch": GFLoadImageBatch,
    }
)
NODE_DISPLAY_NAME_MAPPINGS.update(
    {
        "Load Image Batch": "LoadImageBatch",
    }
)

# Add new S3 nodes to the mappings
NODE_CLASS_MAPPINGS.update(
    {
        "LoadImageS3API": LoadImageS3API,
        "SaveImageS3API": SaveImageS3API,
    }
)
NODE_DISPLAY_NAME_MAPPINGS.update(
    {
        "Load Image from S3 (URI)": "LoadImageS3API",
        "Save Image to S3": "SaveImageS3API",
    }
)


NODE_CLASS_MAPPINGS.update(
    {
        "LoadZipS3API": LoadZipS3API,
        "SaveZipS3API": SaveZipS3API,
        "ProcessZipImages": ProcessZipImages,
    }
)

NODE_DISPLAY_NAME_MAPPINGS.update(
    {
        "LoadZipS3API": "Load ZIP from S3",
        "SaveZipS3API": "Save ZIP to S3",
        "ProcessZipImages": "Process Batch Images",
    }
)

NODE_CLASS_MAPPINGS.update({"SaveTextToPath": SaveTextToPath})
NODE_DISPLAY_NAME_MAPPINGS.update({"Save Text to Path": "SaveTextToPath"})

NODE_CLASS_MAPPINGS.update({"SaveImageAbsolutePath": SaveImageAbsolutePath})
NODE_DISPLAY_NAME_MAPPINGS.update(
    {"SaveImageAbsolutePath": "Save Image with Absolute Path"}
)

NODE_CLASS_MAPPINGS.update({"VideoMaskedRecombine": VideoMaskedRecombine})
NODE_DISPLAY_NAME_MAPPINGS.update(
    {"Video Masked Recombine": "VideoMaskedRecombine"}
)

NODE_CLASS_MAPPINGS.update({"VideoMaskedRecombineDebug": VideoMaskedRecombineDebug})
NODE_DISPLAY_NAME_MAPPINGS.update(
    {"Video Masked Recombine Debug": "VideoMaskedRecombineDebug"}
)

NODE_CLASS_MAPPINGS.update(
    {
        "FlowMatchScheduler": FlowMatchScheduler,
        "FlowMatchSchedulerPresets": FlowMatchSchedulerPresets,
        "FlowMatchAutoConfig": FlowMatchAutoConfig,
        "FlowMatchGuide": FlowMatchGuide,
    }
)
NODE_DISPLAY_NAME_MAPPINGS.update(
    {
        "FlowMatchScheduler": "FlowMatch Scheduler",
        "FlowMatchSchedulerPresets": "FlowMatch Scheduler Presets",
        "FlowMatchAutoConfig": "FlowMatch Auto Config",
        "FlowMatchGuide": "FlowMatch Guide",
    }
)


WEB_DIRECTORY = "./js"

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
