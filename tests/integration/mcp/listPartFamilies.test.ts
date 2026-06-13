import { describe, it, expect } from 'vitest';
import { listPartFamiliesTool } from '../../../src/agent/mcp/tools/listPartFamilies';

describe('list_part_families — end-to-end', () => {
  it('returns all 14 bundled families with no filter', async () => {
    const r = await listPartFamiliesTool({});
    expect(r.ok).toBe(true);
    expect(r.families.length).toBe(14);
  });

  it('every family entry carries a count and exemplar list', async () => {
    const r = await listPartFamiliesTool({});
    for (const f of r.families) {
      expect(f.count).toBeGreaterThan(0);
      expect(f.exemplarIds.length).toBeGreaterThan(0);
      expect(f.exemplarIds.length).toBeLessThanOrEqual(3);
    }
  });
});
