// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct, OcctBackend } from './occtBackend';
import { inspectEdgeBreaks } from './edgeRadius';
import { resolveEdgeQuery } from './edgeQueries';

beforeAll(initOcct);
const box = () => OcctBackend.box(20, 30, 10, true);
const rounded = () => { const b = box(); return b.fillet(resolveEdgeQuery(b, {}), 2); };

describe('BREP edge breaks', () => {
  it('measures R2 fillets from actual faces and leaves no sharp box edges', () => {
    const r = inspectEdgeBreaks(rounded());
    expect(r.breaks.filter(f => f.kind === 'fillet').length).toBeGreaterThanOrEqual(12);
    expect(r.breaks.every(f => f.radiusMm === 2)).toBe(true);
    expect(r.edges.filter(e => e.kind === 'sharp')).toHaveLength(0);
  });
  it('classifies twelve sharp external box edges', () => {
    const r = inspectEdgeBreaks(box());
    expect(r.breaks).toHaveLength(0);
    expect(r.edges.filter(e => e.kind === 'sharp')).toHaveLength(12);
    expect(r.edges.every(e => e.side === 'external')).toBe(true);
  });
  it('does not mistake a boss or a full bore for a fillet', () => {
    const b = OcctBackend.cylinder(10, 2);
    expect(inspectEdgeBreaks(b).breaks).toHaveLength(0);
    const plate = box().subtract(OcctBackend.cylinder(20, 2).translate(0, 0, -10));
    expect(inspectEdgeBreaks(plate).breaks).toHaveLength(0);
    const pocket = box().subtract(OcctBackend.cylinder(7, 2).translate(0, 0, -2));
    expect(inspectEdgeBreaks(pocket).edges.some(e => e.side === 'internal')).toBe(true);
  });
  it('separates a pocket bottom from its external mouth, including after rotation', () => {
    const pocket = box().subtract(OcctBackend.cylinder(7, 2).translate(0, 0, -2));
    const initial = inspectEdgeBreaks(pocket).edges.filter(e => e.kind === 'sharp');
    expect(initial.filter(e => e.side === 'internal')).toHaveLength(1);
    expect(initial.filter(e => e.side === 'external')).toHaveLength(13);
    const rotated = inspectEdgeBreaks(pocket.rotate([1, 2, 3], 47)).edges.filter(e => e.kind === 'sharp');
    expect(rotated.filter(e => e.side === 'internal')).toHaveLength(1);
    expect(rotated.filter(e => e.side === 'external')).toHaveLength(13);
  });
  it('rejects a nontangent quarter-cylinder cut as a fillet', () => {
    const channel = OcctBackend.cylinder(40, 3).translate(0,0,-20).rotate([1,0,0],90).translate(10,0,5);
    expect(inspectEdgeBreaks(box().subtract(channel)).breaks).toHaveLength(0);
  });
  it('measures an internal pocket-bottom toroidal fillet', () => {
    const pocket = box().subtract(OcctBackend.cylinder(7, 4).translate(0,0,-2));
    const bottom = resolveEdgeQuery(pocket, { atZ: -2, ofCurveType: 'CIRCLE', tolerance: 1e-5 });
    const r = inspectEdgeBreaks(pocket.fillet(bottom, 1));
    expect(r.breaks.some(f => f.surfaceType === 'TORUS' && Math.abs(f.radiusMm! - 1) < 1e-6)).toBe(true);
    expect(r.edges.filter(e => e.kind === 'sharp' && e.side === 'internal')).toHaveLength(0);
  });
  it('does not classify a sectioned boss as a radius-5 fillet', () => {
    const cylinder = OcctBackend.cylinder(10,5);
    const lipFillets = cylinder.fillet(resolveEdgeQuery(cylinder, { ofCurveType: 'CIRCLE' }),1);
    const half = lipFillets.intersect(OcctBackend.box(10,20,20).translate(0,-10,-5));
    const r = inspectEdgeBreaks(half);
    expect(r.breaks).toHaveLength(2);
    expect(r.breaks.every(f => f.surfaceType === 'TORUS' && Math.abs(f.radiusMm!-1) < 1e-6)).toBe(true);
  });
  it('detects a small but real sharp crease instead of accepting a 1-degree normal jump', () => {
    const body = OcctBackend.extrudePolygon([[0,0],[10,0],[20,0.087268],[20,10],[0,10]],10);
    const hit = resolveEdgeQuery(body, { atX: 10, atY: 0, tolerance: 1e-5 });
    const indices = body.getReplicadShape().edges.flatMap((e,i) => hit.some(h => h.isSame(e)) ? [i] : []);
    expect(inspectEdgeBreaks(body).edges.filter(e => indices.includes(e.edgeIndex)).map(e => e.kind)).toEqual(['sharp']);
  });
  it('recognizes a planar chamfer strip without claiming a radius', () => {
    const b = box();
    const c = b.chamfer(resolveEdgeQuery(b, { atZ: 5, parallel: [1, 0, 0] }).slice(0, 1), 1);
    const r = inspectEdgeBreaks(c);
    expect(r.breaks.filter(f => f.kind === 'chamfer')).toHaveLength(1);
    expect(r.breaks[0].radiusMm).toBeNull();
  });
  it('recognizes an internal planar chamfer and preserves its concave rail sides', () => {
    const body = OcctBackend.extrudePolygon([[0,0],[20,0],[20,10],[10,10],[10,20],[0,20]],10);
    const c = body.chamfer(resolveEdgeQuery(body, { atX: 10, atY: 10, tolerance: 1e-5 }),1);
    const r = inspectEdgeBreaks(c);
    expect(r.breaks.filter(f => f.kind === 'chamfer')).toHaveLength(1);
    expect(r.edges.filter(e => e.kind === 'chamfered' && e.side === 'internal')).toHaveLength(2);
    expect(r.edges.filter(e => e.kind === 'sharp' && e.side === 'internal')).toHaveLength(0);
  });
  it('measures toroidal lip fillets by minor radius, not bore radius', () => {
    const b = box().subtract(OcctBackend.cylinder(20, 4).translate(0, 0, -10));
    const r = inspectEdgeBreaks(b.fillet(resolveEdgeQuery(b, { atZ: 5, ofCurveType: 'CIRCLE' }), 1));
    expect(r.breaks.some(f => f.surfaceType === 'TORUS' && Math.abs(f.radiusMm! - 1) < 1e-6)).toBe(true);
  });
});
