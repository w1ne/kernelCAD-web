// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { runScript } from '../../composition/runScript';
import { exportSceneToSTEPAsync, type OcctBackend } from '../../kernel/backends/occt/occtBackend';
import { exportDxf, type DxfWriterOptions } from '../../kernel/backends/occt/exportDxf';
import { export3mfAsync, type Export3mfOptions } from '../../kernel/backends/occt/export3mf';
import { exportGlbAsync, type ExportGlbOptions } from '../../kernel/backends/occt/exportGlb';
import type { Assembly } from '../../modeling/capture/assembly';
import { lookupColorFromLineage, lookupMaterialFromLineage } from '../../kernel/backends/occt/lookupSourceColor';
import { sceneToWorldFrameParts, type WorldFramePart } from '../../kernel/backends/occt/sceneToWorldFrame';
import { flattenPattern } from '../../kernel/backends/occt/flattenPattern';
import type { SceneBackend } from '../../kernel/backends/sceneBackend';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { NEXT_ACTIONS } from '../../shared/diagnostics/registry';
import { Shape } from '../../modeling/capture/proxy';
import { Scene } from '../../modeling/validation/scene';
import { isRegion } from '../../shared/intent/region';
import { resolveParams } from '../../shared/runtime/resolveParams';
import { sceneToConnectorManifest } from './connectorManifestExport';
import { findDfmSpec } from '../../modeling/runtime/dfm/runDfmChecks';
import {
  dracoConflictDiagnostic,
  notWatertightDiagnostic,
  sliceShapeToGcode,
  stlNotWatertightDiagnostic,
  type GcodeOptions,
} from './exportDiagnostics';

import type {
  ExportInput,
  ExportResult,
  CompanionMeshFile,
} from './export';

export function optionsFormatMismatchDiagnostic(input: ExportInput): ExportResult | undefined {
  if (!input.options || input.options.format === input.format) return undefined;
  return {
    bytes: new Uint8Array(),
    featureCount: 0,
    diagnostics: [{
      target: 'export-occt',
      code: 'export.options-format-mismatch',
      severity: 'error',
      message: `options.format ('${input.options.format}') must equal format ('${input.format}').`,
      hint: 'Set options.format to the same value as the top-level format, or omit options.',
      nextAction: NEXT_ACTIONS['export.options-format-mismatch'],
    }],
  };
}

/** Validate and resolve the connector-manifest Scene. Throws the three
 *  structured errors the manifest contract requires; returns `undefined`
 *  when no manifest was requested. */
export function resolveConnectorManifestScene(
  manifestRequest: ExportInput['connectorManifest'],
  returnValue: unknown,
  feature_id: string | undefined,
): Scene | undefined {
  if (manifestRequest === undefined) return undefined;
  if (!(returnValue instanceof Scene)) {
    throw new Error('connector-manifest export requires the script to return an assembly Scene.');
  }
  const sourceId = returnValue.__sourceFeatureId();
  if (sourceId === undefined) {
    throw new Error('connector-manifest export requires a Scene with a source feature.');
  }
  if (feature_id !== undefined && feature_id !== sourceId) {
    throw new Error(
      `connector-manifest export feature_id '${feature_id}' must match Scene source feature '${sourceId}'.`,
    );
  }
  return returnValue;
}

/** DXF entry path: a script that returns a `Region` (typically from
 *  `Shape.flattenPattern()`) bypasses target-shape lowering — the Region's
 *  outer / holes / bendLines feed straight into the polyline writer. Any
 *  other format on a Region return is unsupported and falls through to
 *  the normal `targetId` resolution path, which then trips
 *  `export.no-shape` because the Region is not a Shape. */
export function exportRegionDxf(
  input: ExportInput,
  format: ExportInput['format'],
  returnValue: unknown,
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
): ExportResult | undefined {
  if (format !== 'dxf' || !isRegion(returnValue)) return undefined;
  const opts =
    (input.options as DxfWriterOptions | undefined) ?? { format: 'dxf' };
  const bytes = exportDxf({ kind: 'region', region: returnValue }, opts);
  return { bytes, featureCount, diagnostics };
}

