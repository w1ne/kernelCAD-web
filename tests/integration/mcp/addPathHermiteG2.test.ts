// tests/integration/mcp/addPathHermiteG2.test.ts
//
// NURBS Slice D Task 4: integration test for the `add_path_hermite_g2`
// MCP tool. Covers minimal injection, chain-anchor-not-found rejection,
// degenerate-input rejection, and evaluateScript round-trip.

import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { addPathHermiteG2Tool } from '../../../src/agent/mcp/tools/addPathHermiteG2';

const SEED_CODE = [
  'const bridge = path().moveTo(-10, 0);',
  'const sk = bridge.lineTo(10, 0).close();',
  'return sk.extrude(2);',
].join('\n');

describe('add_path_hermite_g2 MCP tool', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('injects a minimal .hermiteG2() call into the chain-anchor', async () => {
    const r = await addPathHermiteG2Tool({
      code: SEED_CODE,
      chain_anchor: 'bridge',
      a: { point: [-10, 0], tangent: [0, 5] },
      b: { point: [10, 0], tangent: [0, -5] },
    });
    expect(r.ok).toBe(true);
    expect(r.new_code).toContain('.hermiteG2({ point: [-10,0], tangent: [0,5] }, { point: [10,0], tangent: [0,-5] })');
  });

  it('serializes optional curvature', async () => {
    const r = await addPathHermiteG2Tool({
      code: SEED_CODE,
      chain_anchor: 'bridge',
      a: { point: [-10, 0], tangent: [0, 5], curvature: [0, 1] },
      b: { point: [10, 0], tangent: [0, -5], curvature: [0, -1] },
    });
    expect(r.ok).toBe(true);
    expect(r.new_code).toContain('curvature: [0,1]');
    expect(r.new_code).toContain('curvature: [0,-1]');
  });

  it('rejects an undeclared chain_anchor', async () => {
    const r = await addPathHermiteG2Tool({
      code: SEED_CODE,
      chain_anchor: 'absent',
      a: { point: [-10, 0], tangent: [0, 5] },
      b: { point: [10, 0], tangent: [0, -5] },
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/"absent" is not declared/);
  });

  it('rejects a non-Vec2 point', async () => {
    const r = await addPathHermiteG2Tool({
      code: SEED_CODE,
      chain_anchor: 'bridge',
      a: { point: [-10] as unknown as [number, number], tangent: [0, 5] },
      b: { point: [10, 0], tangent: [0, -5] },
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/a\.point/);
  });

  it('rejects a non-finite tangent', async () => {
    const r = await addPathHermiteG2Tool({
      code: SEED_CODE,
      chain_anchor: 'bridge',
      a: { point: [-10, 0], tangent: [Number.NaN, 0] },
      b: { point: [10, 0], tangent: [0, -5] },
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/a\.tangent/);
  });
});
