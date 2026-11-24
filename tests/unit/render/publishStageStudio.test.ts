// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/unit/render/publishStageStudio.test.ts
//
// Studio stage state: AgX tone mapping, real self-shadowing, studio softbox
// IBL replacement of the default room probe, and a clean restore on clear.
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  applyPublishStage, buildStudioBackdropTexture, buildStudioSoftboxEnvironment, clearPublishStage,
} from '../../../src/render-player/components/demoPlayer/publishStage';
import { KCAD_FEATURE_GROUP_KEY } from '../../../src/render-player/components/demoPlayer/demoPlayerGeometry';

const stubRenderer = () => ({
  toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 1,
  shadowMap: { enabled: false, type: THREE.PCFShadowMap },
  getSize: () => new THREE.Vector2(800, 600), setSize: () => undefined,
}) as unknown as THREE.WebGLRenderer;

function makeScene(): { scene: THREE.Scene; mesh: THREE.Mesh; environment: THREE.Texture } {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#909090');
  const environment = new THREE.Texture();
  scene.environment = environment;
  scene.environmentIntensity = 0.3;
  scene.environmentRotation = new THREE.Euler(0.1, 0, 0);
  scene.userData.kCadDefaultEnv = true;
  const group = new THREE.Group();
  group.userData[KCAD_FEATURE_GROUP_KEY] = true;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshPhysicalMaterial());
  group.add(mesh);
  scene.add(group);
  return { scene, mesh, environment };
}

describe('publish / studio stage', () => {
  it('switches AgX tone mapping and self-shadowing, then restores everything', () => {
    const renderer = stubRenderer();
    const { scene, mesh, environment } = makeScene();
    applyPublishStage({ scene, renderer }, { background: '#e8ecf1', shadow: false });
    expect(renderer.toneMapping).toBe(THREE.AgXToneMapping);
    expect(renderer.toneMappingExposure).toBe(1.06);
    expect(renderer.shadowMap).toMatchObject({ enabled: true, type: THREE.PCFSoftShadowMap });
    expect([mesh.castShadow, mesh.receiveShadow]).toEqual([true, true]);
    expect((scene.background as THREE.Color).getHexString()).toBe('e8ecf1');

    clearPublishStage(scene);
    expect(renderer.toneMapping).toBe(THREE.NeutralToneMapping);
    expect(renderer.shadowMap).toMatchObject({ enabled: false, type: THREE.PCFShadowMap });
    expect([mesh.castShadow, mesh.receiveShadow]).toEqual([false, false]);
    expect(scene.environment).toBe(environment);
    expect(scene.environmentIntensity).toBe(0.3);
    expect(scene.environmentRotation.x).toBeCloseTo(0.1);
    expect((scene.background as THREE.Color).getHexString()).toBe('909090');
  });

  it('replaces the default room probe; an explicit HDRI stays authoritative', () => {
    const renderer = stubRenderer();
    const { scene } = makeScene();
    applyPublishStage({ scene, renderer }, { background: '#e8ecf1', shadow: false });
    expect(scene.environment).toBeNull();
    expect(scene.environmentIntensity).toBe(0.88);
    expect(scene.environmentRotation.toArray().slice(0, 3)).toEqual([0, 0, 0]);
    clearPublishStage(scene);

    const explicit = new THREE.Texture();
    scene.environment = explicit;
    scene.userData.kCadDefaultEnv = false;
    applyPublishStage({ scene, renderer }, { background: '#e8ecf1', shadow: false });
    expect(scene.environment).toBe(explicit);
    clearPublishStage(scene);
    expect(scene.environment).toBe(explicit);
  });

  it('declines without WebGL; the backdrop falls back to a flat colour', () => {
    expect(buildStudioSoftboxEnvironment(stubRenderer())).toBeUndefined();
    expect(buildStudioBackdropTexture()).toBeInstanceOf(THREE.Color);
  });
});
