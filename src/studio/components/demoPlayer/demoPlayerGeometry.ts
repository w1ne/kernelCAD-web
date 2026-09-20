// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as THREE from 'three';
import type { FaceGeometry } from '../../../shared/worker/workerTypes';
import type { FeatureMeshSerialized } from '../../../modeling/capture/featureMeshSerialize';
import type { RenderEnvironmentSpec } from '../../../shared/intent/renderEnvironmentRecord';
import { disposeMaterialDeep } from './buildMaterialFromPBR';
import { fitDistanceForBounds } from './cameraFit';
import type { RenderView } from '../../../shared/render/views';
export type { RenderView };

export const KCAD_FEATURE_GROUP_KEY = 'kCadFeatureGroup';

export interface DemoPlayerObjectFilter {
  mode: 'focus' | 'hide';
  patterns: string[];
}

export interface DemoPlayerRenderObject {
  featureId: string;
  names: string[];
}

export interface DemoPlayerObjectVisibility {
  filter: DemoPlayerObjectFilter;
  visible: DemoPlayerRenderObject[];
  hidden: DemoPlayerRenderObject[];
}

export interface DemoPlayerMaskObject extends DemoPlayerRenderObject {
  color: string;
  rgb: [number, number, number];
  visibleIndex: number;
}

export interface DemoPlayerMaskCapture {
  pngDataUrl: string;
  objects: DemoPlayerMaskObject[];
}

export type DemoPlayerAuxInspectionChannel = 'depth' | 'normals';

export interface DemoPlayerInspectionChannelCapture {
  pngDataUrl: string;
}

export interface DemoPlayerDepthChannelMetadata {
  encoding: 'linear-camera-depth-rgba8';
  units: 'mm';
  near: number;
  far: number;
  background: 'rgba(0,0,0,0)';
  meaning: string;
}

export interface DemoPlayerNormalsChannelMetadata {
  encoding: 'view-space-normal-rgb8';
  mapping: string;
  background: 'rgba(0,0,0,0)';
  meaning: string;
}

export interface DemoPlayerInspectionCapture {
  channels: Partial<Record<DemoPlayerAuxInspectionChannel, DemoPlayerInspectionChannelCapture>>;
  metadata: {
    depth?: DemoPlayerDepthChannelMetadata;
    normals?: DemoPlayerNormalsChannelMetadata;
  };
}

export interface DevMeshPayload {
  features: FeatureMeshSerialized[];
  bounds: { min: [number, number, number]; max: [number, number, number] };
}

export interface BuildRecordStep {
  id: string;
  title: string;
  status: 'failed' | 'passed';
  script: string;
  review: {
    ok: boolean;
    summary: string;
    blockingReasons?: string[];
  };
}

export interface BuildRecord {
  title: string;
  goal: string;
  steps: BuildRecordStep[];
}

