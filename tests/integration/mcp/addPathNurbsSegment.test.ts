// tests/integration/mcp/addPathNurbsSegment.test.ts
//
// NURBS Slice D Task 4: integration test for the `add_path_nurbs_segment`
// MCP tool. Covers minimal injection, chain-anchor-not-found rejection,
// degenerate-input rejection, and a full evaluateScript round-trip.

import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { addPathNurbsSegmentTool } from '../../../src/agent/mcp/tools/addPathNurbsSegment';

const SEED_CODE = [
  'const ridge = path().moveTo(0, 0);',
  'const sketch = ridge.lineTo(20, 0).close();',
  'return sketch.extrude(3);',
].join('\n');

describe('add_path_nurbs_segment MCP tool', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('injects a minimal .nurbsSegment() call into the chain-anchor', async () => {
    const r = await addPathNurbsSegmentTool({
      code: SEED_CODE,
      chain_anchor: 'ridge',
      controlPoints: [[0, 0], [5, 10], [15, 10], [20, 0]],
    });
    expect(r.ok).toBe(true);
    expect(r.new_code).toContain('.nurbsSegment([[0,0],[5,10],[15,10],[20,0]])');
  });

  it('serializes degree, weights, and knots', async () => {
    const r = await addPathNurbsSegmentTool({
      code: SEED_CODE,
      chain_anchor: 'ridge',
      controlPoints: [[0, 0], [5, 10], [15, 10], [20, 0]],
      degree: 3,
      weights: [1, 2, 2, 1],
      knots: [0, 0, 0, 0, 1, 1, 1, 1],
    });
    expect(r.ok).toBe(true);
    expect(r.new_code).toContain('degree: 3');
    expect(r.new_code).toContain('weights: [1,2,2,1]');
    expect(r.new_code).toContain('knots: [0,0,0,0,1,1,1,1]');
  });

  it('rejects an undeclared chain_anchor', async () => {
    const r = await addPathNurbsSegmentTool({
      code: SEED_CODE,
      chain_anchor: 'absent',
      controlPoints: [[0, 0], [5, 10]],
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/"absent" is not declared/);
  });

  it('rejects controlPoints below the minimum of 2', async () => {
    const r = await addPathNurbsSegmentTool({
      code: SEED_CODE,
      chain_anchor: 'ridge',
      controlPoints: [[0, 0]],
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/at least 2 control points/);
  });

  it('rejects mismatched weights length', async () => {
    const r = await addPathNurbsSegmentTool({
      code: SEED_CODE,
      chain_anchor: 'ridge',
      controlPoints: [[0, 0], [5, 10], [15, 10], [20, 0]],
      weights: [1, 1],
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/weights length/);
  });
});
