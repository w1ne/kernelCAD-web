// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/render-player/components/demoPlayer/displaySurfaces.ts
//
// Page half of the display-surface / indicator contract
// (src/shared/render/displaySurface.ts). A display surface becomes a textured
// plane seated on one face of a part's LOCAL bounding box and parented to that
// part's feature group, so it moves rigidly with the part during FK animation.
// An indicator state tints the LED sub-meshes' materials and adds a small
// local point light, both inside the same group, so lit LEDs spill colour onto
// the PCB/enclosure and travel with the part.
//
// Nothing here is a new bridge surface: setDisplaySurfaces / setIndicatorStates
// on window.__demoPlayer are the only entry points (see demoPlayerApiFactory).

import * as THREE from 'three';
import { disposeMaterialDeep } from './buildMaterialFromPBR';
import { KCAD_FEATURE_GROUP_KEY, isVisibleInScene } from './demoPlayerGeometry';
import {
  computeDisplaySurfacePose,
  parsePartAndSubMesh,
  pickDisplaySubMeshName,
  pickIndicatorSubMeshNames,
  type DisplayRegion,
  type ResolvedDisplaySurface,
  type ResolvedIndicatorState,
} from '../../../shared/render/displaySurface';

export const KCAD_DISPLAY_SURFACE_KEY = 'kCadDisplaySurface';
export const KCAD_INDICATOR_LIGHT_KEY = 'kCadIndicatorLight';

/** Marker on a cloned LED material: the clone is ours, never clone it again. */
const KCAD_INDICATOR_MATERIAL_KEY = 'kCadIndicatorMaterial';

const FULL_REGION: DisplayRegion = [0, 0, 1, 1];

function isFullRegion(region: DisplayRegion): boolean {
  return region[0] === FULL_REGION[0]
    && region[1] === FULL_REGION[1]
    && region[2] === FULL_REGION[2]
    && region[3] === FULL_REGION[3];
}

function subMeshNameOf(mesh: THREE.Mesh): string | undefined {
  const name = mesh.userData.subMeshName;
  return typeof name === 'string' ? name : undefined;
}

function uniqueSubMeshNames(meshes: readonly THREE.Mesh[]): string[] {
  const names = new Set<string>();
  for (const mesh of meshes) {
    const name = subMeshNameOf(mesh);
    if (name !== undefined) names.add(name);
  }
  return [...names];
}

function selectBySubMesh(meshes: readonly THREE.Mesh[], subMeshName: string | undefined): THREE.Mesh[] {
  if (subMeshName === undefined) return [...meshes];
  const target = subMeshName.toLowerCase();
  return meshes.filter((mesh) => subMeshNameOf(mesh)?.toLowerCase() === target);
}

/** Visible feature groups whose part/display/source/metadata names match. */
function findFeatureGroups(scene: THREE.Scene, partName: string): THREE.Group[] {
  const target = partName.trim().toLowerCase();
  const matches: THREE.Group[] = [];
  scene.traverse((obj) => {
    if (!(obj instanceof THREE.Group)) return;
    if (obj.userData[KCAD_FEATURE_GROUP_KEY] !== true || !isVisibleInScene(obj)) return;
    if (groupNames(obj).some((name) => name.toLowerCase() === target)) matches.push(obj);
  });
  return matches;
}

function groupNames(group: THREE.Group): string[] {
  const filterNames = Array.isArray(group.userData.filterNames) ? group.userData.filterNames : [];
  return [
    group.userData.assemblyPartName,
    group.userData.displayName,
    group.userData.sourceMetadataName,
    group.name,
    ...filterNames,
  ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
}

/** Meshes inside a feature group, excluding display planes we added. */
function groupModelMeshes(group: THREE.Group): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.userData[KCAD_DISPLAY_SURFACE_KEY] !== true) meshes.push(obj);
  });
  return meshes;
}

/** Local bounding box of `meshes` in `group`'s own frame — NOT world space, so
 *  a group matrix that animates keeps the plane attached to the part. */
