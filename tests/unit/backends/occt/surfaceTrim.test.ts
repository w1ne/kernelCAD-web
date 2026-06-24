// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';
import { buildNurbsFace } from '../../../../src/kernel/backends/occt/nurbsSurfaceLowerer';
import {
  lowerSurfaceTrim,
  faceArea,
} from '../../../../src/modeling/backends/occt/surfaceTrimLowerer';
import { CaptureSession } from '../../../../src/modeling/capture/captureSession';
import { createApi } from '../../../../src/modeling/api';
import { RecomputeEngine } from '../../../../src/modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../../../src/modeling/backends/occt/occtLowerer';
import type * as replicad from 'replicad';

/** A 2×2 axis-aligned planar patch in the z=0 plane, area 4, spanning [0,2]×[0,2]. */
function unitPlanarPatch(): replicad.Face {
  return buildNurbsFace({
    controls: [
      [[0, 0, 0], [0, 2, 0]],
      [[2, 0, 0], [2, 2, 0]],
    ],
    degree: { u: 1, v: 1 },
  });
}

/**
 * A vertical planar patch crossing the base at x=1, spanning y∈[-1,3], z∈[-1,1].
 * Well-conditioned: clean axis-aligned crossing through the middle of the base.
 */
function crossingPatchHalving(): replicad.Face {
  return buildNurbsFace({
    controls: [
      [[1, -1, -1], [1, 3, -1]],
      [[1, -1, 1], [1, 3, 1]],
    ],
    degree: { u: 1, v: 1 },
  });
}

/**
 * A genuinely curved (non-planar) patch: a 3×3 degree-2 control net whose
 * middle row/column is lifted in +z, so the surface normal swings far across
 * the UV domain. The slab-trim path would silently mis-trim this — the guard
 * must refuse.
 */
function curvedPatch(): replicad.Face {
  return buildNurbsFace({
    controls: [
      [[0, 0, 0], [0, 1, 0], [0, 2, 0]],
      [[1, 0, 2], [1, 1, 2], [1, 2, 2]],
      [[2, 0, 0], [2, 1, 0], [2, 2, 0]],
    ],
    degree: { u: 2, v: 2 },
  });
}

