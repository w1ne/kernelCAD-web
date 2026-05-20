// tests/unit/intent/embossTextRecord.test.ts
//
// Guard tests for EmbossTextMetadata / isEmbossTextMetadata.
import { describe, it, expect } from 'vitest';
import { isEmbossTextMetadata } from '../../../src/shared/intent/embossTextRecord';

describe('isEmbossTextMetadata', () => {
  const validMinimal = {
    textContent: 'KC',
    size: { evaluated: 4 },
    depth: { evaluated: 0.6 },
    align: 'center' as const,
    anchorU: { evaluated: 0.5 },
    anchorV: { evaluated: 0.5 },
    rotation: { evaluated: 0 },
    scaleMode: 'original' as const,
    faceRef: { kind: 'canonical' as const, face: 'top' as const },
  };

  it('accepts minimal valid metadata', () => {
    expect(isEmbossTextMetadata(validMinimal)).toBe(true);
  });

  it('rejects metadata without textContent', () => {
    const { textContent: _drop, ...rest } = validMinimal;
    void _drop;
    expect(isEmbossTextMetadata(rest)).toBe(false);
  });

  it('rejects non-object input', () => {
    expect(isEmbossTextMetadata(null)).toBe(false);
    expect(isEmbossTextMetadata(42)).toBe(false);
    expect(isEmbossTextMetadata('text')).toBe(false);
    expect(isEmbossTextMetadata(undefined)).toBe(false);
  });
});
