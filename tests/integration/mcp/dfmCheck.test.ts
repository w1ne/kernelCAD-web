// tests/integration/mcp/dfmCheck.test.ts
//
// W3 Task 8 — MCP `dfm_check` tool. Same fixtures as the CLI surface,
// driven through `dfmCheckTool({ code })`:
//
//   - thin wall → ok: false with dfm.wall.too-thin; flattened
//     { ok, clearance, walls, voids, timings, diagnostics } payload
//     (the get_bend_table / list_part_stats sibling convention),
//   - clean fixture → ok: true with per-part walls/voids entries,
//   - no dfmSpec → ok: false with the "script declares no dfmSpec(...)"
//     message + hint,
//   - neither { file } nor { code } → ok: false, cli.invalid-args,
//   - every diagnostic on every path carries a non-empty hint,
//   - registry: `dfm_check` is dispatchable through TOOL_REGISTRY,
//   - evaluate_script inherits the enforcement for free (it delegates to
//     evaluateAndBuildScript, which hosts the single hook).

import { describe, it, expect, beforeAll } from 'vitest';
import { dfmCheckTool, type DfmCheckOutput } from '../../../src/agent/mcp/tools/dfmCheck';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';
import { getToolDefinition, callMcpTool } from '../../../src/agent/mcp/toolRegistry';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const THIN = 'dfmSpec({ minWall: 1.5 });\nreturn box(20, 20, 1);\n';
const CLEAN = 'dfmSpec({ minWall: 1.5 });\nreturn box(20, 20, 10);\n';
const NO_SPEC = 'return box(20, 20, 1);\n';

beforeAll(async () => { await initOcct(); }, 120_000);

function assertAllHints(r: { diagnostics: { code: string; hint?: string }[] }): void {
  for (const d of r.diagnostics) {
    expect(typeof d.hint, `code ${d.code} missing hint`).toBe('string');
    expect(d.hint!.trim().length, `code ${d.code} has empty hint`).toBeGreaterThan(0);
  }
}

describe('dfm_check (MCP)', () => {
  it('fails a thin-wall script with dfm.wall.too-thin and the flattened report payload', async () => {
    const r = await dfmCheckTool({ code: THIN });
    expect(r.ok).toBe(false);
    expect(r.clearance).toEqual([]);
    expect(r.walls.length).toBe(1);
    expect(r.walls[0].part).toBe('shape');
    expect(r.walls[0].result.violations.length).toBeGreaterThan(0);
    expect(r.voids.length).toBe(1);
    expect(typeof r.timings?.total).toBe('number');
    expect(r.diagnostics.some(d => d.code === 'dfm.wall.too-thin')).toBe(true);
    assertAllHints(r);
  }, 120_000);

  it('passes a clean fixture with ok: true and per-part results', async () => {
    const r = await dfmCheckTool({ code: CLEAN });
    expect(r.ok).toBe(true);
    expect(r.walls.length).toBe(1);
    expect(r.walls[0].result.violations).toEqual([]);
    expect(r.voids.length).toBe(1);
    expect(r.voids[0].result.sealedVoids).toEqual([]);
    expect(r.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    assertAllHints(r);
  }, 120_000);

  it('errors when the script declares no dfmSpec', async () => {
    const r = await dfmCheckTool({ code: NO_SPEC });
    expect(r.ok).toBe(false);
    const noSpec = r.diagnostics.find(d => d.message.includes('script declares no dfmSpec('));
    expect(noSpec).toBeDefined();
    assertAllHints(r);
  }, 120_000);

  it('errors with cli.invalid-args when neither file nor code is given', async () => {
    const r = await dfmCheckTool({});
    expect(r.ok).toBe(false);
    expect(r.diagnostics.some(d => d.code === 'cli.invalid-args')).toBe(true);
    assertAllHints(r);
  });

  it('is registered and dispatchable through the tool registry', async () => {
    const def = getToolDefinition('dfm_check');
    expect(def).toBeDefined();
    expect(def!.description).toContain('dfmSpec');
    const r = await callMcpTool('dfm_check', { code: THIN }) as DfmCheckOutput;
    expect(r.ok).toBe(false);
    expect(r.diagnostics.some(d => d.code === 'dfm.wall.too-thin')).toBe(true);
  }, 120_000);
});

describe('evaluate_script inherits DFM enforcement', () => {
  it('fails a thin-wall dfmSpec script through evaluate_script', async () => {
    const r = await evaluateScriptTool({ code: THIN });
    expect(r.ok).toBe(false);
    expect(r.diagnostics.some(d => d.code === 'dfm.wall.too-thin')).toBe(true);
  }, 120_000);

  it('the same geometry without dfmSpec stays ok — enforcement is opt-in', async () => {
    const r = await evaluateScriptTool({ code: NO_SPEC });
    expect(r.ok).toBe(true);
  }, 120_000);
});
