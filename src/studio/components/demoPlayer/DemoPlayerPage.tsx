import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ViewerPane } from './ViewerPane';
import { TerminalPane } from './TerminalPane';
import { TitleCard } from './TitleCard';
import { AnimationEngine } from './AnimationEngine';
import { CameraController } from './CameraController';
import type { FeatureEvent } from '../../../modeling/compute/featureEvents';
import type { TerminalLine } from './TerminalPane';
import type { FaceGeometry } from '../../../shared/worker/workerTypes';
import type { FeatureMeshSerialized } from '../../../modeling/capture/featureMeshSerialize';
import { rehydrateFromBridge } from '../../../modeling/capture/featureMeshSerialize';
import { resolveColor } from '../../../shared/render/palette';
import { pbrFromColor } from '../../../shared/render/materialRoles';
import type { PBRMaterial } from '../../../shared/intent/material';
import type { ReferenceImageMetadata } from '../../../shared/intent/referenceImageRecord';
import type { RenderEnvironmentSpec } from '../../../shared/intent/renderEnvironmentRecord';
import type { CameraTargetMetadata } from '../../../shared/intent/cameraTargetRecord';
import { applyEnvironment } from '../../../shared/render/environment';
import { buildMaterialFromPBR, DEFAULT_MESH_COLOR, disposeMaterialDeep } from './buildMaterialFromPBR';
import { buildReferenceImagePlane } from './buildReferenceImagePlane';
import type { RenderView } from '../../../shared/render/views';
export type { RenderView };

export const KCAD_FEATURE_GROUP_KEY = 'kCadFeatureGroup';

interface DemoPlayerObjectFilter {
  mode: 'focus' | 'hide';
  patterns: string[];
}

interface DemoPlayerRenderObject {
  featureId: string;
  names: string[];
}

interface DemoPlayerObjectVisibility {
  filter: DemoPlayerObjectFilter;
  visible: DemoPlayerRenderObject[];
  hidden: DemoPlayerRenderObject[];
}

interface DemoPlayerMaskObject extends DemoPlayerRenderObject {
  color: string;
  rgb: [number, number, number];
  visibleIndex: number;
}

interface DemoPlayerMaskCapture {
  pngDataUrl: string;
  objects: DemoPlayerMaskObject[];
}

type DemoPlayerAuxInspectionChannel = 'depth' | 'normals';

interface DemoPlayerInspectionChannelCapture {
  pngDataUrl: string;
}

interface DemoPlayerDepthChannelMetadata {
  encoding: 'linear-camera-depth-rgba8';
  units: 'mm';
  near: number;
  far: number;
  background: 'rgba(0,0,0,0)';
  meaning: string;
}

interface DemoPlayerNormalsChannelMetadata {
  encoding: 'view-space-normal-rgb8';
  mapping: string;
  background: 'rgba(0,0,0,0)';
  meaning: string;
}

interface DemoPlayerInspectionCapture {
  channels: Partial<Record<DemoPlayerAuxInspectionChannel, DemoPlayerInspectionChannelCapture>>;
  metadata: {
    depth?: DemoPlayerDepthChannelMetadata;
    normals?: DemoPlayerNormalsChannelMetadata;
  };
}

interface DevMeshPayload {
  features: FeatureMeshSerialized[];
  bounds: { min: [number, number, number]; max: [number, number, number] };
}

interface BuildRecordStep {
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

interface BuildRecord {
  title: string;
  goal: string;
  steps: BuildRecordStep[];
}

export interface DemoPlayerWindow {
  isFrameReady(): boolean;
  onEvent(event: FeatureEvent): void;
  setRotatePhase(durationMs: number): void;
  setTerminalLines(lines: readonly TerminalLine[]): void;
  startTerminalClock(originMs: number): void;
  setTitleCard(spec: { title: string; tagline: string; durationMs: number } | null): void;
  advance(dtMs: number): void;
  /** Set kernelCAD module version string for watermark, e.g. "v0.21". */
  setVersion(v: string): void;
  /** Snap camera to one of four standard engineering views and force a
   *  render. Used by `kernelcad render` for headless multi-view PNG
   *  capture. Caller should `forceFullOpacity()` first so faded-in meshes
   *  appear at full visibility. */
  setRenderView(view: RenderView): void;
  /** Snap camera to an arbitrary az/el pose (degrees). az=0 looks down -Y
   *  (front view); az increases CCW around +Z (top-down); el increases looking
   *  up (positive el = camera above the horizon). Used by `kernelcad render
   *  --pose <az,el>` for headless reference-photo-pose scoring. */
  setRenderPose(azDeg: number, elDeg: number): void;
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
  captureMaskPng(): DemoPlayerMaskCapture;
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
  };
}

declare global {
  interface Window {
    __demoPlayer?: DemoPlayerWindow;
  }
}

const VIEWER_W = 1280;
const VIEWER_H = 1080;
const TERMINAL_W = 640;
const TERMINAL_H = 1080;

