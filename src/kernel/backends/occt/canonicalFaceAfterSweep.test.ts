// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/canonicalFaceAfterSweep.test.ts
//
// Regression: canonical face names ('top'/'bottom') on a swept/lofted/revolved
// solid (no primitive `kind`, no lineage `historyMap`) used to fail with a
// misleading 'requires an un-transformed primitive — apply transforms after the
// feature' error. They now resolve by GEOMETRY for cylinder-topology solids,
// and emit a clear, actionable diagnostic when they cannot.

import { describe, it, expect, beforeAll } from 'vitest';
import * as replicad from 'replicad';
import { initOcct, OcctBackend } from './occtBackend';
import { pickFace, pickEdges } from './edgeSelection';
import { resolveCanonicalByGeometry } from './canonicalFaceGeometry';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import type { CanonicalFace } from '../../../shared/intent/types';

beforeAll(async () => {
  await initOcct();
});

/** A solid cylinder built by SWEEPING a circle profile along a vertical rail.
 *  The result has no primitive `kind` and no `historyMap` — exactly the
 *  topology of an agent's swept/lofted wheel: two PLANE caps (z=0, z=h) plus
 *  a curved (CYLINDRE) lateral wall. */
function sweptCylinder(r = 5, h = 10): OcctBackend {
  const sketch = OcctBackend.fromDrawing(replicad.drawCircle(r));
  return OcctBackend.sweepFromSketch(sketch, [
    [0, 0, 0],
    [0, 0, h],
  ]);
}

function canonicalFaceRecord(face: CanonicalFace): FeatureRecord {
  return {
    id: 'fillet-1',
    kind: 'fillet',
    params: {},
    inputs: {
      parent: { kind: 'feature', id: 'parent-0' },
      face: {
        kind: 'face',
        featureId: 'parent-0',
        ref: { kind: 'canonical', face },
      },
    },
    transforms: [],
    suppressed: false,
    metadata: {},
  } as unknown as FeatureRecord;
}

describe('resolveCanonicalByGeometry (unit)', () => {
  it('resolves top/bottom on a revolved cylinder by geometry', () => {
    const cyl = sweptCylinder(5, 10);
    expect(cyl.kind).toBeUndefined();
    expect(cyl.historyMap).toBeUndefined();
    const shape = cyl.getReplicadShape();

    const top = resolveCanonicalByGeometry(shape, 'top');
    expect(top.kind).toBe('resolved');
    if (top.kind === 'resolved') expect(top.face.center.z).toBeCloseTo(10, 2);

    const bottom = resolveCanonicalByGeometry(shape, 'bottom');
    expect(bottom.kind).toBe('resolved');
    if (bottom.kind === 'resolved')
      expect(bottom.face.center.z).toBeCloseTo(0, 2);
  });

  it('reports not-a-cap for left/right on a Z-axis cylinder', () => {
    const cyl = sweptCylinder();
    const res = resolveCanonicalByGeometry(cyl.getReplicadShape(), 'left');
    expect(res.kind).toBe('not-a-cap');
    if (res.kind === 'not-a-cap') expect(res.capAxisLabel).toBe('top/bottom');
  });

  it('reports no-canonical-faces for a sphere (no planar caps)', () => {
    const sphere = OcctBackend.sphere(5);
    const res = resolveCanonicalByGeometry(sphere.getReplicadShape(), 'top');
    expect(res.kind).toBe('no-canonical-faces');
  });
});

describe('pickFace / pickEdges on a swept solid (canonical refs)', () => {
  it('pickFace resolves a canonical top face on a revolved cylinder', () => {
    const cyl = sweptCylinder(5, 10);
    const result = pickFace(canonicalFaceRecord('top'), cyl, undefined);
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.center.z).toBeCloseTo(10, 2);
    }
  });

  it('pickEdges resolves canonical bottom-face edges on a revolved cylinder', () => {
    const cyl = sweptCylinder(5, 10);
    const result = pickEdges(canonicalFaceRecord('bottom'), cyl, undefined);
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    }
  });

  it('emits a clear, actionable diagnostic for a non-cap canonical name', () => {
    const cyl = sweptCylinder(5, 10);
    const result = pickFace(canonicalFaceRecord('left'), cyl, undefined);
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error.code).toBe('feature.face-ref.not-applicable');
      // The message must NOT send the agent chasing a phantom transform.
      expect(result.error.message).not.toMatch(/un-transformed primitive/i);
      expect(result.error.hint).toMatch(/kc\.q\.face|list_faces/);
    }
  });
});