function localBoundsOf(group: THREE.Group, meshes: readonly THREE.Mesh[]): THREE.Box3 {
  group.updateWorldMatrix(true, true);
  const worldToGroup = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const box = new THREE.Box3();
  for (const mesh of meshes) {
    mesh.geometry.computeBoundingBox();
    const geometryBox = mesh.geometry.boundingBox;
    if (geometryBox === null) continue;
    const meshToGroup = new THREE.Matrix4().multiplyMatrices(worldToGroup, mesh.matrixWorld);
    box.union(geometryBox.clone().applyMatrix4(meshToGroup));
  }
  return box;
}

function disposeObject(object: THREE.Object3D): void {
  if (object instanceof THREE.Mesh) {
    object.geometry.dispose();
    disposeMaterialDeep(object.material);
  }
  object.parent?.remove(object);
}

/** Remove every display plane we added and release its geometry, material and
 *  textures. Called before each apply so solves are idempotent. */
export function clearDisplaySurfaces(scene: THREE.Scene): void {
  const planes: THREE.Object3D[] = [];
  scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.userData[KCAD_DISPLAY_SURFACE_KEY] === true) planes.push(obj);
  });
  for (const plane of planes) disposeObject(plane);
}

/** Remove every indicator point light we added. */
export function clearIndicatorLights(scene: THREE.Scene): void {
  const lights: THREE.Light[] = [];
  scene.traverse((obj) => {
    if (obj instanceof THREE.Light && obj.userData[KCAD_INDICATOR_LIGHT_KEY] === true) lights.push(obj);
  });
  for (const light of lights) {
    light.parent?.remove(light);
    light.dispose();
  }
}

function displayMeshesFor(
  group: THREE.Group,
  subMeshName: string | undefined,
  region: DisplayRegion,
): THREE.Mesh[] {
  const meshes = groupModelMeshes(group);
  if (subMeshName !== undefined) return selectBySubMesh(meshes, subMeshName);
  const names = uniqueSubMeshNames(meshes);
  if (!isFullRegion(region) || names.length === 0) return meshes;
  const picked = pickDisplaySubMeshName(names);
  // Seat the texture on the panel's active area instead of the part bbox,
  // which on an OLED module includes the header pins.
  return picked === undefined ? meshes : selectBySubMesh(meshes, picked);
}

function configureDisplayTexture(tex: THREE.Texture, rotation: number): void {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = true;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.center.set(0.5, 0.5);
  tex.rotation = -(rotation * Math.PI) / 180;
}

function displaySurfaceParams(
  tex: THREE.Texture,
  spec: ResolvedDisplaySurface,
): THREE.MeshPhysicalMaterialParameters {
  // Coplanar overlay flags are shared by every mode; the screen finish is not.
  const overlay: THREE.MeshPhysicalMaterialParameters = {
    metalness: 0,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  };
  if (spec.mode === 'epaper') {
    // Matte reflective e-ink paper: a diffuse print, no backlight.
    return {
      ...overlay,
      map: tex,
      color: 0xffffff,
      roughness: 0.92,
      specularIntensity: 0.08,
      envMapIntensity: 0.35,
      clearcoat: 0,
      emissive: 0x000000,
      emissiveIntensity: 0,
    };
  }
  if (spec.mode === 'lcd') {
    // Dark polariser albedo keeps backlit contrast; a low specular floor stops
    // the key light from washing the panel out.
    return {
      ...overlay,
      map: tex,
      color: 0x1c222b,
      emissive: 0xffffff,
      emissiveMap: tex,
      emissiveIntensity: spec.emissiveIntensity ?? 1.05,
      roughness: 0.14,
      specularIntensity: 0.22,
      envMapIntensity: 0.2,
      clearcoat: 0.12,
      clearcoatRoughness: 0.1,
    };
  }
  // OLED: near-black anti-reflective polariser base, no diffuse albedo at all
  // (the panel only emits), so unlit pixels stay black instead of grey.
  return {
    ...overlay,
    color: 0x05070a,
    emissive: 0xffffff,
    emissiveMap: tex,
    emissiveIntensity: spec.emissiveIntensity ?? 1.6,
    roughness: 0.08,
    specularIntensity: 0.15,
    envMapIntensity: 0.12,
    clearcoat: 0.08,
    clearcoatRoughness: 0.06,
  };
}

