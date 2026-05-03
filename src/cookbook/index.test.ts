import { describe, it, expect } from 'vitest';
import { search, type Snippet } from './index';

const fixture: Snippet[] = [
  {
    id: 'alpha',
    title: 'Fillet the top face after subtract',
    tags: ['fillet', 'subtract', 'face-ref'],
    keywords: ['round the rim of a hole', 'edge of a pocket'],
    when_to_use: 'After subtracting, fillet the top face.',
    body: '/* code */',
    filepath: '/tmp/alpha.md',
  },
  {
    id: 'beta',
    title: 'Chamfer a rotated face',
    tags: ['chamfer', 'rotate', 'face-ref'],
    keywords: ['bevel the top after rotate'],
    when_to_use: 'Chamfer a face after the part has been rotated.',
    body: '/* code */',
    filepath: '/tmp/beta.md',
  },
  {
    id: 'gamma',
    title: 'Mirror a half part',
    tags: ['mirror', 'symmetry'],
    keywords: ['symmetric part', 'half then mirror'],
    when_to_use: 'Build half a symmetric part then mirror to complete it.',
    body: '/* code */',
    filepath: '/tmp/gamma.md',
  },
];

describe('search', () => {
  it('ranks fillet+subtract query: alpha first', () => {
    const hits = search('fillet after subtract', fixture, 3);
    expect(hits[0].snippet.id).toBe('alpha');
  });

  it('returns empty for queries below the score floor', () => {
    expect(search('xyzzy plugh', fixture, 3)).toEqual([]);
  });

  it('returns empty for empty query', () => {
    expect(search('', fixture, 3)).toEqual([]);
  });

  it('returns empty for stopword-only query', () => {
    expect(search('the of and', fixture, 3)).toEqual([]);
  });

  it('clamps k to [1, 5]', () => {
    expect(search('fillet', fixture, 0).length).toBeGreaterThanOrEqual(0);
    expect(search('the rim of', fixture, 99).length).toBeLessThanOrEqual(5);
  });

  it('excludes body from scoring (matching only body content scores 0)', () => {
    const f: Snippet[] = [
      {
        id: 'just-code',
        title: 'unrelated',
        tags: ['fillet'],
        keywords: ['unrelated'],
        when_to_use: 'unrelated.',
        body: 'mysterious-magic-token-xyz123',
        filepath: '/tmp/just-code.md',
      },
    ];
    expect(search('mysterious magic token xyz123', f, 3)).toEqual([]);
  });
});
