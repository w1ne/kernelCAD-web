// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/render-player/components/demoPlayer/publishStage.ts
//
// Page half of the 'publish' render preset (src/shared/render/publishPreset.ts):
// a studio stage for product shots. applyPublishStage() swaps the
// engineering three-light rig for a key / fill / rim rig plus a neutral
// room IBL, sets the backdrop (opaque colour or transparent), and bakes a
// soft contact shadow under the model. capturePublishFrame() frames the
// model at a requested az/el (or canonical view) with a margin, renders
// ONE frame at the supersampled output size and returns it as a PNG data
// URL — the Node side downsamples it (sharp) to the exact output size.
//
// Capture goes through the canvas, not a page screenshot: the output size
// is independent of the fixed 1920×1080 headless viewport, and a
// transparent backdrop keeps its alpha (the page must be opened with
// ?alpha=1 so the WebGL context has an alpha channel — see ViewerPane).
//
// The light rig is camera-relative in azimuth: every frame the rig is
// turned to the camera's azimuth, so a turntable orbit keeps the product
// lit from the same side (a physical turntable under fixed studio lights).

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { PublishFrameCapture, PublishFrameRequest, PublishStageSpec } from '../../../shared/render/publishPreset';
import { poseCameraDir } from '../../../shared/render/publishPreset';
import {
  CONTACT_SHADOW_LAYERS,
  STUDIO_CONTACT_SHADOW_LAYERS,
  buildContactShadow,
  type ContactShadow,
  type ContactShadowLayer,
} from './contactShadow';
import { frameForRequest, type Vec3 } from './publishFraming';
import { fitCameraToBounds, isInsideFeatureGroup, isVisibleInScene } from './demoPlayerGeometry';
import { KCAD_DISPLAY_SURFACE_KEY } from './displaySurfaces';

/** userData flag on every object the stage adds; scene-bounds and mask
 *  passes skip flagged subtrees so the stage never affects framing. */
export const STAGE_HELPER_KEY = 'kCadStageHelper';

/** Lens for product shots: a longer focal length than the 45° engineering
 *  camera flattens perspective distortion the way a studio lens does. */
export const PUBLISH_FOV_DEG = 30;

/** Room IBL strength under the legacy publish rig and procedural softbox IBL
 *  strength under the studio rig. */
const PUBLISH_ENV_INTENSITY = 0.55;
/** Studio IBL sits below the legacy room probe so bevels and cast shadows keep
 *  their contrast instead of washing out under the light tent. */
const STUDIO_ENV_INTENSITY = 0.44;
/** AgX tone mapping for the studio stage: clean highlight roll-off for metals,
 *  glass and brass. */
const STUDIO_TONE_MAPPING = THREE.AgXToneMapping;
const STUDIO_TONE_MAPPING_EXPOSURE = 1.08;

/** Scene colours use the same numeric sRGB representation as the light rig. */
const STUDIO_BACKDROP_COLOURS = {
  highlight: 0xf7f9fc,
  base: 0xeef2f7,
  horizon: 0xdde4ee,
} as const;

interface LightSpec {
  kind: 'directional' | 'hemisphere';
  color: number;
  groundColor?: number;
  intensity: number;
  /** Degrees relative to the camera azimuth (+ = CCW around +Z). */
  azOffsetDeg: number;
  elDeg: number;
  castShadow?: boolean;
  /** Shadow-map edge in texels (default 2048) and PCF blur radius. */
  shadowMapSize?: number;
  shadowRadius?: number;
}

/** Legacy publish rig — kept exact so committed catalog previews stay pixel-stable. */
const LEGACY_PUBLISH_LIGHTS: readonly LightSpec[] = [
  { kind: 'directional', color: 0xfff4e8, intensity: 2.1, azOffsetDeg: -40, elDeg: 48 },
  { kind: 'directional', color: 0xe6eeff, intensity: 0.75, azOffsetDeg: 65, elDeg: 18 },
  { kind: 'directional', color: 0xffffff, intensity: 1.6, azOffsetDeg: 165, elDeg: 38 },
  { kind: 'hemisphere', color: 0xffffff, intensity: 0.45, azOffsetDeg: 0, elDeg: 90 },
];

