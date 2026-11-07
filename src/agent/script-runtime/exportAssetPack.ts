// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// `format: 'asset-pack'` writes one deterministic zip. The GLB inside is the
// default-parameter export, so it keeps named materials and mesh-stats extras.

import type { runScript } from '../../composition/runScript';
import { exportGlbAsync } from '../../kernel/backends/occt/exportGlb';
import type { OcctBackend } from '../../kernel/backends/occt/occtBackend';
import { lookupColorFromLineage, lookupMaterialFromLineage } from '../../kernel/backends/occt/lookupSourceColor';
import { releaseWorldFrameParts, sceneToWorldFrameParts, type WorldFramePart } from '../../kernel/backends/occt/sceneToWorldFrame';
import type { SceneBackend } from '../../kernel/backends/sceneBackend';
import { buildAssetPack, type AssetPackParam, type AssetPackPreset } from '../../kernel/export/asset/assetPack';
import type { GlbStats } from '../../kernel/export/lowPolyGlb';
import { buildRigMetadata, type SolvedRigAssembly } from '../../kernel/export/rigHierarchy';
import type { AssetPresets } from '../../shared/assets/assetSchema';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { NEXT_ACTIONS } from '../../shared/diagnostics/registry';
import { kernelcadVersion } from '../../shared/runtime/kernelcadVersion';
import type { ParamEntry } from '../../shared/runtime/paramTable';
import type { ExportInput, ExportResult } from './export';

type ScriptRun = Awaited<ReturnType<typeof runScript>>;

const EMPTY_STATS: GlbStats = {
  triangles: 0,
  sizeM: [0, 0, 0],
  minUpM: 0,
  materials: 0,
  drawCalls: 0,
  parts: 0,
  hasRig: false,
  hasIk: false,
};

export async function exportSceneAssetPack(
  input: ExportInput,
  scene: SceneBackend,
  run: ScriptRun,
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
): Promise<ExportResult> {
  const worldParts = sceneToWorldFrameParts(scene);
  try {
    const glb = await exportGlbAsync(worldParts, { format: 'glb', scriptDir: input.scriptDir }, scene.rig);
    return packedResult(input, run, glb, scene.rig, diagnostics, featureCount);
  } finally {
    releaseWorldFrameParts(worldParts);
  }
}

export async function exportSingleAssetPack(
  input: ExportInput,
  shape: OcctBackend,
  targetId: string,
  scriptDir: string | undefined,
  run: ScriptRun,
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
): Promise<ExportResult> {
  if (shape.isEmpty()) return emptyShapeResult(targetId, diagnostics, featureCount);
  const glb = await exportGlbAsync(
    [singlePart(shape, targetId, run)],
    { format: 'glb', scriptDir: scriptDir ?? input.scriptDir },
  );
  return packedResult(input, run, glb, undefined, diagnostics, featureCount);
}

function packedResult(
  input: ExportInput,
  run: ScriptRun,
  glb: Uint8Array,
  rig: SolvedRigAssembly | undefined,
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
): ExportResult {
  const rigMetadata = rig === undefined ? undefined : buildRigMetadata(rig);
  const bytes = buildAssetPack({
    fileName: input.fileName,
    source: input.code,
    glb,
    params: run.session.paramTable.list().map(packParam),
    presets: packPresets(run.session.assetPresets),
    meta: run.session.assetMetadata,
    stats: statsFromGlb(glb),
    ...(rigMetadata === undefined ? {} : { rig: rigMetadata.rig }),
  }, {
    generatorVersion: kernelcadVersion(),
    year: new Date().getUTCFullYear(),
  });
  return { bytes, featureCount, diagnostics };
}

function singlePart(shape: OcctBackend, targetId: string, run: ScriptRun): WorldFramePart {
  const tail = run.records.find((record) => record.id === targetId);
  const color = tail === undefined ? undefined : lookupColorFromLineage(tail, run.records);
  const material = tail === undefined ? undefined : lookupMaterialFromLineage(tail, run.records);
  return {
    name: 'part',
    shape,
    ...(color === undefined ? {} : { color }),
    ...(material === undefined ? {} : { material }),
  };
}

function packParam(entry: ParamEntry): AssetPackParam {
  return {
    name: entry.name,
    type: entry.type,
    defaultValue: entry.defaultValue,
    value: entry.value,
    ...(entry.meta?.min === undefined ? {} : { min: entry.meta.min }),
    ...(entry.meta?.max === undefined ? {} : { max: entry.meta.max }),
    ...(entry.meta?.choices === undefined ? {} : { choices: entry.meta.choices }),
    ...(entry.meta?.description === undefined ? {} : { description: entry.meta.description }),
  };
}

function packPresets(presets: AssetPresets): AssetPackPreset[] {
  return Object.entries(presets)
    .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([name, params]) => ({ name, params }));
}

function statsFromGlb(bytes: Uint8Array): GlbStats {
  const stats = readKernelcadStats(bytes);
  return stats ?? EMPTY_STATS;
}

function readKernelcadStats(bytes: Uint8Array): GlbStats | undefined {
  if (bytes.byteLength < 20) return undefined;
  try {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const jsonLength = view.getUint32(12, true);
    const json = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + jsonLength))) as {
      asset?: { extras?: { kernelcad?: { stats?: GlbStats } } };
    };
    return json.asset?.extras?.kernelcad?.stats;
  } catch {
    return undefined;
  }
}

function emptyShapeResult(
  targetId: string,
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
): ExportResult {
  return {
    bytes: new Uint8Array(),
    featureCount,
    diagnostics: [...diagnostics, {
      target: 'export-occt',
      code: 'export.no-shape',
      severity: 'error',
      featureId: targetId,
      message: `The returned shape (${targetId}) is empty: it has no faces, so there is nothing to export.`,
      hint: 'An upstream boolean or edit removed all material. Evaluate the script and check which feature first has zero volume.',
      nextAction: NEXT_ACTIONS['export.no-shape'],
    }],
  };
}
