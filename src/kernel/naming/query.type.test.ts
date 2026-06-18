// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Type-narrowing assertions for Query<T>. This file is type-checked by tsc
// via the project's typecheck step; the assertions are compile-time. If a
// line marked `// @ts-expect-error` does NOT error, the type narrowing
// regressed and tsc will fail the unused-directive rule.
//
// Vitest also picks the file up because of the .test.ts suffix, so we add
// a single sentinel runtime test below to satisfy the test runner. The
// runtime assertion is intentionally trivial — the load-bearing checks
// are the `// @ts-expect-error` directives that tsc enforces.

import { describe, it, expect } from 'vitest';
import { q } from './queryConstructors';
import type {
  Query,
  FaceMarker,
  EdgeMarker,
  VertexMarker,
  ConnectorMarker,
  PartMarker,
} from './query';

// Constructors return narrowed types.
const faceQ: Query<FaceMarker> = q.face();
const edgeQ: Query<EdgeMarker> = q.edge();
const vertexQ: Query<VertexMarker> = q.vertex();
const connectorQ: Query<ConnectorMarker> = q.connector();
const partQ: Query<PartMarker> = q.part();

// Cross-kind assignment is rejected.
// @ts-expect-error — Query<EdgeMarker> is not assignable to Query<FaceMarker>
const wrong1: Query<FaceMarker> = q.edge();

// @ts-expect-error — Query<FaceMarker> is not assignable to Query<EdgeMarker>
const wrong2: Query<EdgeMarker> = q.face();

// Set algebra preserves the marker — union<FaceMarker> stays FaceMarker.
const unioned: Query<FaceMarker> = q.union(q.face(), q.face());

// Heterogeneous union is rejected at the type level.
// @ts-expect-error — union<FaceMarker> does not accept Query<EdgeMarker>
const heteroUnion: Query<FaceMarker> = q.union(q.face(), q.edge());

// ownedByPart only accepts Query<PartMarker>.
const ownedFilter = q.ownedByPart(q.part());
// @ts-expect-error — ownedByPart does not accept Query<FaceMarker>
const badOwnedFilter = q.ownedByPart(q.face());

// .nth preserves the marker.
const firstFace: Query<FaceMarker> = q.face().nth(0);

// .asLenient preserves the marker.
const lenientFace: Query<FaceMarker> = q.face().asLenient();

// Mark used so tsc doesn't warn about unused locals.
void faceQ; void edgeQ; void vertexQ; void connectorQ; void partQ;
void unioned; void ownedFilter; void firstFace; void lenientFace;
void wrong1; void wrong2; void heteroUnion; void badOwnedFilter;

describe('Query type narrowing — compile-time gate', () => {
  it('produces narrowed Query<FaceMarker> from q.face() at runtime too', () => {
    // The static-narrowing assertions above are the load-bearing check.
    // This runtime probe exists so vitest discovers the file and so a
    // future refactor that drops the marker plumbing fails loudly here.
    const v = q.face();
    expect(v._kind).toBe('kc.query');
    expect(v.target).toBe('face');
  });
});
