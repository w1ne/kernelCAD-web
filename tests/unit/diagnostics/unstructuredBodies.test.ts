// tests/unit/diagnostics/unstructuredBodies.test.ts
//
// Agent-parts-discipline check: a multi-body model authored as loose
// top-level bodies (no `assembly().part(...)`) emits the advisory
// `assembly.structure.unstructured-bodies` (info). It surfaces from the
// shared evaluate seam, so both `evaluate_script` and the
// `/__kernelcad/review` payload (via reviewCadTool → evaluateAndBuildScript)
// carry it. Single-body / assembly-built / sketch-only returns stay silent.

import { describe, it, expect, beforeAll } from 'vitest';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const CODE = 'assembly.structure.unstructured-bodies';

function has(diags: { code: string }[]): boolean {
  return diags.some(d => d.code === CODE);
}

describe('assembly.structure.unstructured-bodies', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('fires on a loose 2-body return (named variables)', async () => {
    const r = await evaluateScriptTool({
      code: `
        const a = box(10, 10, 10);
        const b = box(10, 10, 10).translate(20, 0, 0);
        return [a, b];
      `,
    });
    expect(r.ok).toBe(true);
    expect(has(r.diagnostics)).toBe(true);
    const d = r.diagnostics.find(x => x.code === CODE)!;
    expect(d.severity).toBe('info');
    expect(d.hint).toMatch(/assembly\(\)\.part/);
  });

  it('fires on an anonymous multi-return (no variable names)', async () => {
    const r = await evaluateScriptTool({
      code: `return [box(10, 10, 10), box(10, 10, 10).translate(20, 0, 0)];`,
    });
    expect(r.ok).toBe(true);
    expect(has(r.diagnostics)).toBe(true);
    const d = r.diagnostics.find(x => x.code === CODE)!;
    // Message notes that the returned bodies are anonymous expressions.
    expect(d.message).toMatch(/anonymous|named variables/i);
  });

  it('is silent on a single-body model', async () => {
    const r = await evaluateScriptTool({ code: `return box(10, 10, 10);` });
    expect(r.ok).toBe(true);
    expect(has(r.diagnostics)).toBe(false);
  });

  it('is silent on an assembly-built scene', async () => {
    const r = await evaluateScriptTool({
      code: `
        const arm = assembly('rig');
        arm.part('base', box(10, 10, 10));
        arm.part('lid', box(10, 10, 2).translate(0, 0, 12));
        return arm.model();
      `,
    });
    expect(r.ok).toBe(true);
    expect(has(r.diagnostics)).toBe(false);
  });

  it('is silent on a named single return', async () => {
    const r = await evaluateScriptTool({
      code: `
        const part = box(40, 30, 5).subtract(cylinder(8, 4).translate(20, 15, -1));
        return part;
      `,
    });
    expect(r.ok).toBe(true);
    expect(has(r.diagnostics)).toBe(false);
  });
});
