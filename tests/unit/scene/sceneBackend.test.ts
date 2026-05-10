import { describe, it, expect } from 'vitest';
import { isSceneBackend, type SceneBackend } from '../../../src/backends/sceneBackend';

describe('SceneBackend', () => {
  it('isSceneBackend distinguishes from ShapeBackend by structural marker', () => {
    const sb: SceneBackend = {
      target: 'export-occt',
      assemblyName: 'arm',
      parts: [],
      _kind: 'scene',
    };
    expect(isSceneBackend(sb)).toBe(true);
  });

  it('isSceneBackend rejects plain objects without _kind: "scene"', () => {
    expect(isSceneBackend({ target: 'export-occt' })).toBe(false);
    expect(isSceneBackend({ target: 'export-occt', _kind: 'shape' })).toBe(false);
  });

  it('isSceneBackend rejects null / undefined / primitives', () => {
    expect(isSceneBackend(null)).toBe(false);
    expect(isSceneBackend(undefined)).toBe(false);
    expect(isSceneBackend('scene')).toBe(false);
    expect(isSceneBackend(42)).toBe(false);
  });
});
