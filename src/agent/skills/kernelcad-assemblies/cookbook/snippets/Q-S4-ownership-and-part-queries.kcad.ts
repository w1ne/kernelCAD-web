// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Q-S4 — Ownership filters and Part Queries
//
// Demonstrates: `q.part(...)`, `q.ownedByPart(...)`, and `q.ownerPart(...)`.
// In an assembly, every face/edge/vertex belongs to exactly one part — the
// ownership filters let an agent narrow a face Query to "faces on part X"
// without naming a specific topology by hand.
//
// "Find the face on the bracket labelled 'mount-plate'" is a canonical
// agent pattern when assembling vendor parts: the bracket's geometry
// changes per variant but the label is stable.

const arm = assembly('bracket-mount');
arm.part('bracket', box(20, 20, 10, false, {
  faceLabels: { mount: 'top', sole: 'bottom' },
}));
arm.part('servo', cylinder(15, 8));

// Build a Part query for "the bracket": narrows from "all parts" to one
// by feature name. Part queries are themselves Queries — composable with
// `.and`, `.or`, etc. — and they're consumed by ownership filters below.
const bracket = q.part().and(q.withFeatureName('bracket'));
if (bracket.target !== 'part') throw new Error('Q-S4: part query target');

// "Faces owned by the bracket part" — face-kind query filtered by part
// membership. The agent writes the part filter once and reuses it.
const bracketFaces = q.face().and(q.ownedByPart(bracket));
if (bracketFaces.target !== 'face') throw new Error('Q-S4: face target lost');

// "The bracket's mount face" — combine ownership with label narrowing.
const mountFace = q.face()
  .and(q.ownedByPart(bracket))
  .and(q.withLabel('mount'));
if (mountFace.ast.op !== 'intersection') throw new Error('Q-S4: ast.op');

return arm.model();
