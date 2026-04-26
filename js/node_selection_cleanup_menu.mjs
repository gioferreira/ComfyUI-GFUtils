import { OUTPUT_SCOPE } from "./node_selection_cleanup_core.mjs";

export function createNodeSelectionCleanupMenuOption(controller) {
  return {
    content: "GFUtils - Selectors",
    has_submenu: true,
    submenu: {
      options: [
        {
          content: "Select muted nodes",
          callback: () => controller.selectAllMutedNodes(),
        },
        {
          content: "Select bypassed nodes",
          callback: () => controller.selectAllBypassedNodes(),
        },
        {
          content: "Select orphan KJ Get nodes",
          callback: () => controller.selectOrphanKJGetNodes(),
        },
        null,
        {
          content: "Select nodes with no outputs",
          callback: () => controller.selectUnusedNodes(OUTPUT_SCOPE.NO_OUTPUTS),
        },
        {
          content: "Select nodes with no outputs or only muted outputs",
          callback: () => controller.selectUnusedNodes(OUTPUT_SCOPE.NO_OUTPUTS_OR_MUTED_OUTPUTS),
        },
        {
          content: "Select nodes with no outputs or only bypassed outputs",
          callback: () => controller.selectUnusedNodes(OUTPUT_SCOPE.NO_OUTPUTS_OR_BYPASSED_OUTPUTS),
        },
        {
          content: "Select nodes with no outputs or only inactive outputs",
          callback: () => controller.selectUnusedNodes(OUTPUT_SCOPE.NO_OUTPUTS_OR_INACTIVE_OUTPUTS),
        },
      ],
    },
  };
}
