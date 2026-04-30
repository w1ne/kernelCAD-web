// tests/unit/mcp/tools/addFeature.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { addFeatureTool } from '../../../../src/mcp/tools/addFeature';
import { initOcct } from '../../../../src/backends/occt/occtBackend';

describe('addFeatureTool', () => {
  beforeAll(async () => { await initOcct(); });

  it('inserts a feature line and re-evaluates successfully', async () => {
    const code = [
      `const base = box(20, 20, 5);`,
      `return base;`,
    ].join('\n');
    const r = await addFeatureTool({ code, feature_code: `const hole = cylinder(5, 2).translate(10, 10, -1);` });
    expect(r.ok).toBe(true);
    expect(r.new_code).toContain(`const hole = cylinder(5, 2)`);
    expect(r.diagnostics?.filter(d => d.severity === 'error')).toHaveLength(0);
  });

  it('returns error when no return statement', async () => {
    const code = `const base = box(20, 20, 5);`; // no return
    const r = await addFeatureTool({ code, feature_code: `const x = 1;` });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/no return/i);
  });

  it('surfaces re-evaluation errors when inserted code is invalid', async () => {
    const code = [
      `const base = box(10, 10, 10);`,
      `return base;`,
    ].join('\n');
    const r = await addFeatureTool({ code, feature_code: `const x = nonexistent();` });
    expect(r.ok).toBe(true); // edit succeeded
    expect(r.diagnostics?.some(d => d.severity === 'error')).toBe(true);
  });
});
