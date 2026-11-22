import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import {
  TOKENIZER_ENCODING,
  TOKENIZER_PACKAGE_VERSION,
  countSource,
  removeComments,
  removeTopLevelMeta,
  summarize,
} from '../../../scripts/tokenBenchmark';

const fixture = `meta({ title: 'Test asset', tags: ['one', 'two'] });
// geometry comment
const part = box(10, 20, 3); /* second comment */
return part;
`;

describe('token benchmark', () => {
  it('pins the same encoding family and tokenizer implementation version', async () => {
    const packageJson = JSON.parse(await readFile(new URL('../../../package.json', import.meta.url), 'utf8'));
    expect(TOKENIZER_ENCODING).toBe('o200k_base');
    expect(TOKENIZER_PACKAGE_VERSION).toBe('1.0.21');
    expect(packageJson.devDependencies['js-tiktoken']).toBe('1.0.21');
  });

  it('counts source with meta and removes exactly the meta statement for the second count', () => {
    const counts = countSource(fixture, 'fixture.kcad.ts');
    const withoutMeta = removeTopLevelMeta(fixture, 'fixture.kcad.ts');
    expect(counts.withMeta).toBeGreaterThan(counts.withoutMeta);
    expect(withoutMeta).toContain('// geometry comment');
    expect(withoutMeta).toContain('box(10, 20, 3)');
    expect(withoutMeta).not.toContain('Test asset');
  });

  it('removes comments without changing strings or code around them', () => {
    const source = `const label = '/* keep */'; // remove\nreturn box(1, 2, 3);`;
    const stripped = removeComments(source);
    expect(stripped).toContain("const label = '/* keep */';");
    expect(stripped).toContain('return box(1, 2, 3);');
    expect(stripped).not.toContain('// remove');
  });

  it('reports median and nearest-rank p90 deterministically', () => {
    expect(summarize([9, 1, 5, 3, 7])).toEqual({
      n: 5,
      min: 1,
      median: 5,
      mean: 5,
      max: 9,
      p90: 9,
    });
  });

  it('fails if an asset source does not have exactly one top-level metadata block', () => {
    expect(() => countSource('return box(1, 2, 3);', 'missing-meta.kcad.ts'))
      .toThrow('expected exactly one top-level meta({...}) statement');
  });
});
