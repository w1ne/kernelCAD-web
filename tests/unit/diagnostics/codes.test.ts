import { describe, it, expect } from 'vitest';
import { DIAGNOSTIC_CODES, HINT_TEMPLATES } from '../../../src/shared/diagnostics/registry';

describe('diagnostic catalogue invariants', () => {
  it('emits exactly 204 codes', () => {
    // 165 baseline + 10 NURBS analytics (V merged) + 10 Query DSL (Q merged) + 9 K1-K9 kinematic + 1 v0.7 Gate 4 (assembly.joint.not-visible) + 1 G2 Gate 6 (assembly.mate.not-physically-realized) + 4 P0 mechanism-truth codes (mechanism.disconnect / interpenetration / dof-mismatch / orphan-part) + 2 P6 physics codes (mechanism.unstable-under-gravity / mechanism.drops-on-release) + 1 P8 joint-mesh-continuity gate (mechanism.joint-mesh-gap) + 1 P11 Slice 2 tendon-routing gate (mechanism.tendon-body-intersect).
    expect(DIAGNOSTIC_CODES).toHaveLength(204);
    expect(new Set(DIAGNOSTIC_CODES).size).toBe(204);
  });

  it('every code has a non-empty hint template', () => {
    for (const code of DIAGNOSTIC_CODES) {
      const tmpl = HINT_TEMPLATES[code];
      expect(tmpl, `missing template for ${code}`).toBeDefined();
      expect(tmpl.template.trim().length, `empty template for ${code}`).toBeGreaterThan(0);
    }
  });

  it('HINT_TEMPLATES covers exactly the catalogue (no orphans, no missing)', () => {
    const tmplKeys = Object.keys(HINT_TEMPLATES).sort();
    const cat = [...DIAGNOSTIC_CODES].sort();
    expect(tmplKeys).toEqual(cat);
  });
});
