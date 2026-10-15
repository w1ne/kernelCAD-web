// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// #953 post-merge: assertSingleSolid compared only face/edge counts, so loose
// geometry that reuses the solid's own faces/edges passed; and topology checks
// failed outright when the inertia axes were degenerate.
import { describe, expect, it, beforeAll, vi } from 'vitest';
import { makeBox, makeCompound, type Shape3D } from 'replicad';
import { initOcct, OcctBackend } from '../../kernel/backends/occt/occtBackend';
import { checkGeometryQuality } from './geometryQuality';

describe('checkGeometryQuality single-solid + inertia (#953)', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('rejects a solid accompanied by a loose copy of its own face or edge (counts unchanged)', () => {
    for (const pick of [(b: Shape3D) => b.faces[0], (b: Shape3D) => b.edges[0]]) {
      const box = makeBox([0, 0, 0], [10, 10, 10]);
      const loose = pick(box);
      const shape = new OcctBackend(makeCompound([box, loose as unknown as Shape3D]) as Shape3D);
      try {
        expect(() => checkGeometryQuality(shape, 'synthetic', { tiny_face_area_mm2: 0, short_edge_length_mm: 0 }))
          .toThrow(/no loose faces, shells or wires/);
      } finally { shape.dispose(); }
    }
  });

  it('still accepts a lone solid, bare or wrapped in a compound', () => {
    for (const make of [() => makeBox([0, 0, 0], [10, 10, 10]), () => makeCompound([makeBox([0, 0, 0], [10, 10, 10])])]) {
      const shape = new OcctBackend(make() as Shape3D);
      try { expect(checkGeometryQuality(shape, 'synthetic').counts.faces).toBe(6); }
      finally { shape.dispose(); }
    }
  });

  it('returns topology results when the principal inertia axes are degenerate', () => {
    const shape = new OcctBackend(makeBox([0, 0, 0], [10, 10, 10]) as Shape3D);
    const real = shape.massProperties.bind(shape);
    vi.spyOn(shape, 'massProperties').mockImplementation(() => ({
      ...real(), principalAxes: [[NaN, 0, 0], [0, 0, 0], [0, 0, 1]],
    }) as ReturnType<typeof real>);
    try {
      const r = checkGeometryQuality(shape, 'synthetic');
      expect(r.counts).toEqual({ faces: 6, edges: 12 });
      expect(r.tinyFaces).toEqual([]);
      expect(r.symmetry.planes.map(p => p.name)).toEqual(['XY', 'YZ', 'XZ']);
      expect(r.limitations.some(l => /inertia candidate planes were omitted/.test(l))).toBe(true);
    } finally { shape.dispose(); }
  });
});