/** URDF / SRDF / SDF entry path: these are pure-XML formats that derive
 *  their entire payload from the captured Assembly (parts + joints + mates
 *  + planning metadata). No targetId / lowered-Shape lookup is required;
 *  the emitter lowers each part on its own. Resolve the Assembly from
 *  the session and dispatch to the per-format serializer. */
export async function exportAssemblyFormat(
  input: ExportInput,
  format: ExportInput['format'],
  run: Awaited<ReturnType<typeof runScript>>,
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
): Promise<ExportResult | undefined> {
  if (!isAssemblyFormat(format)) return undefined;
  const arm = resolveAssemblyArm(run);
  if (!arm) {
    return {
      bytes: new Uint8Array(),
      featureCount,
      diagnostics: [...diagnostics, {
        target: 'export-occt',
        code: 'export.no-shape',
        severity: 'error',
        message: `Export format '${format}' requires the script to return assembly.model() (or assembly.solvedModel(...)).`,
        hint: 'End the script with `return arm.model();` after declaring at least one arm.part(...).',
        nextAction: NEXT_ACTIONS['export.no-shape'],
      }],
    };
  }
  if (format === 'urdf') {
    return exportUrdf(input, arm, diagnostics, featureCount);
  }
  if (format === 'srdf') {
    return exportSrdf(input, arm, diagnostics, featureCount);
  }
  if (format === 'sdf-gazebo') {
    return exportSdf(input, arm, diagnostics, featureCount);
  }
  if (format === 'bom-csv' || format === 'bom-json') {
    return exportBom(format, arm, run, diagnostics, featureCount);
  }
  return exportUsdIsaac(input, arm, diagnostics, featureCount);
}

type AssemblyFormat = 'urdf' | 'srdf' | 'sdf-gazebo' | 'usd-isaac' | 'bom-csv' | 'bom-json';

function isAssemblyFormat(format: ExportInput['format']): format is AssemblyFormat {
  return format === 'urdf' || format === 'srdf' || format === 'sdf-gazebo' || format === 'usd-isaac' || format === 'bom-csv' || format === 'bom-json';
}

/** Resolve the captured Assembly for a pure-XML export: the returned Scene's
 *  named assembly when it matches, else the first capture in the session. */
function resolveAssemblyArm(
  run: Awaited<ReturnType<typeof runScript>>,
): Assembly | undefined {
  const ret = run.returnValue;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const assemblies = run.session.assemblies as Map<string, any>;
  let arm: Assembly | undefined;
  if (ret instanceof Scene) {
    arm = assemblies.get(ret.assemblyName);
  }
  if (!arm) {
    const first = assemblies.values().next();
    if (!first.done) arm = first.value as Assembly;
  }
  return arm;
}

export async function exportUrdf(
  input: ExportInput,
  arm: Assembly,
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
): Promise<ExportResult> {
  const { urdfSerialize } = await import('../../modeling/export/urdf/urdfSerializer');
  const urdfOpts = (input.options as { density?: number; meshPrefix?: string; meshFormat?: 'stl' | 'dae' } | undefined) ?? {};
  const out = await urdfSerialize(arm, urdfOpts);
  return {
    bytes: new TextEncoder().encode(out.urdf),
    featureCount,
    diagnostics: [...diagnostics, ...out.diagnostics],
    meshes: out.urdf === '' ? [] : await emitCompanionMeshes(out.meshPaths),
  };
}

export async function exportSrdf(
  input: ExportInput,
  arm: Assembly,
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
): Promise<ExportResult> {
  const { srdfSerialize } = await import('../../modeling/export/srdf/srdfSerializer');
  const srdfOpts = (input.options as { urdfPath?: string; samplesPerMate?: number; combinatorial?: boolean } | undefined) ?? {};
  const out = await srdfSerialize(arm, srdfOpts);
  return {
    bytes: new TextEncoder().encode(out.srdf),
    featureCount,
    diagnostics: [...diagnostics, ...out.diagnostics],
  };
}

