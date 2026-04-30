// tests/unit/mcp/edits/removeFeature.test.ts
import { describe, it, expect } from 'vitest';
import { removeFeature } from '../../../../src/mcp/edits/removeFeature';

describe('removeFeature primitive', () => {
  it('removes a single matching line', () => {
    const code = [
      `const w = box(10, 10, 10);`,
      `const h = cylinder(5, 2);`,
      `return w.subtract(h);`,
    ].join('\n');
    const r = removeFeature(code, 'cylinder(5, 2)');
    expect(r.ok).toBe(true);
    expect(r.new_code).toBe([
      `const w = box(10, 10, 10);`,
      `return w.subtract(h);`,
    ].join('\n'));
  });

  it('preserves trailing newline if present', () => {
    const code = `const a = box(1,1,1);\nconst b = box(2,2,2);\nreturn a;\n`;
    const r = removeFeature(code, 'box(2,2,2)');
    expect(r.ok).toBe(true);
    expect(r.new_code).toBe(`const a = box(1,1,1);\nreturn a;\n`);
  });

  it('errors when match is not found', () => {
    const code = `const a = box(1,1,1);\nreturn a;`;
    const r = removeFeature(code, 'cylinder');
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/not found/i);
  });

  it('errors when match appears in multiple lines', () => {
    const code = [
      `const a = box(1,1,1);`,
      `const b = box(2,2,2);`,
      `return a;`,
    ].join('\n');
    const r = removeFeature(code, 'box');
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/multiple/i);
  });

  it('errors when match resolves to the return line', () => {
    const code = `const a = box(1,1,1);\nreturn a;`;
    const r = removeFeature(code, 'return');
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/return/i);
  });

  it('preserves indentation context (does not affect surrounding lines)', () => {
    const code = `  const a = box(1, 1, 1);\n  const b = cylinder(2, 1);\n  return a;\n`;
    const r = removeFeature(code, 'cylinder(2, 1)');
    expect(r.ok).toBe(true);
    expect(r.new_code).toBe(`  const a = box(1, 1, 1);\n  return a;\n`);
  });

  it('removes a line that is the only line in the script (other than return)', () => {
    const code = `const x = 5;\nreturn box(x, x, x);`;
    const r = removeFeature(code, 'const x');
    expect(r.ok).toBe(true);
    expect(r.new_code).toBe(`return box(x, x, x);`);
  });
});
