import { describe, it, expect } from 'vitest';
import { listPartCategoriesTool } from './listPartCategories';

describe('list_part_categories MCP tool', () => {
  it('returns the bundled top-level categories', async () => {
    const r = await listPartCategoriesTool({});
    expect(r.ok).toBe(true);
    expect(r.categories).toContain('fastener');
    expect(r.categories).toContain('bearing');
    expect(r.categories).toContain('motor');
    expect(r.categories).toContain('connector');
  });
});
