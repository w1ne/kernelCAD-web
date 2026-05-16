// tests/unit/mcp/tools/getEdgesOf.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { getEdgesOfTool } from '../../../../src/agent/mcp/tools/getEdgesOf';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';

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

  it('errors when face_name is not in the shape (e.g. left on a cylinder)', async () => {
    // A cylinder only has top and bottom canonical faces. Requesting 'left'
    // finds no match in the historyMap → face-ref-removed error.
    const result = await getEdgesOfTool({
      code: `return cylinder(10, 5);`,
      face_name: 'left',
    });
    expect(result.ok).toBe(false);
    // Either the face was not found in the map (removed) or it was never there.
    expect(result.error).toBeTruthy();
  });

  it('resolves canonical face refs on boolean results (v0.2: historyMap propagated through booleans)', async () => {
    // v0.2 propagates historyMap through booleans. The top face of a subtract
    // result still resolves as 'top' if it survived.
    const result = await getEdgesOfTool({
      code: `return box(10, 10, 10).subtract(cylinder(10, 3));`,
      face_name: 'top',
    });
    expect(result.ok).toBe(true);
    // The top face survives the cylinder hole; its boundary edges are returned.
    expect(result.edges!.length).toBeGreaterThan(0);
  });
});