/** Crisp 3-point studio rig: dominant warm key upper-front-left plus a soft
 *  high-angle overhead AO caster (both cast shadows), a restrained cool fill,
 *  a grazing rear rim, and a subtle sky/ground bounce. The two shadow casters
 *  ground components onto PCBs and enclosures, not just onto the floor. */
const STUDIO_LIGHTS: readonly LightSpec[] = [
  {
    kind: 'directional', color: 0xfff5e8, intensity: 3.6, azOffsetDeg: -38, elDeg: 50,
    castShadow: true, shadowMapSize: 2048, shadowRadius: 2.0,
  },
  {
    kind: 'directional', color: 0xeef4ff, intensity: 0.75, azOffsetDeg: 42, elDeg: 76,
    castShadow: true, shadowMapSize: 1024, shadowRadius: 3.0,
  },
  { kind: 'directional', color: 0xd8e6ff, intensity: 0.28, azOffsetDeg: 78, elDeg: 18 },
  { kind: 'directional', color: 0xf4f8ff, intensity: 1.25, azOffsetDeg: 152, elDeg: 24 },
  { kind: 'hemisphere', color: 0xeef3fa, groundColor: 0x7c8694, intensity: 0.14, azOffsetDeg: 0, elDeg: 90 },
];

interface ShadowLight { light: THREE.DirectionalLight; spec: LightSpec }

interface MeshShadowState { mesh: THREE.Mesh; castShadow: boolean; receiveShadow: boolean }

interface StageState {
  renderer: THREE.WebGLRenderer;
  rig: THREE.Group;
  shadowLights: ShadowLight[];
  shadows: ContactShadow[];
  hiddenLights: THREE.Light[];
  background: THREE.Scene['background'];
  ownedBackdropTexture: THREE.Texture | undefined;
  environment: THREE.Texture | null;
  environmentIntensity: number;
  environmentRotation: THREE.Euler;
  ownedEnvironment: THREE.Texture | undefined;
  toneMapping: THREE.ToneMapping;
  toneMappingExposure: number;
  shadowMapEnabled: boolean;
  shadowMapType: THREE.ShadowMapType;
  meshShadows: MeshShadowState[];
}

const stages = new WeakMap<THREE.Scene, StageState>();
/** Canvas size before the first publish capture resized it. The canvas
 *  stays at the publish size across frames (a turntable resizes once, not
 *  twice per frame); clearing the stage restores it. */
const engineeringCanvasSize = new WeakMap<THREE.WebGLRenderer, THREE.Vector2>();

/** The viewer's continuous rAF redraw is paused while the canvas holds a
 *  publish capture: frames are rendered on demand, and a free-running loop
 *  at the (supersampled) publish size would steal the capture's time. */
export function isRenderLoopPaused(renderer: THREE.WebGLRenderer): boolean {
  return engineeringCanvasSize.has(renderer);
}

function restoreCanvasSize(renderer: THREE.WebGLRenderer): void {
  const size = engineeringCanvasSize.get(renderer);
  if (!size) return;
  engineeringCanvasSize.delete(renderer);
  renderer.setSize(size.x, size.y, false);
}

function ensureCanvasSize(renderer: THREE.WebGLRenderer, width: number, height: number): void {
  if (!engineeringCanvasSize.has(renderer)) engineeringCanvasSize.set(renderer, renderer.getSize(new THREE.Vector2()));
  const current = renderer.getSize(new THREE.Vector2());
  // setSize reallocates the drawing buffer even for an unchanged size.
  if (current.x !== width || current.y !== height) renderer.setSize(width, height, false);
}

export function isStageHelper(obj: THREE.Object3D): boolean {
  let cur: THREE.Object3D | null = obj;
  while (cur) {
    if (cur.userData[STAGE_HELPER_KEY]) return true;
    cur = cur.parent;
  }
  return false;
}

/** Visible model meshes: inside a kCAD feature group, visible, not stage. */
function visibleModelMeshes(scene: THREE.Scene): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh && isInsideFeatureGroup(obj) && isVisibleInScene(obj) && !isStageHelper(obj)) {
      meshes.push(obj);
    }
  });
  return meshes;
}

function boundsOf(meshes: readonly THREE.Mesh[]): THREE.Box3 {
  const box = new THREE.Box3();
  for (const mesh of meshes) box.expandByObject(mesh);
  return box;
}

