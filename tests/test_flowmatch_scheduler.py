import importlib.util
import pathlib
import sys
import types
import unittest

import torch


ROOT = pathlib.Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "flowmatch_scheduler.py"


def load_module():
    comfy_module = types.ModuleType("comfy")
    samplers_module = types.ModuleType("comfy.samplers")
    model_management_module = types.ModuleType("comfy.model_management")
    model_management_module.get_torch_device = lambda: torch.device("cpu")

    comfy_module.samplers = samplers_module
    comfy_module.model_management = model_management_module

    sys.modules["comfy"] = comfy_module
    sys.modules["comfy.samplers"] = samplers_module
    sys.modules["comfy.model_management"] = model_management_module

    spec = importlib.util.spec_from_file_location("flowmatch_scheduler", MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


class FlowMatchSchedulerTests(unittest.TestCase):
    def test_linear_scheduler_returns_descending_sigmas_with_final_zero(self):
        module = load_module()

        scheduler = module.FlowMatchScheduler()
        (sigmas,) = scheduler.get_sigmas(steps=4, scheduler_type="linear")

        self.assertEqual(sigmas.shape[0], 5)
        self.assertTrue(torch.equal(sigmas, torch.tensor([1.0, 0.75, 0.5, 0.25, 0.0])))

    def test_presets_node_returns_sigma_tensor(self):
        module = load_module()

        presets = module.FlowMatchSchedulerPresets()
        (sigmas,) = presets.get_sigmas(preset="stable_diffusion", steps=3, denoise=1.0)

        self.assertEqual(sigmas.shape[0], 4)
        self.assertEqual(sigmas[-1].item(), 0.0)

    def test_auto_config_returns_expected_flux_defaults(self):
        module = load_module()

        auto_config = module.FlowMatchAutoConfig()
        config = auto_config.get_config("flux_dev")

        self.assertEqual(config, (28, 3.5, 1.0, "euler", "flux_shift"))

    def test_guide_returns_recommendation_text(self):
        module = load_module()

        guide = module.FlowMatchGuide()
        (text,) = guide.get_recommendation("qwen_image")

        self.assertIn("Qwen", text)
        self.assertIn("Scheduler", text)


if __name__ == "__main__":
    unittest.main()
