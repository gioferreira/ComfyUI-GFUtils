export const MUTED_MODE = 2;

export function isMutedNode(node) {
  return Boolean(node && node.mode === MUTED_MODE);
}

function formatCount(count, noun) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function defaultConfirm(message) {
  return globalThis.confirm?.(message) ?? false;
}

function defaultNotify(message) {
  console.log(`[giovani.cleanMutedNodes] ${message}`);
}

function getSelectedNodeValues(selectedNodes) {
  if (!selectedNodes) return [];
  if (Array.isArray(selectedNodes)) return selectedNodes;
  if (selectedNodes instanceof Map) return [...selectedNodes.values()];
  return Object.values(selectedNodes);
}

function removeFromSelection(selectedNodes, node) {
  if (!selectedNodes || !node) return;
  if (selectedNodes instanceof Map) {
    selectedNodes.delete(node.id);
    return;
  }
  if (node.id in selectedNodes) {
    delete selectedNodes[node.id];
  }
}

export function createCleanMutedNodesController({
  app,
  confirm = defaultConfirm,
  notify = defaultNotify,
} = {}) {
  function getAllNodes() {
    return app?.graph?._nodes ?? [];
  }

  function getMutedNodes() {
    return getAllNodes().filter(isMutedNode);
  }

  function getSelectedNodes() {
    return getSelectedNodeValues(app?.canvas?.selected_nodes);
  }

  function markDirty() {
    app?.graph?.setDirtyCanvas?.(true, true);
    app?.canvas?.setDirty?.(true, true);
  }

  function clearSelection() {
    const canvas = app?.canvas;
    if (!canvas) return;

    if (typeof canvas.deselectAllNodes === "function") {
      canvas.deselectAllNodes();
      return;
    }

    for (const node of getSelectedNodeValues(canvas.selected_nodes)) {
      if (node) node.is_selected = false;
    }
    canvas.selected_nodes = {};
  }

  function selectNodes(nodes) {
    const canvas = app?.canvas;
    if (!canvas) return;

    clearSelection();

    if (typeof canvas.selectNodes === "function") {
      canvas.selectNodes(nodes);
      markDirty();
      return;
    }

    canvas.selected_nodes = {};
    for (const node of nodes) {
      if (!node) continue;
      node.is_selected = true;
      canvas.selected_nodes[node.id] = node;
    }
    markDirty();
  }

  function removeNodes(nodes) {
    const graph = app?.graph;
    const canvas = app?.canvas;
    if (!graph) return;

    for (const node of [...nodes]) {
      graph.remove?.(node);
      removeFromSelection(canvas?.selected_nodes, node);
    }
    markDirty();
  }

  function selectAllMutedNodes() {
    const mutedNodes = getMutedNodes();
    if (mutedNodes.length === 0) {
      notify("No muted nodes found.");
      return 0;
    }

    selectNodes(mutedNodes);
    notify(`Selected ${formatCount(mutedNodes.length, "muted node")}.`);
    return mutedNodes.length;
  }

  function deleteSelectedMutedNodes() {
    const nodes = getSelectedNodes().filter(isMutedNode);
    if (nodes.length === 0) {
      notify("No selected muted nodes found.");
      return 0;
    }

    const confirmed = confirm(
      `Delete ${formatCount(nodes.length, "selected muted node")}? This cannot be undone unless you use workflow undo.`,
    );
    if (!confirmed) return 0;

    removeNodes(nodes);
    notify(`Deleted ${formatCount(nodes.length, "selected muted node")}.`);
    return nodes.length;
  }

  function deleteAllMutedNodes() {
    const nodes = getMutedNodes();
    if (nodes.length === 0) {
      notify("No muted nodes found.");
      return 0;
    }

    const confirmed = confirm(
      `Delete ${formatCount(nodes.length, "muted node")}? This cannot be undone unless you use workflow undo.`,
    );
    if (!confirmed) return 0;

    removeNodes(nodes);
    notify(`Deleted ${formatCount(nodes.length, "muted node")}.`);
    return nodes.length;
  }

  return {
    deleteAllMutedNodes,
    deleteSelectedMutedNodes,
    getMutedNodes,
    getSelectedNodes,
    selectAllMutedNodes,
  };
}
