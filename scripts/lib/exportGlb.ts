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
import { GLTFExporter } from 'three-stdlib';
import { evaluateAndBuildScript } from '../../src/agent/cli/commands/evaluate';
import { pbrFromMetadata, type OcctBackend } from '../../src/kernel/backends/occt/occtBackend';
import { loadScriptFeatures } from '../../src/modeling/runtime/scriptLoader';
import { meshFeaturesPerFeature, type FeatureMesh } from '../../src/modeling/capture/featureMeshing';
import type { PBRMaterial } from '../../src/shared/intent/material';
import { resolveColor } from '../../src/shared/render/palette';

export interface ExportGlbOptions {
  scriptPath: string;
  outPath: string;
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
  scene.add(new Mesh(geometry, makeMaterial(color, material)));
}

function addFeatureMesh(scene: ThreeScene, fm: FeatureMesh): void {
  if (fm.virtual) return;
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
}

export async function exportGlb(opts: ExportGlbOptions): Promise<void> {
  if (!existsSync(opts.scriptPath)) {
    throw new Error(`script not found: ${opts.scriptPath}`);
  }

  const { evaluation, model } = await evaluateAndBuildScript({ file: opts.scriptPath });
  if (evaluation.exitCode !== 0 || !model) {
    throw new Error(`evaluation failed (exitCode=${evaluation.exitCode}, has model=${!!model})`);
  }

  const scene = new ThreeScene();

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
    const loaded = await loadScriptFeatures(opts.scriptPath);
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
