// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { runScript } from '../../composition/runScript';
import { exportSceneToSTEPAsync, type OcctBackend } from '../../kernel/backends/occt/occtBackend';
import { exportDxf, type DxfWriterOptions } from '../../kernel/backends/occt/exportDxf';
import { exportSceneDxf } from './exportDxfProfiles';
import { export3mfWithReportAsync, type Export3mfOptions } from '../../kernel/backends/occt/export3mf';
import { exportGlbAsync, type ExportGlbOptions } from '../../kernel/backends/occt/exportGlb';
import { exportSceneAssetPack, exportSingleAssetPack } from './exportAssetPack';
import { exportScenePly, exportSinglePly, plyOptionsDiagnostic } from './exportPly';
import { buildRigMetadata } from '../../kernel/export/rigHierarchy';
import type { Assembly } from '../../modeling/capture/assembly';
import { lookupColorFromLineage, lookupMaterialFromLineage } from '../../kernel/backends/occt/lookupSourceColor';
import { releaseWorldFrameParts, sceneToWorldFrameParts, type WorldFramePart } from '../../kernel/backends/occt/sceneToWorldFrame';
import { stampStepOriginatingSystem } from '../../kernel/export/stepHeader';
import { attributionGenerator } from '../../shared/links/attribution';
import type { SceneBackend } from '../../kernel/backends/sceneBackend';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { NEXT_ACTIONS } from '../../shared/diagnostics/registry';
import { verifyWatertight } from '../../kernel/backends/occt/meshHeal';
import { validateExportMeshToleranceOptions } from '../../kernel/backends/occt/backendMesh';
import { Shape } from '../../modeling/capture/proxy';
import { Scene } from '../../modeling/validation/scene';
import { isRegion } from '../../shared/intent/region';
import { resolveParams } from '../../shared/runtime/resolveParams';
import { sceneToConnectorManifest } from './connectorManifestExport';
import { findDfmSpec } from '../../modeling/runtime/dfm/runDfmChecks';
import { exportFusedSeamFallback, exportSceneStlAsShells, freeformFuseOverBudget } from './sceneStlFuse';
import { exportSceneTextMesh, exportSingleTextMesh } from './exportMeshText';
import { exportStlWithOptions, measureWorldFramePartsDeviation, meshToleranceFailure } from './exportMeshTolerance';
import { exportSingleStl } from './exportSingleStl';
import { exportShapeDxf } from './exportSheetMetalDxf';
import {
  dracoConflictDiagnostic,
  glbLowPolyDiagnostic,
  notWatertightDiagnostic,
  sliceShapeToGcode,
  threeMfBedDiagnostics,
  threeMfMeshDiagnostics,
  meshToleranceInvalidDiagnostic,
  brepInvalidDiagnostic,
  type GcodeOptions,
} from './exportDiagnostics';
import { getOC } from 'replicad';
import { isValidShape } from '../../kernel/backends/occt/booleanRecovery';

// STEP validity only needs a topology-preserving tessellation for the
// downstream closed-manifold verdict. Use CADGenBench's minimum linear
// deflection and angular tolerance so small edges on helical / threaded faces
// do not trigger export-grade over-tessellation. The fixed minimum is
// conservative for parts larger than 5 mm, where CADGenBench raises its
// deflection with part scale.
const STEP_VALIDITY_MESH_ANGULAR_DEFLECTION_RAD = 0.5;
const STEP_VALIDITY_MESH_LINEAR_DEFLECTION_MM = 0.005;

