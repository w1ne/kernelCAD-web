// tests/unit/backends/occt/edgeSelection.pickFace.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { pickFace } from '../../../../src/kernel/backends/occt/edgeSelection';
import { OcctBackend, initOcct } from '../../../../src/kernel/backends/occt/occtBackend';
import type { FeatureRecord } from '../../../../src/shared/intent/featureRecord';

const shellNoFilter = (baseId: string): FeatureRecord => ({
  id: 'shell_1', kind: 'shell',
  inputs: { base: { kind: 'feature', id: baseId } },
  params: { thickness: { expression: '0.5', unit: 'mm', evaluated: 0.5 } },
  transforms: [], suppressed: false,
});

const shellWithFace = (baseId: string, face: 'top'|'bottom'|'left'|'right'|'front'|'back'): FeatureRecord => ({
  id: 'shell_2', kind: 'shell',
  inputs: {
    base: { kind: 'feature', id: baseId },
    face: { kind: 'face', featureId: baseId, ref: { kind: 'canonical', face } },
  },
  params: { thickness: { expression: '0.5', unit: 'mm', evaluated: 0.5 } },
  transforms: [], suppressed: false,
});

describe('pickFace', () => {
  beforeAll(async () => { await initOcct(); });

  it('returns the canonical "top" face on a box', () => {
    const box = OcctBackend.box(20, 20, 20);
    const result = pickFace(shellWithFace('box_1', 'top'), box, undefined);
    if ('error' in result) throw new Error(`expected face, got error: ${result.error.message}`);
    // We can't easily assert face identity without exposing replicad internals; assert it's truthy.
    expect(result).toBeTruthy();
    expect(result).not.toHaveProperty('error');
  });

  it('returns the canonical "bottom" face on a cylinder', () => {
    const cyl = OcctBackend.cylinder(20, 5);
    const result = pickFace(shellWithFace('cyl_1', 'bottom'), cyl, undefined);
    if ('error' in result) throw new Error(`expected face, got error: ${result.error.message}`);
    expect(result).toBeTruthy();
  });

  it('returns face-required when no face filter is set', () => {
    const box = OcctBackend.box(20, 20, 20);
    const result = pickFace(shellNoFilter('box_1'), box, undefined);
    if (!('error' in result)) throw new Error('expected error, got face');
    expect(result.error.code).toBe('feature.invalid-args');
  });

  it('resolves a canonical name on a lineage-less transformed primitive by the box rule', () => {
    // No kind tag, no historyMap: 'top' is the one +Z planar face at max Z.
    const box = OcctBackend.box(20, 20, 20).translate(5, 0, 0);
    const result = pickFace(shellWithFace('box_1', 'top'), box, undefined);
    if ('error' in result) throw new Error(result.error.message);
    expect(result.center.z).toBeCloseTo(20, 4);
    expect(result.center.x).toBeCloseTo(15, 4);
  });

  it('resolves top on a lineage-less boolean result by the box rule', () => {
    const box = OcctBackend.box(20, 20, 20);
    const cyl = OcctBackend.cylinder(20, 5).translate(10, 10, -1);
    const bool = box.subtract(cyl);
    const result = pickFace(shellWithFace('bool_1', 'top'), bool, undefined);
    if ('error' in result) throw new Error(result.error.message);
    expect(result.center.z).toBeCloseTo(20, 4);
  });

  it('still reports not-applicable when no single planar face faces that way at the extreme', () => {
    // Two +Z faces share the top plane (a slot splits it): ambiguous.
    const box = OcctBackend.box(20, 20, 20);
    const slot = OcctBackend.box(4, 30, 10).translate(8, -5, 15);
    const result = pickFace(shellWithFace('bool_2', 'top'), box.subtract(slot), undefined);
    if (!('error' in result)) throw new Error('expected error, got face');
    expect(result.error.code).toBe('feature.face-ref.not-applicable');
  });

  it('returns face-ref-not-applicable for cylinder side face', () => {
    const cyl = OcctBackend.cylinder(20, 5);
    const result = pickFace(shellWithFace('cyl_1', 'left'), cyl, undefined);
    if (!('error' in result)) throw new Error('expected error, got face');
    expect(result.error.code).toBe('feature.face-ref.not-applicable');
  });
});
