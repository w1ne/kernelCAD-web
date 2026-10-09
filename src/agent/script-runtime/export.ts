// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { runScript } from '../../composition/runScript';
import { RecomputeEngine } from '../../modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../modeling/backends/occt/occtLowerer';
import { meshShapeForExport, type OcctBackend } from '../../kernel/backends/occt/occtBackend';
import { encodeBinaryStl } from '../../kernel/backends/occt/exportStlBinary';
import { verifyWatertight, type WatertightReport } from '../../kernel/backends/occt/meshHeal';
import type { DrawingAnnotation } from '../../kernel/backends/occt/drawingAnnotations';
import type { DrawingSectionSpec } from '../../kernel/backends/occt/drawingSections';
import type { ArchitecturalPlanOptions } from '../../kernel/backends/occt/drawingArchitectural';
import type {
  AutoAnnotateOptions,
  DrawingReport,
} from '../../kernel/backends/occt/exportSvgDrawing';
import type { GcodeStats } from '../../kernel/export/gcode/gcodeHeaderParser';
import type { DrawingSheetSize, ProjectionAngle } from '../../kernel/backends/occt/drawingLayout';
export type { DrawingSheetSize, ProjectionAngle } from '../../kernel/backends/occt/drawingLayout';
export type { DrawingAnnotation, DrawingAnchor } from '../../kernel/backends/occt/drawingAnnotations';
export type { DrawingSectionSpec, SectionPlane } from '../../kernel/backends/occt/drawingSections';
export type {
  AutoAnnotateKind,
  AutoAnnotateOptions,
  DrawingReport,
  Iso2768Class,
} from '../../kernel/backends/occt/exportSvgDrawing';
import { sceneToWorldFrameParts } from '../../kernel/backends/occt/sceneToWorldFrame';
import { isSceneBackend } from '../../kernel/backends/sceneBackend';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { NEXT_ACTIONS, HINT_TEMPLATES } from '../../shared/diagnostics/registry';
import { Scene } from '../../modeling/validation/scene';
import type { ConnectorManifest } from '../../shared/parts/connectorManifestSchema';

import {
  exportAssemblyFormat,
  exportRegionDxf,
  exportSceneBackend,
  exportSingleShape,
  optionsFormatMismatchDiagnostic,
  resolveConnectorManifestScene,
  resolveExportTarget,
} from './exportPhases';
import { exportPdfDrawing, exportSvgDrawing } from './exportDrawing';
import { withOcctPoisonRecovery } from '../../kernel/backends/occt/occtBackend';
import { fileSafePartName } from './safeOutputPath';
import { invalidArgsText } from '../../shared/intent/invalidArgs';
import {
  buildStressInfillExport,
  type StressInfillExportOptions,
  type StressInfillReport,
} from './stressInfillExport';
import type { Export3mfOptions } from '../../kernel/backends/occt/export3mf';
import { resolvePrinterProfile } from '../../kernel/export/gcode/printerProfiles';
export type { StressInfillExportOptions, StressInfillReport } from './stressInfillExport';
export { stlNotWatertightDiagnostic } from './exportDiagnostics';

export type { GcodeStats } from '../../kernel/export/gcode/gcodeHeaderParser';

export type ExportFormat =
  | 'stl' | 'step' | 'dxf' | '3mf' | 'glb' | 'svg-drawing' | 'pdf-drawing'
  | 'urdf' | 'srdf' | 'sdf-gazebo' | 'gcode' | 'usd-isaac'
  | 'bom-csv' | 'bom-json';

