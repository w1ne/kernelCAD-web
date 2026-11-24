// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/unit/render/displaySurfacesPage.test.ts
//
// Page-side display / indicator application on a plain THREE scene (no DOM):
// display planes seat on the display sub-mesh and clear idempotently, LED
// states tint only the LED sub-meshes (cloning shared materials) and add a
// local light that clears with the next apply.
import { describe, it, expect, vi, afterEach } from 'vitest';
import * as THREE from 'three';
import {
  KCAD_DISPLAY_SURFACE_KEY,
  KCAD_INDICATOR_LIGHT_KEY,
  applyDisplaySurfaces,
  applyIndicatorStates,
  clearDisplaySurfaces,
  clearIndicatorLights,
} from '../../../src/render-player/components/demoPlayer/displaySurfaces';
import { KCAD_FEATURE_GROUP_KEY } from '../../../src/render-player/components/demoPlayer/demoPlayerGeometry';
import { applyPublishStage } from '../../../src/render-player/components/demoPlayer/publishStage';
import type { ResolvedDisplaySurface, ResolvedIndicatorState } from '../../../src/shared/render/displaySurface';

afterEach(() => {
  vi.restoreAllMocks();
});

function mesh(name: string, size: [number, number, number], position: [number, number, number], material: THREE.Material): THREE.Mesh {
  const created = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  created.name = name;
  created.userData.subMeshName = name;
  created.position.set(...position);
  return created;
}

/** An imported GLB primitive: material only, no `userData.subMeshName`. */
function unnamedMesh(size: [number, number, number], position: [number, number, number], material: THREE.Material): THREE.Mesh {
  const created = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  created.position.set(...position);
  return created;
}

function displayScene(): { scene: THREE.Scene; group: THREE.Group; shared: THREE.MeshStandardMaterial } {
  const scene = new THREE.Scene();
  const group = new THREE.Group();
  group.name = 'board_1';
  group.userData[KCAD_FEATURE_GROUP_KEY] = true;
  group.userData.assemblyPartName = 'oled-module';
  const shared = new THREE.MeshStandardMaterial({ color: '#203040' });
  group.add(mesh('panel', [20, 10, 1], [0, 0, 0], shared));
  group.add(mesh('active-area', [16, 8, 0.2], [0, 0, 0.6], shared));
  group.add(mesh('header-pins', [18, 2, 1.4], [0, -6, 0.7], shared));
  scene.add(group);
  return { scene, group, shared };
}

const DISPLAY: ResolvedDisplaySurface = {
  part: 'oled-module',
  face: '+z',
  region: [0, 0, 1, 1],
  rotation: 0,
  imageDataUrl: 'data:image/png;base64,AAAA',
  mode: 'oled',
  offsetMm: 0.035,
};

describe('applyDisplaySurfaces', () => {
  it('seats one plane on the active-area sub-mesh and clears it idempotently', async () => {
    vi.spyOn(THREE.TextureLoader.prototype, 'loadAsync').mockResolvedValue(new THREE.Texture());
    const { scene, group } = displayScene();
    const result = await applyDisplaySurfaces(scene, [DISPLAY]);
    expect(result).toEqual({ applied: ['oled-module'], missing: [] });
    const planes = group.children.filter((c) => c.userData[KCAD_DISPLAY_SURFACE_KEY] === true);
    expect(planes).toHaveLength(1);
    const plane = planes[0] as THREE.Mesh;
    // Active-area footprint: 16 × 8, sitting just above its top face (z=0.7) + offset.
    const planeGeometry = plane.geometry as THREE.PlaneGeometry;
    expect(planeGeometry.parameters.width).toBeCloseTo(16, 6);
    expect(planeGeometry.parameters.height).toBeCloseTo(8, 6);
    expect(plane.position.z).toBeCloseTo(0.7 + 0.035, 6);
    expect(plane.renderOrder).toBe(2);
    expect(plane.castShadow).toBe(false);
    const material = plane.material as THREE.MeshPhysicalMaterial;
    expect(material.emissiveIntensity).toBeCloseTo(1.6, 6);
    expect(material.userData.authoredOpacity).toBe(1);
    expect(material.side).toBe(THREE.FrontSide);

    await applyDisplaySurfaces(scene, [DISPLAY]);
    expect(group.children.filter((c) => c.userData[KCAD_DISPLAY_SURFACE_KEY] === true)).toHaveLength(1);

    clearDisplaySurfaces(scene);
    expect(group.children.filter((c) => c.userData[KCAD_DISPLAY_SURFACE_KEY] === true)).toHaveLength(0);
  });

  it('accepts a part/sub-mesh form and reports unknown parts as missing', async () => {
    vi.spyOn(THREE.TextureLoader.prototype, 'loadAsync').mockResolvedValue(new THREE.Texture());
    const { scene } = displayScene();
    const result = await applyDisplaySurfaces(scene, [
      { ...DISPLAY, part: 'nothing-here' },
      { ...DISPLAY, part: 'oled-module/panel' },
    ]);
    expect(result.missing).toEqual(['nothing-here']);
    expect(result.applied).toEqual(['oled-module/panel']);
  });
});

