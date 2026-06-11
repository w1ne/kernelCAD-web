// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Q-S3 — Lenient composition for optional features
//
// Demonstrates: `.asLenient()` and the strict-vs-lenient contract for
// `q.union(...)`. Use this whenever a design family has optional named
// features — the composed Query should succeed on the subset that exists,
// not fail because one sub-query misses.
//
// Strict (default) — first sub-query failure surfaces
// `query.composition-strict-failure` with the inner code quoted for trace.
// Lenient — failed sub-queries contribute zero entities; the survivors
// are unioned and execution continues.

const part = box(30, 30, 5, false, {
  faceLabels: { lid: 'top' },
});

// Strict (default). If any of these labels is undeclared on the design,
// the consumer raises `query.composition-strict-failure`.
const strictUnion = q.union(
  q.face(q.withLabel('lid')),
  q.face(q.withLabel('side-bevel')),    // may not exist on this design
);
if (strictUnion.lenient !== undefined && strictUnion.lenient !== false) {
  throw new Error('Q-S3: strict default expected lenient = undefined/false');
}

// Lenient — proceed with whichever labels are present.
const lenientUnion = q.union(
  q.face(q.withLabel('lid')),
  q.face(q.withLabel('side-bevel')),
).asLenient();
if (lenientUnion.lenient !== true) {
  throw new Error('Q-S3: asLenient() did not flip the lenient flag');
}

// The strict/lenient flag is a Query-value data field, not an AST node —
// `JSON.stringify(query)` round-trips it through `JSON.parse` into a
// structurally equal record (chainable methods are non-enumerable).
const snapshot = JSON.parse(JSON.stringify(lenientUnion));
if (snapshot.lenient !== true) throw new Error('Q-S3: lenient lost in JSON');

return part;