function makeLight(spec: LightSpec): THREE.Light {
  if (spec.kind === 'hemisphere') {
    const hemi = new THREE.HemisphereLight(spec.color, spec.groundColor ?? 0xb8b4ac, spec.intensity);
    hemi.position.set(0, 0, 1); // Z-up sky
    return hemi;
  }
  const light = new THREE.DirectionalLight(spec.color, spec.intensity);
  // Direction only matters for a directional light; the target stays at
  // the (recentered) origin while the rig turns around +Z.
  const [x, y, z] = poseCameraDir(spec.azOffsetDeg, spec.elDeg);
  light.position.set(x * 100, y * 100, z * 100);
  if (spec.castShadow) {
    light.castShadow = true;
    const mapSize = spec.shadowMapSize ?? 2048;
    light.shadow.mapSize.set(mapSize, mapSize);
    light.shadow.radius = spec.shadowRadius ?? 2.0;
    light.shadow.bias = -0.0005;
  }
  return light;
}

function buildRig(studio: boolean): { rig: THREE.Group; shadowLights: ShadowLight[] } {
  const rig = new THREE.Group();
  rig.name = '__publishRig';
  rig.userData[STAGE_HELPER_KEY] = true;
  const shadowLights: ShadowLight[] = [];
  const specs = studio ? STUDIO_LIGHTS : LEGACY_PUBLISH_LIGHTS;
  for (const spec of specs) {
    const light = makeLight(spec);
    rig.add(light);
    if (spec.castShadow && light instanceof THREE.DirectionalLight) {
      // The target must live in the graph for its world matrix to update.
      rig.add(light.target);
      shadowLights.push({ light, spec });
    }
  }
  return { rig, shadowLights };
}

/** Procedural Z-up studio light tent: bright overhead softbox, warm key at
 *  upper-front-left, cool fill panel front-right, rear-left/rear-right rim
 *  strips for metal and glass highlights, and a neutral floor bounce. Baked
 *  through PMREM so every PBR surface has a consistent studio reflection. */
export function buildStudioSoftboxEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture | undefined {
  if (typeof (renderer as unknown as { compile?: unknown }).compile !== 'function') return undefined;
  const envScene = new THREE.Scene();
  // Dark studio walls keep bevel highlights and cast shadows deep instead of
  // washing the whole tent into a grey haze.
  envScene.background = new THREE.Color(0x1b2028);
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const addPanel = (
    width: number,
    height: number,
    color: number,
    intensity: number,
    position: readonly [number, number, number],
  ): void => {
    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color).multiplyScalar(intensity),
      side: THREE.DoubleSide,
    });
    const panel = new THREE.Mesh(geometry, material);
    panel.position.set(position[0], position[1], position[2]);
    panel.lookAt(0, 0, 0);
    envScene.add(panel);
    geometries.push(geometry);
    materials.push(material);
  };
  addPanel(5.5, 5.5, 0xffffff, 1.8, [0, 0, 10]);        // tight overhead softbox: crisp top faces, unwashed shadows
  addPanel(4.0, 7.5, 0xfff0da, 3.0, [-7, -6, 2.2]);     // warm key vertical strip (catches vertical metal faces)
  addPanel(4.0, 6.0, 0xd8e6ff, 1.5, [7, -5, 1.2]);      // cool fill horizon card (lifts dark front-side faces)
  addPanel(3.2, 8.5, 0xffffff, 3.6, [-6, 7, 2.5]);      // rear-left rim strip
  addPanel(3.2, 8.5, 0xffffff, 3.6, [6, 7, 2.5]);       // rear-right rim strip
  addPanel(12, 12, 0x8a94a2, 0.25, [0, 0, -8]);         // subtle floor bounce (-Z)

  const pmrem = (() => {
    try {
      return new THREE.PMREMGenerator(renderer);
    } catch {
      return undefined;
    }
  })();
  try {
    return pmrem === undefined ? undefined : pmrem.fromScene(envScene, 0.04).texture;
  } catch {
    return undefined;
  } finally {
    pmrem?.dispose();
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
  }
}

/** Soft radial studio gradient sweep: bright upper centre falling to a cool
 *  grey horizon, so the silhouette separates without a hard backdrop edge.
 *  Falls back to a flat colour where there is no DOM (node / jsdom tests). */
