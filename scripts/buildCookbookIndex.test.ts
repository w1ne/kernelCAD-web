import { describe, it, expect } from 'vitest';
import { renderCookbookSection } from './buildCookbookIndex';
import type { Snippet } from '../src/cookbook/index';

const fixture: Snippet[] = [
  {
    id: 'beta-snippet',
    title: 'Beta',
    tags: [],
    keywords: [],
    when_to_use: 'When you need beta.',
    body: '/* */',
    filepath: '/tmp/beta.md',
  },
  {
    id: 'alpha-snippet',
    title: 'Alpha',
    tags: [],
    keywords: [],
    when_to_use: 'When you need alpha.',
    body: '/* */',
    filepath: '/tmp/alpha.md',
  },
];

describe('renderCookbookSection', () => {
  it('renders a header + table sorted by id', () => {
    const out = renderCookbookSection(fixture);
    expect(out).toContain('## Cookbook (snippet index)');
    expect(out).toContain('lookup_cookbook(query, k?)');
    // alpha-snippet should appear before beta-snippet
    const ai = out.indexOf('alpha-snippet');
    const bi = out.indexOf('beta-snippet');
    expect(ai).toBeGreaterThan(0);
    expect(bi).toBeGreaterThan(ai);
  });

  it('is idempotent — same inputs produce identical bytes', () => {
    expect(renderCookbookSection(fixture)).toBe(renderCookbookSection(fixture));
  });

  it('renders an empty-cookbook placeholder when given no snippets', () => {
    const out = renderCookbookSection([]);
    expect(out).toContain('## Cookbook (snippet index)');
    expect(out).toContain('(empty)');
  });
});
