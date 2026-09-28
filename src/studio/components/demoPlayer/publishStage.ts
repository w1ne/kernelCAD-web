// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/components/demoPlayer/publishStage.ts
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
import { fitDistanceForBounds } from './cameraFit';
import { CONTACT_SHADOW_LAYERS, buildContactShadow, type ContactShadow } from './contactShadow';
import { fitCameraToBounds, isInsideFeatureGroup, isVisibleInScene } from './demoPlayerGeometry';

/** userData flag on every object the stage adds; scene-bounds and mask
 *  passes skip flagged subtrees so the stage never affects framing. */
export const STAGE_HELPER_KEY = 'kCadStageHelper';

/** Lens for product shots: a longer focal length than the 45° engineering
 *  camera flattens perspective distortion the way a studio lens does. */
export const PUBLISH_FOV_DEG = 30;

/** Room IBL strength under the publish rig. */
const PUBLISH_ENV_INTENSITY = 0.55;
/** Orbit fit: azimuth samples when fitting the worst case over 360°. */
const ORBIT_FIT_STEPS = 72;

interface LightSpec {
  kind: 'directional' | 'hemisphere';
  color: number;
  intensity: number;
  /** Degrees relative to the camera azimuth (+ = CCW around +Z). */
  azOffsetDeg: number;
  elDeg: number;
}

/** Key upper-left of the camera, soft cool fill from the right, strong rim
 *  from behind for an edge highlight, and a sky/ground bounce. */
const PUBLISH_LIGHTS: readonly LightSpec[] = [
  { kind: 'directional', color: 0xfff4e8, intensity: 2.1, azOffsetDeg: -40, elDeg: 48 },
  { kind: 'directional', color: 0xe6eeff, intensity: 0.75, azOffsetDeg: 65, elDeg: 18 },
  { kind: 'directional', color: 0xffffff, intensity: 1.6, azOffsetDeg: 165, elDeg: 38 },
  { kind: 'hemisphere', color: 0xffffff, intensity: 0.45, azOffsetDeg: 0, elDeg: 90 },
];

interface StageState {
  rig: THREE.Group;
  shadows: ContactShadow[];
  hiddenLights: THREE.Light[];
  background: THREE.Scene['background'];
  environment: THREE.Texture | null;
  environmentIntensity: number;
  ownedEnvironment: THREE.Texture | undefined;
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
    const hemi = new THREE.HemisphereLight(spec.color, 0xb8b4ac, spec.intensity);
    hemi.position.set(0, 0, 1); // Z-up sky
    return hemi;
  }
  const light = new THREE.DirectionalLight(spec.color, spec.intensity);
  // Direction only matters for a directional light; the target stays at
  // the (recentered) origin while the rig turns around +Z.
  const [x, y, z] = poseCameraDir(spec.azOffsetDeg, spec.elDeg);
  light.position.set(x * 100, y * 100, z * 100);
  return light;
}

function buildRig(): THREE.Group {
  const rig = new THREE.Group();
  rig.name = '__publishRig';
  rig.userData[STAGE_HELPER_KEY] = true;
  for (const spec of PUBLISH_LIGHTS) rig.add(makeLight(spec));
  return rig;
}

function roomEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture | undefined {
  if (typeof (renderer as unknown as { compile?: unknown }).compile !== 'function') return undefined;
  const pmrem = new THREE.PMREMGenerator(renderer);
  try {
    return pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  } catch {
    return undefined;
  } finally {
    pmrem.dispose();
  }
}

/** Remove the stage and restore the scene's own lights, backdrop and IBL. */
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
  scene.background = state.background;
  scene.environment = state.environment;
  scene.environmentIntensity = state.environmentIntensity;
  state.ownedEnvironment?.dispose();
}