export async function exportSdf(
  input: ExportInput,
  arm: Assembly,
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
): Promise<ExportResult> {
  const { sdfSerialize } = await import('../../modeling/export/sdformat/sdfSerializer');
  const sdfOpts = (input.options as { density?: number; meshPrefix?: string; meshFormat?: 'stl' | 'dae' } | undefined) ?? {};
  const out = await sdfSerialize(arm, sdfOpts);
  return {
    bytes: new TextEncoder().encode(out.sdf),
    featureCount,
    diagnostics: [...diagnostics, ...out.diagnostics],
    meshes: out.sdf === '' ? [] : await emitCompanionMeshes(out.meshPaths),
  };
}

/** bom-csv / bom-json — flat BOM rows, computed by the same `computeBom()`
 *  that backs `inspect({ of: 'bom' })`, so the two surfaces cannot drift. */
export async function exportBom(
  format: 'bom-csv' | 'bom-json',
  arm: Assembly,
  run: Awaited<ReturnType<typeof runScript>>,
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
): Promise<ExportResult> {
  const { computeBom, bomToCsv } = await import('./bom');
  const bom = await computeBom(arm, run.session);
  const encoder = new TextEncoder();
  const bytes = format === 'bom-json'
    ? encoder.encode(JSON.stringify({ rows: bom.rows, totals: bom.totals }, null, 2))
    : encoder.encode(bomToCsv(bom.rows));
  return {
    bytes,
    featureCount,
    diagnostics: [...diagnostics, ...bom.diagnostics],
  };
}

/** usd-isaac — geometry ships as native .usda mesh layers (an STL cannot be
 *  referenced as a USD layer), through the same companion-file channel. */
export async function exportUsdIsaac(
  input: ExportInput,
  arm: Assembly,
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
): Promise<ExportResult> {
  const { usdIsaacSerialize } = await import('../../modeling/export/usd/usdIsaacSerializer');
  const usdOpts = (input.options as import('../../modeling/export/usd/usdIsaacSerializer').UsdIsaacSerializeOptions | undefined) ?? {};
  const out = await usdIsaacSerialize(arm, usdOpts);
  const encoder = new TextEncoder();
  return {
    bytes: encoder.encode(out.usda),
    featureCount,
    diagnostics: [...diagnostics, ...out.diagnostics],
    meshes: out.meshLayers.map((m) => ({ relPath: m.relPath, bytes: encoder.encode(m.usda) })),
  };
}

/** Resolve the feature id to export: explicit `feature_id` (must exist),
 *  else the returned Shape id, the returned Scene's source feature, or the
 *  last captured record. Returns either an error `result` or a `targetId`. */
type ExportTargetResolution =
  | { result: ExportResult }
  | { targetId: string };

export function resolveExportTarget(
  feature_id: string | undefined,
  returnValue: unknown,
  records: ReadonlyArray<{ id: string }>,
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
): ExportTargetResolution {
  let targetId: string | undefined;
  if (feature_id !== undefined) {
    // Explicit feature_id: verify it exists in captured records
    const record = records.find(rec => rec.id === feature_id);
    if (!record) {
      return {
        result: {
          bytes: new Uint8Array(),
          featureCount,
          diagnostics: [...diagnostics, {
            target: 'export-occt',
            code: 'export.feature-not-found',
            featureId: feature_id,
            severity: 'error',
            message: `feature_id '${feature_id}' not found in script's features.`,
            hint: 'Use list_features to see available IDs, or omit feature_id to export the script\'s return value.',
            nextAction: NEXT_ACTIONS['export.feature-not-found'],
          }],
        },
      };
    }
    targetId = feature_id;
  } else {
    if (returnValue instanceof Shape) {
      targetId = returnValue.id;
    } else if (returnValue instanceof Scene) {
      // Scene return → use the upstream solvedAssembly / assemblyModel
      // feature id so STEP export routes through the Scene-aware
      // multi-body path (preserves part names + role colors).
      targetId = returnValue.__sourceFeatureId();
    } else if (records.length > 0) {
      targetId = records[records.length - 1].id;
    }
  }
  if (!targetId) {
    return {
      result: {
        bytes: new Uint8Array(),
        featureCount,
        diagnostics: [...diagnostics, {
          target: 'export-occt',
          code: 'export.no-shape',
          severity: 'error',
          message: 'Script produced no shapes to export.',
          hint: 'End the script with `return <shape>`.',
          nextAction: NEXT_ACTIONS['export.no-shape'],
        }],
      },
    };
  }
  return { targetId };
}