/** Per-format option payloads. The union member is selected by `format`. */
export type ExportOptions =
  | { format: 'stl'; verify?: boolean }
  | { format: 'step'; unit?: 'mm' | 'cm' | 'in' }
  | {
      format: 'dxf';
      layers?: DxfLayerSpec[];
      unit?: 'mm' | 'cm' | 'in';
      tolerance?: number;
      /** Cross-section of any part at this plane (world coordinates), instead
       *  of a flat part's outline. */
      section?: { axis: 'x' | 'y' | 'z'; at: number };
      /** Multi-part models: 'per-part' (default) also writes parts/<part>.dxf
       *  next to the combined sheet; 'sheet' writes the combined sheet only. */
      layout?: 'per-part' | 'sheet';
    }
  | {
      format: '3mf';
      printUnit?: 'mm' | 'cm' | 'in';
      embedSource?: boolean;
      /** Bed layout: 'none' (default, modelled positions), 'plate' (packed,
       *  each part on Z=0), 'assembled' (one multi-part object on Z=0). */
      arrange?: 'none' | 'plate' | 'assembled';
      /** arrange 'plate': largest flat face down per part. */
      orient?: boolean;
      /** Slicer project sidecar: per-object name + filament slot. */
      slicer?: 'generic' | 'bambu' | 'orca' | 'prusa';
      /** Printer profile id (PRINTER_PROFILE_IDS): bed for arrange and the
       *  slicer default; default 'generic-fdm'. */
      printer?: string;
      /** Stress-graded infill: solve the named feaStudy (needs the LOCAL
       *  CalculiX + gmsh toolchain) and write one modifier volume per
       *  stress band with its own infill density: Orca/Bambu format by
       *  default (sparse_infill_density), PrusaSlicer's with
       *  `slicer: 'prusa'` (fill_density). */
      infill?: StressInfillExportOptions;
    }
  | { format: 'glb'; axis?: 'y-up' | 'z-up'; draco?: false }
  | {
      format: 'svg-drawing';
      sheet?: 'a4' | 'a3';
      modelName?: string;
      date?: string;
      /** Authored dimensions / notes; replaces the automatic bbox dimensions. */
      annotations?: readonly DrawingAnnotation[];
      /** Cutting-plane section views — see the kernelcad-drawings skill. */
      sections?: readonly DrawingSectionSpec[];
      /** Exploded isometric cell. */
      exploded?: { factor: number; mode?: 'radial' | 'mate-axis' };
      /** Item balloons on the isometric cell; numbers match BOM item numbers. */
      balloons?: boolean;
      /** Parts-list table (item, name, qty, material) above the title block. */
      partsList?: boolean;
      /** Derive datums, hole callouts with position frames, positions, overall
       *  dims, radii, chamfers, flatness and an ISO 2768 note from the B-rep. */
      autoAnnotate?: boolean | AutoAnnotateOptions;
      /** 'architectural' draws a floor plan instead of the part sheet. */
      style?: DrawingStyle;
      plan?: ArchitecturalPlanOptions;
    }
  | PdfDrawingOptions
  | { format: 'urdf' }
  | { format: 'srdf' }
  | { format: 'sdf-gazebo' }
  | {
      format: 'gcode';
      /** Printer profile id (PRINTER_PROFILE_IDS); default 'generic-fdm'. */
      printer?: string;
      layerHeight?: number;
      /** Infill density, 0-100 (percent); default 15. */
      infill?: number;
      supports?: boolean;
      material?: 'pla' | 'petg';
    }
  | {
      format: 'usd-isaac';
      density?: number;
      meshPrefix?: string;
      /** Joint drives keyed by mate name; emitted only when declared. */
      drives?: Record<string, { stiffness: number; damping: number; maxForce?: number; targetPosition?: number }>;
      collisionApproximation?: 'convexHull' | 'convexDecomposition';
    }
  | { format: 'bom-csv' }
  | { format: 'bom-json' };

/**
 * `pdf-drawing`: the svg-drawing sheet (same views, hidden lines, dimensions,
 * GD&T, sections, parts list) on a standard sheet with a full title block,
 * written as a vector PDF. Title-block text fields print `—` when unset.
 */
