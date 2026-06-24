// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';
import { buildNurbsFace } from '../../../../src/kernel/backends/occt/nurbsSurfaceLowerer';
import { lowerSurfaceSew } from '../../../../src/modeling/backends/occt/surfaceSewLowerer';
import { CaptureSession } from '../../../../src/modeling/capture/captureSession';
import { createApi } from '../../../../src/modeling/api';
import { RecomputeEngine } from '../../../../src/modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../../../src/modeling/backends/occt/occtLowerer';
import type * as replicad from 'replicad';

/**
 * Build a single planar bilinear face from four corner points (CCW). Each
 * corner is a control point of a degree-1×1 NURBS patch — a flat quad.
 */
function quadFace(
  a: [number, number, number],
  b: [number, number, number],
  c: [number, number, number],
  d: [number, number, number],
): replicad.Face {
  // 2x2 control net: rows = u, cols = v. Order so the patch is the quad a-b-c-d.
  return buildNurbsFace({
    controls: [
      [a, d],
      [b, c],
    ],
    degree: { u: 1, v: 1 },
  });
}

/**
 * The six faces of a unit cube spanning [0,1]^3, each a planar quad. Sewn
 * together they form a watertight (closed) shell that can be solidified.
 */
function unitCubeFaces(): replicad.Face[] {
  const p = (x: number, y: number, z: number): [number, number, number] => [x, y, z];
  return [
    // bottom z=0
    quadFace(p(0, 0, 0), p(1, 0, 0), p(1, 1, 0), p(0, 1, 0)),
    // top z=1
    quadFace(p(0, 0, 1), p(1, 0, 1), p(1, 1, 1), p(0, 1, 1)),
    // front y=0
    quadFace(p(0, 0, 0), p(1, 0, 0), p(1, 0, 1), p(0, 0, 1)),
    // back y=1
    quadFace(p(0, 1, 0), p(1, 1, 0), p(1, 1, 1), p(0, 1, 1)),
    // left x=0
    quadFace(p(0, 0, 0), p(0, 1, 0), p(0, 1, 1), p(0, 0, 1)),
    // right x=1
    quadFace(p(1, 0, 0), p(1, 1, 0), p(1, 1, 1), p(1, 0, 1)),
  ];
}

describe('lowerSurfaceSew', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it('sews the six faces of a unit cube into a closed solid', () => {
    const faces = unitCubeFaces();
    const result = lowerSurfaceSew(faces, { tolerance: 1e-6, requireClosed: true });
    expect(result.isClosed).toBe(true);
    expect(result.isSolid).toBe(true);
    // A unit cube has volume 1.
    expect(result.backend.volume()).toBeCloseTo(1, 2);
  });

  it('reports an open shell when a face is missing (5 of 6)', () => {
    const faces = unitCubeFaces().slice(0, 5);
    const result = lowerSurfaceSew(faces, { tolerance: 1e-6, requireClosed: true });
    expect(result.isClosed).toBe(false);
    expect(result.isSolid).toBe(false);
  });

  it('end-to-end: sew(...) with requireClosed builds a closed solid through the dispatch arm', async () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const p = (x: number, y: number, z: number): [number, number, number] => [x, y, z];
    const mk = (
      a: [number, number, number],
      b: [number, number, number],
      c: [number, number, number],
      d: [number, number, number],
    ) => api.nurbsSurface({ controls: [[a, d], [b, c]], degree: { u: 1, v: 1 } });
    const surfaces = [
      mk(p(0, 0, 0), p(1, 0, 0), p(1, 1, 0), p(0, 1, 0)),
      mk(p(0, 0, 1), p(1, 0, 1), p(1, 1, 1), p(0, 1, 1)),
      mk(p(0, 0, 0), p(1, 0, 0), p(1, 0, 1), p(0, 0, 1)),
      mk(p(0, 1, 0), p(1, 1, 0), p(1, 1, 1), p(0, 1, 1)),
      mk(p(0, 0, 0), p(0, 1, 0), p(0, 1, 1), p(0, 0, 1)),
      mk(p(1, 0, 0), p(1, 1, 0), p(1, 1, 1), p(1, 0, 1)),
    ];
    api.sew(surfaces, { requireClosed: true });

    const engine = new RecomputeEngine(createOcctLowerer(session));
    const r = await engine.run(session.getRecords());
    // No open-shell diagnostic for a watertight cube.
    expect(
      r.diagnostics.some((d) => d.code === 'feature.surface-sew.open-shell'),
    ).toBe(false);
  });

  it('emits feature.surface-sew.open-shell through the dispatch arm when requireClosed and the shell is open', async () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const p = (x: number, y: number, z: number): [number, number, number] => [x, y, z];
    const mk = (
      a: [number, number, number],
      b: [number, number, number],
      c: [number, number, number],
      d: [number, number, number],
    ) => api.nurbsSurface({ controls: [[a, d], [b, c]], degree: { u: 1, v: 1 } });
    // Only 5 faces — the top is missing, so the shell is open.
    const surfaces = [
      mk(p(0, 0, 0), p(1, 0, 0), p(1, 1, 0), p(0, 1, 0)),
      mk(p(0, 0, 0), p(1, 0, 0), p(1, 0, 1), p(0, 0, 1)),
      mk(p(0, 1, 0), p(1, 1, 0), p(1, 1, 1), p(0, 1, 1)),
      mk(p(0, 0, 0), p(0, 1, 0), p(0, 1, 1), p(0, 0, 1)),
      mk(p(1, 0, 0), p(1, 1, 0), p(1, 1, 1), p(1, 0, 1)),
    ];
    api.sew(surfaces, { requireClosed: true });

    const engine = new RecomputeEngine(createOcctLowerer(session));
    const r = await engine.run(session.getRecords());
    expect(
      r.diagnostics.some(
        (d) => d.code === 'feature.surface-sew.open-shell' && d.severity === 'error',
      ),
    ).toBe(true);
  });

  it('does NOT emit open-shell when requireClosed is false even if the shell is open', async () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const p = (x: number, y: number, z: number): [number, number, number] => [x, y, z];
    const mk = (
      a: [number, number, number],
      b: [number, number, number],
      c: [number, number, number],
      d: [number, number, number],
    ) => api.nurbsSurface({ controls: [[a, d], [b, c]], degree: { u: 1, v: 1 } });
    const surfaces = [
      mk(p(0, 0, 0), p(1, 0, 0), p(1, 1, 0), p(0, 1, 0)),
      mk(p(0, 0, 0), p(1, 0, 0), p(1, 0, 1), p(0, 0, 1)),
    ];
    api.sew(surfaces, { requireClosed: false });

    const engine = new RecomputeEngine(createOcctLowerer(session));
    const r = await engine.run(session.getRecords());
    expect(
      r.diagnostics.some((d) => d.code === 'feature.surface-sew.open-shell'),
    ).toBe(false);
  });
});
