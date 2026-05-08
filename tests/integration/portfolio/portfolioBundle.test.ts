// tests/integration/portfolio/portfolioBundle.test.ts
import { describe, it, expect } from 'vitest';
import { readdirSync, statSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePortfolioMeta } from '../../../scripts/lib/portfolioMeta';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../../examples/portfolio');
const REQUIRED = ['README.md', 'build.kcad.ts', 'build.mp4', 'build.step', 'build.stl', 'meta.json'];

function entrySlugs(): string[] {
  if (!existsSync(ROOT)) return [];
  return readdirSync(ROOT)
    .filter(name => statSync(join(ROOT, name)).isDirectory())
    .filter(name => !name.startsWith('_') && name !== 'README.md');
}

describe('portfolio bundle integrity', () => {
  const slugs = entrySlugs();

  it.skipIf(slugs.length === 0)('finds at least one portfolio entry once T4 has shipped', () => {
    expect(slugs.length).toBeGreaterThanOrEqual(1);
  });

  for (const slug of slugs) {
    describe(`entry: ${slug}`, () => {
      const dir = join(ROOT, slug);
      for (const file of REQUIRED) {
        it(`has ${file}`, () => {
          expect(existsSync(join(dir, file))).toBe(true);
          expect(statSync(join(dir, file)).size).toBeGreaterThan(0);
        });
      }
      it('meta.json parses', () => {
        const raw = JSON.parse(readFileSync(join(dir, 'meta.json'), 'utf8'));
        const meta = parsePortfolioMeta(raw);
        expect(meta.slug).toBe(slug);
      });
    });
  }
});
