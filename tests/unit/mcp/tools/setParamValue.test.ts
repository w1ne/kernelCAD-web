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
});
