// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { assertNoModuleLoading } from './moduleLoadingCheck';

describe('assertNoModuleLoading', () => {
  it('refuses dynamic import() and import.meta wherever they appear', () => {
    for (const code of [
      "void import('https://example.invalid/x.js');",
      "const m = await import('./local.js'); return m;",
      "return [1].map(() => import /* gap */ ('x'));",
      'const t = `${import("x")}`; return t;',
      'return import.meta.url;',
    ]) {
      expect(() => assertNoModuleLoading(code), code).toThrow(/import\(\) and import\.meta are not available/);
    }
  });

  it('allows the word import in strings, comments and property names', () => {
    expect(() => assertNoModuleLoading([
      "// import('x') is not supported here",
      "const label = 'import(';",
      'const o = { import: 1 }; o.import += 1;',
      'return box(1, 2, 3);',
    ].join('\n'))).not.toThrow();
  });

  it('refuses code it cannot parse instead of running it unchecked', () => {
    expect(() => assertNoModuleLoading('return (;')).toThrow(/could not check this model/);
  });
});
