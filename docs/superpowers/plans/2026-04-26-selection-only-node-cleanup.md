# Selection-Only Node Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build selection-only cleanup helpers for muted and unused ComfyUI nodes.

**Architecture:** Keep the existing frontend-only ComfyUI extension split into a pure core module and a thin LiteGraph menu integration. The core computes candidate nodes from graph shape and selects them; the integration only registers menu items and toast notifications.

**Tech Stack:** JavaScript ES modules, ComfyUI frontend extension API, LiteGraph graph/node/link objects, Node.js built-in test runner.

---

### Task 1: Convert Muted Cleanup To Selection-Only

**Files:**
- Modify: `js/node_selection_cleanup_core.mjs`
- Modify: `js/node_selection_cleanup.js`
- Modify: `tests/node_selection_cleanup_core.test.mjs`
- Modify: `README.md`

- [ ] Remove controller methods that delete muted nodes.
- [ ] Remove confirm handling from the controller factory and integration.
- [ ] Remove delete menu items.
- [ ] Update tests to assert the controller only exposes selection cleanup actions.
- [ ] Update README to describe selection-only behavior.

Run: `node --test tests/node_selection_cleanup_core.test.mjs`

Expected: tests pass after implementation.

### Task 2: Add Unused Node Reachability

**Files:**
- Modify: `js/node_selection_cleanup_core.mjs`
- Modify: `tests/node_selection_cleanup_core.test.mjs`

- [ ] Write failing tests for output traversal, disconnected islands, cycles, and no-output behavior.
- [ ] Add isolated helpers for output node detection, node mode classification, incoming link resolution, and reverse traversal.
- [ ] Add `getUnusedNodes(outputScope)` and `selectUnusedNodes(outputScope)`.
- [ ] Keep traversal defensive when graph data is incomplete.

Run: `node --test tests/node_selection_cleanup_core.test.mjs`

Expected: tests pass after implementation.

### Task 3: Add Menu Items And Docs

**Files:**
- Modify: `js/node_selection_cleanup.js`
- Modify: `README.md`

- [ ] Add menu labels for each unused-node output scope.
- [ ] Rename extension labels from "Clean Muted Nodes" to broader selection cleanup language.
- [ ] Document output scopes and the safety model.

Run: `node --test tests/node_selection_cleanup_core.test.mjs`

Expected: tests pass after docs and integration changes.

### Task 4: Verify Repository Tests

**Files:**
- No code changes expected.

- [ ] Run JavaScript core tests.
- [ ] Run Python unittest suite.
- [ ] Inspect git diff for unrelated changes.

Run:

```bash
node --test tests/node_selection_cleanup_core.test.mjs
python3 -m unittest discover -s tests
```

Expected: all tests pass.
