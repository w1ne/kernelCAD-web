import { describe, it, expect } from 'vitest';
import { DIAGNOSTIC_REGISTRY } from '../../../src/shared/diagnostics/registry';

describe('dfm.* repair-hint discipline (Slice E)', () => {
  const dfmCodes = Object.entries(DIAGNOSTIC_REGISTRY)
    .filter(([code]) => code.startsWith('dfm.'))
    .map(([code, spec]) => ({ code, spec }));

  it('registers exactly 28 dfm.* codes', () => {
    // 24 DFM preflight codes (Slice E: dfm_preflight vendor/material/
    // thickness inputs, hole/slot/web, bend.*, size.*, dxf.*, rule.*)
    // + 4 print-prep gate codes (W3 Task 7: dfm.wall.too-thin,
    // dfm.clearance.violated, dfm.channel.openings-mismatch,
    // dfm.void.undeclared). Adding a dfm.* code? It must satisfy every
    // discipline test below, then bump this count.
    expect(dfmCodes).toHaveLength(28);
  });

  it('every dfm.* code has a non-empty hintTemplate', () => {
    for (const { code, spec } of dfmCodes) {
      expect(spec.hintTemplate.trim().length, `empty hint for ${code}`).toBeGreaterThan(0);
    }
  });

  it('every dfm.* code has a nextAction populated', () => {
    for (const { code, spec } of dfmCodes) {
      expect(spec.nextAction, `missing nextAction for ${code}`).toBeDefined();
    }
  });

  it('every dfm.* code belongs to the dfm group', () => {
    for (const { code, spec } of dfmCodes) {
      expect(spec.group, `wrong group for ${code}`).toBe('dfm');
    }
  });
});
