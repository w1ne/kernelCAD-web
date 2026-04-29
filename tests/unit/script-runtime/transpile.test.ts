import { describe, it, expect } from 'vitest';
import { transpileTs } from '../../../src/script-runtime/transpile';

describe('transpileTs', () => {
  it('strips TypeScript types', () => {
    const src = 'const x: number = 1; export default x;';
    const out = transpileTs(src, 'test.kcad.ts');
    expect(out.code).toContain('const x = 1');
    expect(out.code).not.toContain(': number');
  });

  it('preserves source map reference', () => {
    const src = 'const x = 1;';
    const out = transpileTs(src, 'test.kcad.ts');
    expect(out.sourceMap).toBeDefined();
  });
});
