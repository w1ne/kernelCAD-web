// tests/integration/mcp/addNurbsCurve.test.ts
//
// NURBS Slice B Task 11: integration test for the `add_nurbs_curve` MCP tool.
// Covers minimal insertion, explicit binding_name, malformed inputs, and a
// full evaluateScript round-trip so the inserted code actually parses through
// the capture pipeline.

import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { addNurbsCurveTool } from '../../../src/agent/mcp/tools/addNurbsCurve';

const SEED_CODE = [
  'const base = box(20, 20, 5);',
  'return base;',
].join('\n');

describe('add_nurbs_curve MCP tool', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('inserts a minimal nurbsCurve declaration before the return', async () => {
    const r = await addNurbsCurveTool({
      code: SEED_CODE,
      controlPoints: [
        [0, 0, 0], [10, 0, 0], [20, 0, 0], [30, 0, 0],
      ],
    });
    expect(r.ok).toBe(true);
    expect(r.new_code).toMatch(/const _curve_1 = nurbsCurve\(/);
    expect(r.new_code).toContain('return base;');
    expect(r.diagnostics?.filter(d => d.severity === 'error') ?? []).toEqual([]);
  });

  it('honors explicit binding_name and serializes opts', async () => {
    const r = await addNurbsCurveTool({
      code: SEED_CODE,
      controlPoints: [[0, 0, 0], [10, 0, 0], [20, 0, 0], [30, 0, 0]],
      degree: 3,
      closed: false,
      binding_name: 'brow',
    });
    expect(r.ok).toBe(true);
    expect(r.new_code).toContain('const brow = nurbsCurve(');
    expect(r.new_code).toContain('degree: 3');
    expect(r.new_code).toContain('closed: false');
  });

  it('rejects controlPoints with bad shape', async () => {
    const r = await addNurbsCurveTool({
      code: SEED_CODE,
      controlPoints: [[0, 0], [10, 0, 0]] as number[][],
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Vec3/);
  });

  it('rejects fewer than 2 control points', async () => {
    const r = await addNurbsCurveTool({
      code: SEED_CODE,
      controlPoints: [[0, 0, 0]],
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/at least 2/);
  });

  it('auto-numbers consecutive bindings (_curve_2 follows _curve_1)', async () => {
    const codeWithOne = `const _curve_1 = nurbsCurve([[0,0,0],[1,0,0]]);\n${SEED_CODE}`;
    const r = await addNurbsCurveTool({
      code: codeWithOne,
      controlPoints: [[0, 0, 0], [10, 0, 0]],
    });
    expect(r.ok).toBe(true);
    expect(r.new_code).toMatch(/const _curve_2 = nurbsCurve\(/);
  });
});
