// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { normalizeUserScript } from './normalizeUserScript';

/**
 * Studio runs a .kcad script as the body of `new Function(...)` whose return
 * value is the model. Agent-authored scripts are idiomatic TS/ESM modules
 * (`export default <model>`, `export const`, top-level `import`), which are a
 * SyntaxError inside a function body ("Unexpected token 'export'"). The
 * normalizer rewrites those module-isms into runnable function-body statements.
 */
describe('normalizeUserScript', () => {
  // Canonical kcad scripts already use `return` — must pass through untouched.
  it('leaves a canonical return-based script unchanged', () => {
    const code = [
      'const w = 60;',
      'const base = box(w, 40, 5);',
      'return base.fillet(1);',
    ].join('\n');
    expect(normalizeUserScript(code)).toBe(code);
  });

  it('rewrites `export default <expr>;` to `return <expr>;`', () => {
    const out = normalizeUserScript('const box = cube(20);\nexport default box;');
    expect(out).not.toMatch(/\bexport\b/);
    expect(out).toContain('return box;');
  });

  it('rewrites `export default <expr>` without a trailing semicolon', () => {
    const out = normalizeUserScript('export default cube(20)');
    expect(out).not.toMatch(/\bexport\b/);
    expect(out).toContain('return cube(20)');
  });

  it('rewrites a multi-line `export default` chained expression', () => {
    const out = normalizeUserScript(
      'export default base\n  .subtract(hole)\n  .fillet(1);',
    );
    expect(out).not.toMatch(/\bexport\b/);
    expect(out).toContain('return base');
    expect(out).toContain('.fillet(1);');
  });

  it('strips the `export` keyword from exported declarations', () => {
    const out = normalizeUserScript(
      'export const w = 60;\nexport function make() { return box(w, w, w); }\nexport default make();',
    );
    expect(out).not.toMatch(/\bexport\b/);
    expect(out).toContain('const w = 60;');
    expect(out).toContain('function make()');
    expect(out).toContain('return make();');
  });

  it('strips `export` from `export let`, `export var`, `export class`, `export async function`', () => {
    const out = normalizeUserScript(
      [
        'export let a = 1;',
        'export var b = 2;',
        'export class C {}',
        'export async function d() {}',
      ].join('\n'),
    );
    expect(out).not.toMatch(/\bexport\b/);
    expect(out).toContain('let a = 1;');
    expect(out).toContain('var b = 2;');
    expect(out).toContain('class C {}');
    expect(out).toContain('async function d() {}');
  });

  it('drops top-level ES import statements (named, default, namespace, side-effect)', () => {
    const out = normalizeUserScript(
      [
        "import { foo } from 'bar';",
        "import baz from 'qux';",
        "import * as ns from 'mod';",
        "import 'side-effect';",
        'const x = box(10, 10, 10);',
        'return x;',
      ].join('\n'),
    );
    expect(out).not.toMatch(/\bimport\b/);
    expect(out).toContain('const x = box(10, 10, 10);');
    expect(out).toContain('return x;');
  });

  it('drops `export { ... }` re-export statements', () => {
    const out = normalizeUserScript('const x = box(1, 1, 1);\nexport { x };\nreturn x;');
    expect(out).not.toMatch(/\bexport\b/);
    expect(out).toContain('const x = box(1, 1, 1);');
    expect(out).toContain('return x;');
  });

  it('keeps `export default function`/`class` as a declaration (strips export default)', () => {
    const out = normalizeUserScript('export default function model() { return box(1, 1, 1); }');
    expect(out).not.toMatch(/\bexport\b/);
    expect(out).toContain('function model()');
    // Must not produce `return function ...` (a function is not a model value).
    expect(out).not.toMatch(/return\s+function/);
  });

  it('does not touch the word "export" inside a string literal', () => {
    const code = 'const label = "export this part";\nreturn box(1, 1, 1);';
    expect(normalizeUserScript(code)).toBe(code);
  });

  it('is a no-op for empty / whitespace input', () => {
    expect(normalizeUserScript('')).toBe('');
    expect(normalizeUserScript('   \n  ')).toBe('   \n  ');
  });
});
