import torch
import torch.nn.functional as F


class VideoMaskedRecombine:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "foreground": ("IMAGE",),
                "background": ("IMAGE",),
                "mask": ("MASK",),
                "invert_mask": ("BOOLEAN", {"default": False}),
                "opacity": ("FLOAT", {"default": 1.0, "min": 0.0, "max": 1.0, "step": 0.01}),
                "feather": ("INT", {"default": 0, "min": 0, "max": 128, "step": 1}),
                "grow": ("INT", {"default": 0, "min": -128, "max": 128, "step": 1}),
            }
        }

    RETURN_TYPES = ("IMAGE", "MASK", "IMAGE", "IMAGE")
    RETURN_NAMES = (
        "image",
        "processed_mask",
        "foreground_masked",
        "background_masked",
    )
    FUNCTION = "execute"
    CATEGORY = "GFUtils"

    def _ensure_image_batch(self, image, name):
        if image.ndim == 3:
            image = image.unsqueeze(0)

        if image.ndim != 4:
            raise ValueError(f"{name} must be an IMAGE tensor with shape [B,H,W,C] or [H,W,C].")

        return image.to(dtype=torch.float32)

    def _ensure_mask_batch(self, mask):
        if mask.ndim == 4:
            if mask.shape[-1] == 1:
                mask = mask[..., 0]
            elif mask.shape[1] == 1:
                mask = mask[:, 0]
            else:
                raise ValueError(
                    "mask must have shape [B,H,W], [H,W], [B,H,W,1], or [B,1,H,W]."
                )
        elif mask.ndim == 2:
            mask = mask.unsqueeze(0)
        elif mask.ndim != 3:
            raise ValueError(
                "mask must have shape [B,H,W], [H,W], [B,H,W,1], or [B,1,H,W]."
            )

        return mask.to(dtype=torch.float32)

    def _repeat_to_batch(self, tensor, target_batch, name):
        current_batch = tensor.shape[0]
        if current_batch == target_batch:
            return tensor

        if current_batch == 1:
            return tensor.repeat(target_batch, *([1] * (tensor.ndim - 1)))

        raise ValueError(
            f"{name} batch must be 1 or match the largest batch in the node. "
            f"Got {current_batch} vs target {target_batch}."
        )

    def _resize_mask(self, mask, height, width):
        if mask.shape[1:] == (height, width):
            return mask

        return F.interpolate(
            mask.unsqueeze(1),
            size=(height, width),
            mode="bilinear",
            align_corners=False,
        ).squeeze(1)

    def _gaussian_kernel_1d(self, radius, device, dtype):
        coords = torch.arange(-radius, radius + 1, device=device, dtype=dtype)
        sigma = max(radius / 2.0, 0.5)
        kernel = torch.exp(-(coords**2) / (2 * sigma * sigma))
        kernel = kernel / kernel.sum()
        return kernel

    def _gaussian_blur(self, mask, radius):
        if radius <= 0:
            return mask

        kernel = self._gaussian_kernel_1d(radius, mask.device, mask.dtype)
        horizontal = kernel.view(1, 1, 1, -1)
        vertical = kernel.view(1, 1, -1, 1)

        blurred = mask.unsqueeze(1)
        blurred = F.pad(blurred, (radius, radius, 0, 0), mode="replicate")
        blurred = F.conv2d(blurred, horizontal)
        blurred = F.pad(blurred, (0, 0, radius, radius), mode="replicate")
        blurred = F.conv2d(blurred, vertical)
        return blurred.squeeze(1)

    def _dilate(self, mask, radius):
        if radius <= 0:
            return mask

        kernel_size = radius * 2 + 1
        return F.max_pool2d(mask.unsqueeze(1), kernel_size, stride=1, padding=radius).squeeze(1)

    def _erode(self, mask, radius):
        if radius <= 0:
            return mask

        return 1.0 - self._dilate(1.0 - mask, radius)

    def _process_mask(self, mask, feather=0, grow=0):
        mask = torch.clamp(mask, 0.0, 1.0)

        if grow > 0:
            mask = self._dilate(mask, grow)
        elif grow < 0:
            mask = self._erode(mask, abs(grow))

        if feather > 0:
            mask = self._gaussian_blur(mask, feather)

        return torch.clamp(mask, 0.0, 1.0)

    def execute(
        self,
        foreground,
        background,
        mask,
        invert_mask=False,
        opacity=1.0,
        feather=0,
        grow=0,
    ):
        foreground = self._ensure_image_batch(foreground, "foreground")
        background = self._ensure_image_batch(background, "background")
        mask = self._ensure_mask_batch(mask)

        target_batch = max(foreground.shape[0], background.shape[0], mask.shape[0])
        foreground = self._repeat_to_batch(foreground, target_batch, "foreground")
        background = self._repeat_to_batch(background, target_batch, "background")
        mask = self._repeat_to_batch(mask, target_batch, "mask")

        if foreground.shape[1:] != background.shape[1:]:
            raise ValueError(
                "foreground and background must have the same shape after batch matching. "
                f"Got {tuple(foreground.shape)} vs {tuple(background.shape)}."
            )

        height, width = foreground.shape[1], foreground.shape[2]
        mask = self._resize_mask(mask, height, width)
        processed_mask = self._process_mask(mask, feather=feather, grow=grow)

        if invert_mask:
            processed_mask = 1.0 - processed_mask

        processed_mask = torch.clamp(processed_mask * opacity, 0.0, 1.0)
        mask_image = processed_mask.unsqueeze(-1)

        foreground_masked = foreground * mask_image
        background_masked = background * (1.0 - mask_image)
        image = torch.clamp(foreground_masked + background_masked, 0.0, 1.0)

        return (image, processed_mask, foreground_masked, background_masked)