describe('lowerSurfaceTrim', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it('trims a planar patch by a crossing patch, shrinking its area', () => {
    const base = unitPlanarPatch();
    expect(faceArea(base)).toBeCloseTo(4, 6);

    const { face } = lowerSurfaceTrim(base, crossingPatchHalving(), 'trim');

    const trimmedArea = faceArea(face);
    // The crossing at x=1 halves the 2×2 patch (area 4) right down the middle,
    // so the kept piece is the [1,2]×[0,2] half — area ≈ 2. Pin the actual
    // halving, not just "smaller than 4".
    expect(trimmedArea).toBeCloseTo(2, 1);
  });

  it('still produces a face (composable into sew) — outerWire is non-empty', () => {
    const base = unitPlanarPatch();
    const { face } = lowerSurfaceTrim(base, crossingPatchHalving(), 'trim');
    // A first-class Face has an outer wire we can read back.
    expect(face.outerWire()).toBeTruthy();
  });

  it('composes end-to-end: nurbsSurface().trimTo(cutter).toShape() resolves to a trimmed shell', async () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const base = api.nurbsSurface({
      controls: [
        [[0, 0, 0], [0, 2, 0]],
        [[2, 0, 0], [2, 2, 0]],
      ],
      degree: { u: 1, v: 1 },
    });
    const cutter = api.nurbsSurface({
      controls: [
        [[1, -1, -1], [1, 3, -1]],
        [[1, -1, 1], [1, 3, 1]],
      ],
      degree: { u: 1, v: 1 },
    });
    const shape = base.trimTo(cutter).toShape();
    const backend = await shape.lower();
    // The surviving shell's surface area is the trimmed half (≈2), not the full
    // 2×2 patch (4). (Bounding box is unreliable here: the shell's tessellation
    // can still span the untrimmed surface UV bounds — area is the real
    // invariant that proves the dispatch arm trimmed the geometry.)
    const area = faceArea(
      (backend.getReplicadShape() as unknown as { faces: replicad.Face[] }).faces[0],
    );
    // Halved at x=1 → the surviving shell is the [1,2]×[0,2] piece, area ≈ 2.
    expect(area).toBeCloseTo(2, 1);
  });

  it('throws when the surfaces do not intersect', () => {
    const base = unitPlanarPatch();
    // A parallel patch well above the base — no section.
    const disjoint = buildNurbsFace({
      controls: [
        [[0, 0, 10], [0, 2, 10]],
        [[2, 0, 10], [2, 2, 10]],
      ],
      degree: { u: 1, v: 1 },
    });
    expect(() => lowerSurfaceTrim(base, disjoint, 'trim')).toThrow();
  });

  it('trims a curved base by imprinting the section curve instead of refusing non-planar input', () => {
    const cutter = crossingPatchHalving();
    const base = curvedPatch();
    const baseArea = faceArea(base);

    const { face } = lowerSurfaceTrim(base, cutter, 'trim');

    const trimmedArea = faceArea(face);
    expect(trimmedArea).toBeGreaterThan(0.1);
    expect(trimmedArea).toBeLessThan(baseArea - 0.1);
    expect(face.outerWire()).toBeTruthy();
  });

  it('returns both valid halves for split, with area conserved against the curved base', () => {
    const base = curvedPatch();
    const cutter = crossingPatchHalving();
    const baseArea = faceArea(base);

    const first = lowerSurfaceTrim(base, cutter, 'split', 0).face;
    const second = lowerSurfaceTrim(base, cutter, 'split', 1).face;
    const areaA = faceArea(first);
    const areaB = faceArea(second);

    expect(areaA).toBeGreaterThan(0.1);
    expect(areaB).toBeGreaterThan(0.1);
    expect(first.outerWire()).toBeTruthy();
    expect(second.outerWire()).toBeTruthy();
    expect(Math.abs(areaA + areaB - baseArea)).toBeLessThan(0.25);
  });

  it('lowers a curved trim through the dispatch arm without feature.surface-trim.non-planar', async () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const base = api.nurbsSurface({
      controls: [
        [[0, 0, 0], [0, 1, 0], [0, 2, 0]],
        [[1, 0, 2], [1, 1, 2], [1, 2, 2]],
        [[2, 0, 0], [2, 1, 0], [2, 2, 0]],
      ],
      degree: { u: 2, v: 2 },
    });
    const cutter = api.nurbsSurface({
      controls: [
        [[1, -1, -1], [1, 3, -1]],
        [[1, -1, 1], [1, 3, 1]],
      ],
      degree: { u: 1, v: 1 },
    });
    // Force the surfaceTrim record to be demanded by wiring it into a returned shape.
    base.trimTo(cutter).toShape();

    const engine = new RecomputeEngine(createOcctLowerer(session));
    const r = await engine.run(session.getRecords());
    expect(
      r.diagnostics.some((d) => d.code === 'feature.surface-trim.non-planar'),
    ).toBe(false);
  });

  it('lowers both split halves through the dispatch arm without split-deferred warning', async () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const base = api.nurbsSurface({
      controls: [
        [[0, 0, 0], [0, 2, 0]],
        [[2, 0, 0], [2, 2, 0]],
      ],
      degree: { u: 1, v: 1 },
    });
    const cutter = api.nurbsSurface({
      controls: [
        [[1, -1, -1], [1, 3, -1]],
        [[1, -1, 1], [1, 3, 1]],
      ],
      degree: { u: 1, v: 1 },
    });
    const [left, right] = base.split(cutter);
    left.toShape();
    right.toShape();

    const engine = new RecomputeEngine(createOcctLowerer(session));
    const r = await engine.run(session.getRecords());
    expect(
      r.diagnostics.some(
        (d) => d.code === 'feature.surface-trim.split-deferred',
      ),
    ).toBe(false);
  });
});
