// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { writeFileSync, existsSync } from 'node:fs';
import {
  BufferGeometry,
  BufferAttribute,
  Color,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Scene as ThreeScene,
} from 'three';
import { GLTFExporter, mergeVertices } from 'three-stdlib';
import { evaluateAndBuildScript } from '../../src/agent/cli/commands/evaluate';
import { pbrFromMetadata, type OcctBackend } from '../../src/kernel/backends/occt/occtBackend';
import { loadScriptFeatures } from '../../src/modeling/runtime/scriptLoader';
import { meshFeaturesPerFeature, type FeatureMesh } from '../../src/modeling/capture/featureMeshing';
import type { PBRMaterial } from '../../src/shared/intent/material';
import type { MeshOptions } from '../../src/kernel/backends/occt/meshing';
import { previewFeatureMeshes, validatePreviewMesh } from './previewMeshes';
import { resolveColor } from '../../src/shared/render/palette';

export interface ExportGlbOptions {
  scriptPath: string;
  outPath: string;
  /** Selected web tile only; default native export/Studio quality is unchanged. */
  previewMesh?: MeshOptions;
}

const DEFAULT_MATERIAL = { color: 0xb0b0b0, metalness: 0.2, roughness: 0.6 };

function makeMaterial(color: string | undefined, pbr: PBRMaterial | undefined): MeshStandardMaterial {
  if (pbr !== undefined) {
    const resolved = resolveColor(pbr.baseColor);
    const mat = new MeshPhysicalMaterial({
      color: resolved !== undefined ? new Color(resolved) : DEFAULT_MATERIAL.color,
      metalness: pbr.metalness ?? 0,
      roughness: pbr.roughness ?? 0.5,
      clearcoat: pbr.clearcoat ?? 0,
      clearcoatRoughness: pbr.clearcoatRoughness ?? 0.03,
      ior: pbr.ior ?? 1.5,
      transmission: pbr.transmission ?? 0,
      sheen: pbr.sheen ?? 0,
      opacity: pbr.opacity ?? 1,
      transparent: (pbr.opacity ?? 1) < 1 || (pbr.transmission ?? 0) > 0,
      thickness: pbr.thickness ?? 0,
      attenuationColor: new Color(resolveColor(pbr.attenuationColor) ?? '#ffffff'),
      attenuationDistance: pbr.attenuationDistance ?? Infinity,
    });
    return mat;
  }
  const mat = new MeshStandardMaterial({ ...DEFAULT_MATERIAL });
  const resolved = resolveColor(color);
  if (resolved !== undefined) {
    mat.color = new Color(resolved);
  }
  return mat;
}

function addSingleMesh(
  scene: ThreeScene,
  positions: Float32Array,
  normals: Float32Array,
  indices: Uint32Array,
  color: string | undefined,
  material: PBRMaterial | undefined,
): void {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new BufferAttribute(normals, 3));
  geometry.setIndex(new BufferAttribute(indices, 1));
  // OCCT meshes each face independently, so shared edges carry duplicate
  // vertices (coordinate-equal, index-distinct). Weld them — lossless, and at
  // hard edges the differing normals keep the vertices split so shading is
  // preserved. Shrinks the exported GLB with no visual change.
  const welded = mergeVertices(geometry);
  scene.add(new Mesh(welded, makeMaterial(color, material)));
}