function buildMeshFromFace(
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

function disposeMeshResources(mesh: THREE.Mesh): void {
  mesh.geometry.dispose();
  disposeMaterialDeep(mesh.material);
}

function wildcardMatches(pattern: string, text: string): boolean {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${escaped}$`, 'i').test(text);
}

function objectMatches(names: readonly string[], patterns: readonly string[]): boolean {
  return patterns.some((pattern) =>
    names.some((name) =>
      pattern.includes('*') || pattern.includes('?')
        ? wildcardMatches(pattern, name)
        : name.toLowerCase() === pattern.toLowerCase(),
    ),
  );
}

function collectFilterNames(group: THREE.Group): string[] {
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

function summarizeFilterObject(group: THREE.Group): DemoPlayerRenderObject {
  return {
    featureId: group.name,
    names: collectFilterNames(group),
  };
}

function maskColorForIndex(index: number): { color: string; rgb: [number, number, number] } {
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

function makeDepthInspectionMaterial(camera: THREE.PerspectiveCamera): THREE.ShaderMaterial {
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

function makeNormalsInspectionMaterial(): THREE.MeshNormalMaterial {
  const material = new THREE.MeshNormalMaterial({
    side: THREE.DoubleSide,
  });
  material.toneMapped = false;
  return material;
}

function rgbaPixelsToPngDataUrl(pixels: Uint8Array, width: number, height: number): string {
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

function fitCameraToBounds(
  camera: THREE.PerspectiveCamera,
  bounds: { min: [number, number, number]; max: [number, number, number] },
  view: RenderView | 'demo' = 'demo',
): void {
  const dx = bounds.max[0] - bounds.min[0];
  const dy = bounds.max[1] - bounds.min[1];
  const dz = bounds.max[2] - bounds.min[2];
  const cx = (bounds.min[0] + bounds.max[0]) / 2;
  const cy = (bounds.min[1] + bounds.max[1]) / 2;
  const cz = (bounds.min[2] + bounds.max[2]) / 2;
  // Use the largest extent (not diagonal) so the model fills the viewport tightly.
  const maxExtent = Math.max(dx, dy, dz);
  const fov = camera.fov * (Math.PI / 180);
  // Tighter framing for mobile-readable videos: the viewer is letterboxed next
  // to the terminal, so the model should fill the 3D pane without clipping.
  const distance = (maxExtent / 2 / Math.tan(fov / 2)) * 0.95;

  // kernelCAD is Z-up. Each engineering view fixes camera position + up
  // vector so the rendered tile matches first-angle drafting convention.
  // 'demo' uses the same Z-up 3/4-front-right angle as the CLI's 'iso'
  // view so plates lie horizontally as authored (not rotated 90° onto
  // their side, which the legacy Y-up framing did).
  let pos: [number, number, number];
  let up: [number, number, number] = [0, 0, 1];
  switch (view) {
    case 'front': pos = [0, -distance, 0]; break;
    case 'right': pos = [distance, 0, 0]; break;
    case 'top':   pos = [0, 0, distance]; up = [0, 1, 0]; break;
    case 'iso':   pos = [distance * 0.7, -distance * 0.7, distance * 0.5]; break;
    case 'demo':
    default:
      pos = [distance * 0.7, -distance * 0.7, distance * 0.5];
      break;
  }
  camera.up.set(up[0], up[1], up[2]);
  camera.position.set(cx + pos[0], cy + pos[1], cz + pos[2]);
  camera.lookAt(cx, cy, cz);
  camera.near = Math.max(0.1, distance / 100);
  camera.far = distance * 20;
  camera.updateProjectionMatrix();
}

function isVisibleInScene(obj: THREE.Object3D): boolean {
  let cur: THREE.Object3D | null = obj;
  while (cur) {
    if (!cur.visible) return false;
    cur = cur.parent;
  }
  return true;
}

function isInsideFeatureGroup(obj: THREE.Object3D): boolean {
  let cur: THREE.Object3D | null = obj;
  while (cur) {
    if (cur instanceof THREE.Group && cur.userData[KCAD_FEATURE_GROUP_KEY]) return true;
    cur = cur.parent;
  }
  return false;
}

export function DemoPlayerPage(): React.JSX.Element {
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
  } | null>(null);
  const animEngineRef = useRef<AnimationEngine | null>(null);
  const cameraCtrlRef = useRef<CameraController | null>(null);
  const elapsedMsRef = useRef(0);
  const terminalOriginRef = useRef(0);
  // Default to the package version that vite injects at build time so the
  // watermark stays in sync with shipped releases. captureDemo overrides
  // via setVersion() to the module string (e.g. "v0.6", "gallery"); the
  // kernelcad render CLI doesn't, so this default is what static renders
  // show. Previously hardcoded "v0.21", which silently went stale across
  // every minor release after v0.2.
  const [version, setVersion] = useState(
    typeof __APP_VERSION__ !== 'undefined' ? `v${__APP_VERSION__}` : 'DEV',
  );
  const [isDemoApiReady, setIsDemoApiReady] = useState(false);
  const [scriptLoadStatus, setScriptLoadStatus] = useState<
    { kind: 'idle' | 'loading' | 'error'; message?: string }
  >({ kind: 'idle' });
  const [terminalLines, setTerminalLines] = useState<readonly TerminalLine[]>([]);
  const [buildRecord, setBuildRecord] = useState<BuildRecord | null>(null);
  const [buildRecordStep, setBuildRecordStep] = useState<BuildRecordStep | null>(null);
  const [titleCard, setTitleCard] = useState<{ title: string; tagline: string; durationMs: number } | null>(
    null,
  );
  const autoLoadedScriptRef = useRef<string | null>(null);
  const autoLoadedRecordRef = useRef<string | null>(null);
  // Camera-target override captured from the script's setCameraTarget() call.
  // `target` is in the SCRIPT'S world frame (before geometry recentering);
  // `centroidOffset` is the per-load shift applied to geometry groups so the
  // bbox centroid lands at world origin. setRenderPose / setRenderView
  // subtract the offset to translate the target into the scene's recentered
  // frame. `null` means no override → fall back to existing bbox-centroid
  // auto-fit. Persists across setRenderPose calls within a load.
  const cameraTargetRef = useRef<{
    target: [number, number, number];
    distance?: number;
  } | null>(null);
  const centroidOffsetRef = useRef<[number, number, number]>([0, 0, 0]);

  const handleSceneReady = useCallback((ctx: NonNullable<typeof sceneRef.current>) => {
    sceneRef.current = ctx;
    animEngineRef.current = new AnimationEngine(ctx.scene);
    cameraCtrlRef.current = new CameraController(ctx.camera, ctx.scene);
  }, []);

  useEffect(() => {
    if (!animEngineRef.current || !cameraCtrlRef.current) return;
    window.__demoPlayer = {
      isFrameReady: () => {
        return !!animEngineRef.current?.isFrameReady();
      },
      onEvent: (event) => {
        animEngineRef.current?.enqueue(event);
        if (event.kind === 'feature.compiled') {
          cameraCtrlRef.current?.nudgeTo(event.featureId, 300, elapsedMsRef.current);
        }
      },
      setRotatePhase: (durationMs) => {
        cameraCtrlRef.current?.startRotate(durationMs, elapsedMsRef.current);
      },
      setTerminalLines: (lines) => setTerminalLines(lines),
      startTerminalClock: (originMs) => {
        terminalOriginRef.current = originMs;
      },
      setTitleCard: (spec) => setTitleCard(spec),
      advance: (dtMs) => {
        elapsedMsRef.current += dtMs;
        animEngineRef.current?.advance(dtMs);
        cameraCtrlRef.current?.update(elapsedMsRef.current);
        // Force render so subsequent page.screenshot() captures the updated state.
        // (Headless Chromium can throttle rAF; we drive renderer explicitly here.)
        if (sceneRef.current) {
          sceneRef.current.renderer.render(sceneRef.current.scene, sceneRef.current.camera);
        }
      },
      setVersion: (v) => setVersion(v),
      setRenderView: (view) => {
        if (!sceneRef.current) throw new Error('demo-player: scene not ready');
        const ctx = sceneRef.current;
        // Reuse the bounds the loadFeatureMeshes path computed (mesh
        // groups are already centered at origin; just re-aim the camera).
        // Recompute aggregate bounds from current scene contents to
        // tolerate scenes loaded without explicit fit.
        const bbox = new THREE.Box3();
        ctx.scene.traverse((obj) => {
          if (obj instanceof THREE.Mesh && isVisibleInScene(obj)) bbox.expandByObject(obj);
        });
        if (bbox.isEmpty()) return;
        const minV = bbox.min, maxV = bbox.max;
        fitCameraToBounds(
          ctx.camera,
          { min: [minV.x, minV.y, minV.z], max: [maxV.x, maxV.y, maxV.z] },
          view,
        );
        ctx.renderer.render(ctx.scene, ctx.camera);
      },
      setRenderPose: (azDeg, elDeg) => {
        if (!sceneRef.current) throw new Error('demo-player: scene not ready');
        const ctx = sceneRef.current;
        const bbox = new THREE.Box3();
        ctx.scene.traverse((obj) => {
          if (obj instanceof THREE.Mesh && isVisibleInScene(obj)) bbox.expandByObject(obj);
        });
        if (bbox.isEmpty()) return;
        // az=0,el=0 = front view (camera at -Y looking at origin, Z up).
        // az increases CCW around +Z; el lifts the camera above the horizon.
        const az = (azDeg * Math.PI) / 180;
        const el = (elDeg * Math.PI) / 180;
        const cosEl = Math.cos(el);
        // Camera direction (unit vector from origin TO camera).
        const camDir = new THREE.Vector3(
          Math.sin(az) * cosEl,
          -Math.cos(az) * cosEl,
          Math.sin(el),
        );
        // Resolve the camera target. Default: origin (the scene-frame centroid
        // since loadFeatureMeshes recenters geometry to land the bbox centroid
        // there). Override: if the script called setCameraTarget(x, y, z), use
        // (x, y, z) - centroidOffset so the target lands at the same SCRIPT-
        // frame point in the recentered scene frame.
        const camTgt = cameraTargetRef.current;
        const off = centroidOffsetRef.current;
        const target = camTgt
          ? new THREE.Vector3(
              camTgt.target[0] - off[0],
              camTgt.target[1] - off[1],
              camTgt.target[2] - off[2],
            )
          : bbox.getCenter(new THREE.Vector3());
        // Build the screen-aligned basis at the target.
        const worldUp = new THREE.Vector3(0, 0, 1);
        const right = new THREE.Vector3().crossVectors(worldUp, camDir).normalize();
        const up = new THREE.Vector3().crossVectors(camDir, right).normalize();
        // Project all 8 bbox corners RELATIVE TO THE TARGET onto the screen-
        // plane axes. The max |right-component| / aspect and |up-component|
        // set the required half-extents that must fit the FOV. Operate on
        // raw min/max components so we don't allocate 8 Vector3s per call.
        const aspect = ctx.camera.aspect;
        const rx = right.x, ry = right.y, rz = right.z;
        const ux = up.x, uy = up.y, uz = up.z;
        const xs = [bbox.min.x - target.x, bbox.max.x - target.x];
        const ys = [bbox.min.y - target.y, bbox.max.y - target.y];
        const zs = [bbox.min.z - target.z, bbox.max.z - target.z];
        let halfHoriz = 0;
        let halfVert = 0;
        for (const cx of xs) for (const cy of ys) for (const cz of zs) {
          const h = Math.abs(cx * rx + cy * ry + cz * rz);
          const u = Math.abs(cx * ux + cy * uy + cz * uz);
          if (h > halfHoriz) halfHoriz = h;
          if (u > halfVert) halfVert = u;
        }
        const fovY = ctx.camera.fov * (Math.PI / 180);
        const tanHalfFovY = Math.tan(fovY / 2);
        const tanHalfFovX = tanHalfFovY * aspect;
        // distance needed so projected radius fits both axes (with 5% margin).
        // setCameraDistance override (when present) skips the auto-fit and
        // pins the camera at the user-supplied distance from the target.
        const distFromVert = halfVert / tanHalfFovY;
        const distFromHoriz = halfHoriz / tanHalfFovX;
        const autoDist = Math.max(distFromVert, distFromHoriz) * 1.05;
        const distance = camTgt?.distance ?? autoDist;
        const x = target.x + distance * camDir.x;
        const y = target.y + distance * camDir.y;
        const z = target.z + distance * camDir.z;
        ctx.camera.up.set(0, 0, 1);
        ctx.camera.position.set(x, y, z);
        ctx.camera.lookAt(target.x, target.y, target.z);
        ctx.camera.near = Math.max(0.1, distance / 100);
        ctx.camera.far = distance * 20;
        ctx.camera.updateProjectionMatrix();
        ctx.renderer.render(ctx.scene, ctx.camera);
      },
      forceFullOpacity: () => {
        if (!sceneRef.current) throw new Error('demo-player: scene not ready');
        const ctx = sceneRef.current;
        ctx.scene.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            const mat = obj.material as THREE.Material;
            const authoredOpacity = typeof mat.userData.authoredOpacity === 'number'
              ? mat.userData.authoredOpacity
              : 1;
            mat.opacity = authoredOpacity;
            // Materials with PBR transmission > 0 require `transparent: true`
            // so three.js routes them through the transmission render pass —
            // forcing `transparent: false` here would defeat sapphire crystals
            // and other glass-like materials in headless / post-build captures.
            // Opaque materials still render correctly with `transparent: true`
            // when opacity = 1, so it's safe to keep transparent enabled
            // unconditionally; only the per-mesh opacity gets clobbered to 1.
            const phys = mat as THREE.MeshPhysicalMaterial;
            if ((phys.transmission !== undefined && phys.transmission > 0) || authoredOpacity < 1) {
              mat.transparent = true;
            } else {
              mat.transparent = false;
            }
            mat.needsUpdate = true;
          }
        });
        ctx.renderer.render(ctx.scene, ctx.camera);
      },
      showOnlyTailFeatures: () => {
        if (!sceneRef.current) throw new Error('demo-player: scene not ready');
        const ctx = sceneRef.current;
        // Collect every feature-mesh group + every group that another
        // feature lists as a predecessor. The set difference is the tail.
        const allGroups: THREE.Group[] = [];
        const predecessorIds = new Set<string>();
        ctx.scene.traverse((obj) => {
          if (obj instanceof THREE.Group && obj.userData[KCAD_FEATURE_GROUP_KEY]) {
            allGroups.push(obj);
            const preds = obj.userData.predecessors as readonly string[] | undefined;
            if (preds) {
              for (const p of preds) predecessorIds.add(p);
            }
          }
        });
        for (const group of allGroups) {
          group.visible = !predecessorIds.has(group.name);
        }
        ctx.renderer.render(ctx.scene, ctx.camera);
      },
      applyObjectVisibilityFilter: (filter) => {
        if (!sceneRef.current) throw new Error('demo-player: scene not ready');
        const ctx = sceneRef.current;
        const patterns = filter.patterns.map((pattern) => pattern.trim()).filter(Boolean);
        if (patterns.length === 0) {
          throw new Error('demo-player: object visibility filter requires at least one pattern');
        }
        const groups: THREE.Group[] = [];
        ctx.scene.traverse((obj) => {
          if (obj instanceof THREE.Group && obj.userData[KCAD_FEATURE_GROUP_KEY]) {
            groups.push(obj);
          }
        });
        const visible: DemoPlayerRenderObject[] = [];
        const hidden: DemoPlayerRenderObject[] = [];
        for (const group of groups) {
          const names = collectFilterNames(group);
          const matched = objectMatches(names, patterns);
          const shouldShow = filter.mode === 'focus'
            ? matched
            : group.visible && !matched;
          group.visible = shouldShow;
          (shouldShow ? visible : hidden).push(summarizeFilterObject(group));
        }
        if (visible.length === 0) {
          const available = groups.map((group) => collectFilterNames(group).join('|')).join(', ');
          throw new Error(`demo-player: ${filter.mode} filter matched no visible objects. Available: ${available}`);
        }
        ctx.renderer.render(ctx.scene, ctx.camera);
        return {
          filter: { mode: filter.mode, patterns },
          visible,
          hidden,
        };
      },
      captureMaskPng: () => {
        if (!sceneRef.current) throw new Error('demo-player: scene not ready');
        const ctx = sceneRef.current;
        const visibleGroups: THREE.Group[] = [];
        ctx.scene.traverse((obj) => {
          if (
            obj instanceof THREE.Group
            && obj.userData[KCAD_FEATURE_GROUP_KEY]
            && isVisibleInScene(obj)
          ) {
            visibleGroups.push(obj);
          }
        });

        const originals: Array<{
          mesh: THREE.Mesh;
          material: THREE.Material | THREE.Material[];
        }> = [];
        const hiddenNonFeatureMeshes: Array<{ mesh: THREE.Mesh; visible: boolean }> = [];
        const temporaryMaterials: THREE.Material[] = [];
        const originalBackground = ctx.scene.background;
        const objects: DemoPlayerMaskObject[] = [];

        try {
          ctx.scene.background = new THREE.Color(0x000000);
          ctx.scene.traverse((obj) => {
            if (
              obj instanceof THREE.Mesh
              && !isInsideFeatureGroup(obj)
              && isVisibleInScene(obj)
            ) {
              hiddenNonFeatureMeshes.push({ mesh: obj, visible: obj.visible });
              obj.visible = false;
            }
          });
          visibleGroups.forEach((group, visibleIndex) => {
            const { color, rgb } = maskColorForIndex(visibleIndex);
            objects.push({
              ...summarizeFilterObject(group),
              color,
              rgb,
              visibleIndex,
            });

            group.traverse((obj) => {
              if (!(obj instanceof THREE.Mesh)) return;
              originals.push({ mesh: obj, material: obj.material });
              const material = new THREE.MeshBasicMaterial({
                color,
                side: THREE.DoubleSide,
                transparent: false,
                opacity: 1,
                depthTest: true,
                depthWrite: true,
              });
              material.toneMapped = false;
              temporaryMaterials.push(material);
              obj.material = material;
            });
          });

          ctx.renderer.render(ctx.scene, ctx.camera);
          const pngDataUrl = ctx.renderer.domElement.toDataURL('image/png');
          return { pngDataUrl, objects };
        } finally {
          for (const original of originals) {
            original.mesh.material = original.material;
          }
          for (const hidden of hiddenNonFeatureMeshes) {
            hidden.mesh.visible = hidden.visible;
          }
          for (const material of temporaryMaterials) {
            disposeMaterialDeep(material);
          }
          ctx.scene.background = originalBackground;
          ctx.renderer.render(ctx.scene, ctx.camera);
        }
      },
      captureInspectionChannels: ({ channels, width, height }) => {
        if (!sceneRef.current) throw new Error('demo-player: scene not ready');
        const ctx = sceneRef.current;
        const uniqueChannels = [...new Set(channels)];
        const captures: DemoPlayerInspectionCapture['channels'] = {};
        const metadata: DemoPlayerInspectionCapture['metadata'] = {};

        if (uniqueChannels.length === 0) {
          return { channels: captures, metadata };
        }
        if (width <= 0 || height <= 0) {
          throw new Error('demo-player: inspection capture width and height must be positive');
        }

        const originalTarget = ctx.renderer.getRenderTarget();
        const originalBackground = ctx.scene.background;
        const originalClearColor = new THREE.Color();
        ctx.renderer.getClearColor(originalClearColor);
        const originalClearAlpha = ctx.renderer.getClearAlpha();
        const hiddenNonFeatureMeshes: Array<{ mesh: THREE.Mesh; visible: boolean }> = [];
        const originalMaterials: Array<{
          mesh: THREE.Mesh;
          material: THREE.Material | THREE.Material[];
        }> = [];
        const temporaryMaterials: THREE.Material[] = [];
        const target = new THREE.WebGLRenderTarget(width, height, {
          format: THREE.RGBAFormat,
          type: THREE.UnsignedByteType,
          depthBuffer: true,
          stencilBuffer: false,
        });

        const renderChannel = (
          channel: DemoPlayerAuxInspectionChannel,
          material: THREE.Material,
        ): string => {
          temporaryMaterials.push(material);
          originalMaterials.length = 0;
          ctx.scene.traverse((obj) => {
            if (!(obj instanceof THREE.Mesh) || !isInsideFeatureGroup(obj) || !isVisibleInScene(obj)) return;
            originalMaterials.push({ mesh: obj, material: obj.material });
            obj.material = material;
          });

          ctx.scene.background = null;
          ctx.renderer.setClearColor(0x000000, 0);
          ctx.renderer.setRenderTarget(target);
          ctx.renderer.render(ctx.scene, ctx.camera);
          const pixels = new Uint8Array(width * height * 4);
          ctx.renderer.readRenderTargetPixels(target, 0, 0, width, height, pixels);

          for (const original of originalMaterials) {
            original.mesh.material = original.material;
          }
          originalMaterials.length = 0;
          if (channel === 'depth') {
            metadata.depth = {
              encoding: 'linear-camera-depth-rgba8',
              units: 'mm',
              near: ctx.camera.near,
              far: ctx.camera.far,
              background: 'rgba(0,0,0,0)',
              meaning: 'nearest visible model surface after the active object filter, measured along the camera view direction and normalized from near to far',
            };
          } else {
            metadata.normals = {
              encoding: 'view-space-normal-rgb8',
              mapping: 'rgb = round((normal_view * 0.5 + 0.5) * 255)',
              background: 'rgba(0,0,0,0)',
              meaning: 'visible model-surface normal in the camera coordinate frame after the active object filter',
            };
          }
          return rgbaPixelsToPngDataUrl(pixels, width, height);
        };

        try {
          ctx.scene.traverse((obj) => {
            if (
              obj instanceof THREE.Mesh
              && !isInsideFeatureGroup(obj)
              && isVisibleInScene(obj)
            ) {
              hiddenNonFeatureMeshes.push({ mesh: obj, visible: obj.visible });
              obj.visible = false;
            }
          });

          for (const channel of uniqueChannels) {
            if (channel === 'depth') {
              captures.depth = {
                pngDataUrl: renderChannel('depth', makeDepthInspectionMaterial(ctx.camera)),
              };
            } else if (channel === 'normals') {
              captures.normals = {
                pngDataUrl: renderChannel('normals', makeNormalsInspectionMaterial()),
              };
            }
          }

          return { channels: captures, metadata };
        } finally {
          for (const original of originalMaterials) {
            original.mesh.material = original.material;
          }
          for (const hidden of hiddenNonFeatureMeshes) {
            hidden.mesh.visible = hidden.visible;
          }
          for (const material of temporaryMaterials) {
            disposeMaterialDeep(material);
          }
          target.dispose();
          ctx.scene.background = originalBackground;
          ctx.renderer.setClearColor(originalClearColor, originalClearAlpha);
          ctx.renderer.setRenderTarget(originalTarget);
          ctx.renderer.render(ctx.scene, ctx.camera);
        }
      },
      loadFeatureMeshes: (perFeature, bounds) => {
        if (!sceneRef.current) throw new Error('demo-player: scene not ready');
        const scene = sceneRef.current.scene;
        // Clear any prior groups (re-load support). Also clear any prior
        // reference-image group so re-loads start clean.
        for (const child of [...scene.children]) {
          if (child instanceof THREE.Group && (
            child.userData[KCAD_FEATURE_GROUP_KEY] ||
            child.name === '__referenceImages'
          )) {
            scene.remove(child);
            child.traverse((o) => {
              if (o instanceof THREE.Mesh) {
                disposeMeshResources(o);
              }
            });
          }
        }

        let groupCount = 0;
        // Separate virtual referenceImage / renderEnvironment / cameraTarget
        // records from geometry records.
        const geometryFeatures: typeof perFeature = [];
        const referenceImageFeatures: typeof perFeature = [];
        let renderEnvSpec: RenderEnvironmentSpec | null = null;
        let cameraTargetSpec: CameraTargetMetadata | null = null;
        for (const ser of perFeature) {
          if (ser.featureKind === 'referenceImage' && ser.referenceImage) {
            referenceImageFeatures.push(ser);
          } else if (ser.featureKind === 'renderEnvironment' && ser.renderEnvironment) {
            // Last-wins per spec §4.
            const re = ser.renderEnvironment;
            renderEnvSpec = {
              ...(re.preset !== undefined ? { preset: re.preset } : {}),
              ...(re.url !== undefined ? { url: re.url } : {}),
              intensity: re.intensity,
              rotation: re.rotation,
            };
          } else if (ser.featureKind === 'cameraTarget' && ser.cameraTarget) {
            // Last-wins — same resolution rule as renderEnvironment.
            cameraTargetSpec = ser.cameraTarget;
          } else {
            geometryFeatures.push(ser);
          }
        }
        // Stash the camera-target override for setRenderPose / setRenderView.
        // Reset to null on every load so a script without setCameraTarget()
        // falls back cleanly to the existing bbox-centroid auto-fit.
        cameraTargetRef.current = cameraTargetSpec
          ? {
              target: [
                cameraTargetSpec.target[0],
                cameraTargetSpec.target[1],
                cameraTargetSpec.target[2],
              ],
              ...(cameraTargetSpec.distance !== undefined ? { distance: cameraTargetSpec.distance } : {}),
            }
          : null;

        for (const ser of geometryFeatures) {
          const fm = rehydrateFromBridge(ser);
          const group = new THREE.Group();
          group.name = fm.featureId;
          group.userData[KCAD_FEATURE_GROUP_KEY] = true;
          group.userData.featureId = fm.featureId;
          group.userData.featureKind = fm.featureKind;
          group.userData.predecessors = fm.predecessors;
          group.userData.op = fm.op;
          if (fm.displayName !== undefined) group.userData.displayName = fm.displayName;
          if (fm.filterNames !== undefined) group.userData.filterNames = fm.filterNames;
          if (fm.sourceMetadataName !== undefined) group.userData.sourceMetadataName = fm.sourceMetadataName;
          if (fm.assemblyFeatureId !== undefined) group.userData.assemblyFeatureId = fm.assemblyFeatureId;
          if (fm.assemblyPartName !== undefined) group.userData.assemblyPartName = fm.assemblyPartName;
          group.visible = true;
          // Prefer the full PBR record emitted by the bridge serializer (Task 7+).
          // Fall back to the legacy color string path: pbrFromColor resolves role
          // tokens ('servo', 'gear', ...) to metalness/roughness profiles and we
          // promote the result to a minimal PBRMaterial so buildMaterialFromPBR
          // handles both paths uniformly.
          // When neither field is present the helper defaults to DEFAULT_MESH_COLOR.
          let pbrForFaces: PBRMaterial | undefined;
          if (fm.material !== undefined) {
            pbrForFaces = fm.material;
          } else if (fm.color !== undefined) {
            const legacyProfile = pbrFromColor(fm.color);
            const resolvedBase = resolveColor(fm.color) ?? String(DEFAULT_MESH_COLOR);
            pbrForFaces = {
              baseColor: resolvedBase,
              metalness: legacyProfile.metalness,
              roughness: legacyProfile.roughness,
            };
          }
          for (const face of fm.faces) {
            // Per-face material override (Shape.material({ face: '<label>', ... }))
            // takes precedence over the shape-level default. Unmatched faces fall
            // back to pbrForFaces (whole-shape material → legacy color → default).
            const perFacePbr = fm.materialByFaceId?.[face.faceId];
            const material = buildMaterialFromPBR(perFacePbr ?? pbrForFaces);
            const mesh = buildMeshFromFace(
              face,
              `${fm.featureId}-face-${face.faceId}`,
              material,
            );
            group.add(mesh);
          }
          scene.add(group);
          groupCount++;
        }

        // Center & camera-fit using supplied bounds (skip if nothing was loaded).
        // We compute scene bbox before adding reference images so the camera fits
        // the actual model geometry, not the (potentially larger) overlay planes.
        if (perFeature.length > 0) {
          const [minX, minY, minZ] = bounds.min;
          const [maxX, maxY, maxZ] = bounds.max;
          const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2;
          for (const child of scene.children) {
            if (child instanceof THREE.Group && child.userData[KCAD_FEATURE_GROUP_KEY]) {
              child.position.set(-cx, -cy, -cz);
            }
          }
          // Stash the centroid offset so setRenderPose can translate a
          // script-frame setCameraTarget(x, y, z) into the recentered scene
          // frame (target_scene = target_script - centroid).
          centroidOffsetRef.current = [cx, cy, cz];
          fitCameraToBounds(sceneRef.current.camera, {
            min: [minX - cx, minY - cy, minZ - cz],
            max: [maxX - cx, maxY - cy, maxZ - cz],
          });
        }

        // Reference-image overlays: build a dedicated group so they can be
        // hidden without disturbing geometry groups. TextureLoader is async;
        // we fire-and-forget — the group is added to the scene synchronously
        // (empty) and meshes are appended as textures resolve.
        if (referenceImageFeatures.length > 0) {
          const riGroup = new THREE.Group();
          riGroup.name = '__referenceImages';
          scene.add(riGroup);

          // Compute sceneBbox from the model geometry for 'fit-bbox' scale.
          const sceneBbox = new THREE.Box3();
          scene.traverse((obj) => {
            if (obj instanceof THREE.Mesh && obj.parent !== riGroup) {
              sceneBbox.expandByObject(obj);
            }
          });

          for (const ser of referenceImageFeatures) {
            const ri = ser.referenceImage as ReferenceImageMetadata;
            // In the browser context, reference image paths are absolute
            // filesystem paths recorded at capture time. Vite's dev server
            // doesn't serve arbitrary host-fs files via a static URL, so we
            // load via a data URL: fetch the file through the Node-side
            // /__kernelcad/image endpoint (if present) or fall back to a
            // transparent 1×1 PNG so the scene doesn't crash. In practice,
            // callers that need real texture display should supply a URL
            // via a resolved asset system; this path handles the dev-server
            // case where the path is absolute on the host.
            //
            // Strategy: try /__kernelcad/image?path=<encoded>, fall back to
            // a 1×1 transparent data URL so the overlay still shows up in
            // the group (the visibility toggle test doesn't need real pixels).
            const textureUrl = `/__kernelcad/image?path=${encodeURIComponent(ri.path)}`;
            const loader = new THREE.TextureLoader();
            loader.loadAsync(textureUrl).then((tex) => {
              if (riGroup.parent !== scene) {
                tex.dispose();
                return;
              }
              const mesh = buildReferenceImagePlane(ri, tex, sceneBbox);
              riGroup.add(mesh);
              if (sceneRef.current) {
                sceneRef.current.renderer.render(
                  sceneRef.current.scene,
                  sceneRef.current.camera,
                );
              }
            }).catch(() => {
              // Texture load failed (path not accessible from dev server).
              // Create a 1×1 transparent canvas texture as a stand-in so the
              // mesh is still registered in the group (visibility toggle works).
              const canvas = document.createElement('canvas');
              canvas.width = 1; canvas.height = 1;
              const fallbackTex = new THREE.CanvasTexture(canvas);
              if (riGroup.parent !== scene) {
                fallbackTex.dispose();
                return;
              }
              const mesh = buildReferenceImagePlane(ri, fallbackTex, sceneBbox);
              riGroup.add(mesh);
              if (sceneRef.current) {
                sceneRef.current.renderer.render(
                  sceneRef.current.scene,
                  sceneRef.current.camera,
                );
              }
            });
          }
        }

        // Detect any glass material (transmission > 0) on the loaded scene.
        // Glass without an environment map renders as flat translucent plastic
        // — three.js' refraction integrator needs an IBL probe to sample. So
        // if the script didn't declare an environment but any material is
        // glassy, auto-apply the bundled 'studio' preset. Gated strictly on
        // `transmission > 0` so zero-transmission renders stay bit-identical
        // and snapshot diffs remain scoped.
        const anyGlass = geometryFeatures.some((ser) => {
          if ((ser.material?.transmission ?? 0) > 0) return true;
          const byFace = ser.materialByFaceId ?? {};
          for (const m of Object.values(byFace)) {
            if ((m?.transmission ?? 0) > 0) return true;
          }
          return false;
        });
        const effectiveEnv: RenderEnvironmentSpec | null =
          renderEnvSpec ?? (anyGlass ? { preset: 'studio' } : null);

        // Apply HDRI / IBL environment if the script declared one (or if the
        // auto-glass fallback above kicked in). Async, but we don't await —
        // meshes are already on screen; env will pop in when the .hdr
        // finishes loading + PMREM finishes prefiltering.
        if (sceneRef.current) {
          const ctx = sceneRef.current;
          // W2 helper is imported statically; if it ever fails (e.g. missing
          // HDRI asset in a stripped CLI bundle), surface a console warning
          // rather than blocking the scene.
          try {
            void applyEnvironment(ctx.renderer, ctx.scene, effectiveEnv).then(() => {
              ctx.renderer.render(ctx.scene, ctx.camera);
            });
          } catch (e) {
            console.warn(
              '[kernelcad] applyEnvironment failed; glass will render flat:',
              (e as Error).message,
            );
          }
        }

        return { groupCount };
      },
      setReferenceImagesVisible: (visible) => {
        if (!sceneRef.current) return;
        const ctx = sceneRef.current;
        const group = ctx.scene.getObjectByName('__referenceImages');
        if (group) {
          group.visible = visible;
          ctx.renderer.render(ctx.scene, ctx.camera);
        }
      },
      setRenderEnvironment: async (spec) => {
        if (!sceneRef.current) return;
        const ctx = sceneRef.current;
        await applyEnvironment(ctx.renderer, ctx.scene, spec);
        ctx.renderer.render(ctx.scene, ctx.camera);
      },
      dumpScene: () => {
        const scene = sceneRef.current?.scene;
        const camera = sceneRef.current?.camera;
        if (!scene || !camera) {
          return {
            childCount: 0, meshCount: 0,
            cameraPos: [0, 0, 0] as [number, number, number],
            cameraLookingAt: [0, 0, 0] as [number, number, number],
            sampleOpacities: [],
            samplePolygonOffsets: [],
          };
        }
        let meshCount = 0;
        const sampleOpacities: number[] = [];
        const samplePolygonOffsets: Array<{ enabled: boolean; factor: number; units: number }> = [];
        scene.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            meshCount++;
            const mat = obj.material as THREE.MeshStandardMaterial;
            if (sampleOpacities.length < 5) sampleOpacities.push(mat.opacity);
            if (samplePolygonOffsets.length < 5) {
              samplePolygonOffsets.push({
                enabled: mat.polygonOffset,
                factor: mat.polygonOffsetFactor,
                units: mat.polygonOffsetUnits,
              });
            }
          }
        });
        const lookDir = new THREE.Vector3();
        camera.getWorldDirection(lookDir);
        const lookAt: [number, number, number] = [
          camera.position.x + lookDir.x,
          camera.position.y + lookDir.y,
          camera.position.z + lookDir.z,
        ];
        return {
          childCount: scene.children.length,
          meshCount,
          cameraPos: [camera.position.x, camera.position.y, camera.position.z],
          cameraLookingAt: lookAt,
          sampleOpacities,
          samplePolygonOffsets,
        };
      },
    };
    setIsDemoApiReady(true);
    return () => {
      setIsDemoApiReady(false);
      delete window.__demoPlayer;
    };
  }, []);

  useEffect(() => {
    if (!isDemoApiReady || autoLoadedScriptRef.current !== null || autoLoadedRecordRef.current !== null) return;

    const script = new URLSearchParams(window.location.search).get('script');
    if (!script) return;

    autoLoadedScriptRef.current = script;
    let cancelled = false;
    setScriptLoadStatus({ kind: 'loading', message: `Loading ${script}` });

    fetch(`/__kernelcad/mesh?script=${encodeURIComponent(script)}`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) {
          const message = typeof payload?.error === 'string' ? payload.error : response.statusText;
          throw new Error(message);
        }
        return payload as DevMeshPayload;
      })
      .then((payload) => {
        if (cancelled) return;
        if (!window.__demoPlayer) throw new Error('demo-player API disappeared while loading script');
        window.__demoPlayer.loadFeatureMeshes(payload.features, payload.bounds);
        window.__demoPlayer.forceFullOpacity();
        window.__demoPlayer.setVersion('dev');
        setScriptLoadStatus({ kind: 'idle' });
      })
      .catch((error) => {
        if (cancelled) return;
        setScriptLoadStatus({
          kind: 'error',
          message: error instanceof Error ? error.message : String(error),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [isDemoApiReady]);

  useEffect(() => {
    if (!isDemoApiReady || autoLoadedRecordRef.current !== null || autoLoadedScriptRef.current !== null) return;

    const recordPath = new URLSearchParams(window.location.search).get('record');
    if (!recordPath) return;

    autoLoadedRecordRef.current = recordPath;
    let cancelled = false;
    let stepTimer: number | undefined;
    let clockTimer: number | undefined;
    setScriptLoadStatus({ kind: 'loading', message: `Loading build record ${recordPath}` });

    const linesForStep = (record: BuildRecord, step: BuildRecordStep, index: number): TerminalLine[] => {
      const status = step.status === 'passed' ? 'PASS' : 'FAIL';
      const reasons = step.review.blockingReasons ?? [];
      return [
        { text: `$ kernelcad loop --goal "${record.goal}"`, fullyTypedAtMs: 450 },
        { text: `iteration ${index + 1}/${record.steps.length}: ${step.title}`, fullyTypedAtMs: 1050 },
        { text: `script: ${step.script}`, fullyTypedAtMs: 1600 },
        { text: `review_cad: ${status} - ${step.review.summary}`, fullyTypedAtMs: 2300 },
        ...reasons.slice(0, 3).map((reason, reasonIndex) => ({
          text: `blocking: ${reason}`,
          fullyTypedAtMs: 3050 + reasonIndex * 650,
        })),
      ];
    };

    const loadStep = async (record: BuildRecord, index: number) => {
      const step = record.steps[index];
      if (!step) return;
      setBuildRecordStep(step);
      setScriptLoadStatus({ kind: 'loading', message: `Loading ${step.script}` });
      const response = await fetch(`/__kernelcad/mesh?script=${encodeURIComponent(step.script)}`);
      const payload = await response.json();
      if (!response.ok) {
        const message = typeof payload?.error === 'string' ? payload.error : response.statusText;
        throw new Error(message);
      }
      if (cancelled) return;
      if (!window.__demoPlayer) throw new Error('demo-player API disappeared while loading build record');
      window.__demoPlayer.loadFeatureMeshes(
        (payload as DevMeshPayload).features,
        (payload as DevMeshPayload).bounds,
      );
      window.__demoPlayer.forceFullOpacity();
      window.__demoPlayer.setVersion(step.status === 'passed' ? 'loop pass' : 'loop fail');
      window.__demoPlayer.setTerminalLines(linesForStep(record, step, index));
      window.__demoPlayer.startTerminalClock(elapsedMsRef.current);
      setScriptLoadStatus({ kind: 'idle' });
    };

    fetch(recordPath)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) {
          const message = typeof payload?.error === 'string' ? payload.error : response.statusText;
          throw new Error(message);
        }
        return payload as BuildRecord;
      })
      .then(async (record) => {
        if (cancelled) return;
        setBuildRecord(record);
        let stepIndex = 0;
        await loadStep(record, stepIndex);
        clockTimer = window.setInterval(() => window.__demoPlayer?.advance(100), 100);
        stepTimer = window.setInterval(() => {
          stepIndex = (stepIndex + 1) % record.steps.length;
          void loadStep(record, stepIndex).catch((error) => {
            setScriptLoadStatus({
              kind: 'error',
              message: error instanceof Error ? error.message : String(error),
            });
          });
        }, 5200);
      })
      .catch((error) => {
        if (cancelled) return;
        setScriptLoadStatus({
          kind: 'error',
          message: error instanceof Error ? error.message : String(error),
        });
      });

    return () => {
      cancelled = true;
      if (stepTimer !== undefined) window.clearInterval(stepTimer);
      if (clockTimer !== undefined) window.clearInterval(clockTimer);
    };
  }, [isDemoApiReady]);

  // Headless renders (kernelcad render, scoreReference) navigate with
  // ?headless=1. Suppress the TerminalPane so the ViewerPane (and its model)
  // fills the entire viewport. Without this, TerminalPane's 640px sidebar eats
  // half the canvas at 1024×1024 capture → silhouette IoU bimodality.
  const isHeadless = typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('headless') === '1';
  // ?nowatermark=1 suppresses the kernelCAD version badge for clean hero
  // artifacts (public posts, gallery entries). Wired to the CLI's
  // --no-watermark flag via headlessRender.
  const noWatermark = typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('nowatermark') === '1';
  return (
    <div
      data-testid="demo-player"
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        display: 'flex',
        overflow: 'hidden',
      }}
    >
      {!isHeadless && (
        <TerminalPane
          lines={terminalLines}
          width={TERMINAL_W}
          height={TERMINAL_H}
          getElapsedMs={() => Math.max(0, elapsedMsRef.current - terminalOriginRef.current)}
        />
      )}
      <ViewerPane
        version={version}
        width={isHeadless ? VIEWER_W + TERMINAL_W : VIEWER_W}
        height={VIEWER_H}
        onSceneReady={handleSceneReady}
        noWatermark={noWatermark}
      />
      {scriptLoadStatus.kind !== 'idle' ? (
        <div
          data-testid="demo-player-load-status"
          style={{
            position: 'absolute',
            left: 24,
            bottom: 24,
            maxWidth: 560,
            padding: '10px 12px',
            borderRadius: 6,
            background: scriptLoadStatus.kind === 'error' ? '#7f1d1d' : 'rgba(15, 23, 42, 0.88)',
            color: '#f8fafc',
            font: '13px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace',
          }}
        >
          {scriptLoadStatus.message}
        </div>
      ) : null}
      {buildRecord && buildRecordStep ? (
        <div
          data-testid="build-record-status"
          style={{
            position: 'absolute',
            top: 24,
            left: TERMINAL_W + 24,
            maxWidth: 520,
            padding: '10px 12px',
            borderRadius: 6,
            background: buildRecordStep.status === 'passed' ? 'rgba(22, 101, 52, 0.9)' : 'rgba(127, 29, 29, 0.9)',
            color: '#f8fafc',
            font: '14px/1.35 ui-monospace, SFMono-Regular, Menlo, monospace',
          }}
        >
          <div>{buildRecord.title}</div>
          <div>{buildRecordStep.id}: {buildRecordStep.title}</div>
        </div>
      ) : null}
      {titleCard ? <TitleCard title={titleCard.title} tagline={titleCard.tagline} /> : null}
    </div>
  );
}
