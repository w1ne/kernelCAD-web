// tests/unit/mcp/tools/getShapeInfo.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { getShapeInfoTool } from '../../../../src/agent/mcp/tools/getShapeInfo';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';

describe('getShapeInfoTool', () => {
  beforeAll(async () => { await initOcct(); });

  it('returns info on the last feature when feature_id is omitted', async () => {
    const result = await getShapeInfoTool({ code: `return box(10, 10, 10);` });
    expect(result.ok).toBe(true);
    expect(result.shape).toBeDefined();
    expect(result.shape!.kind).toBe('box');
    expect(result.shape!.volume).toBeCloseTo(1000, 1);
  });

  it('returns info on a specific feature_id', async () => {
    const result = await getShapeInfoTool({
      code: `
        const b = box(10, 10, 10);
        const c = cylinder(5, 2);
        return b.subtract(c);
      `,
    });
    expect(result.ok).toBe(true);
    expect(result.shape!.kind).toBe('boolean');
    expect(result.shape!.volume).toBeLessThan(1000);
  });

  it('returns ok=false when feature_id is not found', async () => {
    const result = await getShapeInfoTool({
      code: `return box(10, 10, 10);`,
      feature_id: 'nonexistent_xyz',
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });

  it('reports volume / bbox / surfaceArea for a fillet', async () => {
    const result = await getShapeInfoTool({ code: `return box(20, 20, 20).fillet(2);` });
    expect(result.ok).toBe(true);
    expect(result.shape!.kind).toBe('fillet');
    expect(result.shape!.volume).toBeLessThan(8000);
    expect(result.shape!.bbox).toBeDefined();
    expect(result.shape!.surfaceArea).toBeGreaterThan(0);
  });
});
