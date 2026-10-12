// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { getOC } from 'replicad';
import { meshShape, type MeshOptions } from '../../src/kernel/backends/occt/meshing';
import { isSceneBackend } from '../../src/kernel/backends/sceneBackend';
import type { ShapeBackend } from '../../src/kernel/backends/backend';
import type { FeatureMesh } from '../../src/modeling/capture/featureMeshing';
import { transformFeatureMesh } from '../../src/modeling/capture/transformMesh';
import type { CaptureSession } from '../../src/modeling/capture/captureSession';

export function validatePreviewMesh(options: MeshOptions): void {
  for (const value of [options.tolerance, options.angularTolerance]) {
    if (!Number.isFinite(value) || value <= 0) throw new Error('preview mesh options must be finite and positive');
  }
}

function explicitMesh(backend: ShapeBackend, options: MeshOptions) {
  const provider = backend as ShapeBackend & { getReplicadShape?: () => unknown };
  if (typeof provider.getReplicadShape !== 'function') throw new Error('preview mesh: backend has no native shape');
  const raw = provider.getReplicadShape();
  if (!raw || typeof raw !== 'object' || !('wrapped' in raw)) throw new Error('preview mesh: native shape has no topology');
  // OCCT caches triangulation on TopoDS; clone() shares that topology. Clear
  // cached display triangulation in this fresh build before explicit meshing.
  const oc = getOC();
  oc.BRepTools.Clean(raw.wrapped as Parameters<typeof oc.BRepTools.Clean>[0], true);
  const mesh = meshShape(raw, options);
  const sourceFaces = (raw as {faces?: readonly unknown[]}).faces;
  if (!mesh || (Array.isArray(sourceFaces) && mesh.faces.length !== sourceFaces.length) || mesh.faces.some(face => face.vertices.length === 0 || face.indices.length === 0)) {
    throw new Error('preview mesh: native part produced incomplete geometry');
  }
  return mesh;
}

export function previewFeatureMeshes(tail: ShapeBackend | undefined, session: CaptureSession, options: MeshOptions): FeatureMesh[] {
  validatePreviewMesh(options);
  if (!tail) throw new Error('preview mesh: missing model tail');
  if (!isSceneBackend(tail)) throw new Error('preview mesh: explicit profile currently requires an assembly');
  for (const assembly of session.assemblies.values()) {
    const arm = assembly as { __tendons?: () => readonly unknown[] };
    if (arm.__tendons?.().length) throw new Error('preview mesh: tendon assemblies are unsupported; use the default native export');
  }
  if (!tail.parts.length) throw new Error('preview mesh: assembly has no parts');
  return tail.parts.map(part => {
    const mesh = explicitMesh(part.shape, options);
    const local: FeatureMesh = {
      featureId: part.name, featureKind: 'assemblyModel', predecessors: [],
      faces: mesh.faces, color: part.color, material: part.material,
      displayName: part.name, assemblyPartName: part.name,
    };
    return transformFeatureMesh(local, part.worldTransform);
  });
}
