// tests/unit/mcp/tools/removeFeature.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { removeFeatureTool } from '../../../../src/mcp/tools/removeFeature';
import { initOcct } from '../../../../src/backends/occt/occtBackend';

describe('removeFeatureTool', () => {
  beforeAll(async () => { await initOcct(); });

  it('removes a feature line and re-evaluates successfully', async () => {
    const code = [
      `const a = box(20, 20, 5);`,
      `const b = cylinder(5, 2);`,
      `return a;`,
    ].join('\n');
    const r = await removeFeatureTool({ code, match: 'cylinder(5, 2)' });
    expect(r.ok).toBe(true);
    expect(r.new_code).not.toContain(`cylinder(5, 2)`);
    expect(r.new_code).toContain(`return a`);
    expect(r.diagnostics?.filter(d => d.severity === 'error')).toHaveLength(0);
  });

  it('returns error when match not found', async () => {
    const code = `return box(10, 10, 10);`;
    const r = await removeFeatureTool({ code, match: 'nonexistent' });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/not found/i);
  });

  it('returns error when match is the return line', async () => {
    const code = `const a = box(10,10,10);\nreturn a;`;
    const r = await removeFeatureTool({ code, match: 'return' });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/return/i);
  });

  it('surfaces re-evaluation errors when removing a line breaks the script', async () => {
    // Remove the const declaration of a variable used later — re-eval will fail.
    const code = [
      `const w = box(10, 10, 10);`,
      `return w.subtract(box(5, 5, 5));`,
    ].join('\n');
    // Removing the const w line makes 'w' undefined.
    const r = await removeFeatureTool({ code, match: `const w = box` });
    expect(r.ok).toBe(true); // edit succeeded
    expect(r.new_code).not.toContain(`const w = box`);
    // Re-eval should produce an error diagnostic
    expect(r.diagnostics?.some(d => d.severity === 'error')).toBe(true);
  });
});