export interface DemoPlayerWindow {
  isFrameReady(): boolean;
  onEvent(event: import('../../../modeling/compute/featureEvents').FeatureEvent): void;
  setRotatePhase(durationMs: number): void;
  setTerminalLines(lines: readonly import('./TerminalPane').TerminalLine[]): void;
  startTerminalClock(originMs: number): void;
  setTitleCard(spec: { title: string; tagline: string; durationMs: number } | null): void;
  advance(dtMs: number): void;
  /** Set kernelCAD module version string for watermark, e.g. "v0.21". */
  setVersion(v: string): void;
  /** Snap camera to one of four standard engineering views and force a
   *  render. Used by `kernelcad render` for headless multi-view PNG
   *  capture. Caller should `forceFullOpacity()` first so faded-in meshes
   *  appear at full visibility. `outputAspect` (optional) is the aspect of
   *  the centered region cropped out of the canvas for the output tile —
   *  the fit guarantees the geometry sits inside that region. */
  setRenderView(view: RenderView, outputAspect?: number): void;
  /** Snap camera to an arbitrary az/el pose (degrees). az=0 looks down -Y
   *  (front view); az increases CCW around +Z (top-down); el increases looking
   *  up (positive el = camera above the horizon). Used by `kernelcad render
   *  --pose <az,el>` for headless reference-photo-pose scoring.
   *  `outputAspect` as in `setRenderView`. */
  setRenderPose(azDeg: number, elDeg: number, outputAspect?: number): void;
  /** Set every loaded FeatureMesh material to opacity 1.0 and re-render.
   *  Used by `kernelcad render` to skip the build-animation fade-in. */
  forceFullOpacity(): void;
  /** Hide every feature-mesh group that another feature lists as a
   *  predecessor — i.e. keep only the tail records visible. Used by
   *  `kernelcad render` so intermediate construction debris (cutter
   *  boxes, pre-fillet bodies) doesn't bleed through the final shape in
   *  headless captures. */
  showOnlyTailFeatures(): void;
  /** Apply a named object visibility filter for headless render inspection. */
  applyObjectVisibilityFilter(filter: DemoPlayerObjectFilter): DemoPlayerObjectVisibility;
  /** Capture a flat object-id mask for the current view without leaving the
   *  scene in mask-material mode. Colors are deterministic by visible
   *  feature-group order and exclude hidden objects. */
  captureMaskPng(maxSize?: number): DemoPlayerMaskCapture;
  /** Capture offscreen depth / normals inspection channels for the current
   *  camera state without disturbing the visible RGB frame. */
  captureInspectionChannels(input: {
    channels: readonly DemoPlayerAuxInspectionChannel[];
    width: number;
    height: number;
  }): DemoPlayerInspectionCapture;
  /** Load pre-computed per-feature meshes into the scene. Each feature becomes a named THREE.Group. */
  loadFeatureMeshes(
    perFeature: FeatureMeshSerialized[],
    bounds: { min: [number, number, number]; max: [number, number, number] },
  ): { groupCount: number };
  /** Show or hide the reference-image overlay group (`__referenceImages`). */
  setReferenceImagesVisible(visible: boolean): void;
  /** Apply (or clear) an HDRI environment. Used by the CLI's
   *  `--environment` flag to override the script's setting, and by the
   *  studio toolbar's preview-only visibility toggle. Pass null to fall
   *  back to the default three-light rig. */
  setRenderEnvironment(spec: RenderEnvironmentSpec | null): Promise<void>;
  /** Debug: dump scene state. */
  dumpScene(): {
    childCount: number;
    meshCount: number;
    cameraPos: [number, number, number];
    cameraLookingAt: [number, number, number];
    sampleOpacities: number[];
    /** polygonOffset triple per sampled mesh material — used by tests to
     *  verify the renderer applies depth bias on assembly meshes. */
    samplePolygonOffsets: Array<{ enabled: boolean; factor: number; units: number }>;
    /** Per-KCAD-feature group matrix (16 numbers column-major). Used by the
     *  B3 regression test to verify worldTransform-bearing features land on
     *  the group's matrix. */
    kcadGroupMatrices: number[][];
  };
}

declare global {
  interface Window {
    __demoPlayer?: DemoPlayerWindow;
  }
}

