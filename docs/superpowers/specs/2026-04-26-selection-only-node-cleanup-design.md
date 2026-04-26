# Selection-Only Node Cleanup Design

## Goal

Replace destructive cleanup actions with selection-only helpers, and add selection for nodes that do not contribute to active output paths.

## Context

ComfyUI-GFUtils previously shipped a frontend-only ComfyUI extension named `giovani.cleanMutedNodes`. It patched the LiteGraph canvas context menu and offered actions to select or delete muted nodes. The new broader extension should register as `giovani.nodeSelectionCleanup`, with core logic in `js/node_selection_cleanup_core.mjs`.

Deletion is riskier than necessary for graph cleanup. Selecting candidate nodes gives the user a chance to inspect the result and then use the normal LiteGraph delete flow manually.

## Behavior

The extension should expose selection-only menu actions:

- Select muted nodes.
- Select nodes with no outputs.
- Select nodes with no outputs or only muted outputs.
- Select nodes with no outputs or only bypassed outputs.
- Select nodes with no outputs or only inactive outputs.

Unused means "not contributing to a protected output path." The extension walks backward from every output node and records which output modes each node can reach. Nodes that reach no outputs are selected by every unused-node mode. Nodes that only reach muted or bypassed outputs are selected only when the chosen mode includes that output state. Nodes that reach at least one active output are always preserved.

If no output nodes exist in the visible graph, every visible node is selected. This matches the cleanup intent after a user deletes the final Save/Preview node from a branch.

## Output Scope

LiteGraph modes used by this feature:

- Active: mode is absent, `0`, or another non-muted/non-bypassed value.
- Muted: `mode === 2`.
- Bypassed: `mode === 4`.

Output scopes:

- `no-outputs`: select only nodes that reach no output.
- `no-outputs-or-muted-outputs`: also select nodes whose reachable outputs are all muted.
- `no-outputs-or-bypassed-outputs`: also select nodes whose reachable outputs are all bypassed.
- `no-outputs-or-inactive-outputs`: also select nodes whose reachable outputs are all muted or bypassed.

Output node detection should use ComfyUI/LiteGraph metadata available on frontend nodes, favoring:

- `node.type === "output"` or `node.constructor?.type === "output"` when present.
- `node.output_node === true`, `node.is_output === true`, or equivalent boolean metadata when present.
- ComfyUI node definitions exposed on the node, such as `node.constructor?.nodeData?.output_node === true` or `node.constructor?.comfyClass`.

The implementation should keep this detection isolated so it can be adjusted after browser verification against actual ComfyUI frontend objects.

## Architecture

Keep the existing split:

- Core module: graph inspection, reachability, selection helpers, user-facing action functions.
- ComfyUI extension module: menu registration, toast integration, and labels.
- Tests: pure Node.js unit tests using small graph harness objects.

Remove delete-specific functions, confirmations, README language, and tests.

## Error Handling

The feature should tolerate missing or partial LiteGraph structures. Missing `graph.links`, missing `node.inputs`, or malformed links should not throw. Unknown link shapes should be ignored.

Cycles are naturally handled with a visited set.

## Testing

Automated tests should cover:

- Muted selection remains selection-only.
- Delete functions no longer exist in the public controller API.
- Active output reachability selects disconnected islands.
- Muted and bypassed output scopes alter which nodes are preserved.
- Cycles disconnected from outputs are selected as unused.
- Missing output nodes selects the visible graph.
- Link formats supported by LiteGraph-like objects are handled.

Manual/browser verification is still recommended in a real ComfyUI frontend because output metadata can vary by ComfyUI version and custom node definitions.
