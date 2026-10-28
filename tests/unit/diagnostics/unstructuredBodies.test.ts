// tests/unit/diagnostics/unstructuredBodies.test.ts
//
// Array returns are auto-wrapped into a named Scene, so the retired
// `assembly.structure.unstructured-bodies` advisory must not fire for them.

import { describe, it, expect, beforeAll } from 'vitest';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const CODE = 'assembly.structure.unstructured-bodies';

function has(diags: { code: string }[]): boolean {
  return diags.some(d => d.code === CODE);
}

describe('retired assembly.structure.unstructured-bodies advisory', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('does not diagnose a named multi-Shape array return auto-wrapped as a Scene', async () => {
    const r = await evaluateScriptTool({
      code: `
        const a = box(10, 10, 10);
        const b = box(10, 10, 10).translate(20, 0, 0);
        return [a, b];
      `,
    });
    expect(r.ok).toBe(true);
    expect(r.parts).toEqual({ count: 2, names: ['a', 'b'] });
    expect(has(r.diagnostics)).toBe(false);
  });

  it('does not diagnose an anonymous multi-Shape array return auto-wrapped as a Scene', async () => {
    const r = await evaluateScriptTool({
      code: `return [box(10, 10, 10), box(10, 10, 10).translate(20, 0, 0)];`,
    });
    expect(r.ok).toBe(true);
    expect(r.parts).toEqual({ count: 2, names: ['part-1', 'part-2'] });
    expect(has(r.diagnostics)).toBe(false);
  });

  it('is silent on a single-body model', async () => {
    const r = await evaluateScriptTool({ code: `return box(10, 10, 10);` });
    expect(r.ok).toBe(true);
    expect(has(r.diagnostics)).toBe(false);
  });

  it('is silent on an assembly-built scene', async () => {
    const r = await evaluateScriptTool({
      // This assembly declares no mates, so the default T3 mechanism gate
      // would correctly flag it broken (mechanism.orphan-part). This test
      // is about the unstructured-bodies discipline diagnostic, not
      // mechanism validity — opt out so the assertion stays focused.
      skipMechanismCheck: true,
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
