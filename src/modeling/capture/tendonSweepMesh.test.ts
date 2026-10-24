// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/captur./tendonSweepMesh.test.ts
//
// Swept ribbon mesh (`profile: { kind: 'flat' }`): buffer layout, normals, UVs,
// width, and that the swept centerline passes through the POSED via points
// after a joint pose change (end to end through meshFeaturesPerFeature).

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../kernel/backends/occt/occtBackend';
import { runScript } from '../runtime/runScript';
import { meshFeaturesPerFeature } from './featureMeshing';
import { buildRibbonMesh, SWEEP_SUBDIVISIONS, wrapArcPoints } from './tendonSweepMesh';
import type { Vec3 } from '../../shared/intent/types';

const straight = (): Vec3[] => [[0, 0, 0], [10, 0, 0], [20, 0, 0]];

describe('buildRibbonMesh', () => {
  it('lays out 8 vertices per section plus two 4-vertex caps', () => {
    const face = buildRibbonMesh({
      points: straight(), widthDirs: [[0, 1, 0], [0, 1, 0], [0, 1, 0]],
      widthMm: 4, thicknessMm: 1.2,
    })!;
    const sections = 2 * SWEEP_SUBDIVISIONS + 1;
    expect(face.vertices.length / 3).toBe(8 * sections + 8);
    expect(face.normals.length).toBe(face.vertices.length);
    expect(face.uv!.length / 2).toBe(face.vertices.length / 3);
    expect(face.indices.length).toBe((sections - 1) * 4 * 6 + 12);
    expect([...face.vertices, ...face.normals].every(Number.isFinite)).toBe(true);
  });

  it('is exactly strapWidthMm wide and thickness thick on a straight span', () => {
    const face = buildRibbonMesh({
      points: straight(), widthDirs: [[0, 1, 0], [0, 1, 0], [0, 1, 0]],
      widthMm: 4, thicknessMm: 1.2,
    })!;
    // Section 3: top face = vertices 0,1 (corners -w/+n and +w/+n); right face start = +w/+n.
    const v = (i: number): Vec3 => [face.vertices[i * 3], face.vertices[i * 3 + 1], face.vertices[i * 3 + 2]];
    const base = 3 * 8;
    const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    expect(dist(v(base), v(base + 1))).toBeCloseTo(4, 5);
    expect(dist(v(base + 2), v(base + 3))).toBeCloseTo(1.2, 5); // right face: +n -> -n
    // Width follows the requested axis (Y), thickness is the remaining normal (Z).
    expect(Math.abs(v(base)[1] - v(base + 1)[1])).toBeCloseTo(4, 5);
  });

  it('emits unit outward normals and u = arc length / period, v in 0..1', () => {
    const face = buildRibbonMesh({
      points: straight(), widthDirs: [[0, 1, 0], [0, 1, 0], [0, 1, 0]],
      widthMm: 4, thicknessMm: 1,
    })!;
    for (let i = 0; i < face.normals.length; i += 3) {
      expect(Math.hypot(face.normals[i], face.normals[i + 1], face.normals[i + 2])).toBeCloseTo(1, 5);
    }
    // Every triangle winds counter-clockwise about its (vertex) normal.
    for (let t = 0; t < face.indices.length; t += 3) {
      const [a, b, c] = [face.indices[t], face.indices[t + 1], face.indices[t + 2]];
      const p = (i: number): Vec3 => [face.vertices[i * 3], face.vertices[i * 3 + 1], face.vertices[i * 3 + 2]];
      const e1 = [p(b)[0] - p(a)[0], p(b)[1] - p(a)[1], p(b)[2] - p(a)[2]];
      const e2 = [p(c)[0] - p(a)[0], p(c)[1] - p(a)[1], p(c)[2] - p(a)[2]];
      const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
      const dot = n[0] * face.normals[a * 3] + n[1] * face.normals[a * 3 + 1] + n[2] * face.normals[a * 3 + 2];
      expect(dot).toBeGreaterThan(0);
    }
    const us = Array.from({ length: face.uv!.length / 2 }, (_, i) => face.uv![i * 2]);
    const vs = Array.from({ length: face.uv!.length / 2 }, (_, i) => face.uv![i * 2 + 1]);
    expect(Math.min(...vs)).toBe(0);
    expect(Math.max(...vs)).toBe(1);
    expect(Math.min(...us)).toBe(0);
    expect(Math.max(...us)).toBeCloseTo(20 / 4, 4); // 20 mm of arc / 4 mm width
  });

  it('keeps a stable frame when the width axis is parallel to the tangent', () => {
    const face = buildRibbonMesh({
      points: straight(), widthDirs: [[1, 0, 0], [1, 0, 0], [1, 0, 0]],
      widthMm: 4, thicknessMm: 1,
    })!;
    expect([...face.vertices, ...face.normals].every(Number.isFinite)).toBe(true);
  });

  it('returns null for degenerate input', () => {
    expect(buildRibbonMesh({ points: [[0, 0, 0], [0, 0, 0]], widthDirs: [[0, 1, 0], [0, 1, 0]], widthMm: 4, thicknessMm: 1 })).toBeNull();
    expect(buildRibbonMesh({ points: straight(), widthDirs: straight(), widthMm: 0, thicknessMm: 1 })).toBeNull();
  });
});

const FLAT_OPTS = `profile: { kind: 'flat', widthMm: 5, thicknessMm: 1.2 },
    material: { baseColor: '#e8dfc8', textures: { albedo: { path: 'data:image/png;base64,AAAA' } } },`;

