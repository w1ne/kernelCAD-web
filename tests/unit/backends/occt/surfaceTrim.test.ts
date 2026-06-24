// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';
import { buildNurbsFace } from '../../../../src/kernel/backends/occt/nurbsSurfaceLowerer';
import {
  lowerSurfaceTrim,
  faceArea,
  NonPlanarTrimError,
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

  it('refuses to trim a curved (non-planar) base — guard fires, no silent mis-trim', () => {
    const cutter = crossingPatchHalving();
    // The planar slab path would happily produce SOME area here (wrong).
    // The near-planar guard must reject instead.
    expect(() => lowerSurfaceTrim(curvedPatch(), cutter, 'trim')).toThrow(NonPlanarTrimError);
  });

  it('refuses to trim by a curved (non-planar) cutter', () => {
    const base = unitPlanarPatch();
    expect(() => lowerSurfaceTrim(base, curvedPatch(), 'trim')).toThrow(NonPlanarTrimError);
  });

  it('emits feature.surface-trim.non-planar through the dispatch arm for a curved base', async () => {
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
      r.diagnostics.some(
        (d) => d.code === 'feature.surface-trim.non-planar' && d.severity === 'error',
      ),
    ).toBe(true);
  });

  it('emits feature.surface-trim.split-deferred (warning) for the split op', async () => {
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
    base.split(cutter).toShape();

    const engine = new RecomputeEngine(createOcctLowerer(session));
    const r = await engine.run(session.getRecords());
    expect(
      r.diagnostics.some(
        (d) => d.code === 'feature.surface-trim.split-deferred' && d.severity === 'warn',
      ),
    ).toBe(true);
  });
});
