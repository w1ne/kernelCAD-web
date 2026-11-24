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
import type { PublishFrameCapture, PublishFrameRequest, PublishStageSpec } from '../../../shared/render/publishPreset';
import { poseCameraDir } from '../../../shared/render/publishPreset';
import { CONTACT_SHADOW_LAYERS, buildContactShadow, type ContactShadow } from './contactShadow';
import { frameForRequest, type Vec3 } from './publishFraming';
import { fitCameraToBounds, isInsideFeatureGroup, isVisibleInScene } from './demoPlayerGeometry';

/** userData flag on every object the stage adds; scene-bounds and mask
 *  passes skip flagged subtrees so the stage never affects framing. */
export const STAGE_HELPER_KEY = 'kCadStageHelper';

/** Lens for product shots: a longer focal length than the 45° engineering
 *  camera flattens perspective distortion the way a studio lens does. */
export const PUBLISH_FOV_DEG = 30;

/** Procedural studio softbox IBL strength under the studio rig. Balanced so
 *  metals and glass reflect bright softbox cards while the shadow-casting key
 *  light drives >60% of diffuse lighting for crisp inter-part self-shadowing. */
const PUBLISH_ENV_INTENSITY = 0.88;
/** AgX tone mapping: clean highlight roll-off for metals, glass and brass. */
const PUBLISH_TONE_MAPPING = THREE.AgXToneMapping;
const PUBLISH_TONE_MAPPING_EXPOSURE = 1.06;

interface LightSpec {
  kind: 'directional' | 'hemisphere';
  color: number;
  groundColor?: number;
  intensity: number;
  /** Degrees relative to the camera azimuth (+ = CCW around +Z). */
  azOffsetDeg: number;
  elDeg: number;
  castShadow?: boolean;
}

/** Crisp 3-point studio rig: dominant warm key upper-front-left (shadow
 *  caster), restrained cool fill front-right, grazing rear rim, and subtle
 *  sky/ground bounce so cast shadows read crisply across parts and PCBs. */
const PUBLISH_KEY = { color: 0xfff6ec, intensity: 2.2, azOffsetDeg: -38, elDeg: 46 } as const;

const PUBLISH_LIGHTS: readonly LightSpec[] = [
  { kind: 'directional', ...PUBLISH_KEY, castShadow: true },
  { kind: 'directional', color: 0xdce8ff, intensity: 0.85, azOffsetDeg: 65, elDeg: 20 },
  { kind: 'directional', color: 0xf5f8ff, intensity: 1.75, azOffsetDeg: 158, elDeg: 36 },
  { kind: 'hemisphere', color: 0xf8fafc, groundColor: 0xc8cfd9, intensity: 0.55, azOffsetDeg: 0, elDeg: 90 },
];

interface MeshShadowState { mesh: THREE.Mesh; castShadow: boolean; receiveShadow: boolean }

interface StageState {
  renderer: THREE.WebGLRenderer;
  rig: THREE.Group;
  keyLight?: THREE.DirectionalLight;
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
    const hemi = new THREE.HemisphereLight(spec.color, spec.groundColor ?? 0xc8cfd9, spec.intensity);
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
    light.shadow.mapSize.set(1024, 1024);
    light.shadow.radius = 2.5;
    light.shadow.bias = -0.0004;
  }
  return light;
}

function buildRig(): { rig: THREE.Group; keyLight?: THREE.DirectionalLight } {
  const rig = new THREE.Group();
  rig.name = '__publishRig';
  rig.userData[STAGE_HELPER_KEY] = true;
  let keyLight: THREE.DirectionalLight | undefined;
  for (const spec of PUBLISH_LIGHTS) {
    const light = makeLight(spec);
    rig.add(light);
    if (spec.castShadow && light instanceof THREE.DirectionalLight) {
      // The target must live in the graph for its world matrix to update.
      rig.add(light.target);
      keyLight = light;
    }
  }
  return { rig, ...(keyLight !== undefined ? { keyLight } : {}) };
}

/** Procedural Z-up studio light tent: bright overhead softbox, warm key at
 *  upper-front-left, cool fill panel front-right, rear-left/rear-right rim
 *  strips for metal and glass highlights, and a neutral floor bounce. Baked
 *  through PMREM so every PBR surface has a consistent studio reflection. */
