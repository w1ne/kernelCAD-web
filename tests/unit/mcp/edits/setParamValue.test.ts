// tests/unit/mcp/edits/setParamValue.test.ts
import { describe, it, expect } from 'vitest';
import { setParamValue } from '../../../../src/agent/mcp/edits/setParamValue';
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
