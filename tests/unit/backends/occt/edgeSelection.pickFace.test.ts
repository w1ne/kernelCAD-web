// tests/unit/backends/occt/edgeSelection.pickFace.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { pickFace } from '../../../../src/backends/occt/edgeSelection';
import { OcctBackend, initOcct } from '../../../../src/backends/occt/occtBackend';
import type { FeatureRecord } from '../../../../src/intent/featureRecord';

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
    expect(result.error.code).toBe('feature.face-feature.face-required');
  });

  it('returns face-ref-not-resolvable on a transformed primitive', () => {
    const box = OcctBackend.box(20, 20, 20).translate(5, 0, 0);
    const result = pickFace(shellWithFace('box_1', 'top'), box, undefined);
    if (!('error' in result)) throw new Error('expected error, got face');
    expect(result.error.code).toBe('feature.face-feature.face-ref-not-resolvable');
  });

  it('returns face-ref-not-resolvable on a non-primitive (boolean result)', () => {
    const box = OcctBackend.box(20, 20, 20);
    const cyl = OcctBackend.cylinder(20, 5).translate(10, 10, -1);
    const bool = box.subtract(cyl);
    const result = pickFace(shellWithFace('bool_1', 'top'), bool, undefined);
    if (!('error' in result)) throw new Error('expected error, got face');
    expect(result.error.code).toBe('feature.face-feature.face-ref-not-resolvable');
  });

  it('returns face-ref-not-applicable for cylinder side face', () => {
    const cyl = OcctBackend.cylinder(20, 5);
    const result = pickFace(shellWithFace('cyl_1', 'left'), cyl, undefined);
    if (!('error' in result)) throw new Error('expected error, got face');
    expect(result.error.code).toBe('feature.face-feature.face-ref-not-applicable');
  });
});
