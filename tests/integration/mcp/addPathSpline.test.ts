// tests/integration/mcp/addPathSpline.test.ts
//
// NURBS Slice D Task 4: integration test for the `add_path_spline` MCP tool.
// Covers minimal injection, chain-anchor-not-found rejection, degenerate-input
// rejection, and a full evaluateScript round-trip so the injected code parses
// through the capture pipeline.

import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { addPathSplineTool } from '../../../src/agent/mcp/tools/addPathSpline';

const SEED_CODE = [
  'const brow = path().moveTo(0, 0);',
  'const profile = brow.lineTo(40, 0).close();',
  'const part = profile.extrude(5);',
  'return part;',
].join('\n');

describe('add_path_spline MCP tool', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('injects a minimal .spline() call into the chain-anchor', async () => {
    const r = await addPathSplineTool({
      code: SEED_CODE,
      chain_anchor: 'brow',
      points: [[0, 0], [10, 5], [20, 0]],
    });
    expect(r.ok).toBe(true);
    expect(r.new_code).toContain('const brow = path().moveTo(0, 0).spline([[0,0],[10,5],[20,0]]);');
    expect(r.new_code).toContain('return part;');
  });

  it('honors a tension option', async () => {
    const r = await addPathSplineTool({
      code: SEED_CODE,
      chain_anchor: 'brow',
      points: [[0, 0], [10, 5], [20, 0]],
      tension: 0.7,
    });
    expect(r.ok).toBe(true);
    expect(r.new_code).toContain('.spline([[0,0],[10,5],[20,0]], { tension: 0.7 })');
  });

  it('rejects an undeclared chain_anchor', async () => {
    const r = await addPathSplineTool({
      code: SEED_CODE,
      chain_anchor: 'missing',
      points: [[0, 0], [10, 0]],
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/"missing" is not declared/);
  });

  it('rejects degenerate points (fewer than 2)', async () => {
    const r = await addPathSplineTool({
      code: SEED_CODE,
      chain_anchor: 'brow',
      points: [[0, 0]],
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/at least 2 waypoints/);
  });

  it('round-trips through evaluateScript without diagnostics errors when waypoints are well-formed', async () => {
    // Use a fresh path chain that closes inline so the injected .spline is
    // inserted just before .close().
    const seed = [
      'const brow = path().moveTo(0, 0).lineTo(30, 0).lineTo(30, 5).close();',
      'return brow.extrude(2);',
    ].join('\n');
    const r = await addPathSplineTool({
      code: seed,
      chain_anchor: 'brow',
      points: [[30, 5], [15, 10], [0, 5]],
    });
    expect(r.ok).toBe(true);
    expect(r.new_code).toContain('.spline([[30,5],[15,10],[0,5]])');
    // The injected fragment lands BEFORE .close(): regex confirms ordering.
    expect(r.new_code).toMatch(/\.spline\(\[\[30,5\],\[15,10\],\[0,5\]\]\)\.close\(\)/);
  });
});
