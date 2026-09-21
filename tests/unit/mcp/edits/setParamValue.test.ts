// tests/unit/mcp/edits/setParamValue.test.ts
import { describe, it, expect } from 'vitest';
import { setParamValue, parseParamDeclaration } from '../../../../src/modeling/edits/setParamValue';
import { parseCode } from '../../../../src/shared/codeGeneration/ast';

function expectParseable(code: string): void {
  expect(() => parseCode(code)).not.toThrow();
}

describe('setParamValue (regex AST-edit primitive)', () => {
  it('replaces a numeric default with a number', () => {
    const code = `const w = param('Width', 60, { unit: 'mm' });`;
    const r = setParamValue(code, 'Width', 120);
    expect(r.ok).toBe(true);
    expect(r.new_code).toBe(`const w = param('Width', 120, { unit: 'mm' });`);
    expectParseable(r.new_code);
  });

  it('replaces a numeric default with an expression string', () => {
    const code = `const w = param('Width', 60, { unit: 'mm' });`;
    const r = setParamValue(code, 'Width', 'h * 2');
    expect(r.ok).toBe(true);
    expect(r.new_code).toBe(`const w = param('Width', 'h * 2', { unit: 'mm' });`);
    expectParseable(r.new_code);
  });

  it('handles param without an opts object', () => {
    const code = `const w = param('Width', 60);`;
    const r = setParamValue(code, 'Width', 120);
    expect(r.ok).toBe(true);
    expect(r.new_code).toBe(`const w = param('Width', 120);`);
    expectParseable(r.new_code);
  });

  it('handles double-quoted param name', () => {
    const code = `const w = param("Width", 60, { unit: "mm" });`;
    const r = setParamValue(code, 'Width', 120);
    expect(r.ok).toBe(true);
    expect(r.new_code).toBe(`const w = param("Width", 120, { unit: "mm" });`);
    expectParseable(r.new_code);
  });

  it('preserves nested option objects', () => {
    const code = `const w = param('Width', 60, { unit: 'mm', range: { min: 30, max: 200 } });`;
    const r = setParamValue(code, 'Width', 120);
    expect(r.ok).toBe(true);
    expect(r.new_code).toBe(`const w = param('Width', 120, { unit: 'mm', range: { min: 30, max: 200 } });`);
    expectParseable(r.new_code);
  });

  it('only replaces the matching name (leaves other params alone)', () => {
    const code = [
      `const w = param('Width', 60, { unit: 'mm' });`,
      `const h = param('Height', 40, { unit: 'mm' });`,
    ].join('\n');
    const r = setParamValue(code, 'Width', 120);
    expect(r.ok).toBe(true);
    expect(r.new_code).toContain(`param('Width', 120, { unit: 'mm' })`);
    expect(r.new_code).toContain(`param('Height', 40, { unit: 'mm' })`);
    expectParseable(r.new_code);
  });

  it('returns error when param name is not found', () => {
    const code = `const w = param('Width', 60);`;
    const r = setParamValue(code, 'Depth', 30);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/not found/i);
  });

  it('returns error when param name appears multiple times', () => {
    const code = [
      `const w1 = param('Width', 60);`,
      `const w2 = param('Width', 80);`,
    ].join('\n');
    const r = setParamValue(code, 'Width', 120);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/multiple/i);
  });

  it('handles param values that are themselves quoted expressions', () => {
    const code = `const h = param('Height', 'w * 0.5', { unit: 'mm' });`;
    const r = setParamValue(code, 'Height', 50);
    expect(r.ok).toBe(true);
    expect(r.new_code).toBe(`const h = param('Height', 50, { unit: 'mm' });`);
    expectParseable(r.new_code);
  });

  it('handles multi-line param() calls', () => {
    const code = `const w = param(\n  'Width',\n  60,\n  { unit: 'mm' }\n);`;
    const r = setParamValue(code, 'Width', 120);
    expect(r.ok).toBe(true);
    // Multi-line param() — exact whitespace preservation isn't required, but the
    // value must change.
    expect(r.new_code).toContain(`120`);
    expect(r.new_code).not.toContain(`60`);
    expectParseable(r.new_code);
  });
});

describe('parseParamDeclaration (source-text-only param kind reader)', () => {
  it('classifies a boolean default', () => {
    const r = parseParamDeclaration(`const b = param('HasLid', true);`, 'HasLid');
    expect(r).toEqual({ ok: true, declaration: { name: 'HasLid', kind: 'boolean' } });
  });

  it('classifies a numeric default', () => {
    const r = parseParamDeclaration(`const w = param('Width', 60, { unit: 'mm' });`, 'Width');
    expect(r).toEqual({ ok: true, declaration: { name: 'Width', kind: 'number' } });
  });

  it('classifies a choice default (string default + meta.choices)', () => {
    const r = parseParamDeclaration(
      `const s = param('Screw', 'M4', { choices: ['M3', 'M4', 'M5'] });`,
      'Screw',
    );
    expect(r).toEqual({
      ok: true,
      declaration: { name: 'Screw', kind: 'choice', choices: ['M3', 'M4', 'M5'] },
    });
  });

  it('classifies a plain string default with maxLength', () => {
    const r = parseParamDeclaration(
      `const l = param('Label', 'KCAD', { maxLength: 24 });`,
      'Label',
    );
    expect(r).toEqual({
      ok: true,
      declaration: { name: 'Label', kind: 'string', maxLength: 24 },
    });
  });

  it('returns kind "unknown" for a non-literal default (variable/expression)', () => {
    const r = parseParamDeclaration(`const h = param('Height', someVar);`, 'Height');
    expect(r).toEqual({ ok: true, declaration: { name: 'Height', kind: 'unknown' } });
  });

  it('does NOT require the script to be evaluable — pure text parsing', () => {
    const code = `
      const b = param('HasLid', true);
      body = body.union(thisIdentifierDoesNotExist);
    `;
    const r = parseParamDeclaration(code, 'HasLid');
    expect(r).toEqual({ ok: true, declaration: { name: 'HasLid', kind: 'boolean' } });
  });

  it('returns ok:false when the param is not found', () => {
    const r = parseParamDeclaration(`const w = param('Width', 60);`, 'Nope');
    expect(r.ok).toBe(false);
  });
});
