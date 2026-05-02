// tests/unit/mcp/tools/whyDidThisFail.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { whyDidThisFailTool } from '../../../../src/mcp/tools/whyDidThisFail';
import { initOcct } from '../../../../src/backends/occt/occtBackend';

describe('whyDidThisFailTool', () => {
  beforeAll(async () => { await initOcct(); });

  it('reports healthy for a clean script', async () => {
    const result = await whyDidThisFailTool({ code: `return box(10, 10, 10);` });
    expect(result.ok).toBe(true);
    expect(result.health).toBe('healthy');
    expect(result.diagnostics).toEqual([]);
  });

  it('reports error + diagnostic when fillet radius is too large', async () => {
    const result = await whyDidThisFailTool({
      code: `return box(10, 10, 10).fillet(100);`,
    });
    expect(result.ok).toBe(true);
    expect(result.health).toBe('error');
    expect(result.diagnostics!.length).toBeGreaterThan(0);
    expect(result.diagnostics![0].code).toBe('feature.fillet.failed');
  });

  it('walks upstream chain when downstream cascades', async () => {
    // Use a radius-too-large fillet so the lowering fails, then verify the upstream
    // box node is reported as healthy in the chain.
    const result = await whyDidThisFailTool({
      code: `return box(10, 10, 10).fillet(100);`,
    });
    expect(result.ok).toBe(true);
    expect(result.health).toBe('error');
    expect(result.upstream!.length).toBeGreaterThan(0);
    expect(result.upstream![0].kind).toBe('box');
    expect(result.upstream![0].health).toBe('healthy');
  });

  it('errors when feature_id is not found', async () => {
    const result = await whyDidThisFailTool({ code: `return box(10, 10, 10);`, feature_id: 'nope' });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });

  it('returns hints for known diagnostic codes', async () => {
    const result = await whyDidThisFailTool({ code: `return box(10, 10, 10).fillet(100);` });
    expect(result.ok).toBe(true);
    expect(result.hints).toEqual(expect.arrayContaining([expect.objectContaining({ hint: expect.stringMatching(/smaller radius/i) })]));
  });
});
