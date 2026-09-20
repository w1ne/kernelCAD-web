import { describe, it, expect, beforeAll } from 'vitest';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';
import { dryRunScript } from '../../../src/agent/cli/commands/evaluate';
import { isExportableReturn } from '../../../src/modeling/validation/noShapeReturn';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const CODE = 'export.no-shape';

describe('export.no-shape from the evaluate seam', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('fires when a script builds features but never returns', async () => {
    const r = await evaluateScriptTool({
      code: `
        const b = box(10, 10, 10);
        const c = b.translate(20, 0, 0);
      `,
    });
    expect(r.ok).toBe(false);
    const d = r.diagnostics.find(x => x.code === CODE);
    expect(d).toBeDefined();
    expect(d!.severity).toBe('error');
    expect(d!.nextAction).toEqual({ kind: 'add-return' });
  });

  it('fires when a script returns nothing at all', async () => {
    const r = await evaluateScriptTool({ code: `const x = 1 + 1;` });
    expect(r.ok).toBe(false);
    expect(r.diagnostics.some(x => x.code === CODE)).toBe(true);
  });

  it('fires on a primitive return', async () => {
    const r = await evaluateScriptTool({ code: `return 42;` });
    expect(r.ok).toBe(false);
    expect(r.diagnostics.some(x => x.code === CODE)).toBe(true);
  });

  it('stays silent on a Shape return', async () => {
    const r = await evaluateScriptTool({ code: `return box(10, 10, 10);` });
    expect(r.ok).toBe(true);
    expect(r.diagnostics.some(x => x.code === CODE)).toBe(false);
  });

  it('stays silent on a non-empty array of Shapes', async () => {
    const r = await evaluateScriptTool({
      code: `return [box(10, 10, 10), box(10, 10, 10).translate(20, 0, 0)];`,
    });
    expect(r.ok).toBe(true);
    expect(r.diagnostics.some(x => x.code === CODE)).toBe(false);
  });

  it('fires on an empty array return', async () => {
    const r = await evaluateScriptTool({ code: `return [];` });
    expect(r.ok).toBe(false);
    expect(r.diagnostics.some(x => x.code === CODE)).toBe(true);
  });

  it('fires on an array that mixes a Shape with a non-Shape element', async () => {
    const r = await evaluateScriptTool({ code: `return [box(10, 10, 10), 1];` });
    expect(r.ok).toBe(false);
    expect(r.diagnostics.some(x => x.code === CODE)).toBe(true);
  });

  it('fires from dryRunScript too (cheap pre-check)', async () => {
    const r = await dryRunScript({ code: `const b = box(10, 10, 10);` });
    expect(r.evaluation.diagnostics.some(d => d.code === CODE)).toBe(true);
    expect(r.evaluation.exitCode).toBe(1);
  });
});

describe('isExportableReturn', () => {
  it('rejects an empty array', () => {
    expect(isExportableReturn([])).toBe(false);
  });

  it('rejects an array of non-Shape values', () => {
    expect(isExportableReturn([1, 2])).toBe(false);
  });

  it('rejects a primitive', () => {
    expect(isExportableReturn(42)).toBe(false);
  });

  it('accepts a structurally valid Region', () => {
    // `isRegion` is structural — it checks the outer/holes/bendLines
    // arrays rather than a class brand — so a plain object satisfies it.
    expect(
      isExportableReturn({ outer: [[0, 0], [1, 0], [0, 1]], holes: [], bendLines: [] }),
    ).toBe(true);
  });
});