async function seatDisplayMaterial(mode: 'oled' | 'lcd' | 'epaper'): Promise<{
  material: THREE.MeshPhysicalMaterial;
  plane: THREE.Mesh;
}> {
  vi.spyOn(THREE.TextureLoader.prototype, 'loadAsync').mockResolvedValue(new THREE.Texture());
  const { scene, group } = displayScene();
  await applyDisplaySurfaces(scene, [{ ...DISPLAY, mode }]);
  const plane = group.children.find((c) => c.userData[KCAD_DISPLAY_SURFACE_KEY] === true) as THREE.Mesh;
  return { material: plane.material as THREE.MeshPhysicalMaterial, plane };
}

describe('display surface material finish per panel mode', () => {
  it('oled: near-black anti-reflective polariser with no diffuse albedo', async () => {
    const { material } = await seatDisplayMaterial('oled');
    expect(material.color.getHexString()).toBe('05070a');
    expect(material.map).toBeNull();
    expect(material.emissiveMap).not.toBeNull();
    expect(material.emissiveIntensity).toBeCloseTo(1.6, 6);
    expect(material.metalness).toBe(0);
    expect(material.roughness).toBeLessThanOrEqual(0.1);
    expect(material.envMapIntensity).toBeLessThanOrEqual(0.15);
    expect(material.specularIntensity).toBeLessThanOrEqual(0.2);
    expect(material.clearcoat).toBeLessThanOrEqual(0.1);
    expect(material.polygonOffset).toBe(true);
  });

  it('epaper: matte reflective paper that receives shadows and never emits', async () => {
    const { material, plane } = await seatDisplayMaterial('epaper');
    expect(material.map).not.toBeNull();
    expect(material.color.getHexString()).toBe('ffffff');
    expect(material.roughness).toBeGreaterThanOrEqual(0.9);
    expect(material.emissive.getHexString()).toBe('000000');
    expect(material.emissiveIntensity).toBe(0);
    expect(material.clearcoat).toBe(0);
    expect(material.specularIntensity).toBeLessThanOrEqual(0.1);
    expect(plane.receiveShadow).toBe(true);
    expect(plane.castShadow).toBe(false);
  });

  it('lcd: dark polariser albedo, backlit contrast and controlled specular', async () => {
    const { material } = await seatDisplayMaterial('lcd');
    expect(material.color.getHexString()).toBe('1c222b');
    expect(material.map).not.toBeNull();
    expect(material.emissiveMap).not.toBeNull();
    expect(material.emissiveIntensity).toBeGreaterThan(0.9);
    expect(material.emissiveIntensity).toBeLessThanOrEqual(1.2);
    expect(material.roughness).toBeLessThanOrEqual(0.2);
    expect(material.specularIntensity).toBeGreaterThan(0);
    expect(material.specularIntensity).toBeLessThanOrEqual(0.25);
    expect(material.envMapIntensity).toBeLessThanOrEqual(0.25);
    expect(material.clearcoat).toBeLessThanOrEqual(0.15);
  });

  it('honours an explicit emissive intensity on lcd / oled', async () => {
    vi.spyOn(THREE.TextureLoader.prototype, 'loadAsync').mockResolvedValue(new THREE.Texture());
    const { scene, group } = displayScene();
    await applyDisplaySurfaces(scene, [{ ...DISPLAY, mode: 'lcd', emissiveIntensity: 0.6 }]);
    const plane = group.children.find((c) => c.userData[KCAD_DISPLAY_SURFACE_KEY] === true) as THREE.Mesh;
    expect((plane.material as THREE.MeshPhysicalMaterial).emissiveIntensity).toBeCloseTo(0.6, 6);
  });
});

