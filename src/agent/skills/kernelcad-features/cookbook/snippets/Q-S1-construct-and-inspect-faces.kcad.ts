// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Q-S1 — Construct a Query and inspect it before consuming
//
// Demonstrates: building a `Query<FaceMarker>` via `q.face(...)`, narrowing
// with `q.withLabel(...)`, and serializing the lazy AST (`.toJSON()`) so
// the agent can paste the structure into a diagnostic message.
//
// This snippet does not consume the Query in a feature op — that path
// (e.g. `.hole(faceQuery, ...)`) ships in a later slice. The Query value
// itself is constructed lazily and round-trips through JSON cleanly.

const part = box(20, 20, 5, false, { faceLabels: { lid: 'top' } });

// The constructor namespace lives at the top-level (`q`) and under the
// `kc` alias (`kc.q`) — both reach the same constructor table.
const lidQuery = q.face(q.withFeatureName('box1')).and(q.withLabel('lid'));

// The Query value carries:
//   - `_kind: 'kc.query'`          (runtime discriminator)
//   - `target: 'face'`             (entity kind narrower)
//   - `ast: { op: 'intersection', queries: [...] }`  (composable AST)
if (lidQuery._kind !== 'kc.query') throw new Error('Q-S1: not a Query value');
if (lidQuery.target !== 'face')    throw new Error('Q-S1: target should be "face"');

// `.toJSON()` returns the data-only snapshot (chainable methods are
// non-enumerable). JSON.stringify on the Query value emits the same shape.
const snapshot = lidQuery.toJSON();
if (snapshot._kind !== 'kc.query') throw new Error('Q-S1: snapshot lost _kind');

return part;
