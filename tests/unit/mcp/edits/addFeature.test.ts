// tests/unit/mcp/edits/addFeature.test.ts
import { describe, it, expect } from 'vitest';
import { addFeature } from '../../../../src/mcp/edits/addFeature';
import { parseCode } from '../../../../src/shared/codeGeneration/ast';

function expectParseable(code: string): void {
  expect(() => parseCode(code)).not.toThrow();
}

describe('addFeature primitive', () => {
  it('inserts a feature before the last return statement', () => {
    const code = [
      `const w = param('Width', 60);`,
      `const base = box(w, 20, 5);`,
      `return base;`,
    ].join('\n');
    const r = addFeature(code, `const hole = cylinder(5, 2);`);
    expect(r.ok).toBe(true);
    expect(r.new_code).toBe([
      `const w = param('Width', 60);`,
      `const base = box(w, 20, 5);`,
      `const hole = cylinder(5, 2);`,
      `return base;`,
    ].join('\n'));
    expectParseable(r.new_code);
  });

  it('preserves indentation of the surrounding lines', () => {
    const code = [
      `const w = param('Width', 60);`,
      `  return box(w, 20, 5);`, // indented
    ].join('\n');
    const r = addFeature(code, `const h = param('Height', 30);`);
    expect(r.ok).toBe(true);
    expect(r.new_code).toContain(`  const h = param('Height', 30);\n  return box(w, 20, 5);`);
    expectParseable(r.new_code);
  });

  it('inserts before the LAST return when multiple returns exist (e.g., in helpers)', () => {
    const code = [
      `function helper() { return 5; }`,
      `const w = helper();`,
      `return box(w, 20, 5);`,
    ].join('\n');
    const r = addFeature(code, `const t = 3;`);
    expect(r.ok).toBe(true);
    // The helper's return is preserved; insertion is before the top-level return.
    expect(r.new_code).toContain(`function helper() { return 5; }`);
    expect(r.new_code).toContain(`const t = 3;\nreturn box(w, 20, 5);`);
    expectParseable(r.new_code);
  });

  it('handles return with multi-line expression', () => {
    const code = [
      `const a = box(10, 10, 10);`,
      `return a`,
      `  .translate(5, 0, 0)`,
      `  .fillet(2);`,
    ].join('\n');
    const r = addFeature(code, `const b = cylinder(3, 1);`);
    expect(r.ok).toBe(true);
    // Insert before the line containing 'return' — multi-line return is preserved.
    expect(r.new_code).toContain(`const b = cylinder(3, 1);\nreturn a`);
    expectParseable(r.new_code);
  });

  it('errors when no return statement is found', () => {
    const code = `const w = param('Width', 60);\nconst base = box(w, 20, 5);`;
    const r = addFeature(code, `const h = param('Height', 30);`);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/no return/i);
  });

  it('handles single-line script with just a return', () => {
    const code = `return box(10, 10, 10);`;
    const r = addFeature(code, `const w = param('Width', 60);`);
    expect(r.ok).toBe(true);
    expect(r.new_code).toBe(`const w = param('Width', 60);\nreturn box(10, 10, 10);`);
    expectParseable(r.new_code);
  });

  it('preserves trailing newline in source', () => {
    const code = `const w = box(1, 1, 1);\nreturn w;\n`;
    const r = addFeature(code, `const h = box(2, 2, 2);`);
    expect(r.ok).toBe(true);
    expect(r.new_code).toBe(`const w = box(1, 1, 1);\nconst h = box(2, 2, 2);\nreturn w;\n`);
    expectParseable(r.new_code);
  });
});