/** Scene-aware export dispatch: STEP/3MF/GLB keep per-part identity; STL and
 *  gcode auto-fuse. Returns `undefined` for formats that fall through to the
 *  single-shape path (urdf/srdf/sdf-gazebo). */
export async function exportSceneBackend(
  input: ExportInput,
  format: ExportInput['format'],
  scene: SceneBackend,
  targetId: string,
  manifestRequest: ExportInput['connectorManifest'],
  manifestScene: Scene | undefined,
  run: Awaited<ReturnType<typeof runScript>>,
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
): Promise<ExportResult | undefined> {
  if (format === 'step') {
    return exportSceneStep(scene, manifestRequest, manifestScene, run, diagnostics, featureCount);
  }
  if (format === 'dxf') {
    return exportSceneDxfRejected(targetId, diagnostics, featureCount);
  }
  if (format === '3mf') {
    return exportScene3mf(input, scene, targetId, diagnostics, featureCount);
  }
  if (format === 'glb') {
    return exportSceneGlb(input, scene, targetId, diagnostics, featureCount);
  }
  if (format === 'stl' || format === 'gcode') {
    return exportSceneFusedMesh(input, format, scene, targetId, run, diagnostics, featureCount);
  }
  return undefined;
}

export async function exportSceneStep(
  scene: SceneBackend,
  manifestRequest: ExportInput['connectorManifest'],
  manifestScene: Scene | undefined,
  run: Awaited<ReturnType<typeof runScript>>,
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
): Promise<ExportResult> {
  const connectorManifest = manifestRequest === undefined
    ? undefined
    : sceneToConnectorManifest(
        manifestScene!,
        scene,
        resolveParams(run.records, run.paramTable),
        manifestRequest,
      );
  const bytes = await exportSceneToSTEPAsync(scene);
  return {
    bytes,
    featureCount,
    diagnostics,
    ...(connectorManifest === undefined ? {} : { connectorManifest }),
  };
}

/** DXF needs a single planar wire source; a multi-body Scene cannot satisfy
 *  that contract without a caller-side choice of which face / part to export.
 *  Surface the non-planar diagnostic so the agent's next move is to either
 *  pick a planar face or return a Region. */
export function exportSceneDxfRejected(
  targetId: string,
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
): ExportResult {
  return {
    bytes: new Uint8Array(),
    featureCount,
    diagnostics: [...diagnostics, {
      target: 'export-occt',
      code: 'export.dxf.non-planar',
      featureId: targetId,
      severity: 'error',
      message: 'DXF export requires a planar input; received a multi-body Scene.',
      hint: 'Return a Region via Shape.flattenPattern() or a single planar face.',
      nextAction: NEXT_ACTIONS['export.dxf.non-planar'],
    }],
  };
}

/** 3MF natively ships multi-body scenes — one `<object>` per part with
 *  distinct names + base colors. Mesh each part via the shared world-frame
 *  walk, then chain through the OPC zip writer. */
export async function exportScene3mf(
  input: ExportInput,
  scene: SceneBackend,
  targetId: string,
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
): Promise<ExportResult> {
  const opts3mf = (input.options as Export3mfOptions | undefined) ?? { format: '3mf' };
  try {
    const worldParts = sceneToWorldFrameParts(scene);
    const bytes = await export3mfAsync(worldParts, opts3mf);
    return { bytes, featureCount, diagnostics };
  } catch (e) {
    const notWatertight = notWatertightDiagnostic(e, diagnostics, featureCount, targetId);
    if (notWatertight) return notWatertight;
    throw e;
  }
}

/** GLB ships multi-body scenes natively — one glTF node per part with
 *  per-part name + PBR material. Mesh each part via the shared world-frame
 *  walk, then chain through the GLTFExporter writer. */
