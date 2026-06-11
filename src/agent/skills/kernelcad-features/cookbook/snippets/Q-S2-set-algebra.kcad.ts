// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Q-S2 — Set-algebra composition on face Queries
//
// Demonstrates: `.and(...)` (intersection), `.or(...)` (union),
// `.minus(...)` (subtraction) — the three set operations that the Query
// DSL ships against. Every composer returns a fresh `Query<FaceMarker>`
// whose AST carries the operands; nothing fires until the Query is
// consumed.
//
// "Everything but the bottom face" is a canonical agent pattern: build
// the universe first, then subtract the exclusion.

const part = box(40, 10, 5, false, {
  faceLabels: { lid: 'top', floor: 'bottom' },
});

// The universe of faces on this part.
const allFaces = q.face().and(q.withFeatureName('box1'));

// One specific face to exclude.
const floor = q.face().and(q.withLabel('floor'));

// Set algebra returns a fresh Query each time — the originals are unchanged.
const topAndSides   = allFaces.minus(floor);
const topOrFloor    = q.face().and(q.withLabel('lid')).or(floor);
const lidOnly       = q.face().and(q.withLabel('lid'));

// Every composer preserves `target` so phantom types narrow consistently.
if (topAndSides.target !== 'face') throw new Error('Q-S2: minus drifted target');
if (topOrFloor.target  !== 'face') throw new Error('Q-S2: or drifted target');
if (lidOnly.target     !== 'face') throw new Error('Q-S2: and drifted target');

// AST ops record the composition for downstream evaluation.
if (topAndSides.ast.op !== 'subtraction') throw new Error('Q-S2: minus op');
if (topOrFloor.ast.op  !== 'union')       throw new Error('Q-S2: or op');

return part;
