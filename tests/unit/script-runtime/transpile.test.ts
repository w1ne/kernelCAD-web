import { describe, it, expect } from 'vitest';
import { transpileTs } from '../../../src/modeling/runtime/transpile';

describe('transpileTs', () => {
  it('strips TypeScript types', () => {
    const src = 'const x: number = 1; export default x;';
    const out = transpileTs(src, 'test.kcad.ts');
    expect(out.code).toContain('const x = 1');
    expect(out.code).not.toContain(': number');
  });

  it('erases types in place: offsets unchanged, so no source map is needed', () => {
    const src = 'const x: number = 1;\nfunction f(a: string): number { return a.length; }\nreturn f("ab") + x;';
    const out = transpileTs(src, 'test.kcad.ts');
    expect(out.code).not.toMatch(/: (number|string)/);
    expect(out.code).toHaveLength(src.length);
    expect(out.code.indexOf('return f(')).toBe(src.indexOf('return f('));
    expect(out.sourceMap).toBeUndefined();
  });

  it('falls back to the TypeScript compiler, with a source map, for syntax that needs a transform', () => {
    const src = 'enum Side { Left, Right }\nconst s = Side.Right;';
    const out = transpileTs(src, 'test.kcad.ts');
    expect(out.code).toContain('Side');
    expect(out.code).not.toMatch(/^enum /m);
    expect(out.sourceMap).toBeDefined();
  });
});