export interface PdfDrawingOptions {
  format: 'pdf-drawing';
  /** Landscape sheet size; default `a3`. `'auto'` / `'auto-ansi'` pick the
   *  smallest ISO / ANSI sheet that holds the views at 1:1 or larger. */
  sheet?: DrawingSheetSize | 'auto' | 'auto-ansi';
  /** View arrangement and title-block symbol; default `'third'`. */
  projection?: ProjectionAngle;
  /** Drawing title; defaults to the model name (the script file name). */
  title?: string;
  /** Part name / number; defaults to the model name. */
  partName?: string;
  /** Material; defaults to the assembly parts' material when they all share one. */
  material?: string;
  revision?: string;
  /** Title-block date text; defaults to today's date (YYYY-MM-DD, UTC). */
  date?: string;
  modelName?: string;
  /** Authored dimensions / notes; replaces the automatic dimensions. */
  annotations?: readonly DrawingAnnotation[];
  sections?: readonly DrawingSectionSpec[];
  exploded?: { factor: number; mode?: 'radial' | 'mate-axis' };
  balloons?: boolean;
  partsList?: boolean;
  /** Automatic datums, hole callouts, positions, overall dims and ISO 2768
   *  note; default ON unless `annotations` are given. `false` falls back to
   *  the overall bounding-box dimensions. */
  autoAnnotate?: boolean | AutoAnnotateOptions;
  /** `'architectural'`: a floor plan (section ~1 m above the base, poché
   *  walls, wall / opening dimensions, room labels with area, scale bar,
   *  north arrow; feet-inches for an imperial model) instead of the
   *  mechanical part sheet. Default `'mechanical'`. */
  style?: DrawingStyle;
  /** Floor-plan options for `style: 'architectural'`. */
  plan?: ArchitecturalPlanOptions;
}

export type DrawingStyle = 'mechanical' | 'architectural';

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
  /** `dxf` of a flat or sheet-metal part: the sheet it is cut from. A shop
   *  needs the thickness, which the DXF itself does not carry. */
  sheet?: { thicknessMm: number; bendCount: number };
  /** Companion files written next to the primary output: per-link meshes
   *  (URDF / SDF) or per-part DXF files (multi-part DXF). */
  meshes?: CompanionMeshFile[];
  /** Numeric authored connector sidecar, present only when requested for a STEP Scene export. */
  connectorManifest?: ConnectorManifest;
  /** Parsed slicer G-code stats, present only for `format: 'gcode'` exports that reached the slicer. */
  gcodeStats?: GcodeStats;
  /** `svg-drawing` / `pdf-drawing` placement report (placed / overlapped counts, datums,
   *  every annotation drawn), present whenever the sheet carries annotations. */
  drawingReport?: DrawingReport;
  /** `3mf` with `infill`: band table, saving estimate and render scripts. */
  infillReport?: StressInfillReport;
}

/** 3MF options with stress-graded infill resolved into writer modifiers.
 *  The slicer defaults to 'orca' (the format Orca and Bambu share) unless
 *  the caller or a printer profile names one ('prusa' writes PrusaSlicer's
 *  modifier format, which Orca and Bambu do not read, and vice versa). */
async function resolveInfill3mf(
  input: ExportInput,
  run: Awaited<ReturnType<typeof runScript>>,
  shapes: ReadonlyMap<string, unknown>,
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
): Promise<{ input: ExportInput; report: StressInfillReport; diagnostics: CompilerDiagnostic[] } | { result: ExportResult }> {
  const opts = input.options as Extract<ExportOptions, { format: '3mf' }>;
  const built = await buildStressInfillExport(
    opts.infill!, run.records, shapes, run.paramTable, input.scriptDir,
  );
  if (!built.ok) {
    return { result: { bytes: new Uint8Array(), featureCount, diagnostics: [...diagnostics, ...built.diagnostics] } };
  }
  const printerSlicer = opts.printer !== undefined ? resolvePrinterProfile(opts.printer).slicer : 'generic';
  const slicer = opts.slicer ?? (printerSlicer === 'generic' ? 'orca' : printerSlicer);
  const writerOpts: Export3mfOptions = {
    ...(opts as Export3mfOptions),
    slicer,
    modifiers: built.build.modifiers,
    objectSettings: built.build.objectSettings,
  };
  return {
    input: { ...input, options: writerOpts as unknown as ExportOptions },
    report: built.build.report,
    diagnostics: [...diagnostics, ...built.diagnostics],
  };
}

function infillRequested(input: ExportInput): boolean {
  return input.format === '3mf' && (input.options as { infill?: unknown } | undefined)?.infill !== undefined;
}

/** Stress-graded infill grades one solid; an assembly return is refused. */
function infillSceneRefusal(
  targetId: string,
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
): ExportResult {
  return {
    bytes: new Uint8Array(),
    featureCount,
    diagnostics: [...diagnostics, {
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: targetId,
      severity: 'error',
      ...invalidArgsText({
        api: "export({ format: '3mf', options: { infill } })",
        path: 'the script return value',
        gotText: 'an assembly (Scene)',
        requires: 'ONE solid part: stress-graded infill grades the shape that declares the feaStudy',
        example: 'return bracket;',
      }),
      nextAction: NEXT_ACTIONS['feature.invalid-args'],
    }],
  };
}

