import { app } from "../../scripts/app.js";
import { createNodeSelectionCleanupController } from "./node_selection_cleanup_core.mjs";
import { createNodeSelectionCleanupMenuOption } from "./node_selection_cleanup_menu.mjs";

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
      options.push(createNodeSelectionCleanupMenuOption(controller));

      return options;
    };

    CanvasClass.prototype[PATCH_FLAG] = true;
  },
});
