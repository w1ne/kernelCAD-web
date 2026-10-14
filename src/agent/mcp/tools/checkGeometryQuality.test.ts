// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';
import { checkGeometryQualityTool, type CheckGeometryQualityInput } from './checkGeometryQuality';
import { verifyTool } from './verify';
import { makeBox, makeCompound, makePolygon, type Shape3D } from 'replicad';
import { initOcct, OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import { checkGeometryQuality } from '../../../modeling/runtime/geometryQuality';

const bracket = 'box(40,20,4,true).union(box(40,4,20,true).translate(0,8,8))';
const disabled = { tiny_face_area_mm2: 0, short_edge_length_mm: 0 };
async function measured(input: CheckGeometryQualityInput) {
  const result = await checkGeometryQualityTool(input);
  if ('error' in result) throw new Error(result.error);
  return result;
}
describe('geometry-quality BREP and sampled mirror checks', () => {
  it('rejects an actual face compound and disconnected solids at the runtime boundary', async () => {
    await initOcct();
    const face = makePolygon([[0,0,0],[10,0,0],[10,10,0],[0,10,0]]);
    const a = makeBox([0,0,0],[10,10,10]);
    const b = makeBox([20,0,0],[30,10,10]);
    for (const compound of [makeCompound([face]), makeCompound([a,b])]) {
      const shape = new OcctBackend(compound as Shape3D);
      try { expect(() => checkGeometryQuality(shape, 'synthetic')).toThrow(/exactly one solid/); }
      finally { shape.dispose(); }
    }
    // Replicad makeCompound consumes its input wrappers; the backend owns the result.
  });
  it('reports sphere pole parameterization edges separately from physical short edges', async () => {
    const r = await measured({ code: 'return sphere(10);' });
    expect(r.ok).toBe(true);
    expect(r.shortEdges).toEqual([]);
    expect(r.degenerateEdges).toHaveLength(2);
    expect(r.degenerateEdges.every(e => e.id === `e${e.index}`)).toBe(true);
    expect(r.symmetry.planes.filter(p => ['XY','YZ','XZ'].includes(p.name)).every(p => p.passed)).toBe(true);
  });
  it('finds a sliver face and short edge created by a tiny step, with ids and locations', async () => {
    const r = await measured({ code: 'return box(20,10,5).union(box(0.01,2,0.01).translate(20,4,4.99));' });
    expect(r.ok).toBe(false);
    expect(r.tinyFaces.length).toBeGreaterThan(0);
    expect(r.tinyFaces.some(f => Math.abs(f.areaMm2 - 0.0001) < 1e-7)).toBe(true);
    expect(r.shortEdges.some(e => Math.abs(e.lengthMm - 0.01) < 1e-7)).toBe(true);
    for (const f of r.tinyFaces) {
      expect(f.id).toBe(`f${f.index}`);
      expect(f.location).toHaveLength(3);
      expect(f.location.every(Number.isFinite)).toBe(true);
      expect(f.areaMm2).toBeLessThan(r.thresholds.tinyFaceAreaMm2);
    }
    expect(new Set(r.shortEdges.map(e => e.id)).size).toBe(r.shortEdges.length);
    expect(r.shortEdges.every(e => e.location.every(Number.isFinite))).toBe(true);
  });
  it('uses a relative fraction of total BREP area, ORed with the absolute threshold', async () => {
    const r = await measured({ code: 'return box(10,10,0.01);', ...disabled, tiny_face_relative: 0.001 });
    expect(r.thresholds.tinyFaceAreaMm2).toBeCloseTo(0.2004, 8);
    expect(r.tinyFaces).toHaveLength(4);
  });
  it('uses strict below-threshold comparisons and zero to disable topology checks', async () => {
    // Use the measured BREP area: quadrature reports 99.99999999999999, not 100.
    const baseline = await measured({ code: 'return box(10,10,10);', ...disabled });
    const r = await measured({ code: 'return box(10,10,10);', tiny_face_area_mm2: baseline.thresholds.surfaceAreaMm2 / 6, short_edge_length_mm: 10 });
    expect(r.ok).toBe(true);
    expect(r.tinyFaces).toEqual([]);
    expect(r.shortEdges).toEqual([]);
  });
  it('detects the bracket YZ plane and reports bounded deviation and witnesses', async () => {
    const r = await measured({ code: `return ${bracket};`, ...disabled });
    expect(r.ok).toBe(true);
    expect(r.symmetry.planes).toHaveLength(6);
    const yz = r.symmetry.planes.find(p => p.name === 'YZ')!;
    expect(yz.passed).toBe(true);
    expect(yz.maxDeviationMm).toBeLessThan(1e-6);
    expect(yz.sampleCount).toBeGreaterThan(10);
    expect(yz.worst.source).toHaveLength(3);
    expect(yz.worst.closest).toHaveLength(3);
    expect(r.symmetry.matchingPlanes).toContain('YZ');
    expect(r.symmetry.method).toBe('sampled-mesh-reflection');
  });
  it('fails a user-asserted symmetry plane for an asymmetric bracket without requiring all candidates', async () => {
    const code = `return ${bracket}.subtract(box(4,6,6,true).translate(12,-7,0));`;
    const input = { code, ...disabled };
    expect((await measured(input)).ok).toBe(true); // discovery alone imposes no symmetry requirement
    const r = await measured({ ...input, asserted_plane: { origin: [0,0,0], normal: [10,0,0] } });
    expect(r.ok).toBe(false);
    const plane = r.symmetry.planes.find(p => p.name === 'asserted')!;
    expect(plane.normal).toEqual([1,0,0]);
    expect(plane.passed).toBe(false);
    expect(plane.maxDeviationMm).toBeGreaterThan(0.5);
  });
  it('finds rotated principal-axis symmetry through the translated centroid', async () => {
    const r = await measured({ code: 'return box(30,16,6,true).rotate([0,0,1],33).translate(17,-9,4);', ...disabled });
    const inertia = r.symmetry.planes.filter(p => p.name.startsWith('inertia-'));
    expect(inertia).toHaveLength(3);
    expect(inertia.every(p => p.passed)).toBe(true);
    inertia[0].origin.forEach((n,i) => expect(n).toBeCloseTo([17,-9,4][i], 6));
    expect(r.symmetry.planes.find(p => p.name === 'YZ')!.passed).toBe(false);
  });
  it('honors the script return instead of measuring a subsequently created helper', async () => {
    const r = await measured({ code: 'const body=box(10,10,10); box(0.01,0.01,0.01); return body;' });
    expect(r.ok).toBe(true);
    expect(r.counts.faces).toBe(6);
    expect(r.thresholds.surfaceAreaMm2).toBeCloseTo(600, 8);
  });
  it('supports explicit feature_id and the real verify router', async () => {
    const r = await verifyTool({ check: 'geometry-quality', code: 'return box(10,10,10);', ...disabled });
    expect(r).toMatchObject({ ok: true, source: 'local', counts: { faces: 6, edges: 12 } });
    const root = await measured({ code: 'return box(10,10,10);' });
    expect((await measured({ code: 'return box(10,10,10);', feature_id: root.featureId })).ok).toBe(true);
    expect(await checkGeometryQualityTool({ code: 'return box(10,10,10);', feature_id: 'missing' })).toMatchObject({ ok: false, error: expect.stringMatching(/missing/) });
  });
  it.each([
    { tiny_face_area_mm2: -1 }, { short_edge_length_mm: NaN }, { tiny_face_relative: 2 },
    { symmetry_tolerance_mm: 0 }, { symmetry_tolerance_mm: Infinity },
    { mesh_deflection_mm: 1 }, { asserted_plane: { origin: [0,0,0], normal: [0,0,0] } },
    { asserted_plane: { origin: [NaN,0,0], normal: [1,0,0] } },
    { tiny_face_area_mm2: '0.1' }, { asserted_plane: null },
  ])('rejects malformed options before evaluation: %j', async options => {
    expect(await checkGeometryQualityTool({ code: 'not valid code', ...options } as CheckGeometryQualityInput))
      .toMatchObject({ ok: false, errorCode: 'feature.invalid-args' });
  });
  it('fails closed on missing scripts, capture/lowering failures and scenes', async () => {
    for (const input of [
      {}, { code: 'throw new Error("synthetic failure");' }, { code: 'return box(10,10,10).fillet(100);' },
      { code: "const a=assembly('a');a.part('body',box(10,10,10));return a.model();" },
    ]) expect(await checkGeometryQualityTool(input)).toMatchObject({ ok: false, error: expect.any(String) });
  });
});
