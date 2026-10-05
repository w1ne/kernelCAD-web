// Union guard through the review tools. A solid-only script (no assembly)
// that fails only on union.* must stay a failure in review_cad and
// design_loop (design_loop promotes a clean "no assembly captured" review to
// a functional solid-only one; a union failure must never reach that path),
// and inspect_assembly must name the union failure, not "no assembly".

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { reviewCadTool } from '../../../src/agent/mcp/tools/reviewCad';
import { designLoopTool } from '../../../src/agent/mcp/tools/designLoop';
import { inspectAssemblyTool } from '../../../src/agent/mcp/tools/inspectAssembly';

const DISCONNECTED_SOLID = 'return union(box(10, 10, 10), box(10, 10, 10).translate(15, 0, 0));';
const BROKEN_TRAY = readFileSync(
  fileURLToPath(new URL('../../fixtures/union-guard/tray-v1-broken.kcad.ts', import.meta.url)),
  'utf8',
);

const cases = [
  { name: 'solid-only disconnected union', code: DISCONNECTED_SOLID, codeExpected: 'union.disconnected' },
  { name: 'broken tray fixture', code: BROKEN_TRAY, codeExpected: 'union.member-overlap' },
];

describe('union guard through review_cad / design_loop / inspect_assembly', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  for (const c of cases) {
    it(`review_cad: ${c.name} is ok:false and lists ${c.codeExpected}`, async () => {
      const r = await reviewCadTool({ code: c.code, includePoseEnvelope: false });
      expect(r.ok).toBe(false);
      expect(r.diagnostics.some((d) => d.code === c.codeExpected)).toBe(true);
    }, 120_000);

    it(`design_loop: ${c.name} is ok:false and lists ${c.codeExpected}`, async () => {
      const r = await designLoopTool({
        goal: 'union guard regression',
        attempts: [{ id: 'a1', code: c.code }],
        includePoseEnvelope: false,
      });
      expect(r.ok).toBe(false);
      const attempt = r.attempts[0];
      expect(attempt.ok).toBe(false);
      // Not promoted to a functional solid-only review; the union error is
      // counted and named in the repair prompt (errors are not reviewFacts).
      expect(attempt.functional).toBe(false);
      expect(attempt.diagnosticCount).toBeGreaterThan(0);
      expect(attempt.nextActionPrompt).toContain(c.codeExpected);
    }, 120_000);
  }

  it('inspect_assembly names the union failure for a solid-only script', async () => {
    const r = await inspectAssemblyTool({ code: DISCONNECTED_SOLID });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toMatch(/separate solids/);
      expect(r.error).not.toMatch(/no assembly captured/);
    }
  }, 120_000);
});
