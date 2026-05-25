# Task: composed Query DSL drives a hole through the top face

Build a 40×40×10 mm box anchored at the world origin and declare a
user-applied face label `top -> top` via the box's `faceLabels` option.
Construct a typed face Query that resolves to the labeled top face by
chaining `q.face()` with `q.withLabel('top')`. Drive a Ø4 mm through hole
on that Query at `u=0, v=0`, naming the hole `lidBolt`.

The Query DSL surface to exercise (every step required):

1. `q.face()` constructor — the universe of face Queries on the part.
2. `.and(q.withLabel('top'))` chainable filter — narrows to one face.
3. The composed `Query<FaceMarker>` value is passed directly into
   `hole(query, opts)` — the consumer accepts a Query alongside the
   legacy `@kc[...]` string form (strings-as-sugar over one canonical
   internal Query representation).

This exercises the end-to-end Query DSL pipeline: typed authoring
(`q.face()`), composition (`.and(...)`), runtime evaluation via the
Query evaluator, lowerer dispatch through the OCCT backend. No strings,
no canonical-face escape hatch — the Query value carries the selection.

Z-up, millimetres, degrees. The script must `return` the final shape.
