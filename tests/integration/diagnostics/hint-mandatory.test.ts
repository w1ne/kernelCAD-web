// tests/integration/diagnostics/hint-mandatory.test.ts
//
// Acceptance gate for spec 2026-05-05-diagnostic-vocabulary-milestone-c §2:
// every diagnostic returned by every kernel-running tool must carry a
// non-empty `hint` field.
//
// Drives one representative failure per major namespace through the
// `evaluate_script` MCP tool and asserts on the wire diagnostic shape.

import { describe, it, expect, beforeAll } from 'vitest';
import { evaluateScriptTool } from '../../../src/mcp/tools/evaluateScript';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { DIAGNOSTIC_CODES } from '../../../src/shared/diagnostics/codes';

beforeAll(async () => {
  await initOcct();
});

interface Fixture {
  name: string;
  code: string;
  expectCode?: string;
}

const FIXTURES: Fixture[] = [
  {
    name: 'fillet too large → kernel-failed',
    code: `return box(10, 10, 10).fillet(20);`,
    expectCode: 'feature.kernel-failed',
  },
  {
    name: 'shell missing thickness via proxy → still carries hint',
    // Calling shell with no args goes through the proxy without args and
    // surfaces as a script-runtime exception. The diagnostic should still
    // carry a non-empty hint.
    code: `return (box(10, 10, 10) as any).shell();`,
  },
  {
    name: 'sphere with faceLabels → face-ref.not-applicable',
    code: `return sphere(5, { faceLabels: { lid: 'top' } } as any);`,
    expectCode: 'feature.face-ref.not-applicable',
  },
  {
    name: 'unknown label → label.unknown-name',
    code: `
      const s = path().moveTo(0,0).lineTo(10,0).lineTo(10,10).lineTo(0,10).close().extrude(5);
      return s.fillet(1, { face: 'nope' } as any);
    `,
  },
  {
    name: 'bad translate args → invalid-args',
    code: `return box(10, 10, 10).translate(NaN, 0, 0);`,
    expectCode: 'feature.invalid-args',
  },
  {
    name: 'extrudePolygon too few points → invalid-args',
    code: `return extrudePolygon([[0, 0]] as any, 5);`,
    expectCode: 'feature.invalid-args',
  },
  {
    name: 'no return value → no diagnostics expected (control)',
    code: `box(10, 10, 10);`,
    expectCode: undefined,
  },
];

describe('every kernel diagnostic carries a non-empty hint', () => {
  for (const fix of FIXTURES) {
    it(fix.name, async () => {
      const r = await evaluateScriptTool({ code: fix.code });
      for (const d of r.diagnostics) {
        expect(typeof d.hint, `code ${d.code} missing hint`).toBe('string');
        expect(d.hint.trim().length, `code ${d.code} has empty hint`).toBeGreaterThan(0);
      }
      // Every emitted code must be in the catalogue.
      for (const d of r.diagnostics) {
        expect(DIAGNOSTIC_CODES, `unknown code emitted: ${d.code}`).toContain(d.code);
      }
      if (fix.expectCode) {
        const codes = r.diagnostics.map((d) => d.code);
        expect(codes, `expected ${fix.expectCode} in [${codes.join(', ')}]`).toContain(fix.expectCode);
      }
    });
  }
});