export function buildMeshFromFace(
  face: FaceGeometry,
  name: string,
  material: THREE.Material,
): THREE.Mesh {
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(face.vertices, 3));
  geom.setAttribute('normal', new THREE.BufferAttribute(face.normals, 3));
  geom.setIndex(new THREE.BufferAttribute(face.indices, 1));
  geom.computeBoundingSphere();
  // MeshPhysicalMaterial — physically-based shading driven by the role
  // (servo/shaft/plate/...) attached at .color() or .material() time. Pairs
  // with the three-point + rim lighting + ACES tone mapping in ViewerPane.
  // The caller applies transparent/opacity/side/polygonOffset render state.
  // polygonOffset — assemblies fan into N FeatureMeshes; adjacent parts
  // whose surfaces touch (column on plate, servo case flush against
  // bracket) produce coplanar geometry. Depth bias kills Z-fighting
  // without geometric epsilons.
  material.transparent = true;
  material.opacity = 0;
  // Transmission needs FrontSide rendering — DoubleSide produces self-occlusion
  // artifacts in the transmission render pass. polygonOffset is also dropped on
  // transmissive materials so the glass shader's depth handling stays clean.
  const physMat = material as THREE.MeshPhysicalMaterial;
  if (physMat.transmission !== undefined && physMat.transmission > 0) {
    physMat.side = THREE.FrontSide;
    physMat.flatShading = false;
    // Glass-like materials don't need depth bias — they're never coplanar
    // with structural parts.
    material.polygonOffset = false;
  } else {
    physMat.side = THREE.DoubleSide;
    physMat.flatShading = false;
    material.polygonOffset = true;
    material.polygonOffsetFactor = 1;
    material.polygonOffsetUnits = 1;
  }
  const mesh = new THREE.Mesh(geom, material);
  mesh.name = name;
  return mesh;
}

export function disposeMeshResources(mesh: THREE.Mesh): void {
  mesh.geometry.dispose();
  disposeMaterialDeep(mesh.material);
}

export function wildcardMatches(pattern: string, text: string): boolean {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${escaped}$`, 'i').test(text);
}

export function objectMatches(names: readonly string[], patterns: readonly string[]): boolean {
  return patterns.some((pattern) =>
    names.some((name) =>
      pattern.includes('*') || pattern.includes('?')
        ? wildcardMatches(pattern, name)
        : name.toLowerCase() === pattern.toLowerCase(),
    ),
  );
}

export function collectFilterNames(group: THREE.Group): string[] {
  const explicitFilterNames = Array.isArray(group.userData.filterNames)
    ? group.userData.filterNames
    : [];
  const names = [
    group.name,
    group.userData.featureId,
    group.userData.displayName,
    group.userData.assemblyFeatureId,
    group.userData.assemblyPartName,
    group.userData.featureKind,
    group.userData.sourceMetadataName,
    ...explicitFilterNames,
  ]
    .map((value) => typeof value === 'string' ? value.trim() : '')
    .filter(Boolean);
  return [...new Set(names)];
}

export function summarizeFilterObject(group: THREE.Group): DemoPlayerRenderObject {
  return {
    featureId: group.name,
    names: collectFilterNames(group),
  };
}

export function maskColorForIndex(index: number): { color: string; rgb: [number, number, number] } {
  const value = index + 1;
  if (value > 0xffffff) {
    throw new Error('demo-player: mask capture supports at most 16777215 visible objects');
  }
  const r = (value >> 16) & 0xff;
  const g = (value >> 8) & 0xff;
  const b = value & 0xff;
  return {
    color: `#${value.toString(16).padStart(6, '0')}`,
    rgb: [r, g, b],
  };
}