export function buildStudioBackdropTexture(): THREE.Texture | THREE.Color {
  if (typeof document === 'undefined') return new THREE.Color(STUDIO_BACKDROP_COLOURS.base);
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Color(STUDIO_BACKDROP_COLOURS.base);
  const gradient = ctx.createRadialGradient(size * 0.5, size * 0.42, size * 0.06, size * 0.5, size * 0.58, size * 0.85);
  gradient.addColorStop(0, new THREE.Color(STUDIO_BACKDROP_COLOURS.highlight).getStyle(THREE.SRGBColorSpace));
  gradient.addColorStop(0.62, new THREE.Color(STUDIO_BACKDROP_COLOURS.base).getStyle(THREE.SRGBColorSpace));
  gradient.addColorStop(1, new THREE.Color(STUDIO_BACKDROP_COLOURS.horizon).getStyle(THREE.SRGBColorSpace));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/** Transmissive surfaces (glass, acrylic) neither cast nor occlude usefully in
 *  the depth-map pass; they still receive so highlights stay grounded. */
export function isTransmissiveMaterial(material: THREE.Material | THREE.Material[]): boolean {
  const materials = Array.isArray(material) ? material : [material];
  return materials.some((entry) => ((entry as THREE.MeshPhysicalMaterial).transmission ?? 0) > 0);
}

/** Mark materials dirty so three.js recompiles with/without USE_SHADOWMAP
 *  when shadow mapping is toggled after initial WebGL shader compilation. */
function markMaterialsNeedsUpdate(material: THREE.Material | THREE.Material[]): void {
  const materials = Array.isArray(material) ? material : [material];
  for (const entry of materials) entry.needsUpdate = true;
}

/** Enable real inter-part self-shadowing on every visible model mesh.
 *  Transmissive glass does not cast a useful depth-map shadow, but it still
 *  receives so highlights stay grounded on the part. A display plane sits
 *  0.035 mm off its part face: it must not cast, or its own shadow would
 *  darken the screen it carries. */
function configureMeshShadows(meshes: readonly THREE.Mesh[]): MeshShadowState[] {
  const saved: MeshShadowState[] = [];
  for (const mesh of meshes) {
    saved.push({ mesh, castShadow: mesh.castShadow, receiveShadow: mesh.receiveShadow });
    const displayPlane = mesh.userData[KCAD_DISPLAY_SURFACE_KEY] === true;
    mesh.castShadow = !displayPlane && !isTransmissiveMaterial(mesh.material);
    mesh.receiveShadow = displayPlane ? mesh.receiveShadow : true;
    markMaterialsNeedsUpdate(mesh.material);
  }
  return saved;
}

/** Remove the stage and restore the scene's own lights, backdrop, IBL, tone
 *  mapping, shadow state and per-mesh shadow flags. */
export function clearPublishStage(scene: THREE.Scene): void {
  const state = stages.get(scene);
  if (!state) return;
  stages.delete(scene);
  scene.remove(state.rig);
  for (const shadow of state.shadows) {
    shadow.plane.parent?.remove(shadow.plane);
    shadow.dispose();
  }
  for (const light of state.hiddenLights) light.visible = true;
  for (const saved of state.meshShadows) {
    saved.mesh.castShadow = saved.castShadow;
    saved.mesh.receiveShadow = saved.receiveShadow;
    markMaterialsNeedsUpdate(saved.mesh.material);
  }
  scene.background = state.background;
  state.ownedBackdropTexture?.dispose();
  scene.environment = state.environment;
  scene.environmentIntensity = state.environmentIntensity;
  scene.environmentRotation.copy(state.environmentRotation);
  state.ownedEnvironment?.dispose();
  state.renderer.toneMapping = state.toneMapping;
  state.renderer.toneMappingExposure = state.toneMappingExposure;
  state.renderer.shadowMap.enabled = state.shadowMapEnabled;
  state.renderer.shadowMap.type = state.shadowMapType;
}

function hideSceneLights(scene: THREE.Scene): THREE.Light[] {
  const hidden: THREE.Light[] = [];
  for (const child of scene.children) {
    if (child instanceof THREE.Light && child.visible) {
      child.visible = false;
      hidden.push(child);
    }
  }
  return hidden;
}

function applyStageBackdrop(scene: THREE.Scene, state: StageState, background: string): void {
  if (background === 'transparent') {
    scene.background = null;
    return;
  }
  if (background === 'studio') {
    const backdrop = buildStudioBackdropTexture();
    if (backdrop instanceof THREE.Texture) state.ownedBackdropTexture = backdrop;
    scene.background = backdrop;
    return;
  }
  scene.background = new THREE.Color(background);
}

function buildLegacyRoomEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture | undefined {
  if (typeof (renderer as unknown as { compile?: unknown }).compile !== 'function') return undefined;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = new RoomEnvironment();
  const rt = pmrem.fromScene(env, 0.04);
  env.dispose();
  pmrem.dispose();
  return rt.texture;
}

function bakeContactShadows(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  casters: readonly THREE.Mesh[],
  layers: readonly ContactShadowLayer[],
): ContactShadow[] {
  const bounds = boundsOf(casters);
  if (bounds.isEmpty()) return [];
  const baked: ContactShadow[] = [];
  for (const layer of layers) {
    const shadow = buildContactShadow(renderer, scene, casters, bounds, layer);
    shadow.plane.userData[STAGE_HELPER_KEY] = true;
    baked.push(shadow);
  }
  // Add after every bake so no layer bakes the previous one.
  for (const shadow of baked) scene.add(shadow.plane);
  return baked;
}

function applyStudioLightingAndEnv(scene: THREE.Scene, renderer: THREE.WebGLRenderer, state: StageState): void {
  // Explicit script / --environment HDRI stays authoritative; only replace
  // the unrotated default room probe (or a missing environment).
  if (scene.environment === null || scene.userData.kCadDefaultEnv === true) {
    state.ownedEnvironment = buildStudioSoftboxEnvironment(renderer);
    scene.environment = state.ownedEnvironment ?? null;
    scene.environmentIntensity = STUDIO_ENV_INTENSITY;
    scene.environmentRotation.set(0, 0, 0);
  }
  renderer.toneMapping = STUDIO_TONE_MAPPING;
  renderer.toneMappingExposure = STUDIO_TONE_MAPPING_EXPOSURE;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = true;
  renderer.shadowMap.needsUpdate = true;
}

function applyLegacyPublishEnv(scene: THREE.Scene, renderer: THREE.WebGLRenderer, state: StageState): void {
  if (scene.environment === null) {
    state.ownedEnvironment = buildLegacyRoomEnvironment(renderer);
    scene.environment = state.ownedEnvironment ?? null;
    scene.environmentIntensity = PUBLISH_ENV_INTENSITY;
  }
}

/**
 * Apply (or, with null, remove) the publish / studio stage. Re-applying
 * rebuilds it, so call again after the visible model changes (reload,
 * visibility filter) to re-bake the contact shadow.
 */
export function applyPublishStage(
  ctx: { scene: THREE.Scene; renderer: THREE.WebGLRenderer },
  spec: PublishStageSpec | null,
): void {
  const { scene, renderer } = ctx;
  clearPublishStage(scene);
  if (spec === null) {
    restoreCanvasSize(renderer);
    return;
  }

  const studio = spec.stage === 'studio';
  const { rig, shadowLights } = buildRig(studio);
  const state: StageState = {
    renderer,
    rig,
    shadowLights,
    shadows: [],
    hiddenLights: hideSceneLights(scene),
    background: scene.background,
    ownedBackdropTexture: undefined,
    environment: scene.environment,
    environmentIntensity: scene.environmentIntensity,
    environmentRotation: scene.environmentRotation.clone(),
    ownedEnvironment: undefined,
    toneMapping: renderer.toneMapping,
    toneMappingExposure: renderer.toneMappingExposure,
    shadowMapEnabled: renderer.shadowMap.enabled,
    shadowMapType: renderer.shadowMap.type,
    meshShadows: [],
  };
  stages.set(scene, state);
  scene.add(state.rig);

  if (studio) applyStudioLightingAndEnv(scene, renderer, state);
  else applyLegacyPublishEnv(scene, renderer, state);

  applyStageBackdrop(scene, state, spec.background);

  const casters = visibleModelMeshes(scene);
  if (studio) state.meshShadows = configureMeshShadows(casters);
  const layers = studio ? STUDIO_CONTACT_SHADOW_LAYERS : CONTACT_SHADOW_LAYERS;
  if (spec.shadow) state.shadows = bakeContactShadows(renderer, scene, casters, layers);
}

const SHADOW_UP = new THREE.Vector3(0, 0, 1);
const SHADOW_UP_ALT = new THREE.Vector3(0, 1, 0);

interface ViewSpaceExtents {
  minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number;
}

/** Project the eight world corners of `box` into the shadow camera's view space
 *  (camera looks down -Z, so -maxZ is the nearest and -minZ the farthest depth). */
function viewSpaceExtents(box: THREE.Box3, inverse: THREE.Matrix4): ViewSpaceExtents {
  const extents: ViewSpaceExtents = {
    minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity,
  };
  const corner = new THREE.Vector3();
  for (let i = 0; i < 8; i += 1) {
    corner.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z);
    corner.applyMatrix4(inverse);
    extents.minX = Math.min(extents.minX, corner.x);
    extents.maxX = Math.max(extents.maxX, corner.x);
    extents.minY = Math.min(extents.minY, corner.y);
    extents.maxY = Math.max(extents.maxY, corner.y);
    extents.minZ = Math.min(extents.minZ, corner.z);
    extents.maxZ = Math.max(extents.maxZ, corner.z);
  }
  return extents;
}

