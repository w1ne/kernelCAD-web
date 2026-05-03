import { describe, it, expect } from 'vitest';
import { loadSnippets, search } from './index';

const QUERIES = [
  'fillet the top edge after a subtract',
  'build an L-bracket from two perpendicular plates',
  'through-hole for a bolt with clearance',
  'pocket cut into the top face',
  'symmetric part using mirror',
];

describe('cookbook snapshot — top-3 IDs per query', () => {
  const snippets = loadSnippets();

  for (const q of QUERIES) {
    it(`ranks: "${q}"`, () => {
      const hits = search(q, snippets, 3).map((h) => h.snippet.id);
      expect(hits).toMatchSnapshot();
    });
  }
});
