// tests/unit/mcp/tools/setParamValue.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { setParamValueTool } from '../../../../src/agent/mcp/tools/setParamValue';
import { initOcct } from '../../../../src/kernel/backends/occt/occtBackend';

describe('setParamValueTool', () => {
  beforeAll(async () => { await initOcct(); });

  it('replaces a param value and re-evaluates successfully', async () => {
    const code = `
      const w = param('Width', 60, { unit: 'mm' });
      return box(w, 20, 5);
    `;
    const r = await setParamValueTool({ code, param_name: 'Width', new_value: 120 });
    expect(r.ok).toBe(true);
    expect(r.new_code).toContain(`param('Width', 120,`);
    expect(r.diagnostics?.filter(d => d.severity === 'error')).toHaveLength(0);
  });

  it('returns error when param name is not found', async () => {
    const code = `const w = param('Width', 60);`;
    const r = await setParamValueTool({ code, param_name: 'Nope', new_value: 1 });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/not found/i);
  });

  it('surfaces re-evaluation diagnostics if the new value breaks the script', async () => {
    const code = `
      const w = param('Width', 60, { unit: 'mm' });
      return box(w, 20, 5);
    `;
    const r = await setParamValueTool({ code, param_name: 'Width', new_value: 'not_a_var' });
    // The edit succeeded, but the new value breaks re-evaluation — ok reflects
    // evaluation. new_code + diagnostics stay available so the agent can repair.
    expect(r.ok).toBe(false);
    expect(r.new_code).toBeDefined();
    expect(r.diagnostics).toBeDefined();
  });

  it('returns the raw error when neither code nor edit succeeds', async () => {
    const code = `const w = param('Width', 60);\nconst w2 = param('Width', 80);`;
    const r = await setParamValueTool({ code, param_name: 'Width', new_value: 5 });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/multiple/i);
  });

  it('replaces a boolean param value and re-evaluates successfully', async () => {
    const code = `
      const hasLid = param('HasLid', true);
      let m = box(60, 40, 20);
      if (hasLid.value) { m = m.chamfer('top', 1); }
      return m;
    `;
    const r = await setParamValueTool({ code, param_name: 'HasLid', new_value: false });
    expect(r.ok).toBe(true);
    expect(r.new_code).toContain(`param('HasLid', false)`);
    expect(r.diagnostics?.filter(d => d.severity === 'error')).toHaveLength(0);
  });

  it('replaces a choice param with a valid choice and re-evaluates successfully', async () => {
    const code = `
      const screw = param('Screw', 'M4', { choices: ['M3', 'M4', 'M5'] });
      const diameters: Record<string, number> = { M3: 3.4, M4: 4.5, M5: 5.5 };
      return box(60, 40, 5).hole('top', { u: 0, v: 0, diameter: diameters[screw.value], depth: 'through' });
    `;
    const r = await setParamValueTool({ code, param_name: 'Screw', new_value: 'M5' });
    expect(r.ok).toBe(true);
    expect(r.new_code).toContain(`param('Screw', 'M5',`);
    expect(r.diagnostics?.filter(d => d.severity === 'error')).toHaveLength(0);
  });

  it('surfaces a choice-invalid diagnostic when the new value is not a declared choice', async () => {
    const code = `
      const screw = param('Screw', 'M4', { choices: ['M3', 'M4', 'M5'] });
      const diameters: Record<string, number> = { M3: 3.4, M4: 4.5, M5: 5.5 };
      return box(60, 40, 5).hole('top', { u: 0, v: 0, diameter: diameters[screw.value], depth: 'through' });
    `;
    const r = await setParamValueTool({ code, param_name: 'Screw', new_value: 'M8' });
    expect(r.ok).toBe(false);
    expect(r.new_code).toBeDefined();
    expect(r.diagnostics).toBeDefined();
  });
});