/** Point the shadow camera from the light at the model centre, with a Z-up
 *  frame (three's LightShadow.updateMatrices reproduces the same basis). */
function aimShadowCamera(light: THREE.DirectionalLight, worldCentre: THREE.Vector3): void {
  const camera = light.shadow.camera;
  const position = light.getWorldPosition(new THREE.Vector3());
  const dir = worldCentre.clone().sub(position).normalize();
  camera.up.copy(Math.abs(dir.z) > 0.99 ? SHADOW_UP_ALT : SHADOW_UP);
  camera.position.copy(position);
  camera.lookAt(worldCentre);
  camera.updateMatrixWorld(true);
}

/** Fit one directional light's orthographic shadow camera to the visible
 *  model's light-space AABB: a tight frustum gives crisp inter-part shadows
 *  where a bounding-sphere cube wastes most of the map. */
function fitDirectionalShadow(
  light: THREE.DirectionalLight,
  spec: LightSpec,
  box: THREE.Box3,
  azDeg: number,
): void {
  const azRad = (azDeg * Math.PI) / 180;
  const worldCentre = box.getCenter(new THREE.Vector3());
  const localCentre = worldCentre.clone().applyAxisAngle(SHADOW_UP, -azRad);
  const radius = Math.max(box.getBoundingSphere(new THREE.Sphere()).radius, 1e-3);
  const [dx, dy, dz] = poseCameraDir(spec.azOffsetDeg, spec.elDeg);
  const distance = Math.max(radius * 2.5, radius + 2);
  light.position.copy(localCentre).addScaledVector(new THREE.Vector3(dx, dy, dz), distance);
  light.target.position.copy(localCentre);
  light.parent?.updateMatrixWorld(true);
  light.updateMatrixWorld(true);
  light.target.updateMatrixWorld(true);

  const camera = light.shadow.camera;
  aimShadowCamera(light, worldCentre);
  const ext = viewSpaceExtents(box, camera.matrixWorldInverse);
  const padXY = Math.max(Math.max(ext.maxX - ext.minX, ext.maxY - ext.minY) * 0.06, 1);
  const nearDist = -ext.maxZ;
  const farDist = -ext.minZ;
  const padZ = Math.max((farDist - nearDist) * 0.12, 2);
  camera.left = ext.minX - padXY;
  camera.right = ext.maxX + padXY;
  camera.bottom = ext.minY - padXY;
  camera.top = ext.maxY + padXY;
  camera.near = Math.max(nearDist - padZ, 0.01);
  camera.far = farDist + padZ;
  camera.updateProjectionMatrix();
  const texelSize = Math.max(camera.right - camera.left, camera.top - camera.bottom)
    / Math.max(light.shadow.mapSize.width, 1);
  light.shadow.bias = -0.00015;
  light.shadow.normalBias = Math.max(0.015, texelSize * 1.5);
}

