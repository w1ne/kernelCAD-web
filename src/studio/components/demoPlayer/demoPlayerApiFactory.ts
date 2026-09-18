// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { MutableRefObject } from 'react';
import * as THREE from 'three';
import type { AnimationEngine } from './AnimationEngine';
import type { CameraController } from './CameraController';
import type { FeatureEvent } from '../../../modeling/compute/featureEvents';
import type { TerminalLine } from './TerminalPane';
import type { FeatureMeshSerialized } from '../../../modeling/capture/featureMeshSerialize';
import { rehydrateFromBridge } from '../../../modeling/capture/featureMeshSerialize';
import { resolveColor } from '../../../shared/render/palette';
import { pbrFromColor } from '../../../shared/render/materialRoles';
import type { PBRMaterial } from '../../../shared/intent/material';
import type { ReferenceImageMetadata } from '../../../shared/intent/referenceImageRecord';
import type { RenderEnvironmentSpec } from '../../../shared/intent/renderEnvironmentRecord';
import type { CameraTargetMetadata } from '../../../shared/intent/cameraTargetRecord';
import { applyEnvironment } from '../../../shared/render/environment';
import { buildMaterialFromPBR, disposeMaterialDeep, DEFAULT_MESH_COLOR } from './buildMaterialFromPBR';
import { buildReferenceImagePlane } from './buildReferenceImagePlane';
import { fitDistanceForBounds } from './cameraFit';
import { disposeMeshResources } from './demoPlayerGeometry';
import {
  KCAD_FEATURE_GROUP_KEY,
  buildMeshFromFace,
  collectFilterNames,
  fitCameraToBounds,
  isInsideFeatureGroup,
  isVisibleInScene,
  makeDepthInspectionMaterial,
  makeNormalsInspectionMaterial,
  maskColorForIndex,
  objectMatches,
  rgbaPixelsToPngDataUrl,
  summarizeFilterObject,
  type DemoPlayerAuxInspectionChannel,
  type DemoPlayerInspectionCapture,
  type DemoPlayerMaskCapture,
  type DemoPlayerMaskObject,
  type DemoPlayerObjectFilter,
  type DemoPlayerObjectVisibility,
  type DemoPlayerRenderObject,
  type DemoPlayerWindow,
  type RenderView,
} from './demoPlayerGeometry';

export interface DemoPlayerSceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
}

export interface DemoPlayerApiDeps {
  sceneRef: MutableRefObject<DemoPlayerSceneContext | null>;
  animEngineRef: MutableRefObject<AnimationEngine | null>;
  cameraCtrlRef: MutableRefObject<CameraController | null>;
  elapsedMsRef: MutableRefObject<number>;
  terminalOriginRef: MutableRefObject<number>;
  cameraTargetRef: MutableRefObject<{ target: [number, number, number]; distance?: number } | null>;
  centroidOffsetRef: MutableRefObject<[number, number, number]>;
  setTerminalLines: (lines: readonly TerminalLine[]) => void;
  setTitleCard: (spec: { title: string; tagline: string; durationMs: number } | null) => void;
  setVersion: (v: string) => void;
}

function requireScene(deps: DemoPlayerApiDeps): DemoPlayerSceneContext {
  if (!deps.sceneRef.current) throw new Error('demo-player: scene not ready');
  return deps.sceneRef.current;
}

function onEvent(deps: DemoPlayerApiDeps, event: FeatureEvent): void {
  deps.animEngineRef.current?.enqueue(event);
  if (event.kind === 'feature.compiled') {
    deps.cameraCtrlRef.current?.nudgeTo(event.featureId, 300, deps.elapsedMsRef.current);
  }
}

function advance(deps: DemoPlayerApiDeps, dtMs: number): void {
  deps.elapsedMsRef.current += dtMs;
  deps.animEngineRef.current?.advance(dtMs);
  deps.cameraCtrlRef.current?.update(deps.elapsedMsRef.current);
  // Force render so subsequent page.screenshot() captures the updated state.
  // (Headless Chromium can throttle rAF; we drive renderer explicitly here.)
  if (deps.sceneRef.current) {
    deps.sceneRef.current.renderer.render(deps.sceneRef.current.scene, deps.sceneRef.current.camera);
  }
}

