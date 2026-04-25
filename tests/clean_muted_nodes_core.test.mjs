import assert from "node:assert/strict";
import test from "node:test";

import { createCleanMutedNodesController, isMutedNode } from "../js/clean_muted_nodes_core.mjs";

function createNode(id, mode = 0) {
  return {
    id,
    mode,
    is_selected: false,
  };
}

function createHarness(nodes) {
  const removed = [];
  const dirtyCalls = [];
  const notices = [];
  const confirmations = [];
  const app = {
    graph: {
      _nodes: [...nodes],
      remove(node) {
        removed.push(node.id);
        this._nodes = this._nodes.filter((candidate) => candidate !== node);
      },
      setDirtyCanvas(foreground, background) {
        dirtyCalls.push(["graph", foreground, background]);
      },
    },
    canvas: {
      selected_nodes: {},
      setDirty(foreground, background) {
        dirtyCalls.push(["canvas", foreground, background]);
      },
    },
  };

  return {
    app,
    removed,
    dirtyCalls,
    notices,
    confirmations,
    controller: createCleanMutedNodesController({
      app,
      confirm(message) {
        confirmations.push(message);
        return true;
      },
      notify(message) {
        notices.push(message);
      },
    }),
  };
}

test("isMutedNode only matches LiteGraph muted mode", () => {
  assert.equal(isMutedNode(createNode(1, 2)), true);
  assert.equal(isMutedNode(createNode(2, 4)), false);
  assert.equal(isMutedNode(createNode(3, 0)), false);
  assert.equal(isMutedNode(null), false);
});

test("selectAllMutedNodes selects exactly muted nodes and clears existing selection", () => {
  const normal = createNode(1, 0);
  const mutedA = createNode(2, 2);
  const bypassed = createNode(3, 4);
  const mutedB = createNode(4, 2);
  normal.is_selected = true;

  const { app, controller, notices } = createHarness([normal, mutedA, bypassed, mutedB]);
  app.canvas.selected_nodes = { [normal.id]: normal };

  const count = controller.selectAllMutedNodes();

  assert.equal(count, 2);
  assert.deepEqual(Object.keys(app.canvas.selected_nodes).sort(), ["2", "4"]);
  assert.equal(normal.is_selected, false);
  assert.equal(mutedA.is_selected, true);
  assert.equal(bypassed.is_selected, false);
  assert.equal(mutedB.is_selected, true);
  assert.deepEqual(notices, ["Selected 2 muted nodes."]);
});

test("deleteSelectedMutedNodes removes only selected muted nodes", () => {
  const mutedSelected = createNode(1, 2);
  const normalSelected = createNode(2, 0);
  const mutedUnselected = createNode(3, 2);
  const { app, controller, confirmations, notices, removed } = createHarness([
    mutedSelected,
    normalSelected,
    mutedUnselected,
  ]);
  app.canvas.selected_nodes = {
    [mutedSelected.id]: mutedSelected,
    [normalSelected.id]: normalSelected,
  };

  const count = controller.deleteSelectedMutedNodes();

  assert.equal(count, 1);
  assert.deepEqual(confirmations, [
    "Delete 1 selected muted node? This cannot be undone unless you use workflow undo.",
  ]);
  assert.deepEqual(removed, [1]);
  assert.deepEqual(app.graph._nodes.map((node) => node.id), [2, 3]);
  assert.deepEqual(notices, ["Deleted 1 selected muted node."]);
});

test("deleteAllMutedNodes removes muted nodes but preserves bypassed nodes", () => {
  const muted = createNode(1, 2);
  const bypassed = createNode(2, 4);
  const normal = createNode(3, 0);
  const { app, controller, removed } = createHarness([muted, bypassed, normal]);

  const count = controller.deleteAllMutedNodes();

  assert.equal(count, 1);
  assert.deepEqual(removed, [1]);
  assert.deepEqual(app.graph._nodes.map((node) => node.id), [2, 3]);
});

test("deleteAllMutedNodes leaves the graph unchanged when confirmation is canceled", () => {
  const muted = createNode(1, 2);
  const { app, removed } = createHarness([muted]);
  const controller = createCleanMutedNodesController({
    app,
    confirm() {
      return false;
    },
    notify() {},
  });

  const count = controller.deleteAllMutedNodes();

  assert.equal(count, 0);
  assert.deepEqual(removed, []);
  assert.deepEqual(app.graph._nodes.map((node) => node.id), [1]);
});

test("actions report when there are no muted nodes to affect", () => {
  const { controller, notices } = createHarness([createNode(1, 0), createNode(2, 4)]);

  assert.equal(controller.selectAllMutedNodes(), 0);
  assert.equal(controller.deleteAllMutedNodes(), 0);
  assert.equal(controller.deleteSelectedMutedNodes(), 0);
  assert.deepEqual(notices, [
    "No muted nodes found.",
    "No muted nodes found.",
    "No selected muted nodes found.",
  ]);
});
