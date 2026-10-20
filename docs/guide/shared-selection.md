# Shared face and edge selection in local Studio

Open a script in local Studio (`npm run dev`, then
`http://localhost:5173/?script=examples/bracket-with-hole.kcad.ts`). Click a
face or an edge. Edge lines highlight orange on hover and teal when selected;
edges can also be picked in shaded mode within a seven CSS-pixel raycast
radius. A plain click replaces the topology selection. Shift, Ctrl, or Cmd
toggles a face or edge in the selection set. Picking an edge clears the active
face sketch plane.

Acquire the same script's token with
`GET http://localhost:5173/__kernelcad/session?script=examples/bracket-with-hole.kcad.ts`.
Call `get_selection` with `{ "studio_url": "http://localhost:5173", "session": "<sessionToken>" }`.
The response retains `selection` as the primary pick and adds `selections` as
the full set:

```json
{
  "ok": true,
  "selection": {
    "shapeIndex": 0,
    "kind": "edge",
    "id": 2,
    "featureId": "box_1",
    "stableId": "s0123456789abcdef",
    "ref": "@kc[box_1/edge/s0123456789abcdef]"
  },
  "selections": [
    {
      "shapeIndex": 0,
      "kind": "edge",
      "id": 2,
      "featureId": "box_1",
      "stableId": "s0123456789abcdef",
      "ref": "@kc[box_1/edge/s0123456789abcdef]"
    }
  ],
  "revision": 1,
  "modelGeneration": 0
}
```

For an edge, `id` is the current mesh edge-range index used by the viewer.
`stableId` is the persistent operation identity: `s` followed by a 64-bit
hexadecimal fingerprint. The fingerprint combines curve type, length, and
nine evenly spaced points along the edge, quantized to `1e-6` model units;
sorting the samples makes it independent of edge orientation and traversal
order. It remains stable while that edge geometry remains unchanged, including
when unrelated geometry is edited. Changed geometry gets a new ID. If multiple
current edges share a fingerprint, the resolver rejects the ID as ambiguous.
The operation-ready `ref` uses the edge's creating feature as owner. Faces
retain their existing current-mesh indices and face-signature remapping.

For a request such as “fillet the edges I selected”, read `get_selection` and
pass the selected edge `ref` values as an array to `apply_surface_blend`:

```json
{
  "code": "const body = box(10, 10, 10);\nreturn body;",
  "shape_binding": "body",
  "radius": 1,
  "selector": [
    "@kc[box_1/edge/s0123456789abcdef]",
    "@kc[box_1/edge/sfedcba9876543210]"
  ]
}
```

`apply_surface_blend` accepts the same stable refs for chamfers. It returns the
new blend result from a script whose top-level return directly returns the
provided `shape_binding`. Use `set_selection` with the latest
`model_generation` and both the primary `selection` and full `selections` array
to set a selection through MCP. Pass `selection: null` and `selections: []`
to clear. The viewer updates its existing highlight within the next 300 ms
sync cycle. These tools change selection only; the surface-blend tool edits and
evaluates CAD geometry.

Selections belong to one pooled session. Separate scripts have separate
selections. Face picks are withheld during a rebuild until Studio uniquely
matches the generating feature and geometric signature against the new mesh;
deleted or ambiguous faces are cleared. Writes from prior generations are
rejected. Edge IDs themselves are geometry-derived and can be used again after
re-evaluation when the edge geometry is unchanged. Failed rebuilds keep the
current model and pick. Studio retries interrupted selection writes and
preserves clicks made during an in-flight read. Closing Studio stops its
polling; session eviction yields a tool error rather than a stale selection.

This implementation is for local HTTP Studio origins (localhost, 127.0.0.1,
::1). Hosted route registration and owner authorization live in the separate
server repository and are not deployed by this change.

[Local edge-picking demo bundle](../demos/edge-picking/README.md).