function currentSceneBounds(ctx: DemoPlayerSceneContext): THREE.Box3 {
  const bbox = new THREE.Box3();
  ctx.scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh && isVisibleInScene(obj)) bbox.expandByObject(obj);
  });
  return bbox;
}

function setRenderView(deps: DemoPlayerApiDeps, view: RenderView, outputAspect?: number): void {
  const ctx = requireScene(deps);
  // Reuse the bounds the loadFeatureMeshes path computed (mesh groups are
  // already centered at origin; just re-aim the camera). Recompute
  // aggregate bounds from current scene contents to tolerate scenes loaded
  // without explicit fit.
  const bbox = currentSceneBounds(ctx);
  if (bbox.isEmpty()) return;
  const minV = bbox.min, maxV = bbox.max;
  fitCameraToBounds(
    ctx.camera,
    { min: [minV.x, minV.y, minV.z], max: [maxV.x, maxV.y, maxV.z] },
    view,
    outputAspect,
  );
  ctx.renderer.render(ctx.scene, ctx.camera);
}

function setRenderPose(deps: DemoPlayerApiDeps, azDeg: number, elDeg: number, outputAspect?: number): void {
  const ctx = requireScene(deps);
  const bbox = currentSceneBounds(ctx);
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
  const camTgt = deps.cameraTargetRef.current;
  const off = deps.centroidOffsetRef.current;
  const target = camTgt
    ? new THREE.Vector3(
        camTgt.target[0] - off[0],
        camTgt.target[1] - off[1],
        camTgt.target[2] - off[2],
      )
    : bbox.getCenter(new THREE.Vector3());
  // Aspect- and corner-depth-aware perspective fit (5% margin).
  // setCameraDistance override (when present) skips the auto-fit and pins
  // the camera at the user-supplied distance from the target.
  const autoDist = fitDistanceForBounds({
    bounds: {
      min: [bbox.min.x, bbox.min.y, bbox.min.z],
      max: [bbox.max.x, bbox.max.y, bbox.max.z],
    },
    target: [target.x, target.y, target.z],
    camDir: [camDir.x, camDir.y, camDir.z],
    fovYDeg: ctx.camera.fov,
    canvasAspect: ctx.camera.aspect,
    outputAspect,
  });
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
}

function forceFullOpacity(deps: DemoPlayerApiDeps): void {
  const ctx = requireScene(deps);
  ctx.scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      const mat = obj.material as THREE.Material;
      const authoredOpacity = typeof mat.userData.authoredOpacity === 'number'
        ? mat.userData.authoredOpacity
        : 1;
      mat.opacity = authoredOpacity;
      // Materials with PBR transmission > 0 require `transparent: true` so
      // three.js routes them through the transmission render pass — forcing
      // `transparent: false` here would defeat sapphire crystals and other
      // glass-like materials in headless / post-build captures. Opaque
      // materials still render correctly with `transparent: true` when
      // opacity = 1, so it's safe to keep transparent enabled
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
}

function showOnlyTailFeatures(deps: DemoPlayerApiDeps): void {
  const ctx = requireScene(deps);
  // Collect every feature-mesh group + every group that another feature
  // lists as a predecessor. The set difference is the tail.
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
}

function applyObjectVisibilityFilter(
  deps: DemoPlayerApiDeps,
  filter: DemoPlayerObjectFilter,
): DemoPlayerObjectVisibility {
  const ctx = requireScene(deps);
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
}

function captureMaskPng(deps: DemoPlayerApiDeps): DemoPlayerMaskCapture {
  const ctx = requireScene(deps);
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
}

function captureInspectionChannels(
  deps: DemoPlayerApiDeps,
  input: { channels: readonly DemoPlayerAuxInspectionChannel[]; width: number; height: number },
): DemoPlayerInspectionCapture {
  const { channels, width, height } = input;
  const ctx = requireScene(deps);
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
}