/**
 * Apply (or, with null, remove) the publish stage. Re-applying rebuilds it,
 * so call again after the visible model changes (reload, visibility filter)
 * to re-bake the contact shadow.
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

  const hiddenLights: THREE.Light[] = [];
  for (const child of scene.children) {
    if (child instanceof THREE.Light && child.visible) {
      child.visible = false;
      hiddenLights.push(child);
    }
  }
  const state: StageState = {
    rig: buildRig(),
    shadows: [],
    hiddenLights,
    background: scene.background,
    environment: scene.environment,
    environmentIntensity: scene.environmentIntensity,
    ownedEnvironment: undefined,
  };
  stages.set(scene, state);
  scene.add(state.rig);

  // A script-declared / --environment HDRI stays authoritative; otherwise
  // light reflections with the neutral procedural room.
  if (scene.environment === null) {
    state.ownedEnvironment = roomEnvironment(renderer);
    scene.environment = state.ownedEnvironment ?? null;
    scene.environmentIntensity = PUBLISH_ENV_INTENSITY;
  }
  scene.background = spec.background === 'transparent' ? null : new THREE.Color(spec.background);

  if (spec.shadow) {
    const casters = visibleModelMeshes(scene);
    const bounds = boundsOf(casters);
    if (!bounds.isEmpty()) {
      for (const layer of CONTACT_SHADOW_LAYERS) {
        const shadow = buildContactShadow(renderer, scene, casters, bounds, layer);
        shadow.plane.userData[STAGE_HELPER_KEY] = true;
        state.shadows.push(shadow);
      }
      // Add after every bake so no layer bakes the previous one.
      for (const shadow of state.shadows) scene.add(shadow.plane);
    }
  }
}

function azimuthOfDir(dir: readonly [number, number, number]): number {
  // Inverse of poseCameraDir's azimuth: dir = (sin az, -cos az, ·).
  if (Math.abs(dir[0]) < 1e-9 && Math.abs(dir[1]) < 1e-9) return 0;
  return (Math.atan2(dir[0], -dir[1]) * 180) / Math.PI;
}

interface Framing {
  camDir: [number, number, number];
  distance: number;
}

function frameForRequest(
  camera: THREE.PerspectiveCamera,
  bounds: { min: [number, number, number]; max: [number, number, number] },
  req: PublishFrameRequest,
): Framing {
  const target: [number, number, number] = [
    (bounds.min[0] + bounds.max[0]) / 2,
    (bounds.min[1] + bounds.max[1]) / 2,
    (bounds.min[2] + bounds.max[2]) / 2,
  ];
  const elDeg = req.elDeg ?? 0;
  const camDir = poseCameraDir(req.azDeg ?? 0, elDeg);
  const fitAt = (dir: [number, number, number]): number => fitDistanceForBounds({
    bounds, target, camDir: dir, fovYDeg: camera.fov, canvasAspect: camera.aspect, margin: req.margin,
  });
  if (req.fit !== 'orbit') return { camDir, distance: fitAt(camDir) };
  let distance = 0;
  for (let i = 0; i < ORBIT_FIT_STEPS; i++) {
    distance = Math.max(distance, fitAt(poseCameraDir((360 * i) / ORBIT_FIT_STEPS, elDeg)));
  }
  return { camDir, distance };
}

/** Aim the camera for the request; returns the camera azimuth (deg). */
function aimCamera(camera: THREE.PerspectiveCamera, scene: THREE.Scene, req: PublishFrameRequest): { azDeg: number; distance: number } {
  const box = boundsOf(visibleModelMeshes(scene));
  if (box.isEmpty()) throw new Error('demo-player: publish capture has no visible model geometry');
  const bounds = {
    min: [box.min.x, box.min.y, box.min.z] as [number, number, number],
    max: [box.max.x, box.max.y, box.max.z] as [number, number, number],
  };
  if (req.view !== undefined) {
    fitCameraToBounds(camera, bounds, req.view, camera.aspect, req.margin);
    const dir = camera.position.clone().sub(box.getCenter(new THREE.Vector3())).normalize();
    return { azDeg: azimuthOfDir([dir.x, dir.y, dir.z]), distance: camera.position.distanceTo(box.getCenter(new THREE.Vector3())) };
  }
  const { camDir, distance } = frameForRequest(camera, bounds, req);
  const c = box.getCenter(new THREE.Vector3());
  camera.up.set(0, 0, 1);
  camera.position.set(c.x + camDir[0] * distance, c.y + camDir[1] * distance, c.z + camDir[2] * distance);
  camera.lookAt(c);
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
