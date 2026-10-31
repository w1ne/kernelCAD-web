// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/script-runtime/exportPly.ts
//
// PLY dispatch for `runAndExport`: option validation, scene (assembly) and
// single-shape paths. Tessellation is the shared export mesher used by STL,
// OBJ and USD; colours come from the same lineage the GLB / 3MF writers read
// (`.finish()` / `.material()` base colour over `.color()`).

import { meshShapeForExport, type OcctBackend } from '../../kernel/backends/occt/occtBackend';
import { lookupColorFromLineage, lookupMaterialFromLineage } from '../../kernel/backends/occt/lookupSourceColor';
import { releaseWorldFrameParts, sceneToWorldFrameParts } from '../../kernel/backends/occt/sceneToWorldFrame';
import { exportMeshPly, plyPartRgb, type PlyPart, type PlyWriterOptions } from '../../kernel/export/plyFormat';
import type { SceneBackend } from '../../kernel/backends/sceneBackend';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { HINT_TEMPLATES, NEXT_ACTIONS } from '../../shared/diagnostics/registry';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import { invalidArgsError, type InvalidArgsSpec } from '../../shared/intent/invalidArgs';
import type { ExportInput, ExportResult } from './export';

const PLY_API = "export({ format: 'ply', options })";
const PLY_EXAMPLE = "export({ target: 'model', code, format: 'ply', output_path: 'part.ply', options: { format: 'ply', encoding: 'ascii', colors: 'face' } })";
const PLY_KEYS = new Set(['format', 'encoding', 'normals', 'colors']);

function plyOptionProblem(options: Record<string, unknown>): Omit<InvalidArgsSpec, 'api' | 'example'> | undefined {
  const unknownKey = Object.keys(options).find(k => !PLY_KEYS.has(k));
  if (unknownKey !== undefined) {
    return { path: `options.${unknownKey}`, gotText: `unknown key '${unknownKey}'`, requires: 'one of encoding, normals, colors' };
  }
  if (options.encoding !== undefined && options.encoding !== 'binary' && options.encoding !== 'ascii') {
    return { path: 'options.encoding', got: options.encoding, requires: "'binary' (default, little-endian) or 'ascii'" };
  }
  if (options.normals !== undefined && typeof options.normals !== 'boolean') {
    return { path: 'options.normals', got: options.normals, showType: true, requires: 'a boolean (default true)' };
  }
  if (options.colors !== undefined && !['vertex', 'face', 'none'].includes(options.colors as string)) {
    return { path: 'options.colors', got: options.colors, requires: "'vertex' (default), 'face' or 'none'" };
  }
  return undefined;
}

/** Refuse bad PLY options before the script runs; `undefined` when valid. */
export function plyOptionsDiagnostic(input: ExportInput): ExportResult | undefined {
  if (input.format !== 'ply' || input.options === undefined) return undefined;
  const problem = plyOptionProblem(input.options as unknown as Record<string, unknown>);
  if (problem === undefined) return undefined;
  const err = invalidArgsError({ ...problem, api: PLY_API, example: PLY_EXAMPLE, code: 'export.ply.invalid-options' });
  return {
    bytes: new Uint8Array(),
    featureCount: 0,
    diagnostics: [{
      target: 'export-occt',
      code: err.code,
      severity: 'error',
      message: err.message,
      hint: err.hint ?? HINT_TEMPLATES['export.ply.invalid-options'].template,
      nextAction: NEXT_ACTIONS['export.ply.invalid-options'],
    }],
  };
}

function writerOptions(input: ExportInput): PlyWriterOptions {
  const o = (input.options ?? {}) as PlyWriterOptions;
  return {
    ...(o.encoding === undefined ? {} : { encoding: o.encoding }),
    ...(o.normals === undefined ? {} : { normals: o.normals }),
    ...(o.colors === undefined ? {} : { colors: o.colors }),
  };
}

/** Assembly: every part meshed in world space, merged into one file. */
export function exportScenePly(
  input: ExportInput,
  scene: SceneBackend,
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
): ExportResult {
  const worldParts = sceneToWorldFrameParts(scene);
  try {
    const parts: PlyPart[] = worldParts.map(part => ({
      name: part.name,
      mesh: meshShapeForExport(part.shape.getReplicadShape()),
      rgb: plyPartRgb(part.color, part.material?.baseColor),
    }));
    return { bytes: exportMeshPly(parts, writerOptions(input)), featureCount, diagnostics };
  } finally {
    releaseWorldFrameParts(worldParts);
  }
}

/** Single body: colour from the target record's lineage (as GLB does). */
export function exportSinglePly(
  input: ExportInput,
  shape: OcctBackend,
  targetId: string,
  records: readonly FeatureRecord[],
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
): ExportResult {
  const tail = records.find(rec => rec.id === targetId);
  const color = tail ? lookupColorFromLineage(tail, records) : undefined;
  const material = tail ? lookupMaterialFromLineage(tail, records) : undefined;
  const part: PlyPart = {
    name: 'part',
    mesh: meshShapeForExport(shape.getReplicadShape()),
    rgb: plyPartRgb(color, material?.baseColor),
  };
  return { bytes: exportMeshPly([part], writerOptions(input)), featureCount, diagnostics };
}
