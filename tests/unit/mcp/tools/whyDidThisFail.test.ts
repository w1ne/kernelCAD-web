// tests/unit/mcp/tools/whyDidThisFail.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { whyDidThisFailTool } from '../../../../src/mcp/tools/whyDidThisFail';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';

describe('whyDidThisFailTool', () => {
  beforeAll(async () => { await initOcct(); });

  it('returns the requested feature in the chain (clean script — no diagnostics)', async () => {
    const result = await whyDidThisFailTool({ code: `return box(10, 10, 10);` });
    expect(result.ok).toBe(true);
    expect(result.chain).toBeDefined();
    expect(result.chain!.length).toBe(1);
    const last = result.chain![result.chain!.length - 1];
    expect(last.kind).toBe('box');
    expect(last.health).toBe('healthy');
    expect(last.diagnostics).toEqual([]);
  });

  it('returns the failing feature with kernel-failed diagnostic + inline hint', async () => {
    const result = await whyDidThisFailTool({
      code: `return box(10, 10, 10).fillet(100);`,
    });
    expect(result.ok).toBe(true);
    expect(result.chain).toBeDefined();
    const last = result.chain![result.chain!.length - 1];
    expect(last.health).toBe('error');
    expect(last.diagnostics.length).toBeGreaterThan(0);
    expect(last.diagnostics[0].code).toBe('feature.kernel-failed');
    expect(last.diagnostics[0].hint).toMatch(/smaller radius/i);
  });

  it('walks upstream chain in topological order; healthy box appears before failing fillet', async () => {
    const result = await whyDidThisFailTool({
      code: `return box(10, 10, 10).fillet(100);`,
    });
    expect(result.ok).toBe(true);
    expect(result.chain!.length).toBeGreaterThan(1);
    const box = result.chain!.find((c) => c.kind === 'box');
    expect(box).toBeDefined();
    expect(box!.health).toBe('healthy');
    expect(box!.diagnostics).toEqual([]);
    // Requested feature is the last entry.
    const last = result.chain![result.chain!.length - 1];
    expect(last.kind).toBe('fillet');
    expect(last.health).toBe('error');
  });

  it('errors when feature_id is not found', async () => {
    const result = await whyDidThisFailTool({ code: `return box(10, 10, 10);`, feature_id: 'nope' });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });
});