export async function exportSceneGlb(
  input: ExportInput,
  scene: SceneBackend,
  targetId: string,
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
): Promise<ExportResult> {
  const optsGlb: ExportGlbOptions = { ...((input.options as ExportGlbOptions | undefined) ?? { format: 'glb' }), scriptDir: (input.options as ExportGlbOptions | undefined)?.scriptDir ?? input.scriptDir };
  try {
    const worldParts = sceneToWorldFrameParts(scene);
    const bytes = await exportGlbAsync(worldParts, optsGlb);
    return { bytes, featureCount, diagnostics };
  } catch (e) {
    const dracoDiag = dracoConflictDiagnostic(e, diagnostics, featureCount, targetId);
    if (dracoDiag) return dracoDiag;
    throw e;
  }
}

/** Single-mesh STL (and gcode, which meshes to STL as its slicer input): fuse
 *  world-frame parts (clone+transform already in `sceneToWorldFrameParts`).
 *  Mirrors `Scene.toUnion()` / `assemblyExport('union')` without requiring
 *  the script author to call it for Studio downloads. */
export async function exportSceneFusedMesh(
  input: ExportInput,
  format: 'stl' | 'gcode',
  scene: SceneBackend,
  targetId: string,
  run: Awaited<ReturnType<typeof runScript>>,
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
): Promise<ExportResult> {
  const worldParts = sceneToWorldFrameParts(scene);
  let fused: OcctBackend = worldParts[0]!.shape;
  for (let i = 1; i < worldParts.length; i++) {
    fused = fused.union(worldParts[i]!.shape);
  }
  if (format === 'gcode') {
    return sliceShapeToGcode(
      fused, input.options as GcodeOptions | undefined, diagnostics, featureCount, targetId,
      findDfmSpec(run.records)?.fdm?.buildDirection,
    );
  }
  const verify = (input.options as { verify?: boolean } | undefined)?.verify !== false;
  const { bytes, report } = await fused.exportSTLWithReportAsync();
  if (verify && !report.ok) {
    return {
      bytes,
      featureCount,
      diagnostics: [...diagnostics, stlNotWatertightDiagnostic(report, targetId)],
    };
  }
  return { bytes, featureCount, diagnostics };
}

/** Single-shape DXF path: sheet-metal lineage flattens to a Region; a plain
 *  planar Shape exports its outer/hole wires; anything else emits the
 *  non-planar diagnostic. */
