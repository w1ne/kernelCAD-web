// tests/unit/mcp/tools/listPartStats.test.ts
//
// Unit tests for the `list_part_stats` MCP tool — print-prep stats for the
// parts of a solved assembly. Inline two-box assembly keeps it unit-fast.
import { describe, it, expect, beforeAll } from 'vitest';
import { listPartStatsTool } from '../../../../src/agent/mcp/tools/listPartStats';

const TWO_BOX_ASSEMBLY = `
const arm = assembly('demo');
arm.part('a', box(10, 10, 10));
arm.part('b', box(10, 10, 10), { at: [20, 0, 0] });
return arm.model();
`;

beforeAll(async () => {
  const { initOcct } = await import('../../../../src/kernel/backends/occt/occtBackend');
  await initOcct();
}, 60000);

describe('list_part_stats MCP tool', () => {
  it('lists parts with positive volume, surface area, and triangle count', async () => {
    const r = await listPartStatsTool({ code: TWO_BOX_ASSEMBLY });
    expect(r.ok).toBe(true);
    expect(r.parts).toHaveLength(2);
    expect(r.parts!.map(p => p.name).sort()).toEqual(['a', 'b']);
    for (const p of r.parts!) {
      expect(p.volumeMm3).toBeCloseTo(1000, 0);
      expect(p.surfaceAreaMm2).toBeCloseTo(600, 0);
      expect(p.triangleCount).toBeGreaterThan(0);
    }
    // Part 'b' is placed at [20, 0, 0] — bbox must be world-frame.
    const b = r.parts!.find(p => p.name === 'b')!;
    expect(b.bbox.min[0]).toBeCloseTo(20, 1);
    expect(b.bbox.max[0]).toBeCloseTo(30, 1);
  }, 60000);

  it('fails with export.no-shape when the script does not return a Scene', async () => {
    const r = await listPartStatsTool({ code: 'return box(10, 10, 10);' });
    expect(r.ok).toBe(false);
    expect(r.diagnostics?.find(d => d.code === 'export.no-shape')).toBeDefined();
  }, 60000);

  it('returns ok: false when neither file nor code is provided', async () => {
    const r = await listPartStatsTool({});
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/file|code/);
  });
});
