// tests/integration/mcp/addSurfaceFromBoundary.test.ts
//
// NURBS Slice C Task 7: integration test for the `add_surface_from_boundary`
// MCP tool. Covers minimal insertion (no opts), explicit opts + binding_name,
// undeclared-binding rejection, and continuity-array validation. The seed
// script declares 4 closed-loop curves so the inserted Surface evaluates
// cleanly through the capture pipeline.

import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { addSurfaceFromBoundaryTool } from '../../../src/agent/mcp/tools/addSurfaceFromBoundary';

// 4 boundary curves forming a closed rectangular loop in the XY plane —
// bottom (X- to X+), right (Y- to Y+ at X+), top (X+ to X-), left (Y+ to Y-).
// Adjacent endpoints coincide so the Coons patch is well-formed.
const SEED_CODE = [
  'const bottom = nurbsCurve([[0, 0, 0], [10, 0, 0], [20, 0, 0]]);',
  'const right = nurbsCurve([[20, 0, 0], [20, 10, 0], [20, 20, 0]]);',
  'const top = nurbsCurve([[20, 20, 0], [10, 20, 0], [0, 20, 0]]);',
  'const left = nurbsCurve([[0, 20, 0], [0, 10, 0], [0, 0, 0]]);',
  'const base = box(20, 20, 5);',
  'return base;',
].join('\n');

describe('add_surface_from_boundary MCP tool', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('inserts a minimal surfaceFromBoundary declaration before the return', async () => {
    const r = await addSurfaceFromBoundaryTool({
      code: SEED_CODE,
      curve_bindings: ['bottom', 'right', 'top', 'left'],
    });
    expect(r.ok).toBe(true);
    expect(r.new_code).toMatch(/const _surface_1 = surfaceFromBoundary\(\[bottom, right, top, left\]\)/);
    expect(r.new_code).toContain('return base;');
    expect(r.diagnostics?.filter(d => d.severity === 'error') ?? []).toEqual([]);
  });

  it('honors explicit binding_name + continuity + sampling opts', async () => {
    const r = await addSurfaceFromBoundaryTool({
      code: SEED_CODE,
      curve_bindings: ['bottom', 'right', 'top', 'left'],
      continuity: 'C1',
      sampling: 21,
      binding_name: 'frontPatch',
    });
    expect(r.ok).toBe(true);
    expect(r.new_code).toContain('const frontPatch = surfaceFromBoundary(');
    expect(r.new_code).toContain('continuity: "C1"');
    expect(r.new_code).toContain('sampling: 21');
  });

  it('rejects an undeclared curve binding', async () => {
    const r = await addSurfaceFromBoundaryTool({
      code: SEED_CODE,
      curve_bindings: ['bottom', 'right', 'top', 'missing'],
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/"missing" is not declared/);
  });

  it('rejects a continuity array whose length is not 4', async () => {
    const r = await addSurfaceFromBoundaryTool({
      code: SEED_CODE,
      curve_bindings: ['bottom', 'right', 'top', 'left'],
      continuity: ['C0', 'C1', 'C2'] as Array<'C0' | 'C1' | 'C2'>,
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/continuity array must be length 4/);
  });
});