export function exportShapeDxf(
  shape: OcctBackend,
  targetId: string,
  exportOptions: ExportInput['options'],
  run: Awaited<ReturnType<typeof runScript>>,
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
): ExportResult {
  const opts =
    (exportOptions as DxfWriterOptions | undefined) ?? { format: 'dxf' };
  // Sheet-metal Shape entry path: if the target Shape's lineage chain
  // roots at a `sheetMetal` record, recover the flat-pattern Region by
  // walking `flattenPattern(records, targetId)` and ship it through the
  // polyline writer. This is the same Region that
  // `Shape.flattenPattern()` would produce — recomputed inside the
  // runtime so the user script can return the bent body directly
  // without needing `require` inside the vm sandbox.
  const tracesToSheetMetal = (() => {
    const byId = new Map(run.records.map(rec => [rec.id, rec]));
    let cur = byId.get(targetId);
    // Bound the walk by the record count — a healthy graph terminates
    // quickly; an inputs.base cycle would otherwise spin forever.
    for (let i = 0; cur && i <= run.records.length; i++) {
      if (cur.kind === 'sheetMetal') return true;
      const baseRef = cur.inputs.base;
      if (!baseRef || baseRef.kind !== 'feature') return false;
      cur = byId.get(baseRef.id);
    }
    return false;
  })();
  if (tracesToSheetMetal) {
    try {
      const region = flattenPattern(run.records, targetId);
      const bytes = exportDxf({ kind: 'region', region }, opts);
      return { bytes, featureCount, diagnostics };
    } catch (e) {
      const errCode = (e as { code?: string }).code;
      const msg = e instanceof Error ? e.message : String(e);
      const hint = (e as { hint?: string }).hint;
      // Pass through structured diagnostics like
      // `feature.flattenPattern.multi-bend-unsupported`; downgrade
      // anything else to `export.dxf.non-planar` so callers see a
      // catalog-known code.
      if (errCode === 'feature.flattenPattern.multi-bend-unsupported') {
        return {
          bytes: new Uint8Array(),
          featureCount,
          diagnostics: [...diagnostics, {
            target: 'export-occt',
            code: 'feature.flattenPattern.multi-bend-unsupported',
            featureId: targetId,
            severity: 'error',
            message: msg,
            hint: hint ?? 'Flatten an upstream Shape with at most two bends, or wait for the multi-bend slice.',
            nextAction: NEXT_ACTIONS['feature.flattenPattern.multi-bend-unsupported'],
          }],
        };
      }
      return {
        bytes: new Uint8Array(),
        featureCount,
        diagnostics: [...diagnostics, {
          target: 'export-occt',
          code: 'export.dxf.non-planar',
          featureId: targetId,
          severity: 'error',
          message: `DXF export could not flatten the sheet-metal chain: ${msg}`,
          hint: hint ?? 'Inspect the sheetMetal root and bends, then retry. Return a Region directly to bypass.',
          nextAction: NEXT_ACTIONS['export.dxf.non-planar'],
        }],
      };
    }
  }
  // Planar `Shape` entry path: extract the outer (and any hole) wires
  // from a single planar face and ship them through the polyline writer.
  // A `null` return from `tryExtractPlanarWires` means the shape carries
  // no planar face we can flatten — emit the non-planar diagnostic so
  // the agent can pick a face explicitly or switch to `flattenPattern()`.
  const planarWires = shape.tryExtractPlanarWires();
  if (!planarWires) {
    return {
      bytes: new Uint8Array(),
      featureCount,
      diagnostics: [...diagnostics, {
        target: 'export-occt',
        code: 'export.dxf.non-planar',
        featureId: targetId,
        severity: 'error',
        message: 'DXF export requires a planar input (Region, planar face, or planar wire).',
        hint: 'Call list_faces to pick a planar face, or return a Region via Shape.flattenPattern().',
        nextAction: NEXT_ACTIONS['export.dxf.non-planar'],
      }],
    };
  }
  const bytes = exportDxf(
    {
      kind: 'planarWires',
      outer: planarWires.outer,
      holes: planarWires.holes,
    },
    opts,
  );
  return { bytes, featureCount, diagnostics };
}

/** Mesh the per-link shapes referenced by a robot-description export into
 *  binary STLs. Shared by the URDF and SDF dispatch branches. */
export async function emitCompanionMeshes(
  meshPaths: ReadonlyArray<{ relPath: string; shape: OcctBackend }>,
): Promise<CompanionMeshFile[]> {
  const meshes: CompanionMeshFile[] = [];
  for (const m of meshPaths) {
    meshes.push({ relPath: m.relPath, bytes: await m.shape.exportSTLAsync() });
  }
  return meshes;
}

/** Single-shape (non-Scene) dispatch: the `switch (format)` tail of
 *  `runAndExport`. URDF / SRDF / SDF-Gazebo are dispatched in the early
 *  Assembly-aware branch, before targetId resolution, so they are unreachable
 *  here. */
export async function exportSingleShape(
  input: ExportInput,
  format: ExportInput['format'],
  shape: OcctBackend,
  targetId: string,
  scriptDir: string | undefined,
  run: Awaited<ReturnType<typeof runScript>>,
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
): Promise<ExportResult> {
  switch (format) {
    case 'stl':
      return exportSingleStl(input, shape, targetId, diagnostics, featureCount);
    case 'gcode':
      return exportSingleGcode(input, shape, targetId, run, diagnostics, featureCount);
    case 'step':
      return exportSingleStep(shape, diagnostics, featureCount);
    case 'dxf':
      return exportShapeDxf(shape, targetId, input.options, run, diagnostics, featureCount);
    case '3mf':
      return exportSingle3mf(input, shape, targetId, diagnostics, featureCount);
    case 'glb':
      return exportSingleGlb(input, shape, targetId, scriptDir, run, diagnostics, featureCount);
  }
  // URDF / SRDF / SDF-Gazebo are dispatched in the early Assembly-aware
  // branch above, before targetId resolution. Unreachable here.
  return { bytes: new Uint8Array(), featureCount, diagnostics };
}

