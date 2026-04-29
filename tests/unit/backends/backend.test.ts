import { describe, it, expect } from 'vitest';
import type { ShapeBackend, FeatureLowerer } from '../../../src/backends/backend';

describe('backend interfaces', () => {
  it('ShapeBackend interface compiles', () => {
    const _check: keyof ShapeBackend = 'getMesh';
    expect(_check).toBe('getMesh');
  });

  it('FeatureLowerer interface compiles', () => {
    const _check: keyof FeatureLowerer = 'lower';
    expect(_check).toBe('lower');
  });
});
