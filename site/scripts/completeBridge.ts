// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { ShapeBackend } from '../../src/kernel/backends/backend';
import { isSceneBackend, type SceneBackend } from '../../src/kernel/backends/sceneBackend';
import type { FeatureRecord } from '../../src/shared/intent/featureRecord';
import type { FeatureMesh, MeshFeaturesResult } from '../../src/modeling/capture/featureMeshing';
import { computeConstructionClosure } from '../../src/modeling/capture/featureMeshingPhases';
import type { CaptureSession } from '../../src/modeling/capture/captureSession';

/** Count authoritative topology faces without re-meshing or changing caches. */
function nativeFaceCount(shape: ShapeBackend, owner: string): number {
  const provider = shape as ShapeBackend & { getReplicadShape?: () => unknown };
  const raw = provider.getReplicadShape?.();
  const faces = raw && typeof raw === 'object' && 'faces' in raw ? raw.faces : undefined;
  if (!Array.isArray(faces)) {
    throw new Error(`${owner}: complete bridge requires native face topology`);
  }
  return faces.length;
}

function requireFaces(mesh: FeatureMesh, count: number, owner: string): void {
  if (count === 0 || mesh.faces.length !== count) throw new Error(`${owner}: incomplete native face coverage`);
  const ids = new Set(mesh.faces.map(face => face.faceId));
  if (ids.size !== count || [...ids].some(id => !Number.isInteger(id) || id < 0 || id >= count)) {
    throw new Error(`${owner}: incomplete native face IDs`);
  }
  for (const face of mesh.faces) {
    const vertices = face.vertices.length / 3;
    if (!Number.isInteger(vertices) || vertices < 3 || face.normals.length !== face.vertices.length ||
        face.indices.length === 0 || face.indices.length % 3 !== 0 ||
        face.indices.some(index => !Number.isInteger(index) || index < 0 || index >= vertices)) {
      throw new Error(`${owner}: incomplete face triangle buffers`);
    }
  }
}

function requireMesh(candidates: FeatureMesh[], owner: string): FeatureMesh {
  if (candidates.length !== 1 || candidates[0].virtual) throw new Error(`${owner}: missing or duplicated physical mesh`);
  return candidates[0];
}

function checkScene(
  id: string, scene: SceneBackend, result: MeshFeaturesResult,
  session: Pick<CaptureSession, 'assemblies'>, matched: Set<FeatureMesh>, label: string,
): void {
  const assembly = session.assemblies.get(scene.assemblyName) as { __tendons?: () => readonly unknown[] } | undefined;
  if (typeof assembly?.__tendons !== 'function') throw new Error(`${label}: native assembly tendon declarations unavailable`);
  if (assembly.__tendons().length) throw new Error(`${label}: complete bridge tendon assemblies are unsupported`);
  if (!scene.parts.length) throw new Error(`${label}: active native assembly has no physical parts`);
  if (new Set(scene.parts.map(part => part.name)).size !== scene.parts.length) {
    throw new Error(`${label}: duplicate native part ownership`);
  }
  for (const part of scene.parts) {
    const owner = `${label}: ${id}/${part.name}`;
    const mesh = requireMesh(result.features.filter(feature =>
      feature.assemblyFeatureId === id && feature.assemblyPartName === part.name), owner);
    requireFaces(mesh, nativeFaceCount(part.shape, owner), owner);
    matched.add(mesh);
  }
}

/** Selected BUILD-only guard. Legacy runtime meshing intentionally tolerates
 * partial results. Match the CURRENT lowered owners to their emitted geometry,
 * excluding construction closure, suppressed and virtual source records. Do not
 * infer completeness from any surviving mesh, or from global cache counts. */
export function assertCompleteBridgeGeometry(
  records: readonly FeatureRecord[], result: MeshFeaturesResult,
  session: Pick<CaptureSession, 'assemblies'>, label: string,
): void {
  if (!result.shapes) throw new Error(`${label}: complete bridge native owners unavailable`);
  if (result.failedFeatureIds.length) throw new Error(`${label}: complete bridge contains failed native features`);
  const construction = computeConstructionClosure(records);
  const matched = new Set<FeatureMesh>();
  for (const record of records) {
    if (record.suppressed || record.metadata?.virtual || construction.has(record.id)) continue;
    const shape = result.shapes.get(record.id);
    const owner = `${label}: ${record.id}`;
    if (!shape) throw new Error(`${owner}: complete bridge native shape unavailable`);
    if (isSceneBackend(shape)) {
      checkScene(record.id, shape, result, session, matched, label);
      continue;
    }
    const count = nativeFaceCount(shape, owner);
    if (record.kind === 'sketch' && count === 0) continue;
    const mesh = requireMesh(result.features.filter(feature => feature.featureId === record.id), owner);
    requireFaces(mesh, count, owner);
    matched.add(mesh);
  }
  if (matched.size === 0) throw new Error(`${label}: complete bridge has no physical meshes`);
  if (result.features.some(feature => !feature.virtual && !matched.has(feature))) {
    throw new Error(`${label}: complete bridge contains unmatched physical geometry`);
  }
}
