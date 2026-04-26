export const MUTED_MODE = 2;
export const BYPASSED_MODE = 4;

export const OUTPUT_SCOPE = Object.freeze({
  ACTIVE: "active",
  ACTIVE_AND_MUTED: "active-muted",
  ACTIVE_AND_BYPASSED: "active-bypassed",
  ALL: "all",
});

export function isMutedNode(node) {
  return Boolean(node && node.mode === MUTED_MODE);
}

function isBypassedNode(node) {
  return Boolean(node && node.mode === BYPASSED_MODE);
}

function isActiveNode(node) {
  return Boolean(node) && !isMutedNode(node) && !isBypassedNode(node);
}

function hasOutputFlag(value) {
  return value === true || value === "true" || value === "output";
}

export function isOutputNode(node) {
  if (!node) return false;

  const candidates = [
    node.output_node,
    node.is_output,
    node.type === "output",
    node.constructor?.type === "output",
    node.constructor?.nodeData?.output_node,
    node.constructor?.nodeData?.is_output,
    node.constructor?.nodeData?.output,
    node.constructor?.comfyClass?.output_node,
    node.constructor?.comfyClass?.is_output,
  ];

  return candidates.some(hasOutputFlag);
}

function isOutputNodeInScope(node, scope) {
  if (!isOutputNode(node)) return false;

  switch (scope) {
    case OUTPUT_SCOPE.ACTIVE_AND_MUTED:
      return isActiveNode(node) || isMutedNode(node);
    case OUTPUT_SCOPE.ACTIVE_AND_BYPASSED:
      return isActiveNode(node) || isBypassedNode(node);
    case OUTPUT_SCOPE.ALL:
      return isActiveNode(node) || isMutedNode(node) || isBypassedNode(node);
    case OUTPUT_SCOPE.ACTIVE:
    default:
      return isActiveNode(node);
  }
}

function formatCount(count, noun) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function defaultNotify(message) {
  console.log(`[giovani.nodeSelectionCleanup] ${message}`);
}

function getSelectedNodeValues(selectedNodes) {
  if (!selectedNodes) return [];
  if (Array.isArray(selectedNodes)) return selectedNodes;
  if (selectedNodes instanceof Map) return [...selectedNodes.values()];
  return Object.values(selectedNodes);
}

function getLinkCandidates(input) {
  if (!input) return [];

  const candidates = [];
  if (input.link != null) candidates.push(input.link);
  if (Array.isArray(input.links)) candidates.push(...input.links);
  return candidates;
}

function resolveOriginNodeId(linkCandidate, links) {
  if (linkCandidate == null) return undefined;

  if (typeof linkCandidate === "object") {
    return linkCandidate.origin_id ?? linkCandidate.originId ?? linkCandidate[1];
  }

  const link = links?.[linkCandidate];
  if (!link) return undefined;

  if (Array.isArray(link)) return link[1];
  return link.origin_id ?? link.originId;
}

function getInputOriginNodeIds(node, graph) {
  const links = graph?.links;
  const originIds = [];

  for (const input of node?.inputs ?? []) {
    for (const linkCandidate of getLinkCandidates(input)) {
      const originId = resolveOriginNodeId(linkCandidate, links);
      if (originId != null) originIds.push(originId);
    }
  }

  return originIds;
}

function getReachableNodesFromOutputs(graph, outputNodes) {
  const allNodes = getCurrentGraphNodes(graph);
  const nodesById = new Map(allNodes.map((node) => [node.id, node]));
  const reachable = new Set();
  const pending = [...outputNodes];

  while (pending.length > 0) {
    const node = pending.pop();
    if (!node || reachable.has(node.id)) continue;

    reachable.add(node.id);

    for (const originId of getInputOriginNodeIds(node, graph)) {
      const originNode = nodesById.get(originId);
      if (originNode && !reachable.has(originNode.id)) {
        pending.push(originNode);
      }
    }
  }

  return reachable;
}

function isCurrentGraphNode(node, graph) {
  return Boolean(node) && (node.graph === undefined || node.graph === graph);
}

function getCurrentGraphNodes(graph) {
  return (graph?._nodes ?? []).filter((node) => isCurrentGraphNode(node, graph));
}

export function createNodeSelectionCleanupController({ app, notify = defaultNotify } = {}) {
  function getAllNodes() {
    return getCurrentGraphNodes(app?.graph);
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

  function getOutputNodes(scope = OUTPUT_SCOPE.ACTIVE) {
    return getAllNodes().filter((node) => isOutputNodeInScope(node, scope));
  }

  function getUnusedNodes(scope = OUTPUT_SCOPE.ACTIVE) {
    const graph = app?.graph;
    const outputNodes = getOutputNodes(scope);
    if (outputNodes.length === 0) return [];

    const reachable = getReachableNodesFromOutputs(graph, outputNodes);
    return getAllNodes().filter((node) => !reachable.has(node.id));
  }

  function selectUnusedNodes(scope = OUTPUT_SCOPE.ACTIVE) {
    const outputNodes = getOutputNodes(scope);
    if (outputNodes.length === 0) {
      clearSelection();
      notify("No eligible output nodes found.");
      return 0;
    }

    const unusedNodes = getUnusedNodes(scope);
    if (unusedNodes.length === 0) {
      clearSelection();
      notify("No unused nodes found.");
      return 0;
    }

    selectNodes(unusedNodes);
    notify(`Selected ${formatCount(unusedNodes.length, "unused node")}.`);
    return unusedNodes.length;
  }

  return {
    getMutedNodes,
    getOutputNodes,
    getSelectedNodes,
    getUnusedNodes,
    selectAllMutedNodes,
    selectUnusedNodes,
  };
}
