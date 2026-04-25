import { app } from "../../scripts/app.js";
import { createCleanMutedNodesController } from "./clean_muted_nodes_core.mjs";

const EXTENSION_NAME = "giovani.cleanMutedNodes";
const PATCH_FLAG = "__giovaniCleanMutedNodesPatched";

function notify(message) {
  const toast = app.extensionManager?.toast;
  if (typeof toast?.add === "function") {
    toast.add({
      severity: "info",
      summary: "Clean Muted Nodes",
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

    const controller = createCleanMutedNodesController({
      app,
      confirm: (message) => globalThis.confirm(message),
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
        content: "Select all muted nodes",
        callback: () => controller.selectAllMutedNodes(),
      });
      options.push({
        content: "Delete selected muted nodes...",
        callback: () => controller.deleteSelectedMutedNodes(),
      });
      options.push({
        content: "Delete all muted nodes...",
        callback: () => controller.deleteAllMutedNodes(),
      });

      return options;
    };

    CanvasClass.prototype[PATCH_FLAG] = true;
  },
});
