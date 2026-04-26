export const MUTED_MODE = 2;
export const BYPASSED_MODE = 4;

export const OUTPUT_SCOPE = Object.freeze({
  NO_OUTPUTS: "no-outputs",
  NO_OUTPUTS_OR_MUTED_OUTPUTS: "no-outputs-or-muted-outputs",
  NO_OUTPUTS_OR_BYPASSED_OUTPUTS: "no-outputs-or-bypassed-outputs",
  NO_OUTPUTS_OR_INACTIVE_OUTPUTS: "no-outputs-or-inactive-outputs",
});

const OUTPUT_MODE = Object.freeze({
  ACTIVE: "active",
  MUTED: "muted",
  BYPASSED: "bypassed",
});

export function isMutedNode(node) {
  return Boolean(node && node.mode === MUTED_MODE);
}

function isBypassedNode(node) {
  return Boolean(node && node.mode === BYPASSED_MODE);
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

function getOutputMode(node) {
  if (isMutedNode(node)) return OUTPUT_MODE.MUTED;
  if (isBypassedNode(node)) return OUTPUT_MODE.BYPASSED;
  return OUTPUT_MODE.ACTIVE;
}

function getCleanupOutputModes(scope) {
  switch (scope) {
    case OUTPUT_SCOPE.NO_OUTPUTS_OR_MUTED_OUTPUTS:
      return new Set([OUTPUT_MODE.MUTED]);
    case OUTPUT_SCOPE.NO_OUTPUTS_OR_BYPASSED_OUTPUTS:
      return new Set([OUTPUT_MODE.BYPASSED]);
    case OUTPUT_SCOPE.NO_OUTPUTS_OR_INACTIVE_OUTPUTS:
      return new Set([OUTPUT_MODE.MUTED, OUTPUT_MODE.BYPASSED]);
    case OUTPUT_SCOPE.NO_OUTPUTS:
    default:
      return new Set();
  }
}

function shouldSelectNodeForCleanup(outputModes, cleanupOutputModes) {
  if (!outputModes || outputModes.size === 0) return true;
  return [...outputModes].every((mode) => cleanupOutputModes.has(mode));
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

function getKJSetGetName(node) {
  const value = node?.widgets?.[0]?.value;
  if (value == null) return undefined;

  const name = String(value);
  return name === "" ? undefined : name;
}

function createKJNodesSetGetTraversalAdapter(nodes) {
  const setNodesByName = new Map();

  for (const node of nodes) {
    if (node?.type !== "SetNode") continue;

    const name = getKJSetGetName(node);
    if (!name) continue;

    const setNodes = setNodesByName.get(name) ?? [];
    setNodes.push(node);
    setNodesByName.set(name, setNodes);
  }

  return {
    getVirtualOriginNodeIds(node) {
      if (node?.type !== "GetNode") return [];

      const name = getKJSetGetName(node);
      if (!name) return [];

      const setNodes = setNodesByName.get(name) ?? [];
      if (setNodes.length !== 1) return [];

      return [setNodes[0].id];
    },
  };
}

function createVirtualTraversalAdapters(nodes) {
  return [createKJNodesSetGetTraversalAdapter(nodes)];
}

function getReachableOriginNodeIds(node, graph, traversalAdapters) {
  const originIds = getInputOriginNodeIds(node, graph);

  for (const adapter of traversalAdapters) {
    originIds.push(...adapter.getVirtualOriginNodeIds(node));
  }

  return originIds;
}

function getReachableOutputModesByNode(graph, outputNodes) {
  const allNodes = getCurrentGraphNodes(graph);
  const nodesById = new Map(allNodes.map((node) => [node.id, node]));
  const outputModesByNode = new Map(allNodes.map((node) => [node.id, new Set()]));
  const traversalAdapters = createVirtualTraversalAdapters(allNodes);

  for (const outputNode of outputNodes) {
    if (!nodesById.has(outputNode?.id)) continue;

    const outputMode = getOutputMode(outputNode);
    const visited = new Set();
    const pending = [outputNode];

    while (pending.length > 0) {
      const node = pending.pop();
      if (!node || visited.has(node.id)) continue;

      visited.add(node.id);
      outputModesByNode.get(node.id)?.add(outputMode);

      for (const originId of getReachableOriginNodeIds(node, graph, traversalAdapters)) {
        const originNode = nodesById.get(originId);
        if (originNode && !visited.has(originNode.id)) {
          pending.push(originNode);
        }
      }
    }
  }

  return outputModesByNode;
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

  function getOutputNodes(scope = OUTPUT_SCOPE.NO_OUTPUTS) {
    const cleanupOutputModes = getCleanupOutputModes(scope);
    return getAllNodes().filter((node) => {
      if (!isOutputNode(node)) return false;
      return getOutputMode(node) === OUTPUT_MODE.ACTIVE || cleanupOutputModes.has(getOutputMode(node));
    });
  }

  function getUnusedNodes(scope = OUTPUT_SCOPE.NO_OUTPUTS) {
    const graph = app?.graph;
    const allNodes = getAllNodes();
    const outputNodes = allNodes.filter(isOutputNode);
    const outputModesByNode = getReachableOutputModesByNode(graph, outputNodes);
    const cleanupOutputModes = getCleanupOutputModes(scope);

    return allNodes.filter((node) =>
      shouldSelectNodeForCleanup(outputModesByNode.get(node.id), cleanupOutputModes),
    );
  }

  function selectUnusedNodes(scope = OUTPUT_SCOPE.NO_OUTPUTS) {
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