/** Scene export, unless stress-graded infill was asked for (refused). */
async function exportSceneOrRefuseInfill(
  input: ExportInput,
  format: ExportFormat,
  scene: Parameters<typeof exportSceneBackend>[2],
  targetId: string,
  manifestRequest: ExportInput['connectorManifest'],
  manifestScene: Scene | undefined,
  run: Awaited<ReturnType<typeof runScript>>,
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
): Promise<ExportResult | undefined> {
  if (infillRequested(input)) return infillSceneRefusal(targetId, diagnostics, featureCount);
  return exportSceneBackend(
    input, format, scene, targetId, manifestRequest, manifestScene, run, diagnostics, featureCount,
  );
}

/** Single-shape export; a 3MF with `infill` gets stress-graded modifiers. */
async function exportShapeOrInfill(
  input: ExportInput,
  format: ExportFormat,
  shape: OcctBackend,
  targetId: string,
  scriptDir: string | undefined,
  run: Awaited<ReturnType<typeof runScript>>,
  shapes: ReadonlyMap<string, unknown>,
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
): Promise<ExportResult> {
  if (!infillRequested(input)) {
    return exportSingleShape(input, format, shape, targetId, scriptDir, run, diagnostics, featureCount);
  }
  const infill = await resolveInfill3mf(input, run, shapes, diagnostics, featureCount);
  if ('result' in infill) return infill.result;
  const out = await exportSingleShape(
    infill.input, '3mf', shape, targetId, scriptDir, run, infill.diagnostics, featureCount,
  );
  return out.bytes.length > 0 ? { ...out, infillReport: infill.report } : out;
}

export async function runAndExport(input: ExportInput): Promise<ExportResult> {
  return withOcctPoisonRecovery(async () => {

  const { code, fileName, format, feature_id, scriptDir, connectorManifest: manifestRequest } = input;

  const optionMismatch = optionsFormatMismatchDiagnostic(input);
  if (optionMismatch !== undefined) return optionMismatch;

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

  const manifestScene = resolveConnectorManifestScene(
    manifestRequest, run.returnValue, feature_id,
  );

  const regionDxf = exportRegionDxf(input, format, run.returnValue, r.diagnostics, featureCount);
  if (regionDxf !== undefined) return regionDxf;

  const assemblyXml = await exportAssemblyFormat(input, format, run, r.diagnostics, featureCount);
  if (assemblyXml !== undefined) return assemblyXml;

  const target = resolveExportTarget(feature_id, run.returnValue, run.records, r.diagnostics, featureCount);
  if ('result' in target) return target.result;
  const targetId = target.targetId;

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
    return await exportSvgDrawing(input, fileName, lowered, targetId, run, r.diagnostics, featureCount);
  }
  if (format === 'pdf-drawing') {
    return await exportPdfDrawing(input, fileName, lowered, targetId, run, r.diagnostics, featureCount);
  }

  // Scene-aware path: STEP/3MF/GLB keep per-part identity. STL is a single
  // triangle mesh, so multi-body Scenes are auto-fused (world-frame boolean
  // union) — same geometry as an explicit Scene.toUnion() upstream. Studio
  // header STL/3MF on assembly returns (e.g. multi-material keycaps) must
  // not fail with "return toUnion()" after the model already viewed fine.
  if (isSceneBackend(lowered)) {
    const sceneResult = await exportSceneOrRefuseInfill(
      input, format, lowered, targetId, manifestRequest, manifestScene, run, r.diagnostics, featureCount,
    );
    if (sceneResult !== undefined) return sceneResult;
    // Remaining formats (urdf/srdf/sdf-gazebo) fall through to the single-shape
    // path below, which will emit format-specific diagnostics for Scenes.
  }

  const shape = lowered as OcctBackend;
  return exportShapeOrInfill(input, format, shape, targetId, scriptDir, run, r.shapes, r.diagnostics, featureCount);

  });
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

export { fileSafePartName };

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
  return withOcctPoisonRecovery(async () => {
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

  });
}
