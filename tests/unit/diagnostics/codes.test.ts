import { describe, it, expect } from 'vitest';
import { DIAGNOSTIC_CODES, HINT_TEMPLATES } from '../../../src/shared/diagnostics/registry';

describe('diagnostic catalogue invariants', () => {
  it('emits exactly 200 codes', () => {
    // 165 baseline + 10 NURBS analytics (V merged) + 10 Query DSL (Q merged) + 9 K1-K9 kinematic + 1 v0.7 Gate 4 (assembly.joint.not-visible) + 1 G2 Gate 6 (assembly.mate.not-physically-realized) + 4 P0 mechanism-truth codes (mechanism.disconnect / interpenetration / dof-mismatch / orphan-part).
    expect(DIAGNOSTIC_CODES).toHaveLength(200);
    expect(new Set(DIAGNOSTIC_CODES).size).toBe(200);
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
