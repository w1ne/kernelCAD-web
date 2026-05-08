// tests/unit/portfolio/portfolioMeta.test.ts
import { describe, it, expect } from 'vitest';
import { parsePortfolioMeta, type PortfolioMeta } from '../../../scripts/lib/portfolioMeta';

const SHA_ZERO = 'sha256:' + '0'.repeat(64);

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
  artifactHashes: { step: SHA_ZERO, stl: SHA_ZERO },
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

  // --- Negative cases for hardened type / shape checks ---

  describe('non-object inputs', () => {
    it('rejects null', () => {
      expect(() => parsePortfolioMeta(null)).toThrow(/not an object/);
    });
    it('rejects a number scalar', () => {
      expect(() => parsePortfolioMeta(42)).toThrow(/not an object/);
    });
    it('rejects a string scalar', () => {
      expect(() => parsePortfolioMeta('hello')).toThrow(/not an object/);
    });
    it('rejects an array', () => {
      expect(() => parsePortfolioMeta([])).toThrow(/not an object/);
    });
  });

  describe('type-smuggled string fields', () => {
    it('rejects slug: 42', () => {
      expect(() => parsePortfolioMeta({ ...VALID, slug: 42 as unknown as string }))
        .toThrow(/slug/);
    });
    it('rejects sourceUrl: null', () => {
      expect(() => parsePortfolioMeta({ ...VALID, sourceUrl: null as unknown as string }))
        .toThrow(/sourceUrl/);
    });
    it('rejects model: false', () => {
      expect(() => parsePortfolioMeta({ ...VALID, model: false as unknown as string }))
        .toThrow(/model/);
    });
    it('rejects empty-string slug', () => {
      expect(() => parsePortfolioMeta({ ...VALID, slug: '' }))
        .toThrow(/slug/);
    });
  });

  describe('attemptCount validation', () => {
    it('rejects "three" (string)', () => {
      expect(() => parsePortfolioMeta({ ...VALID, attemptCount: 'three' as unknown as number }))
        .toThrow(/attemptCount/);
    });
    it('rejects -1', () => {
      expect(() => parsePortfolioMeta({ ...VALID, attemptCount: -1 }))
        .toThrow(/attemptCount/);
    });
    it('rejects 0', () => {
      expect(() => parsePortfolioMeta({ ...VALID, attemptCount: 0 }))
        .toThrow(/attemptCount/);
    });
    it('rejects 1.5 (non-integer)', () => {
      expect(() => parsePortfolioMeta({ ...VALID, attemptCount: 1.5 }))
        .toThrow(/attemptCount/);
    });
    it('rejects NaN', () => {
      expect(() => parsePortfolioMeta({ ...VALID, attemptCount: NaN }))
        .toThrow(/attemptCount/);
    });
  });

  describe('schemaVersion validation', () => {
    it('rejects "1" (string, not number)', () => {
      expect(() => parsePortfolioMeta({ ...VALID, schemaVersion: '1' as unknown as 1 }))
        .toThrow(/schemaVersion/);
    });
    it('rejects 2', () => {
      expect(() => parsePortfolioMeta({ ...VALID, schemaVersion: 2 as unknown as 1 }))
        .toThrow(/schemaVersion/);
    });
  });

  describe('artifactHashes validation', () => {
    it('rejects undefined (key present, undefined value)', () => {
      expect(() => parsePortfolioMeta({ ...VALID, artifactHashes: undefined as unknown as { step: string; stl: string } }))
        .toThrow(/artifactHashes/);
    });
    it('rejects numeric step / stl', () => {
      expect(() => parsePortfolioMeta({
        ...VALID,
        artifactHashes: { step: 1 as unknown as string, stl: 2 as unknown as string },
      })).toThrow(/artifactHashes/);
    });
    it('rejects step that is not sha256-shaped', () => {
      expect(() => parsePortfolioMeta({
        ...VALID,
        artifactHashes: { step: 'not-sha256', stl: SHA_ZERO },
      })).toThrow(/sha256/);
    });
    it('rejects truncated stl hash', () => {
      expect(() => parsePortfolioMeta({
        ...VALID,
        artifactHashes: { step: SHA_ZERO, stl: 'sha256:0' },
      })).toThrow(/sha256/);
    });
  });

  describe('builtAt validation', () => {
    it('rejects 2026-13-45T99:99:99Z (regex-shaped but invalid)', () => {
      expect(() => parsePortfolioMeta({ ...VALID, builtAt: '2026-13-45T99:99:99Z' }))
        .toThrow(/builtAt/);
    });
    it('rejects non-string', () => {
      expect(() => parsePortfolioMeta({ ...VALID, builtAt: 0 as unknown as string }))
        .toThrow(/builtAt/);
    });
  });
});
