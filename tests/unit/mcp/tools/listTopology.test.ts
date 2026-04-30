// tests/unit/mcp/tools/listTopology.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { listTopologyTool } from '../../../../src/mcp/tools/listTopology';
import { initOcct } from '../../../../src/backends/occt/occtBackend';

describe('listTopologyTool', () => {
  beforeAll(async () => { await initOcct(); });

  it('returns canonical face names for an un-transformed box', async () => {
    const result = await listTopologyTool({ code: `return box(10, 10, 10);` });
    expect(result.ok).toBe(true);
    expect(result.hasTrackedTopology).toBe(true);
    expect(result.faceNames).toEqual(
      expect.arrayContaining(['top', 'bottom', 'left', 'right', 'front', 'back']),
    );
    expect(result.edgeCount).toBe(12);
  });

  it('returns just top/bottom for a cylinder', async () => {
    const result = await listTopologyTool({ code: `return cylinder(10, 5);` });
    expect(result.ok).toBe(true);
    expect(result.hasTrackedTopology).toBe(true);
    expect(result.faceNames!.sort()).toEqual(['bottom', 'top']);
  });

  it('returns no canonical names for a sphere', async () => {
    const result = await listTopologyTool({ code: `return sphere(5);` });
    expect(result.ok).toBe(true);
    expect(result.hasTrackedTopology).toBe(true);
    expect(result.faceNames).toEqual([]);
  });

  it('returns hasTrackedTopology=false for a boolean result', async () => {
    const result = await listTopologyTool({
      code: `
        const a = box(10, 10, 10);
        const b = cylinder(10, 3).translate(0, 0, -1);
        return a.subtract(b);
      `,
    });
    expect(result.ok).toBe(true);
    expect(result.hasTrackedTopology).toBe(false);
    expect(result.faceNames).toEqual([]);
    expect(result.edgeCount).toBeGreaterThan(0);
  });

  it('errors when feature_id is not found', async () => {
    const result = await listTopologyTool({ code: `return box(10, 10, 10);`, feature_id: 'nope' });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });
});
