import { describe, it, expect } from 'vitest';
import { tokenize, scoreBM25 } from './bm25';

describe('tokenize', () => {
  it('lowercases and splits on non-alphanumeric', () => {
    expect(tokenize('Fillet, the TOP face!')).toEqual(['fillet', 'top', 'face']);
  });

  it('drops tokens of length <= 2', () => {
    expect(tokenize('a an be the of fillet')).toEqual(['fillet']);
  });

  it('drops english stopwords', () => {
    expect(tokenize('the fillet is on top of the box')).toEqual(['fillet', 'top', 'box']);
  });

  it('returns empty array for empty/punctuation-only input', () => {
    expect(tokenize('')).toEqual([]);
    expect(tokenize('!!! ... ???')).toEqual([]);
  });
});

describe('scoreBM25', () => {
  const docs = [
    { id: 'd1', text: 'fillet round corner edge' },
    { id: 'd2', text: 'chamfer bevel corner' },
    { id: 'd3', text: 'subtract boolean operation' },
  ];

  it('returns higher score for better-matching doc', () => {
    const r = scoreBM25('fillet edge', docs);
    expect(r.find((x) => x.id === 'd1')!.score).toBeGreaterThan(r.find((x) => x.id === 'd2')!.score);
  });

  it('returns zero score for docs with no overlap', () => {
    const r = scoreBM25('fillet', docs);
    expect(r.find((x) => x.id === 'd3')!.score).toBe(0);
  });

  it('returns zero score for empty query', () => {
    const r = scoreBM25('', docs);
    for (const hit of r) expect(hit.score).toBe(0);
  });

  it('is deterministic — same inputs produce identical scores', () => {
    const r1 = scoreBM25('fillet edge', docs);
    const r2 = scoreBM25('fillet edge', docs);
    expect(r1).toEqual(r2);
  });
});
