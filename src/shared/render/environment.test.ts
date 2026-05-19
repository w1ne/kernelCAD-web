// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import {
  applyEnvironment,
  resolveEnvironmentUrl,
  __resetEnvCacheForTest,
} from './environment';

// Module-level mocks: replace the network/GPU bits with deterministic stubs.
vi.mock('three/examples/jsm/loaders/RGBELoader.js', () => ({
  RGBELoader: class {
    loadAsync(_url: string) {
      const tex = new THREE.DataTexture(new Uint8Array(4), 1, 1);
      tex.needsUpdate = true;
      return Promise.resolve(tex);
    }
  },
}));

vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>();
  return {
    ...actual,
    PMREMGenerator: class {
      fromEquirectangular(tex: THREE.Texture) {
        const out = new actual.Texture();
        out.name = `prefiltered:${tex.uuid}`;
        return { texture: out };
      }
      dispose() {}
    },
  };
});

describe('resolveEnvironmentUrl', () => {
  it('resolves each preset to its /hdri/<slug>_1k.hdr path', () => {
    expect(resolveEnvironmentUrl({ preset: 'studio' })).toBe('/hdri/studio_small_03_1k.hdr');
    expect(resolveEnvironmentUrl({ preset: 'softbox' })).toBe('/hdri/photo_studio_01_1k.hdr');
    expect(resolveEnvironmentUrl({ preset: 'neutral' })).toBe('/hdri/brown_photostudio_02_1k.hdr');
    expect(resolveEnvironmentUrl({ preset: 'outdoor' })).toBe('/hdri/kloofendal_43d_clear_puresky_1k.hdr');
    expect(resolveEnvironmentUrl({ preset: 'warehouse' })).toBe('/hdri/studio_country_hall_1k.hdr');
  });

  it('passes a custom url verbatim', () => {
    expect(resolveEnvironmentUrl({ url: '/hdri/custom.hdr' })).toBe('/hdri/custom.hdr');
  });

  it('returns null when neither is set', () => {
    expect(resolveEnvironmentUrl({})).toBeNull();
  });
});

describe('applyEnvironment', () => {
  beforeEach(() => { __resetEnvCacheForTest(); });

  function makeRenderer(): THREE.WebGLRenderer {
    // In happy-dom there is no WebGL2 context; build a minimal stub that the
    // PMREMGenerator mock won't touch (the mock above replaces the real impl).
    return { dispose: () => {} } as unknown as THREE.WebGLRenderer;
  }

  it('null spec clears scene.environment and resets envMapIntensity to 1', async () => {
    const scene = new THREE.Scene();
    scene.environment = new THREE.Texture();
    const mat = new THREE.MeshStandardMaterial();
    mat.envMapIntensity = 5;
    scene.add(new THREE.Mesh(new THREE.BoxGeometry(), mat));

    await applyEnvironment(makeRenderer(), scene, null);

    expect(scene.environment).toBeNull();
    expect(mat.envMapIntensity).toBe(1);
  });

  it('preset spec sets scene.environment and writes envMapIntensity', async () => {
    const scene = new THREE.Scene();
    const mat = new THREE.MeshStandardMaterial();
    scene.add(new THREE.Mesh(new THREE.BoxGeometry(), mat));

    await applyEnvironment(makeRenderer(), scene, { preset: 'studio', intensity: 1.5, rotation: 45 });

    expect(scene.environment).not.toBeNull();
    expect(mat.envMapIntensity).toBe(1.5);
    expect(scene.environmentRotation.y).toBeCloseTo((45 * Math.PI) / 180, 5);
  });

  it('url spec works the same as preset', async () => {
    const scene = new THREE.Scene();
    const mat = new THREE.MeshStandardMaterial();
    scene.add(new THREE.Mesh(new THREE.BoxGeometry(), mat));

    await applyEnvironment(makeRenderer(), scene, { url: '/hdri/custom.hdr' });

    expect(scene.environment).not.toBeNull();
    expect(mat.envMapIntensity).toBe(1);
  });

  it('walks array materials too', async () => {
    const scene = new THREE.Scene();
    const m1 = new THREE.MeshStandardMaterial();
    const m2 = new THREE.MeshStandardMaterial();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), [m1, m2]);
    scene.add(mesh);

    await applyEnvironment(makeRenderer(), scene, { preset: 'studio', intensity: 2 });

    expect(m1.envMapIntensity).toBe(2);
    expect(m2.envMapIntensity).toBe(2);
  });

  it('ignores meshes without envMapIntensity (e.g. MeshBasicMaterial)', async () => {
    const scene = new THREE.Scene();
    const mat = new THREE.MeshBasicMaterial();
    scene.add(new THREE.Mesh(new THREE.BoxGeometry(), mat));

    await applyEnvironment(makeRenderer(), scene, { preset: 'studio' });
    // Should not throw; scene.environment is still set.
    expect(scene.environment).not.toBeNull();
  });

  it('caches the prefiltered envmap by URL across calls', async () => {
    const renderer = makeRenderer();
    const scene = new THREE.Scene();

    await applyEnvironment(renderer, scene, { preset: 'studio' });
    const first = scene.environment;
    expect(first).not.toBeNull();

    await applyEnvironment(renderer, scene, { preset: 'studio' });
    const second = scene.environment;

    // Cache hit → identical texture instance.
    expect(second).toBe(first);
  });
});
