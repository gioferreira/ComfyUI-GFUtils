import json
import ntpath
import os
import posixpath

import numpy as np
from PIL import Image
from PIL.PngImagePlugin import PngInfo


class SaveImageAbsolutePath:
    def __init__(self):
        self.compress_level = 4
        self.type = "output"

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "images": ("IMAGE",),
                "absolute_path": (
                    "STRING",
                    {
                        "default": "",
                        "multiline": False,
                    },
                ),
                "compression": (
                    "INT",
                    {
                        "default": 4,
                        "min": 0,
                        "max": 9,
                        "step": 1,
                    },
                ),
            },
            "hidden": {"prompt": "PROMPT", "extra_pnginfo": "EXTRA_PNGINFO"},
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("saved_paths",)
    FUNCTION = "save_images"
    OUTPUT_NODE = True
    OUTPUT_IS_LIST = (True,)
    CATEGORY = "image/output"

    def _analyze_path(self, absolute_path):
        if ntpath.isabs(absolute_path):
            if os.name != "nt":
                raise ValueError(
                    "Windows absolute paths like D:\\folder\\image.png require ComfyUI to run on Windows."
                )
            return ntpath, "windows"

        if posixpath.isabs(absolute_path):
            if os.name == "nt":
                raise ValueError(
                    "POSIX absolute paths like /tmp/image.png require ComfyUI to run on macOS or Linux."
                )
            return posixpath, "posix"

        raise ValueError(
            "absolute_path must be an absolute file path, for example D:\\folder\\image.png or /tmp/image.png."
        )

    def _build_output_paths(self, absolute_path, image_count):
        path_module, path_style = self._analyze_path(absolute_path)
        root, ext = path_module.splitext(absolute_path)

        if not ext:
            ext = ".png"
            root = absolute_path

        ext = ext.lower()
        if ext not in {".png", ".jpg", ".jpeg", ".webp"}:
            raise ValueError(
                "Unsupported file extension. Use .png, .jpg, .jpeg, or .webp."
            )

        if image_count == 1:
            return path_module, path_style, [f"{root}{ext}"]

        return path_module, path_style, [
            f"{root}_{index:05d}{ext}" for index in range(image_count)
        ]

    def _build_pnginfo(self, prompt, extra_pnginfo):
        if prompt is None and extra_pnginfo is None:
            return None

        metadata = PngInfo()
        if prompt is not None:
            metadata.add_text("prompt", json.dumps(prompt))
        if extra_pnginfo is not None:
            for key, value in extra_pnginfo.items():
                metadata.add_text(key, json.dumps(value))

        return metadata

    def _save_image_file(self, image, output_path, compression, pnginfo, path_module):
        directory = path_module.dirname(output_path)
        if directory:
            os.makedirs(directory, exist_ok=True)

        extension = path_module.splitext(output_path)[1].lower()
        save_kwargs = {}

        if extension == ".png":
            save_kwargs["format"] = "PNG"
            save_kwargs["compress_level"] = compression
            if pnginfo is not None:
                save_kwargs["pnginfo"] = pnginfo
        elif extension in {".jpg", ".jpeg"}:
            save_kwargs["format"] = "JPEG"
            save_kwargs["quality"] = 95
        else:
            save_kwargs["format"] = "WEBP"
            save_kwargs["quality"] = 95

        image.save(output_path, **save_kwargs)

    def save_images(self, images, absolute_path, compression=4, prompt=None, extra_pnginfo=None):
        absolute_path = absolute_path.strip()
        if not absolute_path:
            raise ValueError("absolute_path cannot be empty.")

        path_module, path_style, output_paths = self._build_output_paths(
            absolute_path, len(images)
        )
        pnginfo = self._build_pnginfo(prompt, extra_pnginfo)
        saved_paths = []

        for image_tensor, output_path in zip(images, output_paths):
            image_array = 255.0 * image_tensor.cpu().numpy()
            image = Image.fromarray(np.clip(image_array, 0, 255).astype(np.uint8))

            try:
                self._save_image_file(
                    image, output_path, compression, pnginfo, path_module
                )
            finally:
                image.close()

            print(f"Saved image to ({path_style} path): {output_path}")
            saved_paths.append(output_path)

        return (saved_paths,)
