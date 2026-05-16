import { describe, it, expect } from 'vitest';
import type { Param, FaceRef, EdgeRef, FeatureRef } from '../../../src/shared/intent/types';

describe('intent/types', () => {
  it('Param accepts expression + unit + evaluated', () => {
    const p: Param = { expression: '50 mm', unit: 'mm', evaluated: 50 };
    expect(p.evaluated).toBe(50);
  });

  it('FaceRef discriminated union — canonical', () => {
    const f: FaceRef = { kind: 'canonical', face: 'top' };
    expect(f.kind).toBe('canonical');
  });

  it('EdgeRef carries selector', () => {
    const e: EdgeRef = { kind: 'tracked', edgeName: 'lid', selector: 'midpoint' };
    expect(e.selector).toBe('midpoint');
  });

  it('FeatureRef discriminated union supports face refs', () => {
    const r: FeatureRef = {
      kind: 'face',
      featureId: 'box_1',
      ref: { kind: 'canonical', face: 'top' }
    };
    expect(r.kind).toBe('face');
  });
});
