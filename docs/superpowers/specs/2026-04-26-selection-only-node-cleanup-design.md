# Selection-Only Node Cleanup Design

## Goal

Replace destructive cleanup actions with selection-only helpers, and add selection for nodes that do not contribute to eligible output nodes.

## Context

ComfyUI-GFUtils previously shipped a frontend-only ComfyUI extension named `giovani.cleanMutedNodes`. It patched the LiteGraph canvas context menu and offered actions to select or delete muted nodes. The new broader extension should register as `giovani.nodeSelectionCleanup`, with core logic in `js/node_selection_cleanup_core.mjs`.

Deletion is riskier than necessary for graph cleanup. Selecting candidate nodes gives the user a chance to inspect the result and then use the normal LiteGraph delete flow manually.

## Behavior

The extension should expose selection-only menu actions:

- Select muted nodes.
- Select unused nodes from active outputs.
- Select unused nodes from active + muted outputs.
- Select unused nodes from active + bypassed outputs.
- Select unused nodes from all outputs.

Unused means "not reachable by walking backward from eligible output nodes through input links." A node is useful if it is an eligible output node or an upstream dependency of one. Any main-graph node outside that reachable set is unused for that chosen output scope.

If no eligible output nodes exist for the chosen scope, the extension should select nothing and notify the user. This avoids selecting the whole workflow by accident.

## Output Scope

LiteGraph modes used by this feature:

- Active: mode is absent, `0`, or another non-muted/non-bypassed value.
- Muted: `mode === 2`.
- Bypassed: `mode === 4`.

Output scopes:

- `active`: include only active output nodes.
- `active-muted`: include active and muted output nodes.
- `active-bypassed`: include active and bypassed output nodes.
- `all`: include active, muted, and bypassed output nodes.

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
- Missing eligible outputs produces no selection and a notification.
- Link formats supported by LiteGraph-like objects are handled.

Manual/browser verification is still recommended in a real ComfyUI frontend because output metadata can vary by ComfyUI version and custom node definitions.
