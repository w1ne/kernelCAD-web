import { describe, it, expect } from 'vitest';
import { pbrFromMetadata } from '../../../src/kernel/backends/occt/occtBackend';

describe('pbrFromMetadata', () => {
  it('returns just baseColor when only color metadata is set', () => {
    const m = pbrFromMetadata({ color: '#ff0000' });
    expect(m).toEqual({ baseColor: '#ff0000' });
  });

  it('prefers material over color when both are set', () => {
    const m = pbrFromMetadata({
      color: '#aaaaaa',
      material: { baseColor: '#0a0a0a', clearcoat: 0.8, roughness: 0.15 },
    });
    expect(m).toEqual({ baseColor: '#0a0a0a', clearcoat: 0.8, roughness: 0.15 });
  });

  it('returns undefined when neither is set', () => {
    expect(pbrFromMetadata({})).toBeUndefined();
    expect(pbrFromMetadata(undefined)).toBeUndefined();
  });
});