function addFeatureMesh(scene: ThreeScene, fm: FeatureMesh, named = false): void {
  if (fm.virtual) return;
  // Display-only mesh bodies (lib.meshFromSTL) arrive as an indexed buffer in
  // `mesh`, with no face geometry, and stay in their part's local frame: apply
  // the part world transform like the Studio viewer does. Native (faces-based)
  // parts are emitted already posed — same as the published gallery GLBs — so
  // they are added as-is.
  if (fm.mesh) {
    addSingleMesh(scene, fm.mesh.positions, fm.mesh.normals, fm.mesh.indices, fm.color, fm.material);
    const node = scene.children[scene.children.length - 1];
    if (fm.transform !== undefined) {
      node.matrixAutoUpdate = false;
      node.matrix.fromArray(Array.from(fm.transform));
      node.matrixWorldNeedsUpdate = true;
    }
    if (named && fm.displayName) node.name = fm.displayName;
    return;
  }
  const totalVerts = fm.faces.reduce((s, f) => s + f.vertices.length, 0);
  if (totalVerts === 0) return;
  const totalIndices = fm.faces.reduce((s, f) => s + f.indices.length, 0);
  const positions = new Float32Array(totalVerts);
  const normals = new Float32Array(totalVerts);
  const indices = new Uint32Array(totalIndices);
  let vOff = 0;
  let iOff = 0;
  for (const face of fm.faces) {
    positions.set(face.vertices, vOff);
    normals.set(face.normals, vOff);
    const indexBase = vOff / 3;
    for (let i = 0; i < face.indices.length; i++) {
      indices[iOff + i] = face.indices[i] + indexBase;
    }
    vOff += face.vertices.length;
    iOff += face.indices.length;
  }
  addSingleMesh(scene, positions, normals, indices, fm.color, fm.material);
  if (named && fm.displayName) scene.children[scene.children.length - 1].name = fm.displayName;
}

type BuiltModel = NonNullable<Awaited<ReturnType<typeof evaluateAndBuildScript>>['model']>;

async function addNativeModel(scene: ThreeScene, model: BuiltModel, scriptPath: string): Promise<void> {
  // Two paths:
  //   1. Single-shape script — tailShape is an OcctBackend exposing getMesh().
  //   2. Assembly script — tailShape is the assembly's own backend (no getMesh).
  //      Fan out via meshFeaturesPerFeature (same path headlessRender uses),
  //      build one Mesh per non-virtual feature with its captured color.
  const tail = model.tailShape as OcctBackend | undefined;
  if (tail && typeof tail.getMesh === 'function') {
    const m = tail.getMesh();
    const tailRecord = model.records.find(record => record.id === model.tailId);
    const color = (tailRecord?.metadata as { color?: unknown } | undefined)?.color;
    const material = pbrFromMetadata(tailRecord?.metadata as Record<string, unknown> | undefined);
    addSingleMesh(
      scene,
      m.positions,
      m.normals,
      m.indices,
      typeof color === 'string' ? color : undefined,
      material,
    );
  } else {
    const loaded = await loadScriptFeatures(scriptPath);
    const meshing = await meshFeaturesPerFeature(
      loaded.features.map((f) => f.record),
      loaded.paramTable,
      loaded.session,
    );
    if (meshing.failedFeatureIds.length > 0) {
      throw new Error(
        `exportGlb: ${meshing.failedFeatureIds.length} feature(s) failed to mesh: ${meshing.failedFeatureIds.join(', ')}`,
      );
    }
    for (const fm of meshing.features) addFeatureMesh(scene, fm);
    if (scene.children.length === 0) {
      throw new Error('exportGlb: assembly produced no non-virtual feature meshes');
    }
  }

}

export async function exportGlb(opts: ExportGlbOptions): Promise<void> {
  if (opts.previewMesh) validatePreviewMesh(opts.previewMesh);
  if (!existsSync(opts.scriptPath)) {
    throw new Error(`script not found: ${opts.scriptPath}`);
  }

  const { evaluation, model } = await evaluateAndBuildScript({ file: opts.scriptPath });
  if (evaluation.exitCode !== 0 || !model) {
    const diags = (evaluation.diagnostics ?? [])
      .filter((d) => d.severity === 'error')
      .map((d) => `[${d.code ?? 'error'}] ${d.message}`)
      .join('\n  ');
    throw new Error(
      `evaluation failed for ${opts.scriptPath} (exitCode=${evaluation.exitCode}, has model=${!!model})` +
        (diags ? `\n  ${diags}` : ''),
    );
  }

  const scene = new ThreeScene();

  if (opts.previewMesh) {
    for (const fm of previewFeatureMeshes(model.tailShape, model.session, opts.previewMesh)) addFeatureMesh(scene, fm, true);
  } else {
    await addNativeModel(scene, model, opts.scriptPath);
  }

  const exporter = new GLTFExporter();
  const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    exporter.parse(
      scene,
      (result) => {
        if (result instanceof ArrayBuffer) resolve(result);
        else reject(new Error('GLTFExporter returned non-binary result'));
      },
      reject,
      { binary: true },
    );
  });
  writeFileSync(opts.outPath, Buffer.from(buffer));
}
