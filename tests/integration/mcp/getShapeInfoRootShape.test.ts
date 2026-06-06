import { describe, it, expect } from 'vitest';
import { getShapeInfoTool } from '../../../src/agent/mcp/tools/getShapeInfo';

describe('get_shape_info defaults to the returned shape', () => {
  it('measures the returned shape when a decoy is created after it', async () => {
    const r = await getShapeInfoTool({
      code: `
        const main = box(10, 10, 10, true);
        const decoy = box(1, 1, 1, true).translate(100, 100, 100);
        return main;
      `,
    });
    expect(r.ok).toBe(true);
    expect(r.shape!.bbox.max[0]).toBeCloseTo(5, 3);
    expect(r.shape!.volume).toBeCloseTo(1000, 0);
  });
});