describe('applyIndicatorStates', () => {
  const LED: ResolvedIndicatorState = { part: 'board_1', color: '#ff2200', level: 1, intensity: 2.2 };

  it('tints only the LED sub-mesh, clones the shared material and adds a local light', () => {
    const { scene, group, shared } = displayScene();
    const before = shared.color.getHexString();
    const result = applyIndicatorStates(scene, [LED]);
    expect(result).toEqual({ applied: ['board_1'], missing: [] });

    const lens = group.children[1] as THREE.Mesh;
    const lensMaterial = lens.material as THREE.MeshStandardMaterial;
    expect(lensMaterial).not.toBe(shared);
    expect(shared.color.getHexString()).toBe(before);
    expect(lensMaterial.emissiveIntensity).toBeCloseTo(2.2, 6);
    expect(lensMaterial.metalness).toBe(0);
    expect(lensMaterial.roughness).toBeLessThanOrEqual(0.16);

    const body = group.children[0] as THREE.Mesh;
    const bodyMaterial = body.material as THREE.MeshStandardMaterial;
    expect(bodyMaterial.emissiveIntensity).toBeCloseTo(2.2, 6);
    const headerPins = group.children[2] as THREE.Mesh;
    expect(headerPins.material).toBe(shared);
    expect((headerPins.material as THREE.MeshStandardMaterial).emissive.getHexString()).toBe('000000');

    const lights = group.children.filter((c) => c.userData[KCAD_INDICATOR_LIGHT_KEY] === true);
    expect(lights).toHaveLength(1);
    const light = lights[0] as THREE.PointLight;
    expect(light.intensity).toBeCloseTo(260, 6);
    // Physical inverse-square falloff with no cutoff sphere: no clipped
    // crescent reflection on nearby metal.
    expect(light.decay).toBe(2);
    expect(light.distance).toBe(0);
    expect(light.castShadow).toBe(false);

    applyIndicatorStates(scene, [{ ...LED, level: 0 }]);
    expect(group.children.filter((c) => c.userData[KCAD_INDICATOR_LIGHT_KEY] === true)).toHaveLength(0);
    expect(lensMaterial.emissiveIntensity).toBe(0);
    clearIndicatorLights(scene);
  });

  it('skips pins/leads when the part has no LED-named sub-mesh, and reports missing parts', () => {
    const scene = new THREE.Scene();
    const group = new THREE.Group();
    group.name = 'indicator_1';
    group.userData[KCAD_FEATURE_GROUP_KEY] = true;
    group.add(mesh('body', [4, 4, 4], [0, 0, 0], new THREE.MeshStandardMaterial()));
    group.add(mesh('metal-lead', [0.5, 0.5, 3], [1, 1, -2], new THREE.MeshStandardMaterial()));
    scene.add(group);

    const result = applyIndicatorStates(scene, [
      { part: 'indicator_1', color: '#00ff00', level: 1, intensity: 2.2 },
      { part: 'missing', color: '#00ff00', level: 1, intensity: 2.2 },
    ]);
    expect(result).toEqual({ applied: ['indicator_1'], missing: ['missing'] });
    const body = group.children[0] as THREE.Mesh;
    const lead = group.children[1] as THREE.Mesh;
    expect((body.material as THREE.MeshStandardMaterial).emissiveIntensity).toBeGreaterThan(0);
    expect((lead.material as THREE.MeshStandardMaterial).emissive.getHexString()).toBe('000000');
  });

  it('material-aware on an unnamed multi-material GLB: only the translucent lens glows', () => {
    const scene = new THREE.Scene();
    const group = new THREE.Group();
    group.name = 'led-module';
    group.userData[KCAD_FEATURE_GROUP_KEY] = true;
    const pins = new THREE.MeshStandardMaterial({ color: '#c8c8c8', metalness: 0.9, roughness: 0.25 });
    const lens = new THREE.MeshStandardMaterial({
      color: '#200000', metalness: 0, roughness: 0.2, transparent: true, opacity: 0.6,
    });
    const collar = new THREE.MeshStandardMaterial({ color: '#e8e8e8', metalness: 0, roughness: 0.5 });
    const pinMesh = unnamedMesh([0.6, 0.6, 6], [0, 0, -3], pins);
    const lensMesh = unnamedMesh([3, 3, 2], [0, 0, 1], lens);
    const collarMesh = unnamedMesh([4, 4, 1], [0, 0, 0], collar);
    group.add(pinMesh, lensMesh, collarMesh);
    scene.add(group);

    const result = applyIndicatorStates(scene, [{ part: 'led-module', color: '#ff2200', level: 1, intensity: 2.2 }]);
    expect(result).toEqual({ applied: ['led-module'], missing: [] });

    const lensMaterial = lensMesh.material as THREE.MeshStandardMaterial;
    expect(lensMaterial).not.toBe(lens);
    expect(lensMaterial.emissiveIntensity).toBeCloseTo(2.2, 6);
    // Metallic pins and the opaque collar keep their own material untouched.
    expect(pinMesh.material).toBe(pins);
    expect(collarMesh.material).toBe(collar);
    expect((pinMesh.material as THREE.MeshStandardMaterial).emissive.getHexString()).toBe('000000');
    expect((collarMesh.material as THREE.MeshStandardMaterial).emissive.getHexString()).toBe('000000');

    const lights = group.children.filter((c) => c.userData[KCAD_INDICATOR_LIGHT_KEY] === true);
    expect(lights).toHaveLength(1);
    const light = lights[0] as THREE.PointLight;
    // Dome centroid (0, 0, 1), not the pin + lens midpoint.
    expect(light.position.toArray().map((v) => Number(v.toFixed(6)))).toEqual([0, 0, 1]);
    expect(light.decay).toBe(2);
    expect(light.distance).toBe(0);
    expect(light.intensity).toBeGreaterThanOrEqual(30);
    expect(light.intensity).toBeLessThanOrEqual(260);
  });

  it('named led-dome + led-pins lights only the dome and centres the light on it', () => {
    const scene = new THREE.Scene();
    const group = new THREE.Group();
    group.name = 'led-module';
    group.userData[KCAD_FEATURE_GROUP_KEY] = true;
    const pins = new THREE.MeshStandardMaterial({ color: '#c8c8c8', metalness: 0.9, roughness: 0.25 });
    const lens = new THREE.MeshStandardMaterial({ color: '#200000', metalness: 0, roughness: 0.3 });
    const pinMesh = mesh('led-pins', [0.6, 0.6, 6], [0, 0, -3], pins);
    const domeMesh = mesh('led-dome', [3, 3, 2], [0, 0, 1], lens);
    group.add(pinMesh, domeMesh);
    scene.add(group);

    applyIndicatorStates(scene, [{ part: 'led-module', color: '#22ff44', level: 1, intensity: 2 }]);

    expect((domeMesh.material as THREE.MeshStandardMaterial).emissiveIntensity).toBeCloseTo(2, 6);
    expect(pinMesh.material).toBe(pins);
    expect((pinMesh.material as THREE.MeshStandardMaterial).emissive.getHexString()).toBe('000000');

    const lights = group.children.filter((c) => c.userData[KCAD_INDICATOR_LIGHT_KEY] === true);
    expect(lights).toHaveLength(1);
    expect((lights[0] as THREE.PointLight).position.toArray().map((v) => Number(v.toFixed(6)))).toEqual([0, 0, 1]);
  });
});