function displayPose(
  group: THREE.Group,
  meshes: readonly THREE.Mesh[],
  spec: ResolvedDisplaySurface,
): ReturnType<typeof computeDisplaySurfacePose> | undefined {
  const box = localBoundsOf(group, meshes);
  if (box.isEmpty()) return undefined;
  const pose = computeDisplaySurfacePose(
    { min: [box.min.x, box.min.y, box.min.z], max: [box.max.x, box.max.y, box.max.z] },
    { face: spec.face, region: spec.region, offsetMm: spec.offsetMm },
  );
  return pose.size[0] <= 1e-4 || pose.size[1] <= 1e-4 ? undefined : pose;
}

function seatDisplayPlane(
  group: THREE.Group,
  spec: ResolvedDisplaySurface,
  pose: ReturnType<typeof computeDisplaySurfacePose>,
  tex: THREE.Texture,
): THREE.Mesh {
  const material = new THREE.MeshPhysicalMaterial(displaySurfaceParams(tex, spec));
  material.userData.authoredOpacity = 1;
  material.side = THREE.FrontSide;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(pose.size[0], pose.size[1]), material);
  mesh.position.set(...pose.position);
  const basis = new THREE.Matrix4().makeBasis(
    new THREE.Vector3(...pose.basis[0]),
    new THREE.Vector3(...pose.basis[1]),
    new THREE.Vector3(...pose.basis[2]),
  );
  mesh.quaternion.setFromRotationMatrix(basis);
  mesh.userData[KCAD_DISPLAY_SURFACE_KEY] = true;
  mesh.renderOrder = 2;
  mesh.castShadow = false;
  mesh.receiveShadow = spec.mode === 'epaper';
  group.add(mesh);
  return mesh;
}