// ---- loadFeatureMeshes: fetch/decode/apply steps ----

function clearPriorGroups(scene: THREE.Scene): void {
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
}

interface PartitionedFeatures {
  geometryFeatures: FeatureMeshSerialized[];
  referenceImageFeatures: FeatureMeshSerialized[];
  renderEnvSpec: RenderEnvironmentSpec | null;
  cameraTargetSpec: CameraTargetMetadata | null;
}

function partitionFeatures(perFeature: FeatureMeshSerialized[]): PartitionedFeatures {
  // Separate virtual referenceImage / renderEnvironment / cameraTarget
  // records from geometry records. Tendon FeatureMeshes carry a baked
  // world-frame cylinder mesh emitted by `meshFeaturesPerFeature` (P7);
  // they fall through to the geometry path and render as ordinary kCAD
  // feature groups, so no separate routing here.
  const geometryFeatures: FeatureMeshSerialized[] = [];
  const referenceImageFeatures: FeatureMeshSerialized[] = [];
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
  return { geometryFeatures, referenceImageFeatures, renderEnvSpec, cameraTargetSpec };
}

function resolveFacePbr(fm: ReturnType<typeof rehydrateFromBridge>): PBRMaterial | undefined {
  // Prefer the full PBR record emitted by the bridge serializer (Task 7+).
  // Fall back to the legacy color string path: pbrFromColor resolves role
  // tokens ('servo', 'gear', ...) to metalness/roughness profiles and we
  // promote the result to a minimal PBRMaterial so buildMaterialFromPBR
  // handles both paths uniformly. When neither field is present the helper
  // defaults to DEFAULT_MESH_COLOR.
  if (fm.material !== undefined) return fm.material;
  if (fm.color === undefined) return undefined;
  const legacyProfile = pbrFromColor(fm.color);
  const resolvedBase = resolveColor(fm.color) ?? String(DEFAULT_MESH_COLOR);
  return {
    baseColor: resolvedBase,
    metalness: legacyProfile.metalness,
    roughness: legacyProfile.roughness,
  };
}

function buildGeometryGroup(ser: FeatureMeshSerialized): THREE.Group {
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
  const pbrForFaces = resolveFacePbr(fm);
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
  // Apply the per-feature world transform (e.g. solvedModel({poses}) FK for
  // an assembly part). The centroid-recenter loop below composes the bbox
  // offset on top, so worldTransform-bearing groups respect both the joint
  // pose AND the scene-centering. Without this, agents returning
  // arm.solvedModel({...}) rendered at rest pose. (B3 fix.)
  if (fm.transform !== undefined) {
    group.matrixAutoUpdate = false;
    group.matrix.fromArray(fm.transform);
    group.matrixWorldNeedsUpdate = true;
  }
  return group;
}

function recenterAndFitCamera(
  deps: DemoPlayerApiDeps,
  scene: THREE.Scene,
  bounds: { min: [number, number, number]; max: [number, number, number] },
): void {
  const [minX, minY, minZ] = bounds.min;
  const [maxX, maxY, maxZ] = bounds.max;
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2;
  // For groups carrying a baked worldTransform (assembly FK), compose the
  // centroid offset onto the matrix instead of setting `position` —
  // `position` is decoupled from `matrix` when matrixAutoUpdate=false, so
  // position.set() would silently no-op on those groups.
  const centroidOffset = new THREE.Matrix4().makeTranslation(-cx, -cy, -cz);
  for (const child of scene.children) {
    if (child instanceof THREE.Group && child.userData[KCAD_FEATURE_GROUP_KEY]) {
      if (child.matrixAutoUpdate === false) {
        child.matrix.premultiply(centroidOffset);
        child.matrixWorldNeedsUpdate = true;
      } else {
        child.position.set(-cx, -cy, -cz);
      }
    }
  }
  // Stash the centroid offset so setRenderPose can translate a script-frame
  // setCameraTarget(x, y, z) into the recentered scene frame (target_scene
  // = target_script - centroid).
  deps.centroidOffsetRef.current = [cx, cy, cz];
  if (!deps.sceneRef.current) return;
  fitCameraToBounds(deps.sceneRef.current.camera, {
    min: [minX - cx, minY - cy, minZ - cz],
    max: [maxX - cx, maxY - cy, maxZ - cz],
  });
}

