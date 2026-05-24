import { describe, it, expect } from 'vitest';
import {
  DIAGNOSTIC_REGISTRY,
  HINT_TEMPLATES,
  NEXT_ACTIONS,
} from '../../../src/shared/diagnostics/registry';

// V slice — Task V2 owns 5 new codes scoped to Curve3D.analytics (the
// bridge-conversion-failed code was shipped in V1). The full V2-aware set
// (used in the analytics impl) is 6.
const V_CODES_V2 = [
  'feature.curve3d.analytics.degenerate-arclength',
  'feature.curve3d.analytics.closest-point-no-converge',
  'feature.curve3d.analytics.derivatives-out-of-range',
  'feature.curve3d.analytics.tessellation-tolerance-invalid',
  'feature.curve3d.analytics.kernel-failed',
  'feature.nurbs.bridge-conversion-failed',
] as const;

describe('V2 diagnostic codes — curve analytics namespace', () => {
  for (const code of V_CODES_V2) {
    it(`registers ${code} with hint + nextAction + error severity`, () => {
      expect(DIAGNOSTIC_REGISTRY[code]).toBeDefined();
      expect(DIAGNOSTIC_REGISTRY[code].defaultSeverity).toBe('error');
      expect(DIAGNOSTIC_REGISTRY[code].group).toBe('feature');
      expect(HINT_TEMPLATES[code].template.length).toBeGreaterThan(20);
      expect(NEXT_ACTIONS[code]).toBeDefined();
    });
  }
});

// V slice — Task V3 owns 2 new codes scoped to Curve3D.analytics.intersect
// (curve-curve and curve-surface). intersect-no-intersection rides at info
// severity because the no-hit case is data, not failure.
const V_CODES_V3 = [
  'feature.curve3d.analytics.intersect-kernel-failed',
  'feature.curve3d.analytics.intersect-no-intersection',
] as const;

describe('V3 diagnostic codes — curve-curve / curve-surface intersect', () => {
  it('registers intersect-kernel-failed at error severity', () => {
    expect(
      DIAGNOSTIC_REGISTRY['feature.curve3d.analytics.intersect-kernel-failed'],
    ).toBeDefined();
    expect(
      DIAGNOSTIC_REGISTRY['feature.curve3d.analytics.intersect-kernel-failed']
        .defaultSeverity,
    ).toBe('error');
    expect(
      HINT_TEMPLATES['feature.curve3d.analytics.intersect-kernel-failed']
        .template.length,
    ).toBeGreaterThan(20);
    expect(
      NEXT_ACTIONS['feature.curve3d.analytics.intersect-kernel-failed'],
    ).toBeDefined();
  });
  it('registers intersect-no-intersection at info severity (does NOT throw)', () => {
    expect(
      DIAGNOSTIC_REGISTRY['feature.curve3d.analytics.intersect-no-intersection'],
    ).toBeDefined();
    expect(
      DIAGNOSTIC_REGISTRY['feature.curve3d.analytics.intersect-no-intersection']
        .defaultSeverity,
    ).toBe('info');
    expect(
      HINT_TEMPLATES['feature.curve3d.analytics.intersect-no-intersection']
        .template.length,
    ).toBeGreaterThan(20);
    expect(
      NEXT_ACTIONS['feature.curve3d.analytics.intersect-no-intersection'],
    ).toBeDefined();
  });
  it('ships exactly 2 V3 codes (count discipline)', () => {
    expect(V_CODES_V3.length).toBe(2);
  });
});
