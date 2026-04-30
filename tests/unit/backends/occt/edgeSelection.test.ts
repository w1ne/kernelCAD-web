// tests/unit/backends/occt/edgeSelection.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { pickEdges } from '../../../../src/backends/occt/edgeSelection';
import { OcctBackend, initOcct } from '../../../../src/backends/occt/occtBackend';
import type { FeatureRecord } from '../../../../src/intent/featureRecord';

const filletNoFilter = (baseId: string): FeatureRecord => ({
  id: 'fillet_1', kind: 'fillet',
  inputs: { base: { kind: 'feature', id: baseId } },
  params: { radius: { expression: '2', unit: 'mm', evaluated: 2 } },
  transforms: [], suppressed: false,
});

const filletWithFace = (baseId: string, face: 'top'|'bottom'|'left'|'right'|'front'|'back'): FeatureRecord => ({
  id: 'fillet_2', kind: 'fillet',
  inputs: {
    base: { kind: 'feature', id: baseId },
    face: { kind: 'face', featureId: baseId, ref: { kind: 'canonical', face } },
  },
  params: { radius: { expression: '2', unit: 'mm', evaluated: 2 } },
  transforms: [], suppressed: false,
});

describe('pickEdges', () => {
  beforeAll(async () => { await initOcct(); });

  it('returns ALL edges when no face filter is set (un-transformed box)', () => {
    const box = OcctBackend.box(20, 20, 20);
    const result = pickEdges(filletNoFilter('box_1'), box);
    if ('error' in result) throw new Error(`expected edges, got error: ${result.error.message}`);
    expect(result.length).toBe(12); // a box has 12 edges
  });

  it('returns 4 edges for canonical "top" face on a box', () => {
    const box = OcctBackend.box(20, 20, 20);
    const result = pickEdges(filletWithFace('box_1', 'top'), box);
    if ('error' in result) throw new Error(`expected edges, got error: ${result.error.message}`);
    expect(result.length).toBe(4);
  });

  it('returns 1 edge for canonical "top" face on a cylinder', () => {
    const cyl = OcctBackend.cylinder(20, 5);
    const result = pickEdges(filletWithFace('cyl_1', 'top'), cyl);
    if ('error' in result) throw new Error(`expected edges, got error: ${result.error.message}`);
    expect(result.length).toBe(1); // cylinder top is one circular edge
  });

  it('returns error when face filter is on a non-primitive (boolean result)', () => {
    const box = OcctBackend.box(20, 20, 20);
    const cyl = OcctBackend.cylinder(20, 5).translate(10, 10, -1);
    const bool = box.subtract(cyl); // result has no kind tag
    const result = pickEdges(filletWithFace('bool_1', 'top'), bool);
    if (!('error' in result)) throw new Error('expected error, got edges');
    expect(result.error.code).toBe('feature.edge-feature.face-ref-not-resolvable');
    expect(result.error.severity).toBe('error');
  });

  it('returns error when face filter is on a transformed primitive', () => {
    const box = OcctBackend.box(20, 20, 20).translate(5, 0, 0); // transform drops kind tag
    const result = pickEdges(filletWithFace('box_1', 'top'), box);
    if (!('error' in result)) throw new Error('expected error, got edges');
    expect(result.error.code).toBe('feature.edge-feature.face-ref-not-resolvable');
  });

  it('returns error when canonical face is not applicable to this primitive', () => {
    const cyl = OcctBackend.cylinder(20, 5);
    const result = pickEdges(filletWithFace('cyl_1', 'left'), cyl);
    if (!('error' in result)) throw new Error('expected error, got edges');
    expect(result.error.code).toBe('feature.edge-feature.face-ref-not-applicable');
  });
});
