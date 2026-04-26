import assert from "node:assert/strict";
import test from "node:test";

import { createNodeSelectionCleanupMenuOption } from "../js/node_selection_cleanup_menu.mjs";

test("createNodeSelectionCleanupMenuOption groups selector actions in a submenu", () => {
  const calls = [];
  const controller = {
    selectAllMutedNodes() {
      calls.push("muted");
    },
    selectAllBypassedNodes() {
      calls.push("bypassed");
    },
    selectOrphanKJGetNodes() {
      calls.push("orphan-gets");
    },
    selectUnusedNodes(scope) {
      calls.push(scope);
    },
  };

  const option = createNodeSelectionCleanupMenuOption(controller);
  const submenuOptions = option.submenu.options;

  assert.equal(option.content, "GFUtils - Selectors");
  assert.equal(option.has_submenu, true);
  assert.deepEqual(
    submenuOptions.map((item) => item?.content ?? null),
    [
      "Select muted nodes",
      "Select bypassed nodes",
      "Select orphan KJ Get nodes",
      null,
      "Select nodes with no outputs",
      "Select nodes with no outputs or only muted outputs",
      "Select nodes with no outputs or only bypassed outputs",
      "Select nodes with no outputs or only inactive outputs",
    ],
  );

  for (const item of submenuOptions) {
    item?.callback?.();
  }

  assert.deepEqual(calls, [
    "muted",
    "bypassed",
    "orphan-gets",
    "no-outputs",
    "no-outputs-or-muted-outputs",
    "no-outputs-or-bypassed-outputs",
    "no-outputs-or-inactive-outputs",
  ]);
});
