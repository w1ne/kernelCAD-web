// tests/unit/mcp/tools/getEdgesOf.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { getEdgesOfTool } from '../../../../src/mcp/tools/getEdgesOf';
import { initOcct } from '../../../../src/backends/occt/occtBackend';

describe('getEdgesOfTool', () => {
  beforeAll(async () => { await initOcct(); });

  it('returns 4 edges for the top face of a box', async () => {
    const result = await getEdgesOfTool({
      code: `return box(20, 20, 20);`,
      face_name: 'top',
    });
    expect(result.ok).toBe(true);
    expect(result.edges).toHaveLength(4);
    for (const e of result.edges!) {
      expect(e.centroid).toHaveLength(3);
      expect(e.length).toBeGreaterThan(0);
    }
  });

  it('returns 1 edge for the top face of a cylinder (the circle)', async () => {
    const result = await getEdgesOfTool({
      code: `return cylinder(10, 5);`,
      face_name: 'top',
    });
    expect(result.ok).toBe(true);
    expect(result.edges).toHaveLength(1);
    expect(result.edges![0].isClosed).toBe(true);
  });

  it('errors when face_name is not applicable', async () => {
    const result = await getEdgesOfTool({
      code: `return cylinder(10, 5);`,
      face_name: 'left',
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/not applicable/i);
  });

  it('errors when applied to a non-primitive', async () => {
    const result = await getEdgesOfTool({
      code: `return box(10, 10, 10).subtract(cylinder(10, 3));`,
      face_name: 'top',
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/un-transformed primitive|not.resolvable/i);
  });
});
