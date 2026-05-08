// tests/integration/diagnostics/next-action-mandatory.test.ts
//
// Acceptance gate for SOTA Phase 1 lever A1: every diagnostic returned by
// every kernel-running tool must carry a structured `nextAction` field.
import { describe, it, expect, beforeAll } from 'vitest';
import { evaluateScriptTool } from '../../../src/mcp/tools/evaluateScript';
import { initOcct } from '../../../src/backends/occt/occtBackend';
import { NEXT_ACTIONS } from '../../../src/diagnostics/nextAction';

beforeAll(async () => { await initOcct(); });

interface Fixture { name: string; code: string; expectCode?: string; }

const FIXTURES: Fixture[] = [
  { name: 'fillet too large → kernel-failed', code: `return box(10,10,10).fillet(20);`, expectCode: 'feature.kernel-failed' },
  { name: 'sphere with faceLabels → face-ref.not-applicable', code: `return sphere(5, { faceLabels: { lid: 'top' } } as any);`, expectCode: 'feature.face-ref.not-applicable' },
  { name: 'unknown label → label.unknown-name', code: `const s = path().moveTo(0,0).lineTo(10,0).lineTo(10,10).lineTo(0,10).close().extrude(5); return s.fillet(1, { face: 'nope' } as any);`, expectCode: 'feature.label.unknown-name' },
  // Deviation from plan: original fixture `box(10,10,10);` (no return) produces
  // no error diagnostic from the evaluate path — `export.no-shape` is emitted
  // only by `runAndExport`. Substituted with a script exception that exercises
  // the `cli.script-exception` → `inspect-message` next-action code path.
  { name: 'shell with no thickness → cli.script-exception', code: `return (box(10,10,10) as any).shell();`, expectCode: 'cli.script-exception' },
];

describe('next-action mandatory on wire', () => {
  for (const fx of FIXTURES) {
    it(fx.name, async () => {
      const { diagnostics } = await evaluateScriptTool({ code: fx.code });
      const d = diagnostics.find(x => x.severity === 'error');
      expect(d).toBeDefined();
      if (fx.expectCode) expect(d!.code).toBe(fx.expectCode);
      expect(d!.nextAction).toBeDefined();
      expect(d!.nextAction).toEqual(NEXT_ACTIONS[d!.code]);
    });
  }
});
