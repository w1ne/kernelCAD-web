// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { RebuildCache, rebuildCacheKey } from './rebuildCache';
import { featureMeshFingerprint } from './meshFingerprint';

describe('rebuildCacheKey', () => {
  const base = { source: 'return box(w, 1, 1);', params: { w: 2, h: 3 }, quality: 'display', kernelVersion: 'k1' };

  it('is the content of the rebuild, independent of param order', () => {
    expect(rebuildCacheKey(base)).toBe(rebuildCacheKey({ ...base, params: { h: 3, w: 2 } }));
  });

  it('changes with the source, a param value, the mesh quality and the kernel version', () => {
    const key = rebuildCacheKey(base);
    expect(rebuildCacheKey({ ...base, source: 'return box(w, 2, 1);' })).not.toBe(key);
    expect(rebuildCacheKey({ ...base, params: { w: 2, h: 4 } })).not.toBe(key);
    expect(rebuildCacheKey({ ...base, quality: 'coarse' })).not.toBe(key);
    expect(rebuildCacheKey({ ...base, kernelVersion: 'k2' })).not.toBe(key);
  });
});

describe('RebuildCache', () => {
  it('evicts the least recently used entry past the entry bound', () => {
    const cache = new RebuildCache<string>({ maxEntries: 2, maxBytes: 1000 }, () => 1);
    cache.set('a', 'A');
    cache.set('b', 'B');
    expect(cache.get('a')).toBe('A');
    cache.set('c', 'C');
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBe('A');
    expect(cache.get('c')).toBe('C');
  });

  it('evicts by retained bytes and never keeps an entry larger than the budget', () => {
    const cache = new RebuildCache<number>({ maxEntries: 10, maxBytes: 100 }, (bytes) => bytes);
    cache.set('a', 60);
    cache.set('b', 30);
    cache.set('c', 30);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.bytes).toBe(60);
    cache.set('huge', 101);
    expect(cache.get('huge')).toBeUndefined();
    expect(cache.bytes).toBe(60);
  });
});

describe('featureMeshFingerprint', () => {
  const part = () => ({
    featureId: 'arm__link',
    faces: [{ vertices: new Float32Array([0, 1, 2]), normals: new Float32Array([0, 0, 1]), indices: new Uint32Array([0, 1, 2]), faceId: 0 }],
    transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    material: { baseColor: '#808080', metalness: 0.5 },
  });

  it('is equal for equal content, whatever the key order or -0', () => {
    const a = part();
    const b = { material: { metalness: 0.5, baseColor: '#808080' }, transform: a.transform, faces: [{ ...a.faces[0], vertices: new Float32Array([-0, 1, 2]) }], featureId: 'arm__link' };
    expect(featureMeshFingerprint(b)).toBe(featureMeshFingerprint(a));
  });

  it('changes with the triangles, the transform, the material and the id', () => {
    const fp = featureMeshFingerprint(part());
    const moved = { ...part(), transform: [...part().transform.slice(0, 12), 5, 0, 0, 1] };
    const recolored = { ...part(), material: { baseColor: '#ff0000', metalness: 0.5 } };
    const renamed = { ...part(), featureId: 'arm__base' };
    const reshaped = part();
    reshaped.faces[0]!.vertices = new Float32Array([0, 1, 3]);
    for (const other of [moved, recolored, renamed, reshaped]) {
      expect(featureMeshFingerprint(other)).not.toBe(fp);
    }
  });
});
