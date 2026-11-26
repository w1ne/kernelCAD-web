// tests/unit/mcp/tools/addFeature.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { addFeatureTool } from '../../../../src/agent/mcp/tools/addFeature';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';

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
    // The splice succeeded, but re-evaluation failed — ok reflects evaluation,
    // not the edit. new_code + diagnostics remain available so the agent can repair.
    expect(r.ok).toBe(false);
    expect(r.new_code).toBeDefined();
    expect(r.diagnostics?.some(d => d.severity === 'error')).toBe(true);
  });

  it('applies a bare immutable expression to the returned binding', async () => {
    const code = [
      `const plate = box(60, 40, 6);`,
      `return plate;`,
    ].join('\n');
    const r = await addFeatureTool({ code, feature_code: `plate.fillet(1.5)` });
    expect(r.ok).toBe(true);
    expect(r.new_code).toContain(`return plate.fillet(1.5);`);
    expect(r.new_code).toBe([
      `const plate = box(60, 40, 6);`,
      `return plate.fillet(1.5);`,
    ].join('\n'));
    // A filleted box has 26 faces; the unmodified box has 6.
    expect(r.sceneSummary?.faceCount).toBeGreaterThan(6);
    expect(r.sceneSummary?.volume).toBeLessThan(14400);
  });

  it('applies a declaration derived from the returned binding', async () => {
    const code = [
      `const plate = box(60, 40, 6);`,
      `return plate;`,
    ].join('\n');
    const r = await addFeatureTool({ code, feature_code: `const filleted = plate.fillet(1.5);` });
    expect(r.ok).toBe(true);
    expect(r.new_code).toContain(`return filleted;`);
    expect(r.sceneSummary?.faceCount).toBeGreaterThan(6);
    expect(r.sceneSummary?.volume).toBeLessThan(14400);
  });

  it('fails closed instead of returning unchanged geometry for an unused expression', async () => {
    const code = [
      `const plate = box(60, 40, 6);`,
      `const other = box(10, 10, 10);`,
      `return other;`,
    ].join('\n');
    const r = await addFeatureTool({ code, feature_code: `plate.fillet(1.5)` });
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe('feature.add.expression-unused');
    expect(r.error).toMatch(/bare expression/i);
    expect(r.new_code).toBeUndefined();
    expect(r.sceneSummary).toBeUndefined();
  });

  it('applies a bare edit to a same-line return without dropping the prefix (#1804)', async () => {
    const r = await addFeatureTool({
      code: `const plate = box(60, 40, 6); return plate;`,
      feature_code: `plate.fillet(1.5)`,
    });
    expect(r.ok).toBe(true);
    expect(r.new_code).toBe(`const plate = box(60, 40, 6);\nreturn plate.fillet(1.5);`);
    expect(r.diagnostics?.filter(d => d.severity === 'error')).toHaveLength(0);
    // 60 x 40 x 6 = 14400 mm^3 before the fillet removes material.
    expect(r.sceneSummary?.faceCount).toBeGreaterThan(6);
    expect(r.sceneSummary?.volume).toBeLessThan(14400);
  });

  it('fails closed for a bare identifier instead of reporting an unchanged model (#1804)', async () => {
    const code = [
      `const plate = box(60, 40, 6);`,
      `return plate;`,
    ].join('\n');
    const r = await addFeatureTool({ code, feature_code: `plate` });
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe('feature.add.expression-unused');
    expect(r.new_code).toBeUndefined();
    expect(r.sceneSummary).toBeUndefined();
  });
});