export function makeDepthInspectionMaterial(camera: THREE.PerspectiveCamera): THREE.ShaderMaterial {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      near: { value: camera.near },
      far: { value: camera.far },
    },
    vertexShader: `
      varying float vViewDepth;
      void main() {
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        vViewDepth = -viewPosition.z;
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: `
      uniform float near;
      uniform float far;
      varying float vViewDepth;

      vec4 packNormalizedDepth(const in float depth) {
        const vec4 bitShift = vec4(16777216.0, 65536.0, 256.0, 1.0);
        const vec4 bitMask = vec4(0.0, 1.0 / 256.0, 1.0 / 256.0, 1.0 / 256.0);
        vec4 res = fract(depth * bitShift);
        res -= res.xxyz * bitMask;
        return res;
      }

      void main() {
        float normalizedDepth = clamp((vViewDepth - near) / max(far - near, 0.0001), 0.0, 1.0);
        gl_FragColor = packNormalizedDepth(normalizedDepth);
      }
    `,
    side: THREE.DoubleSide,
    transparent: false,
    depthTest: true,
    depthWrite: true,
  });
  material.toneMapped = false;
  return material;
}

export function makeNormalsInspectionMaterial(): THREE.MeshNormalMaterial {
  const material = new THREE.MeshNormalMaterial({
    side: THREE.DoubleSide,
  });
  material.toneMapped = false;
  return material;
}

export function rgbaPixelsToPngDataUrl(pixels: Uint8Array, width: number, height: number): string {
  const flipped = new Uint8ClampedArray(pixels.length);
  const stride = width * 4;
  for (let y = 0; y < height; y++) {
    const sourceStart = (height - 1 - y) * stride;
    const targetStart = y * stride;
    flipped.set(pixels.subarray(sourceStart, sourceStart + stride), targetStart);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)) {
    return `data:image/png;base64,${btoa('inspection-channel')}`;
  }
  let ctx: CanvasRenderingContext2D | null = null;
  try {
    ctx = canvas.getContext('2d');
  } catch {
    ctx = null;
  }
  if (!ctx) {
    return `data:image/png;base64,${btoa('inspection-channel')}`;
  }
  ctx.putImageData(new ImageData(flipped, width, height), 0, 0);
  return canvas.toDataURL('image/png');
}

export function fitCameraToBounds(
  camera: THREE.PerspectiveCamera,
  bounds: { min: [number, number, number]; max: [number, number, number] },
  view: RenderView | 'demo' = 'demo',
  outputAspect?: number,
): void {
  const center: [number, number, number] = [
    (bounds.min[0] + bounds.max[0]) / 2,
    (bounds.min[1] + bounds.max[1]) / 2,
    (bounds.min[2] + bounds.max[2]) / 2,
  ];
  // kernelCAD is Z-up. Each engineering view fixes the view direction +
  // up vector so the rendered tile matches first-angle drafting
  // convention. 'demo' shares the Z-up 3/4-front-right angle with 'iso'.
  const isoLen = Math.hypot(0.7, 0.7, 0.5);
  let camDir: [number, number, number];
  let up: [number, number, number] = [0, 0, 1];
  switch (view) {
    case 'front': camDir = [0, -1, 0]; break;
    case 'right': camDir = [1, 0, 0]; break;
    case 'top':   camDir = [0, 0, 1]; up = [0, 1, 0]; break;
    case 'iso':
    case 'demo':
    default:
      camDir = [0.7 / isoLen, -0.7 / isoLen, 0.5 / isoLen];
      break;
  }
  const distance = fitDistanceForBounds({
    bounds,
    target: center,
    camDir,
    worldUp: view === 'top' ? [0, 1, 0] : [0, 0, 1],
    fovYDeg: camera.fov,
    canvasAspect: camera.aspect,
    outputAspect,
  });
  camera.up.set(up[0], up[1], up[2]);
  camera.position.set(
    center[0] + camDir[0] * distance,
    center[1] + camDir[1] * distance,
    center[2] + camDir[2] * distance,
  );
  camera.lookAt(center[0], center[1], center[2]);
  camera.near = Math.max(0.1, distance / 100);
  camera.far = distance * 20;
  camera.updateProjectionMatrix();
}

export function isVisibleInScene(obj: THREE.Object3D): boolean {
  let cur: THREE.Object3D | null = obj;
  while (cur) {
    if (!cur.visible) return false;
    cur = cur.parent;
  }
  return true;
}

export function isInsideFeatureGroup(obj: THREE.Object3D): boolean {
  let cur: THREE.Object3D | null = obj;
  while (cur) {
    if (cur instanceof THREE.Group && cur.userData[KCAD_FEATURE_GROUP_KEY]) return true;
    cur = cur.parent;
  }
  return false;
}
