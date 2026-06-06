import { describe, it, expect } from 'vitest';
import { DIAGNOSTIC_CODES, HINT_TEMPLATES } from '../../../src/shared/diagnostics/registry';

describe('diagnostic catalogue invariants', () => {
  it('emits exactly 211 codes', () => {
    // 204 from develop (NURBS analytics, Query DSL, K1-K9 kinematic, assembly/mechanism gates)
    // + 6 parts catalog codes (parts.* — Slice C bundled parts catalog)
    // + 1 feature.emboss-text.boolean-noop (#393 silent no-op guard).
    expect(DIAGNOSTIC_CODES).toHaveLength(211);
    expect(new Set(DIAGNOSTIC_CODES).size).toBe(211);
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