function attachReferenceImages(
  scene: THREE.Scene,
  sceneRef: DemoPlayerApiDeps['sceneRef'],
  referenceImageFeatures: FeatureMeshSerialized[],
): void {
  if (referenceImageFeatures.length === 0) return;
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
    // In the browser context, reference image paths are absolute filesystem
    // paths recorded at capture time. Vite's dev server doesn't serve
    // arbitrary host-fs files via a static URL, so we load via a data URL:
    // fetch the file through the Node-side /__kernelcad/image endpoint (if
    // present) or fall back to a transparent 1×1 PNG so the scene doesn't
    // crash. In practice, callers that need real texture display should
    // supply a URL via a resolved asset system; this path handles the
    // dev-server case where the path is absolute on the host.
    //
    // Strategy: try /__kernelcad/image?path=<encoded>, fall back to a 1×1
    // transparent data URL so the overlay still shows up in the group (the
    // visibility toggle test doesn't need real pixels).
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
        sceneRef.current.renderer.render(sceneRef.current.scene, sceneRef.current.camera);
      }
    }).catch(() => {
      // Texture load failed (path not accessible from dev server). Create a
      // 1×1 transparent canvas texture as a stand-in so the mesh is still
      // registered in the group (visibility toggle works).
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
        sceneRef.current.renderer.render(sceneRef.current.scene, sceneRef.current.camera);
      }
    });
  }
}

