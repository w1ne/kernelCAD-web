// tests/unit/portfolio/portfolioMeta.test.ts
import { describe, it, expect } from 'vitest';
import { parsePortfolioMeta, type PortfolioMeta } from '../../../scripts/lib/portfolioMeta';

const VALID: PortfolioMeta = {
  schemaVersion: 1,
  slug: 'stepper-motor-bracket',
  category: 'bracket',
  difficulty: 'easy',
  sourceUrl: 'https://github.com/example/repo/issues/42',
  sourceLicense: 'MIT',
  paraphrasedPrompt: 'Mounting bracket for a NEMA 17 stepper, three M3 holes, 5 mm wall.',
  model: 'claude-opus-4-7',
  attemptCount: 1,
  builtAt: '2026-05-08T12:00:00Z',
  artifactHashes: { step: 'sha256:0', stl: 'sha256:0' },
};

describe('parsePortfolioMeta', () => {
  it('accepts a valid record', () => {
    expect(parsePortfolioMeta(VALID)).toEqual(VALID);
  });
  it('rejects missing required field', () => {
    const { sourceUrl: _, ...rest } = VALID;
    expect(() => parsePortfolioMeta(rest)).toThrow(/sourceUrl/);
  });
  it('rejects unknown category', () => {
    expect(() => parsePortfolioMeta({ ...VALID, category: 'spaceship' as 'bracket' }))
      .toThrow(/category/);
  });
  it('rejects unknown difficulty', () => {
    expect(() => parsePortfolioMeta({ ...VALID, difficulty: 'extreme' as 'easy' }))
      .toThrow(/difficulty/);
  });
  it('rejects bad ISO timestamp', () => {
    expect(() => parsePortfolioMeta({ ...VALID, builtAt: 'tomorrow' }))
      .toThrow(/builtAt/);
  });
});
