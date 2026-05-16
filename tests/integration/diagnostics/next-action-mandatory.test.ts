// tests/integration/diagnostics/next-action-mandatory.test.ts
//
// Acceptance gate for SOTA Phase 1 lever A1: every diagnostic returned by
// every kernel-running tool must carry a structured `nextAction` field.
//
// Wire boundaries covered: `evaluate_script` (FIXTURES), `export_stl`
// (EXPORT_FIXTURES below), and `why_did_this_fail` (left as describe.todo
// because exercising it requires a multi-feature graph — covered indirectly
// via the central `withNextActions` helper unit tests in
// tests/unit/diagnostics/nextAction.test.ts).
import { describe, it, expect, beforeAll } from 'vitest';
import { evaluateScriptTool } from '../../../src/mcp/tools/evaluateScript';
import { exportStlTool } from '../../../src/mcp/tools/exportStl';
import { initOcct } from '../../../src/backends/occt/occtBackend';
import { NEXT_ACTIONS } from '../../../src/shared/diagnostics/nextAction';

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

describe('next-action mandatory on wire (evaluate_script)', () => {
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

interface ExportFixture { name: string; code: string; feature_id?: string; expectCode: string; }

// Drive the export wire boundary so diagnostics constructed inside
// `runAndExport` (export.no-shape, export.feature-not-found,
// recompute.input.missing) get exercised end-to-end and asserted to
// carry `nextAction` on the wire.
const EXPORT_FIXTURES: ExportFixture[] = [
  {
    name: 'export_stl empty script → export.no-shape',
    // `runAndExport` only emits export.no-shape when the script produced
    // neither a return value nor any captured features. A script with a
    // bare `box(10,10,10)` still captures the box record and the export
    // path falls back to the last record, so we use a no-op script here.
    code: `// no shapes`,
    expectCode: 'export.no-shape',
  },
  {
    name: 'export_stl unknown feature_id → export.feature-not-found',
    code: `return box(10,10,10);`,
    feature_id: 'does-not-exist',
    expectCode: 'export.feature-not-found',
  },
  {
    name: 'export_stl upstream kernel failure → feature.kernel-failed',
    code: `return box(10,10,10).fillet(20);`,
    expectCode: 'feature.kernel-failed',
  },
];

describe('next-action mandatory on wire (export_stl)', () => {
  for (const fx of EXPORT_FIXTURES) {
    it(fx.name, async () => {
      const result = await exportStlTool({
        code: fx.code,
        output_path: '/tmp/_kcad-next-action-test.stl',
        feature_id: fx.feature_id,
      });
      expect(result.ok).toBe(false);
      const d = result.diagnostics?.find(x => x.severity === 'error' && x.code === fx.expectCode);
      expect(d, `expected ${fx.expectCode} in [${(result.diagnostics ?? []).map(x => x.code).join(', ')}]`).toBeDefined();
      expect(d!.nextAction).toBeDefined();
      expect(d!.nextAction).toEqual(NEXT_ACTIONS[d!.code]);
    });
  }
});

describe.todo('next-action mandatory on wire (why_did_this_fail)');
