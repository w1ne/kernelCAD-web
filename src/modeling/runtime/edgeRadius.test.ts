// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { makeCompound, makeLine, makePolygon } from 'replicad';
import { OcctBackend } from '../../kernel/backends/occt/occtBackend';
import { buildModel } from '../buildModel';
import { checkEdgeRadius } from './edgeRadius';
const build = (code: string) => buildModel({ code, fileName: 'edge-radius.kcad.ts' });
const round = 'return box(20,30,10).fillet(2);';

describe('edge radius specification', () => {
  it('R2 passes min 1 and fails min 3 / max 1', async () => {
    const model = await build(round);
    expect(checkEdgeRadius(model, { min_radius_mm: 1 })).toMatchObject({ ok: true, status: 'pass' });
    const small = checkEdgeRadius(model, { min_radius_mm: 3 });
    expect(small).toMatchObject({ ok: false, status: 'fail' });
    expect(small.bodies[0].violations.every(v => v.rule === 'min-radius')).toBe(true);
    expect(checkEdgeRadius(model, { max_radius_mm: 1 }).bodies[0].violations.every(v => v.rule === 'max-radius')).toBe(true);
  });
  it('sharp box fails required external/all edge break but passes internal scope', async () => {
    const model = await build('return box(20,30,10);');
    expect(checkEdgeRadius(model, { require_edge_break: 'external' }).bodies[0].violations).toHaveLength(12);
    expect(checkEdgeRadius(model, { require_edge_break: 'all' }).ok).toBe(false);
    expect(checkEdgeRadius(model, { require_edge_break: 'internal' }).ok).toBe(true);
  });
  it('checks only returned geometry, each assembly part and disconnected body', async () => {
    const root = await build('const result=box(20,30,10).fillet(2); const helper=box(2,2,2);return result;');
    expect(checkEdgeRadius(root, { min_radius_mm: 1, require_edge_break: 'all' }).ok).toBe(true);
    const scene = await build("const a=assembly('a');a.part('round',box(20,30,10).fillet(2));a.part('sharp',box(20,30,10).translate(50,0,0));return a.model();");
    expect(checkEdgeRadius(scene, { require_edge_break: 'all' }).bodies).toHaveLength(2);
    expect(checkEdgeRadius(scene, { require_edge_break: 'all', parts: ['round'] }).ok).toBe(true);
    const compound = await build('return box(20,30,10).union(box(20,30,10).translate(50,0,0));');
    expect(checkEdgeRadius(compound, { require_edge_break: 'all' }).bodies).toHaveLength(2);
  });
  it('supports edge and face filters without erasing radius violations', async () => {
    const model = await build(round);
    const report = checkEdgeRadius(model, { min_radius_mm: 3, faces: { ofSurfaceType: 'CYLINDER' } });
    expect(report.ok).toBe(false);
    expect(report.bodies[0].breaks.length).toBe(12);
    const sharp = await build('return box(20,30,10);');
    expect(checkEdgeRadius(sharp, { require_edge_break: 'all', edges: { atZ: 5 } }).bodies[0].violations).toHaveLength(4);
    expect(checkEdgeRadius(sharp, { require_edge_break: 'all', faces: { byNormal: 'Z' } }).bodies[0].violations).toHaveLength(4);
    const unfiltered = checkEdgeRadius(sharp, { require_edge_break: 'all' });
    const ref = unfiltered.bodies[0].edges[0].ref;
    expect(checkEdgeRadius(sharp, { require_edge_break: 'all', edges: ref }).bodies[0].violations).toHaveLength(1);
  });
  it('a selected face with no incident selected edge still resolves (not unknown)', async () => {
    const sharp = await build('return box(20,30,10);');
    const all = checkEdgeRadius(sharp, { require_edge_break: 'all' }).bodies[0].edges;
    const edge = all[0];
    const loneFace = [...new Set(all.flatMap(e => e.faceRefs))].find(f => !edge.faceRefs.includes(f))!;
    const r = checkEdgeRadius(sharp, { require_edge_break: 'all', edges: edge.ref, faces: [edge.faceRefs[0], loneFace] });
    expect(r.bodies.flatMap(b => b.unknownRefs)).not.toContain(loneFace);
    expect(r.status).toBe('fail'); // the selected sharp edge is still a violation, not 'partial'
    expect(r.bodies[0].violations).toHaveLength(1);
    const bogus = checkEdgeRadius(sharp, { require_edge_break: 'all', faces: [edge.faceRefs[0], 'nope:face:zz'] });
    expect(bogus.bodies.flatMap(b => b.unknownRefs)).toContain('nope:face:zz');
  });
  it('empty selections and missing targets cannot pass', async () => {
    const model = await build(round);
    expect(checkEdgeRadius(model, { min_radius_mm: 1, edges: [] })).toMatchObject({ ok: false, status: 'no-coverage' });
    expect(() => checkEdgeRadius(model, { min_radius_mm: 1, feature_id: 'absent' })).toThrow(/feature/);
    expect(() => checkEdgeRadius(model, { min_radius_mm: 1, parts: ['absent'] })).toThrow(/parts/);
    expect(() => checkEdgeRadius(model, { min_radius_mm: 1, assembly: 'absent' })).toThrow(/assembly/);
  });
  it('requires actual fillet coverage for radius-only checks', async () => {
    const sharp = await build('return box(20,30,10);');
    expect(checkEdgeRadius(sharp, { min_radius_mm: 1 })).toMatchObject({ ok: false, status: 'no-coverage', checkedFillets: 0 });
    const rounded = await build(round);
    expect(checkEdgeRadius(rounded, { min_radius_mm: 3, faces: { ofSurfaceType: 'PLANE' } })).toMatchObject({ ok: false, status: 'no-coverage', checkedFillets: 0 });
  });
  it('keeps open-face and standalone-wire evidence beside a solid', async () => {
    for (const extra of ['face','wire']) {
      const model = await build(round);
      const solid = (model.rootShape as OcctBackend).getReplicadShape();
      const unsupported = extra === 'face' ? makePolygon([[40,0,0],[50,0,0],[50,10,0],[40,10,0]]) : makeLine([40,0,0],[50,0,0]);
      model.rootShape = new OcctBackend(makeCompound([solid,unsupported]).asShape3D());
      const result = checkEdgeRadius(model, { min_radius_mm: 1, require_edge_break: 'all' });
      expect(result).toMatchObject({ ok: false, status: 'partial' });
      expect(result.bodies.some(b => b.unknownRefs.length > 0)).toBe(true);
    }
  });
  it('rejects missing rules, nonfinite/inverted limits and invalid scope', async () => {
    const model = await build(round);
    for (const options of [{}, { min_radius_mm: NaN }, { max_radius_mm: -1 }, { min_radius_mm: 3, max_radius_mm: 1 }, { require_edge_break: 'other' }, { min_radius_mm: 1, faces: 7 }, { min_radius_mm: 1, edges: { convex: 'yes' } }, { min_radius_mm: 1, faces: { ofSurfaceType: 'MISSING' } }]) {
      expect(() => checkEdgeRadius(model, options as never)).toThrow();
    }
  });
});
