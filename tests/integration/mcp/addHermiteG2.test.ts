// tests/integration/mcp/addHermiteG2.test.ts
//
// NURBS Slice C Task 7: integration test for the `add_hermite_g2` MCP tool.
// Covers minimal insertion, explicit binding_name, malformed Vec3 input, and
// optional curvature serialization. The capture-time validators
// (feature.hermite-g2.degenerate-tangent / non-finite-input) cover the
// physics; the MCP wrapper guards shape-of-input.

import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { addHermiteG2Tool } from '../../../src/agent/mcp/tools/addHermiteG2';

const SEED_CODE = [
  'const base = box(20, 20, 5);',
  'return base;',
].join('\n');

describe('add_hermite_g2 MCP tool', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('inserts a minimal hermiteG2 declaration before the return', async () => {
    const r = await addHermiteG2Tool({
      code: SEED_CODE,
      a: { point: [0, 0, 0], tangent: [10, 0, 0] },
      b: { point: [20, 0, 0], tangent: [10, 0, 0] },
    });
    expect(r.ok).toBe(true);
    expect(r.new_code).toMatch(/const _curve_1 = hermiteG2\(/);
    expect(r.new_code).toContain('return base;');
    expect(r.diagnostics?.filter(d => d.severity === 'error') ?? []).toEqual([]);
  });

  it('honors explicit binding_name and serializes optional curvature', async () => {
    const r = await addHermiteG2Tool({
      code: SEED_CODE,
      a: { point: [0, 0, 0], tangent: [5, 0, 0], curvature: [0, 1, 0] },
      b: { point: [10, 0, 0], tangent: [5, 0, 0], curvature: [0, -1, 0] },
      binding_name: 'bridge',
    });
    expect(r.ok).toBe(true);
    expect(r.new_code).toContain('const bridge = hermiteG2(');
    expect(r.new_code).toContain('curvature: [0,1,0]');
    expect(r.new_code).toContain('curvature: [0,-1,0]');
  });

  it('rejects an endpoint with a non-Vec3 point', async () => {
    const r = await addHermiteG2Tool({
      code: SEED_CODE,
      a: { point: [0, 0] as unknown as [number, number, number], tangent: [1, 0, 0] },
      b: { point: [10, 0, 0], tangent: [1, 0, 0] },
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/a\.point/);
  });

  it('rejects an endpoint with a non-finite tangent', async () => {
    const r = await addHermiteG2Tool({
      code: SEED_CODE,
      a: { point: [0, 0, 0], tangent: [Number.NaN, 0, 0] },
      b: { point: [10, 0, 0], tangent: [1, 0, 0] },
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/a\.tangent/);
  });
});
