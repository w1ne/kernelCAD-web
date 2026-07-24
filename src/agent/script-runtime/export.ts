// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { runScript } from '../../modeling/runtime/runScript';
import { RecomputeEngine } from '../../modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../modeling/backends/occt/occtLowerer';
import { exportSceneToSTEPAsync, meshShapeForExport, type OcctBackend } from '../../kernel/backends/occt/occtBackend';
import { lookupColorFromLineage, lookupMaterialFromLineage } from '../../kernel/backends/occt/lookupSourceColor';
import { encodeBinaryStl } from '../../kernel/backends/occt/exportStlBinary';
import { verifyWatertight, type WatertightReport } from '../../kernel/backends/occt/meshHeal';
import { exportDxf, type DxfWriterOptions } from '../../kernel/backends/occt/exportDxf';
import { export3mfAsync, type Export3mfOptions } from '../../kernel/backends/occt/export3mf';
import { exportGlbAsync, type ExportGlbOptions } from '../../kernel/backends/occt/exportGlb';
import { exportSvgDrawing, type SvgDrawingOptions } from '../../kernel/backends/occt/exportSvgDrawing';
import type { DrawingAnnotation } from '../../kernel/backends/occt/drawingAnnotations';
export type { DrawingAnnotation, DrawingAnchor } from '../../kernel/backends/occt/drawingAnnotations';
import { sceneToWorldFrameParts, type WorldFramePart } from '../../kernel/backends/occt/sceneToWorldFrame';
import { flattenPattern } from '../../kernel/backends/occt/flattenPattern';
import { isSceneBackend } from '../../kernel/backends/sceneBackend';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { NEXT_ACTIONS, HINT_TEMPLATES } from '../../shared/diagnostics/registry';
import { Shape } from '../../modeling/capture/proxy';
import { Scene } from '../../modeling/validation/scene';
import { isRegion } from '../../shared/intent/region';
import { resolveParams } from '../../shared/runtime/resolveParams';
import type { ConnectorManifest } from '../../shared/parts/connectorManifestSchema';
import { sceneToConnectorManifest } from './connectorManifestExport';

export type ExportFormat =
  | 'stl' | 'step' | 'dxf' | '3mf' | 'glb' | 'svg-drawing'
  | 'urdf' | 'srdf' | 'sdf-gazebo';

/** Per-format option payloads. The union member is selected by `format`. */
export type ExportOptions =
  | { format: 'stl'; verify?: boolean }
  | { format: 'step'; unit?: 'mm' | 'cm' | 'in' }
  | { format: 'dxf'; layers?: DxfLayerSpec[]; unit?: 'mm' | 'cm' | 'in'; tolerance?: number }
  | { format: '3mf'; printUnit?: 'mm' | 'cm' | 'in'; embedSource?: boolean }
  | { format: 'glb'; axis?: 'y-up' | 'z-up'; draco?: false }
  | {
      format: 'svg-drawing';
      sheet?: 'a4' | 'a3';
      modelName?: string;
      date?: string;
      /** Authored dimensions / notes; replaces the automatic bbox dimensions. */
      annotations?: readonly DrawingAnnotation[];
    }
  | { format: 'urdf' }
  | { format: 'srdf' }
  | { format: 'sdf-gazebo' };

export interface DxfLayerSpec {
  name: string;
  color?: string;
  lineWeight?: number;
  lineType?: 'continuous' | 'dashed' | 'phantom';
  filter?: 'all' | { partName: string };
}

export interface ExportInput {
  code: string;
  fileName: string;
  format: ExportFormat;
  /** Optional: which feature to export. Defaults to the returned value or last captured feature. */
  feature_id?: string;
  /** Optional: absolute directory of the source script. Threaded into the
   *  API context so `lib.fromSTEP('parts/foo.step')` resolves. */
  scriptDir?: string;
  /** Per-format options. Discriminator `options.format` must equal top-level `format`. */
  options?: ExportOptions;
  /** Request a numeric authored connector sidecar for a static assembly STEP export. */
  connectorManifest?: { partId: string; family: string };
}

