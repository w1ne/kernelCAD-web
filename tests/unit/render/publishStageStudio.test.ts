// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/unit/render/publishStageStudio.test.ts
//
// Studio stage state: AgX tone mapping, real self-shadowing, studio softbox
// IBL replacement of the default room probe, and a clean restore on clear.
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  applyPublishStage, buildStudioBackdropTexture, buildStudioSoftboxEnvironment, capturePublishFrame,
  clearPublishStage,
} from '../../../src/render-player/components/demoPlayer/publishStage';
import { KCAD_FEATURE_GROUP_KEY } from '../../../src/render-player/components/demoPlayer/demoPlayerGeometry';

const stubRenderer = () => ({
  toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 1,
  shadowMap: { enabled: false, type: THREE.PCFShadowMap },
  getSize: () => new THREE.Vector2(800, 600), setSize: () => undefined,
}) as unknown as THREE.WebGLRenderer;

/** Stub with just enough of the canvas surface for capturePublishFrame. */
const captureRenderer = () => ({
  ...stubRenderer(),
  render: () => undefined,
  setRenderTarget: () => undefined,
  domElement: { toDataURL: () => 'data:image/png;base64,AAAA' },
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

/** Flat, wide assembly: a 200 × 40 × 4 plate whose bounding sphere wastes most
 *  of a cube shadow frustum. */
function makeWideScene(): { scene: THREE.Scene; mesh: THREE.Mesh } {
  const scene = new THREE.Scene();
  const group = new THREE.Group();
  group.userData[KCAD_FEATURE_GROUP_KEY] = true;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(200, 40, 4), new THREE.MeshPhysicalMaterial());
  group.add(mesh);
  scene.add(group);
  return { scene, mesh };
}

function rigLights(scene: THREE.Scene): THREE.Light[] {
  const rig = scene.children.find((child) => child.name === '__publishRig') as THREE.Group | undefined;
  return rig === undefined ? [] : rig.children.filter((child): child is THREE.Light => child instanceof THREE.Light);
}

function shadowCasters(scene: THREE.Scene): THREE.DirectionalLight[] {
  return rigLights(scene).filter(
    (light): light is THREE.DirectionalLight => light instanceof THREE.DirectionalLight && light.castShadow,
  );
}

describe('publish / studio stage', () => {
  it('switches AgX tone mapping and self-shadowing on stage=studio, then restores everything', () => {
    const renderer = stubRenderer();
    const { scene, mesh, environment } = makeScene();
    applyPublishStage({ scene, renderer }, { background: '#e8ecf1', shadow: false, stage: 'studio' });
    expect(renderer.toneMapping).toBe(THREE.AgXToneMapping);
    expect(renderer.toneMappingExposure).toBe(1.08);
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

  it('replaces the default room probe on stage=studio; an explicit HDRI stays authoritative', () => {
    const renderer = stubRenderer();
    const { scene } = makeScene();
    applyPublishStage({ scene, renderer }, { background: '#e8ecf1', shadow: false, stage: 'studio' });
    expect(scene.environment).toBeNull();
    expect(scene.environmentIntensity).toBe(0.44);
    expect(scene.environmentRotation.toArray().slice(0, 3)).toEqual([0, 0, 0]);
    clearPublishStage(scene);

    const explicit = new THREE.Texture();
    scene.environment = explicit;
    scene.userData.kCadDefaultEnv = false;
    applyPublishStage({ scene, renderer }, { background: '#e8ecf1', shadow: false, stage: 'studio' });
    expect(scene.environment).toBe(explicit);
    clearPublishStage(scene);
    expect(scene.environment).toBe(explicit);
  });

  it('legacy publish keeps its room IBL strength at 0.55', () => {
    const renderer = stubRenderer();
    const scene = new THREE.Scene();
    scene.environment = null;
    applyPublishStage({ scene, renderer }, { background: '#ffffff', shadow: false });
    expect(scene.environmentIntensity).toBe(0.55);
    clearPublishStage(scene);
  });

  it('keeps legacy publish stage tone mapping and mesh shadow flags untouched', () => {
    const renderer = stubRenderer();
    const { scene, mesh, environment } = makeScene();
    applyPublishStage({ scene, renderer }, { background: '#f4ecd7', shadow: false });
    expect(renderer.toneMapping).toBe(THREE.NeutralToneMapping);
    expect(renderer.shadowMap.enabled).toBe(false);
    expect([mesh.castShadow, mesh.receiveShadow]).toEqual([false, false]);
    expect(scene.environment).toBe(environment);
    clearPublishStage(scene);
  });

  it('studio rig carries a 2048 key and a 1024 overhead AO shadow caster', () => {
    const renderer = stubRenderer();
    const { scene } = makeScene();
    applyPublishStage({ scene, renderer }, { background: '#e8ecf1', shadow: false, stage: 'studio' });
    const casters = shadowCasters(scene);
    expect(casters.map((light) => [light.shadow.mapSize.width, light.shadow.mapSize.height, light.shadow.radius]))
      .toEqual([[2048, 2048, 2], [1024, 1024, 3]]);
    expect(rigLights(scene).filter((light) => light.castShadow)).toHaveLength(2);
    clearPublishStage(scene);
  });

  it('capture fits tight light-space AABB frustums instead of a sphere cube', () => {
    const renderer = captureRenderer();
    const { scene, mesh } = makeWideScene();
    applyPublishStage({ scene, renderer }, { background: '#e8ecf1', shadow: false, stage: 'studio' });
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 5000);
    capturePublishFrame(
      { scene, camera, renderer },
      { width: 640, height: 480, supersample: 1, margin: 1.3, azDeg: 30, elDeg: 22 },
    );

    const bounds = new THREE.Box3().setFromObject(mesh);
    const sphere = bounds.getBoundingSphere(new THREE.Sphere());
    const centre = bounds.getCenter(new THREE.Vector3());
    const sphereCubeHalf = sphere.radius * 1.45;
    const casters = shadowCasters(scene);
    expect(casters).toHaveLength(2);

    for (const light of casters) {
      const shadowCamera = light.shadow.camera;
      const halfWidth = (shadowCamera.right - shadowCamera.left) / 2;
      const halfHeight = (shadowCamera.top - shadowCamera.bottom) / 2;
      // Tight, not the old ±radius*1.45 sphere cube.
      expect(halfWidth).toBeLessThan(sphereCubeHalf);
      expect(halfHeight).toBeLessThan(sphereCubeHalf);
      expect(Math.max(halfWidth, halfHeight)).toBeGreaterThan(sphere.radius * 0.2);
      expect(shadowCamera.right).toBeGreaterThan(shadowCamera.left);
      expect(shadowCamera.top).toBeGreaterThan(shadowCamera.bottom);
      expect(shadowCamera.near).toBeGreaterThan(0);
      expect(shadowCamera.far).toBeGreaterThan(shadowCamera.near);
      // Light sits off the dome at the documented physical distance.
      const distance = light.getWorldPosition(new THREE.Vector3()).distanceTo(centre);
      expect(distance).toBeCloseTo(Math.max(sphere.radius * 2.5, sphere.radius + 2), 3);
      expect(light.shadow.bias).toBeCloseTo(-0.00015, 9);
      const texelSize = Math.max(shadowCamera.right - shadowCamera.left, shadowCamera.top - shadowCamera.bottom)
        / light.shadow.mapSize.width;
      expect(light.shadow.normalBias).toBeCloseTo(Math.max(0.015, texelSize * 1.5), 9);
    }
    clearPublishStage(scene);
  });

  it('legacy publish stage leaves shadow cameras at their defaults', () => {
    const renderer = captureRenderer();
    const { scene } = makeWideScene();
    applyPublishStage({ scene, renderer }, { background: '#ffffff', shadow: false });
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 5000);
    capturePublishFrame(
      { scene, camera, renderer },
      { width: 640, height: 480, supersample: 1, margin: 1.3, azDeg: 30, elDeg: 22 },
    );
    expect(shadowCasters(scene)).toHaveLength(0);
    const directional = rigLights(scene).filter(
      (light): light is THREE.DirectionalLight => light instanceof THREE.DirectionalLight,
    );
    expect(directional).toHaveLength(3);
    for (const light of directional) {
      const shadowCamera = light.shadow.camera;
      expect([shadowCamera.left, shadowCamera.right, shadowCamera.top, shadowCamera.bottom, shadowCamera.near, shadowCamera.far])
        .toEqual([-5, 5, 5, -5, 0.5, 500]);
    }
    clearPublishStage(scene);
  });

  it('declines without WebGL; the backdrop falls back to a flat colour', () => {
    expect(buildStudioSoftboxEnvironment(stubRenderer())).toBeUndefined();
    expect(buildStudioBackdropTexture()).toBeInstanceOf(THREE.Color);
  });
});