/** Re-fit every shadow caster after the rig has turned to the camera azimuth. */
function fitStageShadows(state: StageState, scene: THREE.Scene, azDeg: number): void {
  if (state.shadowLights.length === 0) return;
  const box = boundsOf(visibleModelMeshes(scene));
  if (box.isEmpty()) return;
  for (const { light, spec } of state.shadowLights) fitDirectionalShadow(light, spec, box, azDeg);
}

function azimuthOfDir(dir: readonly [number, number, number]): number {
  // Inverse of poseCameraDir's azimuth: dir = (sin az, -cos az, ·).
  if (Math.abs(dir[0]) < 1e-9 && Math.abs(dir[1]) < 1e-9) return 0;
  return (Math.atan2(dir[0], -dir[1]) * 180) / Math.PI;
}

/** Cap on the vertices the framing fit visits (uniform stride). */
const FRAMING_POINT_BUDGET = 60_000;

/** World-space vertices of the visible model (strided to the budget). */
export function modelPoints(meshes: readonly THREE.Mesh[]): Vec3[] {
  let total = 0;
  for (const mesh of meshes) total += mesh.geometry.getAttribute('position')?.count ?? 0;
  const stride = Math.max(1, Math.ceil(total / FRAMING_POINT_BUDGET));
  const v = new THREE.Vector3();
  const out: Vec3[] = [];
  for (const mesh of meshes) {
    const pos = mesh.geometry.getAttribute('position');
    if (!pos) continue;
    mesh.updateWorldMatrix(true, false);
    for (let i = 0; i < pos.count; i += stride) {
      v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
      out.push([v.x, v.y, v.z]);
    }
  }
  return out;
}