import type {
  ExportInput,
  ExportResult,
  CompanionMeshFile,
  ExportOptions,
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

/** Refuse an options bag before the script runs: a mismatched
 *  `options.format`, then format-specific checks (PLY). */
export function exportOptionsRefusal(input: ExportInput): ExportResult | undefined {
  const mismatch = optionsFormatMismatchDiagnostic(input);
  if (mismatch !== undefined) return mismatch;
  if (input.format === 'stl' || input.format === '3mf' || input.format === 'obj') {
    const toleranceError = validateExportMeshToleranceOptions(input.options);
    if (toleranceError !== undefined) {
      return {
        bytes: new Uint8Array(),
        featureCount: 0,
        diagnostics: [meshToleranceInvalidDiagnostic(toleranceError)],
      };
    }
  }
  return plyOptionsDiagnostic(input);
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

/** Scene-aware export dispatch: STEP/3MF/GLB/OBJ/PLY/USD keep per-part identity; STL and
 *  gcode auto-fuse. Returns `undefined` for formats that fall through to the
 *  single-shape path (urdf/srdf/sdf-gazebo). */
/** Per-part STEP verify: B-rep validity (BRepCheck) first — invalid topology
 *  (e.g. an unorientable face left by a boolean on an imported body) passes the
 *  mesh gate but downstream validity gates reject the STEP — then the
 *  watertight mesh check. Returns the first failing diagnostic, or undefined
 *  when every part passes both gates. */
function firstStepVerifyFailure(
  parts: ReturnType<typeof sceneToWorldFrameParts>,
  targetId: string,
): CompilerDiagnostic | undefined {
  for (const p of parts) {
    const partName = parts.length > 1 ? p.name : undefined;
    const failure = stepShapeVerifyFailure(p.shape, targetId, partName);
    if (failure) return failure;
  }
  return undefined;
}

/** Apply the STEP B-rep and downstream mesh gates to one exported shape. */
function stepShapeVerifyFailure(
  shape: OcctBackend,
  targetId: string,
  partName?: string,
): CompilerDiagnostic | undefined {
  const replicadShape = shape.getReplicadShape();
  if (!isValidShape(getOC(), replicadShape.wrapped)) {
    return brepInvalidDiagnostic(targetId, partName);
  }
  const report = verifyWatertight(meshShapeForExport(replicadShape, {
    linear: STEP_VALIDITY_MESH_LINEAR_DEFLECTION_MM,
    relative: false,
    angularRad: STEP_VALIDITY_MESH_ANGULAR_DEFLECTION_RAD,
  }));
  if (!report.ok) return stlNotWatertightDiagnostic(report, targetId, partName, 'STEP mesh');
  return undefined;
}

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
    const result = await exportSceneStep(scene, manifestRequest, manifestScene, run, diagnostics, featureCount);
    // STEP exports run the same mesh verify as STL (default-on; options.verify
    // false skips). Downstream consumers tessellate the STEP and reject
    // non-manifold meshes (e.g. exact coincident/tangent faces), so surface the
    // defect at export time — the file is still written for inspection.
    const verify = (input.options as { verify?: boolean } | undefined)?.verify !== false;
    if (verify) {
      const parts = sceneToWorldFrameParts(scene);
      try {
        const failure = firstStepVerifyFailure(parts, targetId);
        if (failure) result.diagnostics.push(failure);
      } finally {
        releaseWorldFrameParts(parts);
      }
    }
    return result;
  }
  if (format === 'dxf') {
    return exportSceneDxf(scene, targetId, input.options, diagnostics, featureCount);
  }
  if (format === '3mf') {
    return exportScene3mf(input, scene, targetId, diagnostics, featureCount);
  }
  if (format === 'glb') {
    return exportSceneGlb(input, scene, targetId, diagnostics, featureCount);
  }
  if (format === 'asset-pack') {
    return exportSceneAssetPack(input, scene, run, diagnostics, featureCount);
  }
  if (format === 'ply') {
    return exportScenePly(input, scene, diagnostics, featureCount);
  }
  if (format === 'obj' || format === 'usd') {
    const worldParts = sceneToWorldFrameParts(scene);
    try {
      return exportSceneTextMesh(
        format,
        worldParts,
        targetId,
        diagnostics,
        featureCount,
        format === 'obj' ? input.options as Extract<ExportOptions, { format: 'obj' }> | undefined : undefined,
      );
    } finally {
      releaseWorldFrameParts(worldParts);
    }
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
  const bytes = stampStepOriginatingSystem(await exportSceneToSTEPAsync(scene), attributionGenerator());
  return {
    bytes,
    featureCount,
    diagnostics,
    ...(connectorManifest === undefined ? {} : { connectorManifest }),
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
    try {
      const { bytes, bedWarnings, meshWarnings, mesh_deviation } = await export3mfWithReportAsync(
        worldParts,
        { assemblyName: scene.assemblyName, ...opts3mf },
        measureWorldFramePartsDeviation,
      );
      const toleranceFailure = meshToleranceFailure(mesh_deviation, targetId);
      return {
        bytes,
        featureCount,
        diagnostics: [
          ...diagnostics,
          ...(toleranceFailure ? [toleranceFailure] : []),
          ...threeMfMeshDiagnostics(meshWarnings, targetId),
          ...threeMfBedDiagnostics(bedWarnings, targetId),
        ],
        ...(mesh_deviation === undefined ? {} : { mesh_deviation }),
      };
    } finally {
      releaseWorldFrameParts(worldParts);
    }
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
    try {
      const bytes = await exportGlbAsync(worldParts, optsGlb, scene.rig);
      const warnings = optsGlb.hierarchy !== 'flat' && scene.rig !== undefined
        ? buildRigMetadata(scene.rig).warnings
        : [];
      return {
        bytes,
        featureCount,
        diagnostics: [
          ...diagnostics,
          ...warnings.map((message): CompilerDiagnostic => ({
            target: 'export-occt',
            code: 'export.glb.rig-warning',
            featureId: targetId,
            severity: 'warn',
            message,
            hint: 'Inspect asset.extras.kernelcad.rigWarnings. Loop-closing mates remain separate from the strict glTF node tree; ball and planar mates are held fixed.',
            nextAction: NEXT_ACTIONS['export.glb.rig-warning'],
          })),
        ],
      };
    } finally {
      releaseWorldFrameParts(worldParts);
    }
  } catch (e) {
    const dracoDiag = dracoConflictDiagnostic(e, diagnostics, featureCount, targetId)
      ?? glbLowPolyDiagnostic(e, diagnostics, featureCount, targetId);
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
  const temps: OcctBackend[] = [];
  try {
    const stlOptions = format === 'stl'
      ? input.options as Extract<ExportOptions, { format: 'stl' }> | undefined
      : undefined;
    const shellExport = exportOverBudgetSceneAsShells(
      format, worldParts, targetId, diagnostics, featureCount, stlOptions,
    );
    if (shellExport !== undefined) return shellExport;
    const fused = fuseWorldFrameParts(worldParts, temps);
    if (format === 'gcode') {
      return exportFusedSceneGcode(input, fused, targetId, run, diagnostics, featureCount);
    }
    return await exportFusedSceneStl(
      worldParts, fused, targetId, diagnostics, featureCount, stlOptions,
    );
  } finally {
    disposeIntermediateShapes(temps);
    releaseWorldFrameParts(worldParts);
  }
}

function exportOverBudgetSceneAsShells(
  format: 'stl' | 'gcode',
  worldParts: WorldFramePart[],
  targetId: string,
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
  options?: Extract<ExportOptions, { format: 'stl' }>,
): ExportResult | undefined {
  if (format !== 'stl') return undefined;
  const cost = freeformFuseOverBudget(worldParts);
  return cost === undefined
    ? undefined
    : exportSceneStlAsShells(worldParts, cost, targetId, diagnostics, featureCount, options?.verify !== false, options);
}

function fuseWorldFrameParts(parts: readonly WorldFramePart[], temps: OcctBackend[]): OcctBackend {
  const first = parts[0]!.shape;
  let fused = first;
  for (let i = 1; i < parts.length; i++) {
    const next = fused.union(parts[i]!.shape);
    if (fused !== first) temps.push(fused);
    fused = next;
  }
  if (fused !== first) temps.push(fused);
  return fused;
}

function exportFusedSceneGcode(
  input: ExportInput,
  fused: OcctBackend,
  targetId: string,
  run: Awaited<ReturnType<typeof runScript>>,
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
): Promise<ExportResult> {
  return sliceShapeToGcode(
    fused, input.options as GcodeOptions | undefined, diagnostics, featureCount, targetId,
    findDfmSpec(run.records)?.fdm?.buildDirection,
  );
}

async function exportFusedSceneStl(
  worldParts: WorldFramePart[],
  fused: OcctBackend,
  targetId: string,
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
  options?: Extract<ExportOptions, { format: 'stl' }>,
): Promise<ExportResult> {
  const exported = await exportStlWithOptions(fused, options);
  if (options?.verify !== false && !exported.report.ok) {
    return exportFusedSeamFallback(
      worldParts,
      exported.bytes,
      exported.report,
      targetId,
      diagnostics,
      featureCount,
      options,
      exported.mesh_deviation,
    );
  }
  const toleranceFailure = meshToleranceFailure(exported.mesh_deviation, targetId);
  return {
    bytes: exported.bytes,
    featureCount,
    diagnostics: [...diagnostics, ...(toleranceFailure === undefined ? [] : [toleranceFailure])],
    ...(exported.mesh_deviation === undefined ? {} : { mesh_deviation: exported.mesh_deviation }),
  };
}

function disposeIntermediateShapes(temps: readonly OcctBackend[]): void {
  for (const temp of temps) {
    try { temp.dispose(); } catch { /* intermediate already freed */ }
  }
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
  // An empty result (a boolean that lost every face) would otherwise write a
  // header-only STEP/STL and report success.
  if (shape.isEmpty()) {
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
  switch (format) {
    case 'stl':
      return exportSingleStl(input, shape, targetId, diagnostics, featureCount);
    case 'gcode':
      return exportSingleGcode(input, shape, targetId, run, diagnostics, featureCount);
    case 'step':
      return exportSingleStep(input, shape, targetId, diagnostics, featureCount);
    case 'dxf':
      return exportShapeDxf(shape, targetId, input.options, run, diagnostics, featureCount);
    case '3mf':
      return exportSingle3mf(input, shape, targetId, diagnostics, featureCount);
    case 'glb':
      return exportSingleGlb(input, shape, targetId, scriptDir, run, diagnostics, featureCount);
    case 'asset-pack':
      return exportSingleAssetPack(input, shape, targetId, scriptDir, run, diagnostics, featureCount);
    case 'obj':
      return exportSingleTextMesh(
        shape,
        'obj',
        targetId,
        run.records,
        diagnostics,
        featureCount,
        input.options as Extract<ExportOptions, { format: 'obj' }> | undefined,
      );
    case 'usd':
      return exportSingleTextMesh(shape, 'usd', targetId, run.records, diagnostics, featureCount);
    case 'ply':
      return exportSinglePly(input, shape, targetId, run.records, diagnostics, featureCount);
  }
  // URDF / SRDF / SDF-Gazebo are dispatched in the early Assembly-aware
  // branch above, before targetId resolution. Unreachable here.
  return { bytes: new Uint8Array(), featureCount, diagnostics };
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
  input: ExportInput,
  shape: OcctBackend,
  targetId: string,
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
): Promise<ExportResult> {
  const bytes = stampStepOriginatingSystem(await shape.exportSTEPAsync(), attributionGenerator());
  const verify = (input.options as { verify?: boolean } | undefined)?.verify !== false;
  const failure = verify ? stepShapeVerifyFailure(shape, targetId) : undefined;
  return { bytes, featureCount, diagnostics: failure ? [...diagnostics, failure] : diagnostics };
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
    const { bytes, bedWarnings, meshWarnings, mesh_deviation } = await export3mfWithReportAsync(
      [part],
      opts3mf,
      measureWorldFramePartsDeviation,
    );
    const toleranceFailure = meshToleranceFailure(mesh_deviation, targetId);
    return {
      bytes,
      featureCount,
      diagnostics: [
        ...diagnostics,
        ...(toleranceFailure === undefined ? [] : [toleranceFailure]),
        ...threeMfMeshDiagnostics(meshWarnings, targetId),
        ...threeMfBedDiagnostics(bedWarnings, targetId),
      ],
      ...(mesh_deviation === undefined ? {} : { mesh_deviation }),
    };
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
    const dracoDiag = dracoConflictDiagnostic(e, diagnostics, featureCount, targetId)
      ?? glbLowPolyDiagnostic(e, diagnostics, featureCount, targetId);
    if (dracoDiag) return dracoDiag;
    throw e;
  }
}