export function buildStudioSoftboxEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture | undefined {
  if (typeof (renderer as unknown as { compile?: unknown }).compile !== 'function') return undefined;
  const envScene = new THREE.Scene();
  // Mid-dark studio walls prevent pitch-black crushes on vertical dark metals
  // while keeping crisp contrast against the horizon & overhead softbox cards.
  envScene.background = new THREE.Color(0x2a303a);
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
  addPanel(7.5, 7.5, 0xffffff, 2.2, [0, 0, 10]);        // overhead softbox (+Z, balanced so top shadows stay crisp)
  addPanel(4.5, 7.5, 0xfff0da, 3.2, [-7, -6, 2.2]);     // warm key vertical strip (catches vertical metal faces)
  addPanel(4.5, 6.5, 0xd8e6ff, 1.8, [7, -5, 1.2]);      // cool fill horizon card (lifts dark front-side faces)
  addPanel(3.5, 8.5, 0xffffff, 3.4, [-6, 7, 2.5]);      // rear-left rim strip
  addPanel(3.5, 8.5, 0xffffff, 3.4, [6, 7, 2.5]);       // rear-right rim strip
  addPanel(12, 12, 0x9aa4b2, 0.35, [0, 0, -8]);         // subtle floor bounce (-Z)

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
  if (typeof document === 'undefined') return new THREE.Color('#eef2f7');
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Color('#eef2f7');
  const gradient = ctx.createRadialGradient(size * 0.5, size * 0.42, size * 0.06, size * 0.5, size * 0.58, size * 0.85);
  gradient.addColorStop(0, '#f7f9fc');
  gradient.addColorStop(0.62, '#eef2f7');
  gradient.addColorStop(1, '#dde4ee');
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
 *  receives so highlights stay grounded on the part. */
function configureMeshShadows(meshes: readonly THREE.Mesh[]): MeshShadowState[] {
  const saved: MeshShadowState[] = [];
  for (const mesh of meshes) {
    saved.push({ mesh, castShadow: mesh.castShadow, receiveShadow: mesh.receiveShadow });
    mesh.castShadow = !isTransmissiveMaterial(mesh.material);
    mesh.receiveShadow = true;
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

function bakeContactShadows(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  casters: readonly THREE.Mesh[],
): ContactShadow[] {
  const bounds = boundsOf(casters);
  if (bounds.isEmpty()) return [];
  const baked: ContactShadow[] = [];
  for (const layer of CONTACT_SHADOW_LAYERS) {
    const shadow = buildContactShadow(renderer, scene, casters, bounds, layer);
    shadow.plane.userData[STAGE_HELPER_KEY] = true;
    baked.push(shadow);
  }
  // Add after every bake so no layer bakes the previous one.
  for (const shadow of baked) scene.add(shadow.plane);
  return baked;
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

  const { rig, keyLight } = buildRig();
  const state: StageState = {
    renderer,
    rig,
    ...(keyLight !== undefined ? { keyLight } : {}),
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

  // ENVIRONMENT BUG FIX: a script-declared / --environment HDRI stays
  // authoritative, but the unrotated default room probe (or no environment at
  // all) is ALWAYS replaced with the studio softbox.
  if (scene.environment === null || scene.userData.kCadDefaultEnv === true) {
    state.ownedEnvironment = buildStudioSoftboxEnvironment(renderer);
    scene.environment = state.ownedEnvironment ?? null;
    scene.environmentIntensity = PUBLISH_ENV_INTENSITY;
    scene.environmentRotation.set(0, 0, 0);
  }

  renderer.toneMapping = PUBLISH_TONE_MAPPING;
  renderer.toneMappingExposure = PUBLISH_TONE_MAPPING_EXPOSURE;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = true;
  renderer.shadowMap.needsUpdate = true;

  applyStageBackdrop(scene, state, spec.background);

  const casters = visibleModelMeshes(scene);
  state.meshShadows = configureMeshShadows(casters);
  if (spec.shadow) state.shadows = bakeContactShadows(renderer, scene, casters);
}

/** Fit the key light and its orthographic shadow camera tightly around the
 *  visible model's bounding sphere for crisp inter-part self-shadowing. */
function fitKeyLightShadow(
  keyLight: THREE.DirectionalLight,
  centre: THREE.Vector3,
  radius: number,
  azDeg: number,
): void {
  const azRad = (azDeg * Math.PI) / 180;
  const zAxis = new THREE.Vector3(0, 0, 1);
  const localCentre = centre.clone().applyAxisAngle(zAxis, -azRad);
  const [dx, dy, dz] = poseCameraDir(PUBLISH_KEY.azOffsetDeg, PUBLISH_KEY.elDeg);
  // Local direction is fixed; the rig's +Z rotation turns it with the camera,
  // so the key stays upper-front-left of every turntable frame.
  const localDir = new THREE.Vector3(dx, dy, dz);
  const distance = Math.max(radius * 2.6, radius + 1);
  keyLight.position.copy(localCentre).addScaledVector(localDir, distance);
  keyLight.target.position.copy(localCentre);
  keyLight.target.updateMatrixWorld();

  const extent = Math.max(radius * 1.45, 1e-3);
  const shadowCamera = keyLight.shadow.camera;
  shadowCamera.left = -extent;
  shadowCamera.right = extent;
  shadowCamera.top = extent;
  shadowCamera.bottom = -extent;
  shadowCamera.near = 0.1;
  shadowCamera.far = radius * 8;
  shadowCamera.updateProjectionMatrix();
  keyLight.shadow.normalBias = Math.max(0.02, radius * 0.004);
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

/** Aim the camera for the request; returns the camera azimuth (deg). */
function aimCamera(camera: THREE.PerspectiveCamera, scene: THREE.Scene, req: PublishFrameRequest): { azDeg: number; distance: number } {
  const meshes = visibleModelMeshes(scene);
  const box = boundsOf(meshes);
  if (box.isEmpty()) throw new Error('demo-player: publish capture has no visible model geometry');
  const state = stages.get(scene);
  const fitShadow = (azDeg: number): void => {
    if (state?.keyLight === undefined) return;
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const radius = Math.max(sphere.radius, 1e-3);
    fitKeyLightShadow(state.keyLight, sphere.center, radius, azDeg);
  };
  if (req.view !== undefined) {
    const bounds = {
      min: [box.min.x, box.min.y, box.min.z] as Vec3,
      max: [box.max.x, box.max.y, box.max.z] as Vec3,
    };
    fitCameraToBounds(camera, bounds, req.view, camera.aspect, req.margin);
    const centre = box.getCenter(new THREE.Vector3());
    const dir = camera.position.clone().sub(centre).normalize();
    const azDeg = azimuthOfDir([dir.x, dir.y, dir.z]);
    fitShadow(azDeg);
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
  const azDeg = req.azDeg ?? 0;
  fitShadow(azDeg);
  return { azDeg, distance };
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
    const rig = stages.get(scene)?.rig;
    if (rig) rig.rotation.z = (azDeg * Math.PI) / 180;
    scene.updateMatrixWorld(true);
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
