import assert from "node:assert/strict";
import test from "node:test";

import {
  BYPASSED_MODE,
  MUTED_MODE,
  OUTPUT_SCOPE,
  createNodeSelectionCleanupController,
  isMutedNode,
  isOutputNode,
} from "../js/node_selection_cleanup_core.mjs";

function createNode(id, mode = 0, options = {}) {
  return {
    id,
    mode,
    inputs: options.inputs ?? [],
    is_selected: false,
    ...options,
  };
}

function link(id, originNode, targetNode) {
  targetNode.inputs.push({ link: id });
  return {
    id,
    origin_id: originNode.id,
    target_id: targetNode.id,
  };
}

function createHarness(nodes, links = []) {
  const dirtyCalls = [];
  const notices = [];
  const graph = {
    _nodes: [...nodes],
    links: Object.fromEntries(links.map((candidate) => [candidate.id, candidate])),
    setDirtyCanvas(foreground, background) {
      dirtyCalls.push(["graph", foreground, background]);
    },
  };

  for (const node of nodes) {
    if (node.graph !== null) node.graph = graph;
  }

  const app = {
    graph,
    canvas: {
      selected_nodes: {},
      setDirty(foreground, background) {
        dirtyCalls.push(["canvas", foreground, background]);
      },
    },
  };

  return {
    app,
    dirtyCalls,
    notices,
    controller: createNodeSelectionCleanupController({
      app,
      notify(message) {
        notices.push(message);
      },
    }),
  };
}

function selectedIds(app) {
  return Object.keys(app.canvas.selected_nodes)
    .map((id) => Number(id))
    .sort((left, right) => left - right);
}

test("isMutedNode only matches LiteGraph muted mode", () => {
  assert.equal(isMutedNode(createNode(1, MUTED_MODE)), true);
  assert.equal(isMutedNode(createNode(2, BYPASSED_MODE)), false);
  assert.equal(isMutedNode(createNode(3, 0)), false);
  assert.equal(isMutedNode(null), false);
});

test("isOutputNode recognizes common ComfyUI frontend output metadata", () => {
  assert.equal(isOutputNode(createNode(1, 0, { output_node: true })), true);
  assert.equal(isOutputNode(createNode(2, 0, { is_output: true })), true);
  assert.equal(
    isOutputNode(createNode(3, 0, { constructor: { nodeData: { output_node: true } } })),
    true,
  );
  assert.equal(isOutputNode(createNode(4, 0, { type: "CheckpointLoaderSimple" })), false);
});

test("controller exposes selection-only cleanup actions", () => {
  const { controller } = createHarness([]);

  assert.equal(typeof controller.selectAllMutedNodes, "function");
  assert.equal(typeof controller.selectUnusedNodes, "function");
  assert.equal(typeof controller.getUnusedNodes, "function");
  assert.equal("deleteAllMutedNodes" in controller, false);
  assert.equal("deleteSelectedMutedNodes" in controller, false);
});

test("selectAllMutedNodes selects exactly muted nodes and clears existing selection", () => {
  const normal = createNode(1, 0);
  const mutedA = createNode(2, MUTED_MODE);
  const bypassed = createNode(3, BYPASSED_MODE);
  const mutedB = createNode(4, MUTED_MODE);
  normal.is_selected = true;

  const { app, controller, notices } = createHarness([normal, mutedA, bypassed, mutedB]);
  app.canvas.selected_nodes = { [normal.id]: normal };

  const count = controller.selectAllMutedNodes();

  assert.equal(count, 2);
  assert.deepEqual(selectedIds(app), [2, 4]);
  assert.equal(normal.is_selected, false);
  assert.equal(mutedA.is_selected, true);
  assert.equal(bypassed.is_selected, false);
  assert.equal(mutedB.is_selected, true);
  assert.deepEqual(notices, ["Selected 2 muted nodes."]);
});

test("selectUnusedNodes selects nodes unreachable from active outputs", () => {
  const source = createNode(1);
  const processor = createNode(2);
  const output = createNode(3, 0, { output_node: true });
  const disconnectedA = createNode(4);
  const disconnectedB = createNode(5);
  const links = [
    link(10, source, processor),
    link(11, processor, output),
    link(12, disconnectedA, disconnectedB),
  ];
  const { app, controller, notices } = createHarness(
    [source, processor, output, disconnectedA, disconnectedB],
    links,
  );

  const count = controller.selectUnusedNodes(OUTPUT_SCOPE.ACTIVE);

  assert.equal(count, 2);
  assert.deepEqual(selectedIds(app), [4, 5]);
  assert.deepEqual(notices, ["Selected 2 unused nodes."]);
});

