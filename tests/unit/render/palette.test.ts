// tests/unit/render/palette.test.ts
import { describe, it, expect } from 'vitest';
import { resolveColor, ROLE_PALETTE, isColorToken, DEFAULT_COLOR } from '../../../src/shared/render/palette';

describe('palette', () => {
  it('resolveColor returns the palette hex for known tokens', () => {
    expect(resolveColor('servo')).toBe('#2b3137');
    expect(resolveColor('gear')).toBe('#d8dde3');
    expect(resolveColor('tool')).toBe('#d4683a');
  });

  it('resolveColor passes through hex literals', () => {
    expect(resolveColor('#ff0080')).toBe('#ff0080');
    expect(resolveColor('#abcdef')).toBe('#abcdef');
  });

  it('resolveColor returns undefined for unknown tokens', () => {
    expect(resolveColor('aluminum')).toBeUndefined();
    expect(resolveColor('not-a-color')).toBeUndefined();
  });

  it('resolveColor returns undefined for undefined input', () => {
    expect(resolveColor(undefined)).toBeUndefined();
  });

  it('isColorToken type-guards correctly', () => {
    expect(isColorToken('servo')).toBe(true);
    expect(isColorToken('aluminum')).toBe(false);
    expect(isColorToken(undefined)).toBe(false);
    expect(isColorToken(123)).toBe(false);
  });

  it('DEFAULT_COLOR is a valid hex string', () => {
    expect(DEFAULT_COLOR).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('ROLE_PALETTE has exactly 8 tokens', () => {
    expect(Object.keys(ROLE_PALETTE)).toHaveLength(8);
  });
});