const POSED_STRAP = (poseDeg: number, tendonOpts = FLAT_OPTS) => `
  const arm = assembly('strap-pose');
  const axis = { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 1, 0] };
  const pt = (x, z) => ({ type: 'frame', origin: { kind: 'vec3', value: [x, 0, z] } });
  arm.part('palm', box(20, 20, 20, true).translate(-10, 0, 0)).connector('h', axis).connector('in', pt(-15, -8));
  arm.part('link', box(60, 10, 10, true).translate(30, 0, 0)).connector('h', axis).connector('loop', pt(30, -8)).connector('tip', pt(55, -8));
  arm.mate('j', 'palm.h', 'link.h', 'revolute', { pose: ${poseDeg}, limitsDeg: [0, 90] });
  arm.tendon('strap', {
    from: 'palm.in', via: ['link.loop'], to: 'link.tip', actuator: { kind: 'force', maxForceN: 10 },
    ${tendonOpts}
  });
  return arm.solvedModel({});
`;

describe('flat-profile tendon through meshFeaturesPerFeature', () => {
  beforeAll(async () => { await initOcct(); });

  async function strapFace(poseDeg: number, tendonOpts?: string) {
    const { records, paramTable, session } = await runScript({ code: POSED_STRAP(poseDeg, tendonOpts), fileName: 'strap.kcad.ts' });
    const assembly = records[records.length - 1];
    const { features } = await meshFeaturesPerFeature(records, paramTable, session);
    const mesh = features.find((f) => f.assemblyFeatureId === assembly.id && f.assemblyPartName === '__tendon__strap')!;
    return mesh;
  }

  /** Centroid of a section's 8 ring vertices == the centerline point. */
  const sectionCenter = (vertices: Float32Array, k: number): Vec3 => {
    const c: Vec3 = [0, 0, 0];
    for (let i = 0; i < 8; i++) for (let a = 0; a < 3; a++) c[a] += vertices[(k * 8 + i) * 3 + a] / 8;
    return c;
  };

  it('carries the material, texture and UVs to the render player', async () => {
    const mesh = await strapFace(0);
    expect(mesh.material).toMatchObject({
      baseColor: '#e8dfc8',
      textures: { albedo: { path: 'data:image/png;base64,AAAA' } },
    });
    expect(mesh.faces[0].uv).toBeDefined();
  });

  it('passes through the posed via point after a joint pose change', async () => {
    for (const deg of [0, 40]) {
      const mesh = await strapFace(deg);
      const r = (deg * Math.PI) / 180;
      const expected: Vec3 = [30 * Math.cos(r) + -8 * Math.sin(r), 0, -30 * Math.sin(r) + -8 * Math.cos(r)];
      // Control points: from (0), via (1), to (2); Catmull-Rom keeps them at k = i * SWEEP_SUBDIVISIONS.
      const c = sectionCenter(mesh.faces[0].vertices, SWEEP_SUBDIVISIONS);
      expect(c[0]).toBeCloseTo(expected[0], 3);
      expect(c[1]).toBeCloseTo(0, 3);
      expect(c[2]).toBeCloseTo(expected[2], 3);
    }
  });

  it('sweeps a round tube through a routed line tendon and a round profile', async () => {
    const routedLine = await strapFace(0, '');
    const round = await strapFace(0, "profile: { kind: 'round', diameterMm: 2 },");
    for (const mesh of [routedLine, round]) {
      const face = mesh.faces[0];
      // 8 radial vertices per ring, smoothed route: (2 spans * 6) + 1 rings.
      expect(face.vertices.length / 3).toBe(8 * (2 * SWEEP_SUBDIVISIONS + 1));
      expect(face.uv!.length / 2).toBe(face.vertices.length / 3);
    }
  });
});

describe('wrapArcPoints', () => {
  const cyl = { center: [0, 0, 0] as [number, number, number], axis: [0, 1, 0] as [number, number, number], radiusMm: 5 };
  const radial = (p: readonly number[]) => Math.hypot(p[0], p[2]);

  it('keeps a cable straight when the segment misses the cylinder', () => {
    expect(wrapArcPoints([-10, 0, 8], [10, 0, 8], cyl)).toEqual([]);
  });

  it('wraps over the side the straight segment passes, on the cylinder surface', () => {
    const pts = wrapArcPoints([-10, 0, 2], [10, 0, 2], cyl);
    expect(pts.length).toBeGreaterThan(2);
    for (const p of pts) {
      expect(radial(p)).toBeCloseTo(5, 6);
      expect(p[2]).toBeGreaterThan(0);
    }
    // tangent from prev: (p - prev) is perpendicular to the radius at p
    const [t0] = pts;
    const d = [t0[0] + 10, t0[2] - 2];
    expect(d[0] * t0[0] + d[1] * t0[2]).toBeCloseTo(0, 6);
  });

  it('wraps on the sidesite side even when the segment passes the other way', () => {
    const pts = wrapArcPoints([-10, 0, 2], [10, 0, 2], { ...cyl, side: [0, 0, -10] });
    expect(pts.length).toBeGreaterThan(2);
    for (const p of pts) expect(p[2]).toBeLessThan(0.001);
  });

  it('interpolates the height along the axis between the neighbours', () => {
    const pts = wrapArcPoints([-10, -4, 2], [10, 4, 2], cyl);
    expect(pts[0][1]).toBeGreaterThan(-4);
    expect(pts[pts.length - 1][1]).toBeLessThan(4);
    expect(pts[pts.length - 1][1]).toBeGreaterThan(pts[0][1]);
  });
});