describe('publish stage and indicator lights', () => {
  it('hides only scene-level rig lights, so the part-local indicator light stays lit', () => {
    const renderer = {
      toneMapping: THREE.NeutralToneMapping,
      toneMappingExposure: 1,
      shadowMap: { enabled: false, type: THREE.PCFShadowMap },
      getSize: () => new THREE.Vector2(800, 600),
      setSize: () => undefined,
    } as unknown as THREE.WebGLRenderer;
    const { scene, group } = displayScene();
    const rigLight = new THREE.DirectionalLight();
    scene.add(rigLight);
    applyIndicatorStates(scene, [{ part: 'board_1', color: '#ff2200', level: 1, intensity: 2.2 }]);

    applyPublishStage({ scene, renderer }, { background: '#ffffff', shadow: false });

    expect(rigLight.visible).toBe(false);
    const indicatorLights = group.children.filter((c) => c.userData[KCAD_INDICATOR_LIGHT_KEY] === true);
    expect(indicatorLights).toHaveLength(1);
    expect(indicatorLights[0]!.visible).toBe(true);
  });

  it('preserves display-plane receiveShadow (false for emissive OLED, true for reflective e-paper)', async () => {
    vi.spyOn(THREE.TextureLoader.prototype, 'loadAsync').mockResolvedValue(new THREE.Texture());
    const renderer = {
      toneMapping: THREE.NeutralToneMapping,
      toneMappingExposure: 1,
      shadowMap: { enabled: false, type: THREE.PCFShadowMap },
      getSize: () => new THREE.Vector2(800, 600),
      setSize: () => undefined,
    } as unknown as THREE.WebGLRenderer;

    for (const [mode, expectedReceive] of [['oled', false], ['epaper', true]] as const) {
      const { scene, group } = displayScene();
      await applyDisplaySurfaces(scene, [{ ...DISPLAY, mode }]);
      applyPublishStage({ scene, renderer }, { background: '#ffffff', shadow: false });
      const plane = group.children.find((c) => c.userData[KCAD_DISPLAY_SURFACE_KEY] === true) as THREE.Mesh;
      expect(plane.castShadow).toBe(false);
      expect(plane.receiveShadow).toBe(expectedReceive);
    }
  });
});
