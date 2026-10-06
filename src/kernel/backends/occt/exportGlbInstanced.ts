// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// GLB for scenes with repeated geometry: one glTF mesh per (geometryKey,
// appearance) — GLTFExporter dedupes meshes that share a BufferGeometry and
// a Material object — and one node per part carrying the part's world
// matrix. Parts are meshed in their LOCAL frame and never transformed, so
// shared OCCT shapes are not touched.
import * as THREE from 'three';
import type { SceneBackend } from '../sceneBackend';
import { meshShapeForExport, type OcctBackend } from './occtBackend';
import { buildGlbMaterial, encodeGlbRoot, finalizeGlb, glbRoot, type ExportGlbOptions } from './exportGlb';

export function canExportInstanced(scene: SceneBackend): boolean {
  const counts = new Map<string, number>();
  for (const p of scene.parts) {
    if (p.material?.textureProjection !== undefined) return false;
    if (p.geometryKey !== undefined) counts.set(p.geometryKey, (counts.get(p.geometryKey) ?? 0) + 1);
  }
  for (const n of counts.values()) if (n >= 2) return true;
  return false;
}

function localGeometry(shape: OcctBackend): THREE.BufferGeometry {
  const mesh = meshShapeForExport(shape.getReplicadShape());
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(mesh.vertices, 3));
  geom.setIndex(Array.from(mesh.triangles));
  geom.computeVertexNormals();
  return geom;
}

export async function exportSceneGlbInstancedAsync(
  scene: SceneBackend,
  options: ExportGlbOptions,
): Promise<Uint8Array> {
  if ((options as { draco?: unknown }).draco === true) {
    throw new Error('export.glb.draco-glass-conflict: Draco compression is reserved but not yet implemented. Pass draco: false or omit.');
  }
  if (scene.parts.length === 0) throw new Error('exportSceneGlbInstancedAsync: no parts to write.');
  const axis = options.axis ?? 'y-up';
  const root = glbRoot(axis);
  const geometryByKey = new Map<string, THREE.BufferGeometry>();
  const materialByKey = new Map<string, THREE.Material>();
  scene.parts.forEach((p, i) => {
    const gKey = p.geometryKey ?? `part:${i}`;
    let geom = geometryByKey.get(gKey);
    if (geom === undefined) {
      geom = localGeometry(p.shape as OcctBackend);
      geometryByKey.set(gKey, geom);
    }
    const mKey = JSON.stringify([p.color ?? null, p.material ?? null]);
    let mat = materialByKey.get(mKey);
    if (mat === undefined) {
      mat = buildGlbMaterial(p.material, p.color);
      materialByKey.set(mKey, mat);
    }
    const node = new THREE.Mesh(geom, mat);
    node.name = p.name;
    new THREE.Matrix4().fromArray(p.worldTransform.toMat4() as number[]).decompose(node.position, node.quaternion, node.scale);
    root.add(node);
  });
  return finalizeGlb(await encodeGlbRoot(root), axis);
}
