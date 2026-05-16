// tests/integration/mcp/validateAssembly.test.ts
//
// v0.6 Task 11: integration test for `validate_assembly` MCP tool. Wraps
// `validateAssemblyWithMates(arm)` (T8). Verifies the validator surfaces
// the structured diagnostic chain (codes + hints) agents rely on to
// recover from authoring errors.

import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/backends/occt/occtBackend';
import { clearActiveMcpSession } from '../../../src/mcp/activeSession';
import { evaluateScriptTool } from '../../../src/mcp/tools/evaluateScript';
import { validateAssemblyTool } from '../../../src/mcp/tools/validateAssembly';

describe('validate_assembly MCP tool', () => {
  beforeAll(async () => { await initOcct(); }, 60000);
  beforeEach(() => { clearActiveMcpSession(); });

  it('returns status=solved with empty diagnostics when parts are joined via a fastened mate', async () => {
    const ev = await evaluateScriptTool({
      code: `
        const arm = assembly('rig');
        arm.part('a', box(1, 1, 1))
          .connector('p', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
        arm.part('b', box(1, 1, 1))
          .connector('q', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
        arm.mate('m1', 'a.p', 'b.q', 'fastened');
        return arm.model();
      `,
    });
    expect(ev.ok).toBe(true);

    const r = await validateAssemblyTool({});
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.status).toBe('solved');
      // v0.7.4 Gate 1 emits info-severity "deferred" notes per vec3-origin
      // side on fastened mates (the topology-bound face inference path is a
      // v0.7.x followup). Filter those out — this test asserts clean status,
      // not the deferred-note behaviour (covered by mountingHoleConsistency.test.ts).
      const errorsAndWarnings = r.diagnostics.filter((d) => d.severity !== 'info');
      expect(errorsAndWarnings).toEqual([]);
      expect(r.partCount).toBe(2);
      expect(r.jointCount).toBe(0);
    }
  });

  it('returns status=warning with a floating-part diagnostic when a part has no joint or mate', async () => {
    const ev = await evaluateScriptTool({
      code: `
        const arm = assembly('rig');
        arm.part('a', box(1, 1, 1));
        arm.part('b', box(1, 1, 1), { at: [5, 0, 0] });
        return arm.model();
      `,
    });
    expect(ev.ok).toBe(true);

    const r = await validateAssemblyTool({});
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.status).toBe('warning');
      expect(r.partCount).toBe(2);
      expect(r.diagnostics.some((d) => d.code === 'assembly.part.floating')).toBe(true);
      // Hint vocabulary is the load-bearing recovery surface for agents.
      for (const d of r.diagnostics) {
        expect(d.hint.length).toBeGreaterThan(0);
      }
    }
  });

  it('returns ok:false when no active session is set', async () => {
    // No prior evaluate_script call.
    const r = await validateAssemblyTool({});
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errorCode).toBe('feature.invalid-args');
    }
  });
});
