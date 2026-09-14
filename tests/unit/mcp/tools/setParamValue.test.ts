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

  it('rejects a string value for a numeric param before rewriting (was: silently rewrote and broke on re-evaluation)', async () => {
    const code = `
      const w = param('Width', 60, { unit: 'mm' });
      return box(w, 20, 5);
    `;
    const r = await setParamValueTool({ code, param_name: 'Width', new_value: 'not_a_var' });
    expect(r.ok).toBe(false);
    expect(r.new_code).toBeUndefined();
    expect(r.error).toMatch(/number/i);
    expect(r.error).toMatch(/type-mismatch/);
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
      if (hasLid.value) { m = m.chamfer(1, { face: 'top' }); }
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

  // --- Type-mismatch / choice-invalid rejections (pre-rewrite gate) ---------
  //
  // set_param must REJECT a value that doesn't match the param's declared
  // kind BEFORE rewriting the source, with ok:false, NO new_code, and a
  // clear error naming the mismatch. Regression: this used to silently
  // rewrite the default (flipping a boolean param's inferred kind to
  // 'string', or accepting an out-of-choices value) and only fail later,
  // confusingly, when the corrupted code was re-evaluated or acted upon.

  const TYPED_CODE = `
    const hasLid = param('HasLid', true);
    const screw = param('Screw', 'M4', { choices: ['M3', 'M4', 'M5'] });
    const label = param('Label', 'KCAD', { maxLength: 24 });
    const diameters: Record<string, number> = { M3: 3.4, M4: 4.5, M5: 5.5 };
    let body = box(60, 40, 5).hole('top', { u: 0, v: 0, diameter: diameters[screw.value], depth: 'through' });
    if (hasLid.value) { body = body.chamfer(1, { face: 'top' }); }
    return body;
  `;

  it('rejects a non-boolean value for a boolean param (no new_code)', async () => {
    const r = await setParamValueTool({ code: TYPED_CODE, param_name: 'HasLid', new_value: 'yes' });
    expect(r.ok).toBe(false);
    expect(r.new_code).toBeUndefined();
    expect(r.error).toMatch(/boolean/i);
    expect(r.error).toMatch(/type-mismatch/);
  });

  it('rejects a non-string value for a string param (no new_code)', async () => {
    const r = await setParamValueTool({ code: TYPED_CODE, param_name: 'Label', new_value: 42 });
    expect(r.ok).toBe(false);
    expect(r.new_code).toBeUndefined();
    expect(r.error).toMatch(/string/i);
    expect(r.error).toMatch(/type-mismatch/);
  });

  it('rejects a value outside the declared choices for a choice param (no new_code)', async () => {
    const r = await setParamValueTool({ code: TYPED_CODE, param_name: 'Screw', new_value: 'M9' });
    expect(r.ok).toBe(false);
    expect(r.new_code).toBeUndefined();
    expect(r.error).toMatch(/M9/);
    expect(r.error).toMatch(/choice-invalid/);
  });

  it('still accepts a valid value for each typed kind after the rejection tests above', async () => {
    const bool = await setParamValueTool({ code: TYPED_CODE, param_name: 'HasLid', new_value: false });
    expect(bool.ok).toBe(true);
    expect(bool.new_code).toContain(`param('HasLid', false)`);

    const choice = await setParamValueTool({ code: TYPED_CODE, param_name: 'Screw', new_value: 'M5' });
    expect(choice.ok).toBe(true);
    expect(choice.new_code).toContain(`param('Screw', 'M5',`);

    const str = await setParamValueTool({ code: TYPED_CODE, param_name: 'Label', new_value: 'PROTO' });
    expect(str.ok).toBe(true);
    expect(str.new_code).toContain(`param('Label', 'PROTO',`);
  });
});