/** Companion mesh file for robot-description exports (URDF / SDF). The
 *  emitted XML references these by relative path, so the writer must put
 *  them on disk next to the output file or the consumer cannot resolve the
 *  visual/collision geometry. */
export interface CompanionMeshFile {
  /** Path relative to the directory of the primary output file. */
  relPath: string;
  bytes: Uint8Array;
}

export interface ExportResult {
  bytes: Uint8Array;
  featureCount: number;
  diagnostics: CompilerDiagnostic[];
  /** Per-link mesh files referenced by the primary output (URDF / SDF). */
  meshes?: CompanionMeshFile[];
  /** Numeric authored connector sidecar, present only when requested for a STEP Scene export. */
  connectorManifest?: ConnectorManifest;
}

export async function runAndExport(input: ExportInput): Promise<ExportResult> {
  const { code, fileName, format, feature_id, scriptDir, connectorManifest: manifestRequest } = input;

  if (input.options && input.options.format !== input.format) {
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

  if (manifestRequest !== undefined && format !== 'step') {
    throw new Error('connector-manifest export requires STEP format.');
  }

  const run = await runScript({ code, fileName, scriptDir });
  const engine = new RecomputeEngine(createOcctLowerer(run.session));
  const r = await engine.run(run.records, { paramTable: run.paramTable });

  const featureCount = run.records.length;

  const fatal = r.diagnostics.filter(d => d.severity === 'error');
  if (fatal.length > 0) {
    return { bytes: new Uint8Array(), featureCount, diagnostics: r.diagnostics };
  }

  const manifestScene = manifestRequest === undefined ? undefined : (() => {
    if (!(run.returnValue instanceof Scene)) {
      throw new Error('connector-manifest export requires the script to return an assembly Scene.');
    }
    const sourceId = run.returnValue.__sourceFeatureId();
    if (sourceId === undefined) {
      throw new Error('connector-manifest export requires a Scene with a source feature.');
    }
    if (feature_id !== undefined && feature_id !== sourceId) {
      throw new Error(
        `connector-manifest export feature_id '${feature_id}' must match Scene source feature '${sourceId}'.`,
      );
    }
    return run.returnValue;
  })();

  // DXF entry path: a script that returns a `Region` (typically from
  // `Shape.flattenPattern()`) bypasses target-shape lowering — the Region's
  // outer / holes / bendLines feed straight into the polyline writer. Any
  // other format on a Region return is unsupported and falls through to
  // the normal `targetId` resolution path, which then trips
  // `export.no-shape` because the Region is not a Shape.
  if (format === 'dxf' && isRegion(run.returnValue)) {
    const opts =
      (input.options as DxfWriterOptions | undefined) ?? { format: 'dxf' };
    const bytes = exportDxf({ kind: 'region', region: run.returnValue }, opts);
    return { bytes, featureCount, diagnostics: r.diagnostics };
  }

  // URDF / SRDF / SDF entry path: these are pure-XML formats that derive
  // their entire payload from the captured Assembly (parts + joints + mates
  // + planning metadata). No targetId / lowered-Shape lookup is required;
  // the emitter lowers each part on its own. Resolve the Assembly from
  // the session and dispatch to the per-format serializer.
  if (format === 'urdf' || format === 'srdf' || format === 'sdf-gazebo') {
    const ret = run.returnValue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const assemblies = run.session.assemblies as Map<string, any>;
    let arm: import('../../modeling/capture/assembly').Assembly | undefined;
    if (ret instanceof Scene) {
      arm = assemblies.get(ret.assemblyName);
    }
    if (!arm) {
      const first = assemblies.values().next();
      if (!first.done) arm = first.value as import('../../modeling/capture/assembly').Assembly;
    }
    if (!arm) {
      return {
        bytes: new Uint8Array(),
        featureCount,
        diagnostics: [...r.diagnostics, {
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
      const { urdfSerialize } = await import('../../modeling/export/urdf/urdfSerializer');
      const urdfOpts = (input.options as { density?: number; meshPrefix?: string; meshFormat?: 'stl' | 'dae' } | undefined) ?? {};
      const out = await urdfSerialize(arm, urdfOpts);
      return {
        bytes: new TextEncoder().encode(out.urdf),
        featureCount,
        diagnostics: [...r.diagnostics, ...out.diagnostics],
        meshes: out.urdf === '' ? [] : await emitCompanionMeshes(out.meshPaths),
      };
    }
    if (format === 'srdf') {
      const { srdfSerialize } = await import('../../modeling/export/srdf/srdfSerializer');
      const srdfOpts = (input.options as { urdfPath?: string; samplesPerMate?: number; combinatorial?: boolean } | undefined) ?? {};
      const out = await srdfSerialize(arm, srdfOpts);
      return {
        bytes: new TextEncoder().encode(out.srdf),
        featureCount,
        diagnostics: [...r.diagnostics, ...out.diagnostics],
      };
    }
    // sdf-gazebo
    {
      const { sdfSerialize } = await import('../../modeling/export/sdformat/sdfSerializer');
      const sdfOpts = (input.options as { density?: number; meshPrefix?: string; meshFormat?: 'stl' | 'dae' } | undefined) ?? {};
      const out = await sdfSerialize(arm, sdfOpts);
      return {
        bytes: new TextEncoder().encode(out.sdf),
        featureCount,
        diagnostics: [...r.diagnostics, ...out.diagnostics],
        meshes: out.sdf === '' ? [] : await emitCompanionMeshes(out.meshPaths),
      };
    }
  }

  let targetId: string | undefined;
  if (feature_id !== undefined) {
    // Explicit feature_id: verify it exists in captured records
    const record = run.records.find(rec => rec.id === feature_id);
    if (!record) {
      return {
        bytes: new Uint8Array(),
        featureCount,
        diagnostics: [...r.diagnostics, {
          target: 'export-occt',
          code: 'export.feature-not-found',
          featureId: feature_id,
          severity: 'error',
          message: `feature_id '${feature_id}' not found in script's features.`,
          hint: 'Use list_features to see available IDs, or omit feature_id to export the script\'s return value.',
          nextAction: NEXT_ACTIONS['export.feature-not-found'],
        }],
      };
    }
    targetId = feature_id;
  } else {
    const ret = run.returnValue;
    if (ret instanceof Shape) {
      targetId = ret.id;
    } else if (ret instanceof Scene) {
      // Scene return → use the upstream solvedAssembly / assemblyModel
      // feature id so STEP export routes through the Scene-aware
      // multi-body path (preserves part names + role colors).
      targetId = ret.__sourceFeatureId();
    } else if (run.records.length > 0) {
      targetId = run.records[run.records.length - 1].id;
    }
  }
  if (!targetId) {
    return {
      bytes: new Uint8Array(),
      featureCount,
      diagnostics: [...r.diagnostics, {
        target: 'export-occt',
        code: 'export.no-shape',
        severity: 'error',
        message: 'Script produced no shapes to export.',
        hint: 'End the script with `return <shape>`.',
        nextAction: NEXT_ACTIONS['export.no-shape'],
      }],
    };
  }

  const lowered = r.shapes.get(targetId);
  if (!lowered) {
    return {
      bytes: new Uint8Array(),
      featureCount,
      diagnostics: [...r.diagnostics, {
        target: 'export-occt',
        code: 'recompute.input.missing',
        featureId: targetId,
        severity: 'error',
        message: `Target shape '${targetId}' did not lower successfully.`,
        hint: 'Walk the upstream chain with why_did_this_fail to find the root cause.',
        nextAction: NEXT_ACTIONS['recompute.input.missing'],
      }],
    };
  }

  if (manifestScene !== undefined && !isSceneBackend(lowered)) {
    throw new Error('connector-manifest export requires the Scene source to lower to a SceneBackend.');
  }

  // svg-drawing entry path: the engineering-drawing sheet accepts both a
  // single body and a multi-body Scene — Scene parts ship in world frame so
  // the hidden-line pass sees inter-part occlusion. Dispatched before the
  // Scene-aware block because the drawing exporter owns its own Scene
  // handling (no union / per-part split needed).
  if (format === 'svg-drawing') {
    const opts =
      (input.options as SvgDrawingOptions | undefined) ??
      { format: 'svg-drawing' as const };
    const baseName = fileName.split(/[\\/]/).pop() ?? fileName;
    const modelName =
      opts.modelName ?? baseName.replace(/(\.kcad)?\.ts$/, '');
    const drawingParts: WorldFramePart[] = isSceneBackend(lowered)
      ? sceneToWorldFrameParts(lowered)
      : [{ name: 'part', shape: lowered as OcctBackend }];
    const bytes = exportSvgDrawing(drawingParts, { ...opts, modelName });
    return { bytes, featureCount, diagnostics: r.diagnostics };
  }

  // Scene-aware path: STEP export of a SceneBackend ships a STEP file
  // with one named body per part (replicad.exportSTEP(ShapeConfig[])
  // writes XCAFDoc names + colors). For STL we still need a single mesh,
  // so fall back to the boolean union via assemblyExport(union).
  if (isSceneBackend(lowered)) {
    if (format === 'step') {
      const connectorManifest = manifestRequest === undefined
        ? undefined
        : sceneToConnectorManifest(
            manifestScene!,
            lowered,
            resolveParams(run.records, run.paramTable),
            manifestRequest,
          );
      const bytes = await exportSceneToSTEPAsync(lowered);
      return {
        bytes,
        featureCount,
        diagnostics: r.diagnostics,
        ...(connectorManifest === undefined ? {} : { connectorManifest }),
      };
    }
    if (format === 'dxf') {
      // DXF needs a single planar wire source; a multi-body Scene cannot
      // satisfy that contract without a caller-side choice of which face /
      // part to export. Surface the non-planar diagnostic so the agent's
      // next move is to either pick a planar face or return a Region.
      return {
        bytes: new Uint8Array(),
        featureCount,
        diagnostics: [...r.diagnostics, {
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
    if (format === '3mf') {
      // 3MF natively ships multi-body scenes — one `<object>` per part with
      // distinct names + base colors. Mesh each part via the shared
      // world-frame walk, then chain through the OPC zip writer.
      const opts3mf = (input.options as Export3mfOptions | undefined) ?? { format: '3mf' };
      try {
        const worldParts = sceneToWorldFrameParts(lowered);
        const bytes = await export3mfAsync(worldParts, opts3mf);
        return { bytes, featureCount, diagnostics: r.diagnostics };
      } catch (e) {
        const notWatertight = notWatertightDiagnostic(e, r.diagnostics, featureCount, targetId);
        if (notWatertight) return notWatertight;
        throw e;
      }
    }
    if (format === 'glb') {
      // GLB ships multi-body scenes natively — one glTF node per part with
      // per-part name + PBR material. Mesh each part via the shared
      // world-frame walk, then chain through the GLTFExporter writer.
      const optsGlb = (input.options as ExportGlbOptions | undefined) ?? { format: 'glb' };
      try {
        const worldParts = sceneToWorldFrameParts(lowered);
        const bytes = await exportGlbAsync(worldParts, optsGlb);
        return { bytes, featureCount, diagnostics: r.diagnostics };
      } catch (e) {
        const dracoDiag = dracoConflictDiagnostic(e, r.diagnostics, featureCount, targetId);
        if (dracoDiag) return dracoDiag;
        throw e;
      }
    }
    // STL of a Scene: caller must explicitly fuse via Scene.toUnion() /
    // Scene.toCompound() upstream — surface a structured diagnostic
    // pointing at the right call.
    return {
      bytes: new Uint8Array(),
      featureCount,
      diagnostics: [...r.diagnostics, {
        target: 'export-occt',
        code: 'export.no-shape',
        featureId: targetId,
        severity: 'error',
        message: 'STL export of a Scene requires an explicit Scene.toUnion() or Scene.toCompound() upstream.',
        hint: 'Return arm.solvedModel(poses).toUnion() (or .toCompound()) for STL; STEP export accepts the Scene directly and preserves per-part names + colors.',
        nextAction: NEXT_ACTIONS['export.no-shape'],
      }],
    };
  }

  const shape = lowered as OcctBackend;
  switch (format) {
    case 'stl': {
      const verify = (input.options as { verify?: boolean } | undefined)?.verify !== false;
      const { bytes, report } = await shape.exportSTLWithReportAsync();
      if (verify && !report.ok) {
        // Write-then-fail contract: keep the real mesh bytes next to the
        // error diagnostic so consumers can write the broken mesh to disk
        // for inspection before failing (same as per-part export).
        return {
          bytes,
          featureCount,
          diagnostics: [...r.diagnostics, stlNotWatertightDiagnostic(report, targetId)],
        };
      }
      return { bytes, featureCount, diagnostics: r.diagnostics };
    }
    case 'step': {
      const bytes = await shape.exportSTEPAsync();
      return { bytes, featureCount, diagnostics: r.diagnostics };
    }
    case 'dxf': {
      const opts =
        (input.options as DxfWriterOptions | undefined) ?? { format: 'dxf' };
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
          return { bytes, featureCount, diagnostics: r.diagnostics };
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
              diagnostics: [...r.diagnostics, {
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
            diagnostics: [...r.diagnostics, {
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
          diagnostics: [...r.diagnostics, {
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
      return { bytes, featureCount, diagnostics: r.diagnostics };
    }
    case '3mf': {
      // Single-shape 3MF: wrap in a one-part `WorldFramePart[]` so the
      // writer can mesh + emit identically to the Scene path.
      const opts3mf = (input.options as Export3mfOptions | undefined) ?? { format: '3mf' };
      const part: WorldFramePart = { name: 'part', shape };
      try {
        const bytes = await export3mfAsync([part], opts3mf);
        return { bytes, featureCount, diagnostics: r.diagnostics };
      } catch (e) {
        const notWatertight = notWatertightDiagnostic(e, r.diagnostics, featureCount, targetId);
        if (notWatertight) return notWatertight;
        throw e;
      }
    }
    case 'glb': {
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
      const optsGlb = (input.options as ExportGlbOptions | undefined) ?? { format: 'glb' };
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
        return { bytes, featureCount, diagnostics: r.diagnostics };
      } catch (e) {
        const dracoDiag = dracoConflictDiagnostic(e, r.diagnostics, featureCount, targetId);
        if (dracoDiag) return dracoDiag;
        throw e;
      }
    }
  }
  // URDF / SRDF / SDF-Gazebo are dispatched in the early Assembly-aware
  // branch above, before targetId resolution. Unreachable here.
  return { bytes: new Uint8Array(), featureCount, diagnostics: r.diagnostics };
}

/** Mesh the per-link shapes referenced by a robot-description export into
 *  binary STLs. Shared by the URDF and SDF dispatch branches. */
async function emitCompanionMeshes(
  meshPaths: ReadonlyArray<{ relPath: string; shape: OcctBackend }>,
): Promise<CompanionMeshFile[]> {
  const meshes: CompanionMeshFile[] = [];
  for (const m of meshPaths) {
    meshes.push({ relPath: m.relPath, bytes: await m.shape.exportSTLAsync() });
  }
  return meshes;
}

export interface PartStlExport {
  name: string;
  /** name sanitized for filenames: [^A-Za-z0-9._-] -> '-' */
  fileSafeName: string;
  bytes: Uint8Array;
  report: WatertightReport;
  triangleCount: number;
}

export interface ExportPartsInput {
  code: string;
  fileName: string;
  scriptDir?: string;
  /** Part names to export; omit for all parts. */
  parts?: string[];
}

export interface ExportPartsResult {
  parts: PartStlExport[];
  featureCount: number;
  diagnostics: CompilerDiagnostic[];
}

export function fileSafePartName(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]/g, '-');
}

/** Resolved world-frame scene + run bookkeeping, shared by the per-part
 *  exporter and the part-stats lister. `parts` is undefined when resolution
 *  failed — `diagnostics` then carries the structured error. */
interface WorldFrameSceneResult {
  parts?: import('../../kernel/backends/occt/sceneToWorldFrame').WorldFramePart[];
  featureCount: number;
  diagnostics: CompilerDiagnostic[];
}

/**
 * Run a script and resolve its returned Scene into world-frame parts.
 * The script must return `assembly.solvedModel(...)` / `assembly.model()`
 * (a Scene). Shared prelude for `runAndExportParts` and `listPartStats`.
 */
export async function resolveWorldFrameScene(
  input: { code: string; fileName: string; scriptDir?: string },
): Promise<WorldFrameSceneResult> {
  const { code, fileName, scriptDir } = input;
  const run = await runScript({ code, fileName, scriptDir });
  const engine = new RecomputeEngine(createOcctLowerer(run.session));
  const r = await engine.run(run.records, { paramTable: run.paramTable });
  const featureCount = run.records.length;
  const fatal = r.diagnostics.filter(d => d.severity === 'error');
  if (fatal.length > 0) return { featureCount, diagnostics: r.diagnostics };

  const ret = run.returnValue;
  if (!(ret instanceof Scene)) {
    return {
      featureCount,
      diagnostics: [...r.diagnostics, {
        target: 'export-occt',
        code: 'export.no-shape',
        severity: 'error',
        message: 'Per-part export requires the script to return assembly.solvedModel(...) or assembly.model().',
        hint: 'End the script with `return asm.solvedModel({...});` so part names and modeled positions are available.',
        nextAction: NEXT_ACTIONS['export.no-shape'],
      }],
    };
  }
  const sourceId = ret.__sourceFeatureId();
  const lowered = sourceId !== undefined ? r.shapes.get(sourceId) : undefined;
  if (!lowered || !isSceneBackend(lowered)) {
    return {
      featureCount,
      diagnostics: [...r.diagnostics, {
        target: 'export-occt',
        code: 'recompute.input.missing',
        featureId: sourceId,
        severity: 'error',
        message: 'The assembly scene did not lower successfully.',
        hint: 'Walk the upstream chain with why_did_this_fail to find the root cause.',
        nextAction: NEXT_ACTIONS['recompute.input.missing'],
      }],
    };
  }
  return { parts: sceneToWorldFrameParts(lowered), featureCount, diagnostics: r.diagnostics };
}

/**
 * Run a script and export each solved-assembly part as its own binary STL,
 * in the part's modeled (world-frame) position. The script must return
 * `assembly.solvedModel(...)` / `assembly.model()` (a Scene). Each part is
 * meshed through the export pipeline and carries a watertight report —
 * callers decide whether a failing report is fatal (verify default-on).
 */
export async function runAndExportParts(input: ExportPartsInput): Promise<ExportPartsResult> {
  const resolved = await resolveWorldFrameScene(input);
  const { featureCount } = resolved;
  if (!resolved.parts) {
    return { parts: [], featureCount, diagnostics: resolved.diagnostics };
  }
  const worldParts = resolved.parts;
  const validNames = worldParts.map(p => p.name);
  if (input.parts !== undefined) {
    const unknown = input.parts.filter(n => !validNames.includes(n));
    if (unknown.length > 0) {
      return {
        parts: [], featureCount,
        diagnostics: [...resolved.diagnostics, {
          target: 'export-occt',
          code: 'export.part.not-found',
          severity: 'error',
          message: `Unknown part name(s): ${unknown.join(', ')}. Valid names: ${validNames.join(', ')}.`,
          hint: HINT_TEMPLATES['export.part.not-found'].template,
          nextAction: NEXT_ACTIONS['export.part.not-found'],
        }],
      };
    }
  }
  const selected = input.parts === undefined
    ? worldParts
    : worldParts.filter(p => input.parts!.includes(p.name));

  const parts: PartStlExport[] = [];
  for (const p of selected) {
    const mesh = meshShapeForExport(p.shape.getReplicadShape());
    const report = verifyWatertight(mesh);
    const buf = encodeBinaryStl({ vertices: mesh.vertices, triangles: mesh.triangles });
    parts.push({
      name: p.name,
      fileSafeName: fileSafePartName(p.name),
      bytes: Uint8Array.from(buf),
      report,
      triangleCount: mesh.triangles.length / 3,
    });
  }
  return { parts, featureCount, diagnostics: resolved.diagnostics };
}

/**
 * Structured `export.mesh.not-watertight` diagnostic from a failing
 * watertight report — open-edge count plus up to 5 crack-cluster xyz spots.
 */
export function stlNotWatertightDiagnostic(
  report: WatertightReport,
  targetId: string | undefined,
  partName?: string,
): CompilerDiagnostic {
  const spots = report.clusters
    .map(c => `(${c.center.map(n => n.toFixed(2)).join(', ')})×${c.edgeCount}`)
    .join('; ');
  const subject = partName !== undefined ? `Part '${partName}' STL mesh` : 'STL mesh';
  return {
    target: 'export-occt',
    code: 'export.mesh.not-watertight',
    featureId: targetId,
    severity: 'error',
    message: `${subject} is not watertight: ${report.openEdgeCount} open edge(s) in ${report.clusters.length} crack cluster(s) at ${spots}.`,
    hint: HINT_TEMPLATES['export.mesh.not-watertight'].template,
    nextAction: NEXT_ACTIONS['export.mesh.not-watertight'],
  };
}

/**
 * Translate an `assertWatertight` Error into the structured
 * `export.3mf.not-watertight` diagnostic. Returns `undefined` when the
 * error doesn't look like a watertight failure so callers can rethrow.
 */
function notWatertightDiagnostic(
  e: unknown,
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
  targetId: string | undefined,
): ExportResult | undefined {
  const msg = e instanceof Error ? e.message : String(e);
  if (!/watertight/i.test(msg)) return undefined;
  return {
    bytes: new Uint8Array(),
    featureCount,
    diagnostics: [...diagnostics, {
      target: 'export-occt',
      code: 'export.3mf.not-watertight',
      featureId: targetId,
      severity: 'error',
      message: '3MF export requires a watertight mesh; the exported triangulation has non-manifold edges.',
      hint: 'The mesh has open or non-manifold edges. Inspect the source geometry (typically a self-intersecting cone or non-closed shell) and re-author the offending surface via nurbsSurfaceLowerer, raise OCCT mesh deflection, or re-mesh via Manifold; see the K1 mesher gap.',
      nextAction: NEXT_ACTIONS['export.3mf.not-watertight'],
    }],
  };
}

/**
 * Translate an `exportGlbAsync` Draco-conflict Error into the structured
 * `export.glb.draco-glass-conflict` diagnostic. Returns `undefined` when the
 * error doesn't look like a Draco gate failure so callers can rethrow.
 */
function dracoConflictDiagnostic(
  e: unknown,
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
  targetId: string | undefined,
): ExportResult | undefined {
  const msg = e instanceof Error ? e.message : String(e);
  if (!/draco/i.test(msg)) return undefined;
  return {
    bytes: new Uint8Array(),
    featureCount,
    diagnostics: [...diagnostics, {
      target: 'export-occt',
      code: 'export.glb.draco-glass-conflict',
      featureId: targetId,
      severity: 'error',
      message: 'Draco compression is reserved but not yet implemented. Pass options.draco: false or omit.',
      hint: 'Set options.draco to false or omit it; Draco encoding ships in a follow-up slice.',
      nextAction: NEXT_ACTIONS['export.glb.draco-glass-conflict'],
    }],
  };
}
