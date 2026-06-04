import { describe, it, expect } from 'vitest';
import { listPartCategoriesTool } from '../../../src/agent/mcp/tools/listPartCategories';

describe('list_part_categories — end-to-end', () => {
  it('returns the bundled categories sorted', async () => {
    const r = await listPartCategoriesTool();
    expect(r.ok).toBe(true);
    const sorted = [...r.categories].sort();
    expect(r.categories).toEqual(sorted);
    expect(r.categories.length).toBeGreaterThanOrEqual(4);
  });
});
