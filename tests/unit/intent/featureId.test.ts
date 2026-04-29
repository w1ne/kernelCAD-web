import { describe, it, expect } from 'vitest';
import { createFeatureIdGenerator } from '../../../src/intent/featureId';

describe('featureId', () => {
  it('produces unique IDs for the same kind', () => {
    const gen = createFeatureIdGenerator();
    expect(gen.next('box')).toBe('box_1');
    expect(gen.next('box')).toBe('box_2');
    expect(gen.next('cylinder')).toBe('cylinder_1');
  });

  it('reset() restarts counters', () => {
    const gen = createFeatureIdGenerator();
    gen.next('box');
    gen.reset();
    expect(gen.next('box')).toBe('box_1');
  });
});
