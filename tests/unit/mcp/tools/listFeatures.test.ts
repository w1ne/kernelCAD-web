// tests/unit/mcp/tools/listFeatures.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { listFeaturesTool } from '../../../../src/agent/mcp/tools/listFeatures';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';

describe('listFeaturesTool', () => {
  beforeAll(async () => { await initOcct(); });

  it('lists features from a simple script', async () => {
    const result = await listFeaturesTool({ code: `return box(10, 10, 10);` });
    expect(result.features).toHaveLength(1);
    expect(result.features[0].kind).toBe('box');
    expect(result.features[0].id).toBeTruthy();
  });

  it('lists multiple features in capture order', async () => {
    const result = await listFeaturesTool({
      code: `
        const a = box(10, 10, 10);
        const b = cylinder(5, 3).translate(2, 2, 0);
        return a.subtract(b).fillet(1);
      `,
    });
    expect(result.features.map(f => f.kind)).toEqual(['box', 'cylinder', 'boolean', 'fillet']);
  });

  it('returns empty list when script returns nothing', async () => {
    const result = await listFeaturesTool({ code: `return undefined;` });
    expect(result.features).toHaveLength(0);
  });
});