async function exportSingleStl(
  input: ExportInput,
  shape: OcctBackend,
  targetId: string,
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
): Promise<ExportResult> {
  const verify = (input.options as { verify?: boolean } | undefined)?.verify !== false;
  const { bytes, report } = await shape.exportSTLWithReportAsync();
  if (verify && !report.ok) {
    // Write-then-fail contract: keep the real mesh bytes next to the
    // error diagnostic so consumers can write the broken mesh to disk
    // for inspection before failing (same as per-part export).
    return {
      bytes,
      featureCount,
      diagnostics: [...diagnostics, stlNotWatertightDiagnostic(report, targetId)],
    };
  }
  return { bytes, featureCount, diagnostics };
}

async function exportSingleGcode(
  input: ExportInput,
  shape: OcctBackend,
  targetId: string,
  run: Awaited<ReturnType<typeof runScript>>,
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
): Promise<ExportResult> {
  return sliceShapeToGcode(
    shape, input.options as GcodeOptions | undefined, diagnostics, featureCount, targetId,
    findDfmSpec(run.records)?.fdm?.buildDirection,
  );
}

async function exportSingleStep(
  shape: OcctBackend,
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
): Promise<ExportResult> {
  const bytes = await shape.exportSTEPAsync();
  return { bytes, featureCount, diagnostics };
}

async function exportSingle3mf(
  input: ExportInput,
  shape: OcctBackend,
  targetId: string,
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
): Promise<ExportResult> {
  // Single-shape 3MF: wrap in a one-part `WorldFramePart[]` so the
  // writer can mesh + emit identically to the Scene path.
  const opts3mf = (input.options as Export3mfOptions | undefined) ?? { format: '3mf' };
  const part: WorldFramePart = { name: 'part', shape };
  try {
    const bytes = await export3mfAsync([part], opts3mf);
    return { bytes, featureCount, diagnostics };
  } catch (e) {
    const notWatertight = notWatertightDiagnostic(e, diagnostics, featureCount, targetId);
    if (notWatertight) return notWatertight;
    throw e;
  }
}

async function exportSingleGlb(
  input: ExportInput,
  shape: OcctBackend,
  targetId: string,
  scriptDir: string | undefined,
  run: Awaited<ReturnType<typeof runScript>>,
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
): Promise<ExportResult> {
  // Single-shape GLB: wrap in a one-part `WorldFramePart[]` so the
  // writer can mesh + emit identically to the Scene path.
  //
  // Colour/material attribution is resolved by walking the target
  // record's *lineage*, not just the target record itself. `.color()`
  // mutates the metadata of the record that was current when it was
  // called, so `box(...).color('#f00').fillet(1)` attributes the colour
  // to the box while the export target is the fillet — reading only the
  // tail silently dropped the colour.
  //
  // Precedence (identical to `lookupSourceColor`, used by the assembly
  // fan-out — one convention, not two): the tail's own attribution wins,
  // otherwise follow the primary upstream pointer (shape > base >
  // target). A boolean therefore inherits from its base but NEVER from
  // its cutters; recolour the boolean result to override.
  const optsGlb: ExportGlbOptions = { ...((input.options as ExportGlbOptions | undefined) ?? { format: 'glb' }), scriptDir: (input.options as ExportGlbOptions | undefined)?.scriptDir ?? scriptDir };
  const tailRecord = run.records.find((rec) => rec.id === targetId);
  const partColor = tailRecord
    ? lookupColorFromLineage(tailRecord, run.records)
    : undefined;
  const partMaterial = tailRecord
    ? lookupMaterialFromLineage(tailRecord, run.records)
    : undefined;
  const part: WorldFramePart = {
    name: 'part',
    shape,
    ...(partColor !== undefined ? { color: partColor } : {}),
    ...(partMaterial !== undefined ? { material: partMaterial } : {}),
  };
  try {
    const bytes = await exportGlbAsync([part], optsGlb);
    return { bytes, featureCount, diagnostics };
  } catch (e) {
    const dracoDiag = dracoConflictDiagnostic(e, diagnostics, featureCount, targetId);
    if (dracoDiag) return dracoDiag;
    throw e;
  }
}