test("selectUnusedNodes handles disconnected cycles without selecting useful nodes", () => {
  const source = createNode(1);
  const output = createNode(2, 0, { output_node: true });
  const cycleA = createNode(3);
  const cycleB = createNode(4);
  const links = [link(10, source, output), link(11, cycleA, cycleB), link(12, cycleB, cycleA)];
  const { app, controller } = createHarness([source, output, cycleA, cycleB], links);

  const count = controller.selectUnusedNodes(OUTPUT_SCOPE.ACTIVE);

  assert.equal(count, 2);
  assert.deepEqual(selectedIds(app), [3, 4]);
});

test("muted and bypassed output scopes control which output branches are preserved", () => {
  const activeSource = createNode(1);
  const activeOutput = createNode(2, 0, { output_node: true });
  const mutedSource = createNode(3);
  const mutedOutput = createNode(4, MUTED_MODE, { output_node: true });
  const bypassedSource = createNode(5);
  const bypassedOutput = createNode(6, BYPASSED_MODE, { output_node: true });
  const links = [
    link(10, activeSource, activeOutput),
    link(11, mutedSource, mutedOutput),
    link(12, bypassedSource, bypassedOutput),
  ];

  {
    const { app, controller } = createHarness(
      [activeSource, activeOutput, mutedSource, mutedOutput, bypassedSource, bypassedOutput],
      links,
    );
    assert.equal(controller.selectUnusedNodes(OUTPUT_SCOPE.ACTIVE), 4);
    assert.deepEqual(selectedIds(app), [3, 4, 5, 6]);
  }

  {
    const { app, controller } = createHarness(
      [activeSource, activeOutput, mutedSource, mutedOutput, bypassedSource, bypassedOutput],
      links,
    );
    assert.equal(controller.selectUnusedNodes(OUTPUT_SCOPE.ACTIVE_AND_MUTED), 2);
    assert.deepEqual(selectedIds(app), [5, 6]);
  }

  {
    const { app, controller } = createHarness(
      [activeSource, activeOutput, mutedSource, mutedOutput, bypassedSource, bypassedOutput],
      links,
    );
    assert.equal(controller.selectUnusedNodes(OUTPUT_SCOPE.ALL), 0);
    assert.deepEqual(selectedIds(app), []);
  }
});

test("selectUnusedNodes does not select the whole workflow when no eligible outputs exist", () => {
  const source = createNode(1);
  const processor = createNode(2);
  const { app, controller, notices } = createHarness([source, processor]);

  const count = controller.selectUnusedNodes(OUTPUT_SCOPE.ACTIVE);

  assert.equal(count, 0);
  assert.deepEqual(selectedIds(app), []);
  assert.deepEqual(notices, ["No eligible output nodes found."]);
});

test("selectUnusedNodes recomputes graph reachability after nodes are deleted", () => {
  const source = createNode(1);
  const processor = createNode(2);
  const output = createNode(3, 0, { output_node: true });
  const links = [link(10, source, processor), link(11, processor, output)];
  const { app, controller } = createHarness([source, processor, output], links);

  assert.equal(controller.selectUnusedNodes(OUTPUT_SCOPE.ACTIVE), 0);
  assert.deepEqual(selectedIds(app), []);

  app.graph._nodes = app.graph._nodes.filter((node) => node !== processor);
  output.inputs = [];
  app.graph.links = {};

  assert.equal(controller.selectUnusedNodes(OUTPUT_SCOPE.ACTIVE), 1);
  assert.deepEqual(selectedIds(app), [1]);
});

test("selectUnusedNodes ignores nodes that no longer belong to the current graph", () => {
  const source = createNode(1);
  const deletedProcessor = createNode(2);
  const output = createNode(3, 0, { output_node: true });
  const links = [link(10, source, deletedProcessor), link(11, deletedProcessor, output)];
  const { app, controller } = createHarness([source, deletedProcessor, output], links);
  deletedProcessor.graph = null;

  assert.equal(controller.selectUnusedNodes(OUTPUT_SCOPE.ACTIVE), 1);
  assert.deepEqual(selectedIds(app), [1]);
});