function applyGlassEnvironmentIfNeeded(
  deps: DemoPlayerApiDeps,
  geometryFeatures: FeatureMeshSerialized[],
  renderEnvSpec: RenderEnvironmentSpec | null,
): void {
  // Detect any glass material (transmission > 0) on the loaded scene. Glass
  // without an environment map renders as flat translucent plastic —
  // three.js' refraction integrator needs an IBL probe to sample. So if the
  // script didn't declare an environment but any material is glassy,
  // auto-apply the bundled 'studio' preset. Gated strictly on
  // `transmission > 0` so zero-transmission renders stay bit-identical and
  // snapshot diffs remain scoped.
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
  // meshes are already on screen; env will pop in when the .hdr finishes
  // loading + PMREM finishes prefiltering.
  if (!deps.sceneRef.current) return;
  const ctx = deps.sceneRef.current;
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

function loadFeatureMeshes(
  deps: DemoPlayerApiDeps,
  perFeature: FeatureMeshSerialized[],
  bounds: { min: [number, number, number]; max: [number, number, number] },
): { groupCount: number } {
  const ctx = requireScene(deps);
  const scene = ctx.scene;
  clearPriorGroups(scene);

  const { geometryFeatures, referenceImageFeatures, renderEnvSpec, cameraTargetSpec } =
    partitionFeatures(perFeature);

  // Stash the camera-target override for setRenderPose / setRenderView.
  // Reset to null on every load so a script without setCameraTarget() falls
  // back cleanly to the existing bbox-centroid auto-fit.
  deps.cameraTargetRef.current = cameraTargetSpec
    ? {
        target: [
          cameraTargetSpec.target[0],
          cameraTargetSpec.target[1],
          cameraTargetSpec.target[2],
        ],
        ...(cameraTargetSpec.distance !== undefined ? { distance: cameraTargetSpec.distance } : {}),
      }
    : null;

  let groupCount = 0;
  for (const ser of geometryFeatures) {
    scene.add(buildGeometryGroup(ser));
    groupCount++;
  }

  // Center & camera-fit using supplied bounds (skip if nothing was loaded).
  // We compute scene bbox before adding reference images so the camera fits
  // the actual model geometry, not the (potentially larger) overlay planes.
  if (perFeature.length > 0) {
    recenterAndFitCamera(deps, scene, bounds);
  }

  attachReferenceImages(scene, deps.sceneRef, referenceImageFeatures);
  applyGlassEnvironmentIfNeeded(deps, geometryFeatures, renderEnvSpec);

  return { groupCount };
}

function setReferenceImagesVisible(deps: DemoPlayerApiDeps, visible: boolean): void {
  if (!deps.sceneRef.current) return;
  const ctx = deps.sceneRef.current;
  const group = ctx.scene.getObjectByName('__referenceImages');
  if (group) {
    group.visible = visible;
    ctx.renderer.render(ctx.scene, ctx.camera);
  }
}

async function setRenderEnvironment(deps: DemoPlayerApiDeps, spec: RenderEnvironmentSpec | null): Promise<void> {
  if (!deps.sceneRef.current) return;
  const ctx = deps.sceneRef.current;
  await applyEnvironment(ctx.renderer, ctx.scene, spec);
  ctx.renderer.render(ctx.scene, ctx.camera);
}

function dumpScene(deps: DemoPlayerApiDeps): ReturnType<DemoPlayerWindow['dumpScene']> {
  const scene = deps.sceneRef.current?.scene;
  const camera = deps.sceneRef.current?.camera;
  if (!scene || !camera) {
    return {
      childCount: 0, meshCount: 0,
      cameraPos: [0, 0, 0] as [number, number, number],
      cameraLookingAt: [0, 0, 0] as [number, number, number],
      sampleOpacities: [],
      samplePolygonOffsets: [],
      kcadGroupMatrices: [],
    };
  }
  let meshCount = 0;
  const sampleOpacities: number[] = [];
  const samplePolygonOffsets: Array<{ enabled: boolean; factor: number; units: number }> = [];
  const kcadGroupMatrices: number[][] = [];
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
  for (const child of scene.children) {
    if (child instanceof THREE.Group && child.userData[KCAD_FEATURE_GROUP_KEY]) {
      kcadGroupMatrices.push(child.matrix.toArray());
    }
  }
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
    kcadGroupMatrices,
  };
}

/** Builds the `window.__demoPlayer` API object from the page's refs/setters. */
export function createDemoPlayerWindowApi(deps: DemoPlayerApiDeps): DemoPlayerWindow {
  return {
    isFrameReady: () => !!deps.animEngineRef.current?.isFrameReady(),
    onEvent: (event) => onEvent(deps, event),
    setRotatePhase: (durationMs) => {
      deps.cameraCtrlRef.current?.startRotate(durationMs, deps.elapsedMsRef.current);
    },
    setTerminalLines: (lines) => deps.setTerminalLines(lines),
    startTerminalClock: (originMs) => {
      deps.terminalOriginRef.current = originMs;
    },
    setTitleCard: (spec) => deps.setTitleCard(spec),
    advance: (dtMs) => advance(deps, dtMs),
    setVersion: (v) => deps.setVersion(v),
    setRenderView: (view, outputAspect) => setRenderView(deps, view, outputAspect),
    setRenderPose: (azDeg, elDeg, outputAspect) => setRenderPose(deps, azDeg, elDeg, outputAspect),
    forceFullOpacity: () => forceFullOpacity(deps),
    showOnlyTailFeatures: () => showOnlyTailFeatures(deps),
    applyObjectVisibilityFilter: (filter) => applyObjectVisibilityFilter(deps, filter),
    captureMaskPng: () => captureMaskPng(deps),
    captureInspectionChannels: (input) => captureInspectionChannels(deps, input),
    loadFeatureMeshes: (perFeature, bounds) => loadFeatureMeshes(deps, perFeature, bounds),
    setReferenceImagesVisible: (visible) => setReferenceImagesVisible(deps, visible),
    setRenderEnvironment: (spec) => setRenderEnvironment(deps, spec),
    dumpScene: () => dumpScene(deps),
  };
}
