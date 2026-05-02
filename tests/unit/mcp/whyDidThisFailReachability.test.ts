import { describe, it, expect } from 'vitest';
import { HINTS, type HintReachability } from '../../../src/mcp/tools/whyDidThisFail';

const ALLOWED_REACHABILITY: ReadonlySet<HintReachability> = new Set([
  'engine-path',
  'direct-lowerer-only',
  'reserved',
] as const);

const KNOWN_DIRECT_LOWERER_ONLY = [
  'feature.loft.bad-sketch',
  'feature.sweep.multi-face-profile',
  'feature.transform.invalid-plane',
] as const;

describe('whyDidThisFail HINTS table reachability classification', () => {
  it('every HINTS entry has a reachable field that is one of the three allowed values', () => {
    const entries = Object.entries(HINTS);
    expect(entries.length).toBeGreaterThanOrEqual(30);

    for (const [code, entry] of entries) {
      expect(entry.reachable, `HINTS entry '${code}' is missing 'reachable'`).toBeDefined();
      expect(
        ALLOWED_REACHABILITY.has(entry.reachable),
        `HINTS entry '${code}' has invalid reachable value '${entry.reachable}'`,
      ).toBe(true);
      expect(typeof entry.hint, `HINTS entry '${code}' is missing 'hint'`).toBe('string');
      expect(entry.hint.length, `HINTS entry '${code}' has empty hint`).toBeGreaterThan(0);
    }
  });

  it('known direct-lowerer-only codes are classified as direct-lowerer-only', () => {
    for (const code of KNOWN_DIRECT_LOWERER_ONLY) {
      expect(HINTS[code], `Expected HINTS entry for '${code}' to exist`).toBeDefined();
      expect(
        HINTS[code]!.reachable,
        `Expected '${code}' to be classified 'direct-lowerer-only', got '${HINTS[code]!.reachable}'`,
      ).toBe('direct-lowerer-only');
    }
  });

  it('the direct-lowerer-only set matches the documented forward-looking codes', () => {
    // Codes classified as direct-lowerer-only must be in the documented set.
    // Adding a new direct-lowerer-only code requires updating this test AND
    // citing docs/superpowers/specs/2026-05-01-error-attribution-policy.md
    // per the rc.12 error-attribution policy memo.
    const directLowererOnly = Object.entries(HINTS)
      .filter(([, entry]) => entry.reachable === 'direct-lowerer-only')
      .map(([code]) => code)
      .sort();
    const expected = [...KNOWN_DIRECT_LOWERER_ONLY].sort();
    expect(
      directLowererOnly,
      `Adding a new direct-lowerer-only code requires (1) updating KNOWN_DIRECT_LOWERER_ONLY in this test, AND (2) citing docs/superpowers/specs/2026-05-01-error-attribution-policy.md in the introducing PR per the error-attribution policy.`,
    ).toEqual(expected);
  });
});
