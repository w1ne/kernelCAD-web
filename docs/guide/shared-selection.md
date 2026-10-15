# Shared selection in local Studio

Open a script in local Studio (`npm run dev`, then
`http://localhost:5173/?script=examples/bracket-with-hole.kcad.ts`). Click a
face or hover an edge and click it. The existing viewer highlight and code
link identify the pick; no extra selection panel is needed.

Acquire the same script's token with
`GET http://localhost:5173/__kernelcad/session?script=examples/bracket-with-hole.kcad.ts`.
Call `get_selection` with `{ "studio_url": "http://localhost:5173", "session": "<sessionToken>" }`.
It returns `{ "ok": true, "selection": { "shapeIndex": 0, "kind": "edge", "id": 2, "featureId": "box_1" }, "revision": 1, "modelGeneration": 0 }`
(or `selection: null` when nothing is selected).

For a request such as “make this edge r2”, read selection first, inspect the
current shape with `query` (topology/edges), and identify the matching edge
before editing the source. `shapeIndex` is the rendered body index; `id` is
its face id or edge-range index. `featureId` identifies the feature that
created the picked geometry. It is provenance, **not a stable topology ref**;
do not manufacture an `@kc[...]` ref from these fields. Indices are local to
the current mesh and expire when the model rebuilds.

Call `set_selection` with the same origin/token, `model_generation` from the latest `get_selection`, and a `selection` object in
that format. The viewer updates its existing face/edge highlight within the
next 300 ms sync cycle. Pass `selection: null` to clear. These tools change
selection only; they do not modify CAD geometry.

Selections belong to one pooled session. Separate scripts have separate
selections. After a successful rebuild Studio withholds a selected face from agent tools, then
matches its generating feature and geometric signature against the new mesh.
Only a unique match is republished at the new model generation; deleted or
ambiguous faces are cleared. Writes from prior generations are rejected.
Failed rebuilds keep the current model and pick. Studio retries interrupted selection writes
and preserves clicks made during an in-flight read. Closing Studio stops its
polling; session eviction yields a tool error rather than a stale selection.

This implementation is for local HTTP Studio origins (localhost, 127.0.0.1,
::1). Hosted route registration and owner authorization live in the separate
server repository and are not deployed by this change.

[Shared selection handoff](../demos/shared-selection/README.md).
