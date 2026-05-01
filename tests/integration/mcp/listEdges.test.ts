// tests/integration/mcp/listEdges.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { listEdgesTool } from '../../../src/mcp/tools/listEdges';
import { listFacesTool } from '../../../src/mcp/tools/listFaces';
import { listFaceLabelsTool } from '../../../src/mcp/tools/listFaceLabels';

describe('list_edges MCP tool', () => {
  beforeAll(async () => {
    const { initOcct } = await import('../../../src/backends/occt/occtBackend');
    await initOcct();
  });

  it('lists 12 edges for a box with full metadata', async () => {
    const r = await listEdgesTool({ code: `return box(10, 10, 5);` });
    expect(r.ok).toBe(true);
    expect(r.edges).toHaveLength(12);
    expect(r.edges![0]).toHaveProperty('id');
    expect(r.edges![0]).toHaveProperty('midpoint');
    expect(r.edges![0]).toHaveProperty('direction');
    expect(r.edges![0]).toHaveProperty('curveType');
  });

  it('filters with EdgeQuery: { atZ: 5 } -> 4 top edges', async () => {
    const r = await listEdgesTool({ code: `return box(10, 10, 5);`, query: { atZ: 5 } });
    expect(r.ok).toBe(true);
    expect(r.edges).toHaveLength(4);
    for (const e of r.edges!) expect(e.midpoint[2]).toBeCloseTo(5, 1);
  });
});

describe('list_faces MCP tool', () => {
  beforeAll(async () => {
    const { initOcct } = await import('../../../src/backends/occt/occtBackend');
    await initOcct();
  });

  it('lists 6 faces for a box with surface type PLANE', async () => {
    const r = await listFacesTool({ code: `return box(10, 10, 5);` });
    expect(r.ok).toBe(true);
    expect(r.faces).toHaveLength(6);
    for (const f of r.faces!) expect(f.surfaceType).toBe('PLANE');
  });

  it('filters by parallelTo XY -> 2 faces (top + bottom)', async () => {
    const r = await listFacesTool({ code: `return box(10, 10, 5);`, query: { parallelTo: 'XY' } });
    expect(r.ok).toBe(true);
    expect(r.faces).toHaveLength(2);
  });
});

describe('list_face_labels MCP tool', () => {
  it('returns labels from a labeled sketch', async () => {
    const code = `
      return path().moveTo(0,0)
        .lineTo(10,0).label('bottom')
        .lineTo(10,5).label('right')
        .lineTo(0,5).label('topRim')
        .close()
        .extrude(3);
    `;
    const r = await listFaceLabelsTool({ code });
    expect(r.ok).toBe(true);
    expect(r.labels).toHaveLength(3);
    const names = r.labels!.map(l => l.name);
    expect(names).toContain('bottom');
    expect(names).toContain('right');
    expect(names).toContain('topRim');
  });

  it('returns empty array for a sketch with no labels', async () => {
    const r = await listFaceLabelsTool({ code: `return path().moveTo(0,0).lineTo(5,0).lineTo(5,5).close().extrude(1);` });
    expect(r.ok).toBe(true);
    expect(r.labels).toHaveLength(0);
  });
});
