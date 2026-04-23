import importlib.util
import pathlib
import unittest

import torch


ROOT = pathlib.Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "video_masked_recombine.py"


def load_module():
    spec = importlib.util.spec_from_file_location("video_masked_recombine", MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


class VideoMaskedRecombineTests(unittest.TestCase):
    def test_execute_composites_foreground_and_background_with_debug_outputs(self):
        module = load_module()
        node = module.VideoMaskedRecombine()

        foreground = torch.ones((1, 2, 2, 3), dtype=torch.float32)
        background = torch.full((1, 2, 2, 3), 0.2, dtype=torch.float32)
        mask = torch.tensor([[[1.0, 0.0], [0.5, 1.0]]], dtype=torch.float32)

        image, processed_mask, foreground_masked, background_masked = node.execute(
            foreground=foreground,
            background=background,
            mask=mask,
            invert_mask=False,
            opacity=1.0,
            feather=0,
            grow=0,
        )

        expected_mask = mask
        expected_image = foreground * expected_mask.unsqueeze(-1) + background * (
            1.0 - expected_mask.unsqueeze(-1)
        )

        self.assertTrue(torch.allclose(processed_mask, expected_mask))
        self.assertTrue(torch.allclose(image, expected_image))
        self.assertTrue(torch.allclose(foreground_masked, foreground * expected_mask.unsqueeze(-1)))
        self.assertTrue(
            torch.allclose(background_masked, background * (1.0 - expected_mask.unsqueeze(-1)))
        )

    def test_execute_repeats_single_mask_across_batch(self):
        module = load_module()
        node = module.VideoMaskedRecombine()

        foreground = torch.stack(
            [
                torch.zeros((2, 2, 3), dtype=torch.float32),
                torch.ones((2, 2, 3), dtype=torch.float32),
            ],
            dim=0,
        )
        background = torch.full((2, 2, 2, 3), 0.25, dtype=torch.float32)
        mask = torch.tensor([[1.0, 0.0], [0.0, 1.0]], dtype=torch.float32)

        image, processed_mask, _, _ = node.execute(
            foreground=foreground,
            background=background,
            mask=mask,
            invert_mask=False,
            opacity=1.0,
            feather=0,
            grow=0,
        )

        self.assertEqual(processed_mask.shape, (2, 2, 2))
        self.assertTrue(torch.allclose(processed_mask[0], processed_mask[1]))
        self.assertTrue(torch.allclose(image[0, 0, 0], torch.zeros(3)))
        self.assertTrue(torch.allclose(image[0, 0, 1], torch.full((3,), 0.25)))
        self.assertTrue(torch.allclose(image[1, 1, 1], torch.ones(3)))

    def test_grow_expands_mask_area(self):
        module = load_module()
        node = module.VideoMaskedRecombine()

        mask = torch.zeros((1, 5, 5), dtype=torch.float32)
        mask[0, 2, 2] = 1.0

        grown = node._process_mask(mask, feather=0, grow=1)

        self.assertGreater(grown.sum().item(), mask.sum().item())
        self.assertEqual(grown[0, 2, 2].item(), 1.0)

    def test_feather_softens_mask_edges(self):
        module = load_module()
        node = module.VideoMaskedRecombine()

        mask = torch.zeros((1, 5, 5), dtype=torch.float32)
        mask[0, 2, 2] = 1.0

        feathered = node._process_mask(mask, feather=1, grow=0)

        self.assertGreater(feathered[0, 2, 2].item(), 0.0)
        self.assertLess(feathered[0, 2, 2].item(), 1.0)
        self.assertGreater(feathered[0, 2, 1].item(), 0.0)


if __name__ == "__main__":
    unittest.main()
