// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  applyEnvironment,
  resolveEnvironmentUrl,
  __resetEnvCacheForTest,
} from './environment';

describe('resolveEnvironmentUrl', () => {
  it('resolves each preset to its /hdri/<slug>_1k.hdr path', () => {
    expect(resolveEnvironmentUrl({ preset: 'studio' })).toBe('/hdri/studio_small_03_1k.hdr');
    expect(resolveEnvironmentUrl({ preset: 'outdoor' })).toBe('/hdri/kloofendal_43d_clear_puresky_1k.hdr');
    expect(resolveEnvironmentUrl({ preset: 'softbox' })).toBe('/hdri/photo_studio_01_1k.hdr');
    expect(resolveEnvironmentUrl({ preset: 'neutral' })).toBe('/hdri/brown_photostudio_02_1k.hdr');
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
  function makeRenderer(): THREE.WebGLRenderer {
    // happy-dom has no WebGL context. The null-spec branch never touches the
    // renderer (no loader / PMREM), so a stub is sufficient for the tests
    // below. The PMREM / RGBE-loaded path is exercised by the Playwright
    // smoke fixture (Task 11), not here.
    return { dispose: () => {} } as unknown as THREE.WebGLRenderer;
  }

  it('null spec clears scene.environment and walks materials', async () => {
    __resetEnvCacheForTest();
    const scene = new THREE.Scene();
    scene.environment = new THREE.Texture();
    const mat = new THREE.MeshStandardMaterial();
    mat.envMapIntensity = 5;
    scene.add(new THREE.Mesh(new THREE.BoxGeometry(), mat));

    await applyEnvironment(makeRenderer(), scene, null);

    expect(scene.environment).toBeNull();
    expect(mat.envMapIntensity).toBe(1);
  });

  it('null spec resets envMapIntensity on arrays of materials', async () => {
    __resetEnvCacheForTest();
    const scene = new THREE.Scene();
    const m1 = new THREE.MeshStandardMaterial();
    m1.envMapIntensity = 3;
    const m2 = new THREE.MeshStandardMaterial();
    m2.envMapIntensity = 7;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), [m1, m2]);
    scene.add(mesh);

    await applyEnvironment(makeRenderer(), scene, null);

    expect(m1.envMapIntensity).toBe(1);
    expect(m2.envMapIntensity).toBe(1);
  });

  it('returns immediately when spec resolves to null URL (defense-in-depth)', async () => {
    __resetEnvCacheForTest();
    const scene = new THREE.Scene();
    const mat = new THREE.MeshStandardMaterial();
    mat.envMapIntensity = 5;
    scene.add(new THREE.Mesh(new THREE.BoxGeometry(), mat));

    // {} resolves to null URL → applyEnvironment must NOT throw and must
    // clear the env / reset intensity.
    await applyEnvironment(makeRenderer(), scene, {});

    expect(scene.environment).toBeNull();
    expect(mat.envMapIntensity).toBe(1);
  });
});