/** Aim the camera for the request; returns the camera azimuth (deg). Shadow
 *  fitting happens after the rig turns, in capturePublishFrame. */
function aimCamera(camera: THREE.PerspectiveCamera, scene: THREE.Scene, req: PublishFrameRequest): { azDeg: number; distance: number } {
  const meshes = visibleModelMeshes(scene);
  const box = boundsOf(meshes);
  if (box.isEmpty()) throw new Error('demo-player: publish capture has no visible model geometry');
  if (req.view !== undefined) {
    const bounds = {
      min: [box.min.x, box.min.y, box.min.z] as Vec3,
      max: [box.max.x, box.max.y, box.max.z] as Vec3,
    };
    fitCameraToBounds(camera, bounds, req.view, camera.aspect, req.margin);
    const centre = box.getCenter(new THREE.Vector3());
    const dir = camera.position.clone().sub(centre).normalize();
    const azDeg = azimuthOfDir([dir.x, dir.y, dir.z]);
    return { azDeg, distance: camera.position.distanceTo(centre) };
  }
  const { target, camDir, distance } = frameForRequest(modelPoints(meshes), req, {
    fovYDeg: camera.fov, aspect: camera.aspect, margin: req.margin,
  });
  camera.up.set(0, 0, 1);
  camera.position.set(target[0] + camDir[0] * distance, target[1] + camDir[1] * distance, target[2] + camDir[2] * distance);
  camera.lookAt(target[0], target[1], target[2]);
  camera.near = Math.max(0.1, distance / 100);
  camera.far = distance * 20;
  camera.updateProjectionMatrix();
  return { azDeg: req.azDeg ?? 0, distance };
}

/**
 * Render one publish frame at `width*supersample × height*supersample` and
 * return it as a PNG data URL. Restores the camera lens and aspect
 * afterwards; the canvas keeps the publish size until the stage is cleared
 * (setPublishStage(null)).
 */
export function capturePublishFrame(
  ctx: { scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer },
  req: PublishFrameRequest,
): PublishFrameCapture {
  const { scene, camera, renderer } = ctx;
  const originalFov = camera.fov;
  const originalAspect = camera.aspect;
  try {
    camera.fov = PUBLISH_FOV_DEG;
    camera.aspect = req.width / req.height;
    camera.updateProjectionMatrix();
    const { azDeg, distance } = aimCamera(camera, scene, req);
    const state = stages.get(scene);
    if (state !== undefined) state.rig.rotation.z = (azDeg * Math.PI) / 180;
    scene.updateMatrixWorld(true);
    if (state !== undefined) fitStageShadows(state, scene, azDeg);
    ensureCanvasSize(renderer, req.width * req.supersample, req.height * req.supersample);
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);
    return { pngDataUrl: renderer.domElement.toDataURL('image/png'), distance };
  } finally {
    camera.fov = originalFov;
    camera.aspect = originalAspect;
    camera.updateProjectionMatrix();
  }
}