async function applyOneDisplaySurface(
  scene: THREE.Scene,
  spec: ResolvedDisplaySurface,
): Promise<boolean> {
  const { partName, subMeshName } = parsePartAndSubMesh(spec.part, spec.subMesh);
  const group = findFeatureGroups(scene, partName)[0];
  if (group === undefined) return false;
  const pose = displayPose(group, displayMeshesFor(group, subMeshName, spec.region), spec);
  if (pose === undefined) return false;
  let tex: THREE.Texture;
  try {
    tex = await new THREE.TextureLoader().loadAsync(spec.imageDataUrl);
  } catch (e) {
    throw new Error(
      `display-surface: texture for '${spec.part}' failed to load: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  configureDisplayTexture(tex, spec.rotation);
  // The scene may have been reloaded while the image decoded; never attach a
  // plane to a detached group.
  if (group.parent === null) {
    tex.dispose();
    return false;
  }
  seatDisplayPlane(group, spec, pose, tex);
  return true;
}

/**
 * Seat every resolved display surface on its part. Clears previous planes
 * first, so calling again after a mesh reload is idempotent. Parts that match
 * no visible feature group are reported in `missing` instead of throwing.
 */
export async function applyDisplaySurfaces(
  scene: THREE.Scene,
  specs: readonly ResolvedDisplaySurface[],
): Promise<{ applied: string[]; missing: string[] }> {
  clearDisplaySurfaces(scene);
  const applied: string[] = [];
  const missing: string[] = [];
  for (const spec of specs) {
    if (await applyOneDisplaySurface(scene, spec)) applied.push(spec.part);
    else missing.push(spec.part);
  }
  return { applied, missing };
}

/** Full-brightness epoxy lens tint: keep the LED hue saturated so AgX does not
 *  desaturate lit domes into chalky white. */
function litLensTint(color: string): THREE.Color {
  return new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.22);
}

/** Unlit resin tint: the LED colour darkened toward its plastic body. */
function unlitResinTint(color: string): THREE.Color {
  return new THREE.Color(color).multiplyScalar(0.32);
}

function ensureOwnedMaterials(mesh: THREE.Mesh): THREE.MeshStandardMaterial[] {
  const owned: THREE.MeshStandardMaterial[] = [];
  const source = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const material of source) {
    if (!(material instanceof THREE.MeshStandardMaterial)) continue;
    if (material.userData[KCAD_INDICATOR_MATERIAL_KEY] === true) {
      owned.push(material);
      continue;
    }
    // Clone: an imported GLB often shares one material across unrelated
    // sub-meshes, and tinting in place would light the whole part.
    const clone = material.clone();
    clone.userData[KCAD_INDICATOR_MATERIAL_KEY] = true;
    owned.push(clone);
  }
  if (owned.length > 0) mesh.material = owned.length === 1 ? owned[0]! : owned;
  return owned;
}

function applyLensFinish(material: THREE.MeshStandardMaterial, lit: boolean): void {
  material.roughness = lit ? Math.min(material.roughness, 0.16) : 0.22;
  material.metalness = 0;
  const physical = material as THREE.MeshPhysicalMaterial;
  physical.clearcoat = lit ? Math.max(physical.clearcoat ?? 0, 0.85) : 0.7;
  if (lit) physical.clearcoatRoughness = 0.08;
}

function applyIndicatorMaterial(material: THREE.MeshStandardMaterial, spec: ResolvedIndicatorState): void {
  const lit = spec.level > 0;
  const authoredOpacity = typeof material.userData.authoredOpacity === 'number'
    ? material.userData.authoredOpacity
    : material.opacity;
  material.emissive = new THREE.Color(spec.color);
  material.emissiveIntensity = lit ? spec.level * spec.intensity : 0;
  material.color = lit ? litLensTint(spec.color) : unlitResinTint(spec.color);
  // Translucent epoxy domes blend their emission by alpha when left at low
  // opacity, which washes lit LEDs out. Raise opacity while lit and restore the
  // authored lens translucency when turned off.
  if (lit && authoredOpacity < 0.94) {
    material.opacity = 0.94;
    material.transparent = true;
  } else if (!lit) {
    material.opacity = authoredOpacity;
    material.transparent = authoredOpacity < 1 || ((material as THREE.MeshPhysicalMaterial).transmission ?? 0) > 0;
  }
  applyLensFinish(material, lit);
  material.needsUpdate = true;
}

/** Sub-mesh names that are hardware, never the light: pins, leads, pads. */
const PIN_SUBMESH_NAME = /pin|lead|leg|pad|solder|metal|terminal|contact/i;

function standardMaterialsOf(mesh: THREE.Mesh): THREE.MeshStandardMaterial[] {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  return materials.filter((entry): entry is THREE.MeshStandardMaterial => entry instanceof THREE.MeshStandardMaterial);
}

/** Glass / epoxy lens: transmissive, or authored / material alpha below opaque. */
function isTranslucentMaterial(material: THREE.MeshStandardMaterial): boolean {
  const authored = material.userData.authoredOpacity;
  const transmission = (material as THREE.MeshPhysicalMaterial).transmission ?? 0;
  return transmission > 0
    || (typeof authored === 'number' && authored < 0.99)
    || (material.transparent && material.opacity < 0.99);
}

/** A mesh is hardware metal when every material is metallic and none is a
 *  translucent lens. Imported GLBs share one material across sub-meshes, so
 *  the material test has to back up the (often missing) sub-mesh name. */
function isMetallicMesh(mesh: THREE.Mesh): boolean {
  const materials = standardMaterialsOf(mesh);
  return materials.length > 0
    && materials.every((material) => material.metalness >= 0.5 && !isTranslucentMaterial(material));
}

function isTranslucentMesh(mesh: THREE.Mesh): boolean {
  return standardMaterialsOf(mesh).some(isTranslucentMaterial);
}

/** Drop pins/leads and metal hardware; fall back to every mesh when that would
 *  leave nothing to light. */
function indicatorCandidates(meshes: readonly THREE.Mesh[]): THREE.Mesh[] {
  const filtered = meshes.filter((mesh) => {
    const name = subMeshNameOf(mesh);
    if (name !== undefined && PIN_SUBMESH_NAME.test(name)) return false;
    return !isMetallicMesh(mesh);
  });
  return filtered.length > 0 ? filtered : [...meshes];
}

function namedSubMeshes(meshes: readonly THREE.Mesh[], names: readonly string[]): THREE.Mesh[] {
  const wanted = new Set(names.map((name) => name.toLowerCase()));
  return meshes.filter((mesh) => {
    const name = subMeshNameOf(mesh);
    return name !== undefined && wanted.has(name.toLowerCase());
  });
}

function indicatorMeshesFor(group: THREE.Group, subMeshName: string | undefined): THREE.Mesh[] {
  const meshes = groupModelMeshes(group);
  if (subMeshName !== undefined) return selectBySubMesh(meshes, subMeshName);
  if (meshes.length <= 1) return meshes;
  const candidates = indicatorCandidates(meshes);
  const picked = pickIndicatorSubMeshNames(uniqueSubMeshNames(candidates));
  if (picked !== undefined && picked.length > 0) {
    const named = namedSubMeshes(candidates, picked);
    if (named.length > 0) return named;
  }
  const lenses = candidates.filter(isTranslucentMesh);
  if (lenses.length > 0 && lenses.length < candidates.length) return lenses;
  return candidates;
}

/** Dome-centred physical light at the LED: inverse-square falloff with no hard
 *  cutoff radius, so nearby metal and satin surfaces never show a clipped
 *  crescent reflection. Intensity scales gently with the dome radius. */
function addIndicatorLight(
  group: THREE.Group,
  spec: ResolvedIndicatorState,
  meshes: readonly THREE.Mesh[],
): void {
  if (spec.level <= 0 || meshes.length === 0) return;
  const bounds = localBoundsOf(group, meshes);
  if (bounds.isEmpty()) return;
  const centre = bounds.getCenter(new THREE.Vector3());
  const radius = Math.max(bounds.getBoundingSphere(new THREE.Sphere()).radius, 0.75);
  const intensity = Math.min(Math.max(radius * radius * 16.0, 30), 260) * spec.level;
  const light = new THREE.PointLight(spec.color, intensity, 0, 2);
  light.position.copy(centre);
  light.userData[KCAD_INDICATOR_LIGHT_KEY] = true;
  light.castShadow = false;
  group.add(light);
}

function applyOneIndicatorState(scene: THREE.Scene, spec: ResolvedIndicatorState): boolean {
  const { partName, subMeshName } = parsePartAndSubMesh(spec.part, spec.subMesh);
  const group = findFeatureGroups(scene, partName)[0];
  if (group === undefined) return false;
  const meshes = indicatorMeshesFor(group, subMeshName);
  if (meshes.length === 0) return false;
  for (const mesh of meshes) {
    for (const material of ensureOwnedMaterials(mesh)) {
      applyIndicatorMaterial(material, spec);
    }
  }
  addIndicatorLight(group, spec, meshes);
  return true;
}

/** Apply live / simulated LED and indicator emissive states to loaded parts. */
export function applyIndicatorStates(
  scene: THREE.Scene,
  specs: readonly ResolvedIndicatorState[],
): { applied: string[]; missing: string[] } {
  clearIndicatorLights(scene);
  const applied: string[] = [];
  const missing: string[] = [];
  for (const spec of specs) {
    if (applyOneIndicatorState(scene, spec)) applied.push(spec.part);
    else missing.push(spec.part);
  }
  return { applied, missing };
}
