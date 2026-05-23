# Task: Topology refs survive upstream fillet

Build a 20×20×5 mm box anchored at the world origin and declare a
user-applied face label `lid -> top` via the box's `faceLabels` option.
Drill a small pilot hole on the `bottom` face (Ø3 mm, 2 mm deep,
`name: 'pilotHole'`) so the result shape carries lineage snapshots for
every face. Apply a `fillet(0.4, { face: 'bottom' })`; the top face is
not on the filleted boundary, so its lineage propagates unchanged.
Finally drill a Ø4 mm through hole at `u=0, v=0` of the preserved top
face, using the LABEL-form ref string `'@kc[base/face/lid]'` as the
face selector and `name: 'lidBolt'`.

This exercises the load-bearing topology-ref claim: after an upstream
fillet preserves the labeled face, the `@kc[base/face/lid]` ref still
resolves and can be pasted into `hole(...)`. The label form is the
shape `list_faces` actually emits when the user applied a face label
upstream — the collective `base/` owner is the portable form when the
upstream chain isn't known to the caller.

Z-up, millimetres, degrees. The script must `return` the final shape.
