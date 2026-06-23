// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';
import { buildNurbsFace } from '../../../../src/kernel/backends/occt/nurbsSurfaceLowerer';
import { lowerSurfaceTrim, faceArea } from '../../../../src/modeling/backends/occt/surfaceTrimLowerer';
import { CaptureSession } from '../../../../src/modeling/capture/captureSession';
import { createApi } from '../../../../src/modeling/api';
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

describe('lowerSurfaceTrim', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it('trims a planar patch by a crossing patch, shrinking its area', () => {
    const base = unitPlanarPatch();
    expect(faceArea(base)).toBeCloseTo(4, 6);

    const { face } = lowerSurfaceTrim(base, crossingPatchHalving(), 'trim');

    const trimmedArea = faceArea(face);
    // The crossing halves the patch; trim keeps the larger surviving piece,
    // which is strictly smaller than the original 2×2 patch.
    expect(trimmedArea).toBeLessThan(4 - 1e-3);
    expect(trimmedArea).toBeGreaterThan(0);
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
    expect(area).toBeLessThan(4 - 1e-3);
    expect(area).toBeGreaterThan(0);
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
});
