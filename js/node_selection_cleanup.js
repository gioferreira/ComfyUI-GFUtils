import { app } from "../../scripts/app.js";
import {
  OUTPUT_SCOPE,
  createNodeSelectionCleanupController,
} from "./node_selection_cleanup_core.mjs";

const EXTENSION_NAME = "giovani.nodeSelectionCleanup";
const PATCH_FLAG = "__giovaniNodeSelectionCleanupPatched";

function notify(message) {
  const toast = app.extensionManager?.toast;
  if (typeof toast?.add === "function") {
    toast.add({
      severity: "info",
      summary: "Node Selection Cleanup",
      detail: message,
      life: 3000,
    });
    return;
  }

  console.log(`[${EXTENSION_NAME}] ${message}`);
}

function getCanvasClass() {
  return globalThis.LGraphCanvas;
}

app.registerExtension({
  name: EXTENSION_NAME,
  setup() {
    const CanvasClass = getCanvasClass();
    if (!CanvasClass?.prototype || CanvasClass.prototype[PATCH_FLAG]) {
      return;
    }

    const controller = createNodeSelectionCleanupController({
      app,
      notify,
    });
    const originalGetCanvasMenuOptions = CanvasClass.prototype.getCanvasMenuOptions;

    CanvasClass.prototype.getCanvasMenuOptions = function (...args) {
      const originalOptions = originalGetCanvasMenuOptions
        ? originalGetCanvasMenuOptions.apply(this, args)
        : [];
      const options = Array.isArray(originalOptions) ? originalOptions : [];

      options.push(null);
      options.push({
        content: "Select muted nodes",
        callback: () => controller.selectAllMutedNodes(),
      });
      options.push({
        content: "Select unused nodes from active outputs",
        callback: () => controller.selectUnusedNodes(OUTPUT_SCOPE.ACTIVE),
      });
      options.push({
        content: "Select unused nodes from active + muted outputs",
        callback: () => controller.selectUnusedNodes(OUTPUT_SCOPE.ACTIVE_AND_MUTED),
      });
      options.push({
        content: "Select unused nodes from active + bypassed outputs",
        callback: () => controller.selectUnusedNodes(OUTPUT_SCOPE.ACTIVE_AND_BYPASSED),
      });
      options.push({
        content: "Select unused nodes from all outputs",
        callback: () => controller.selectUnusedNodes(OUTPUT_SCOPE.ALL),
      });

      return options;
    };

    CanvasClass.prototype[PATCH_FLAG] = true;
  },
});
