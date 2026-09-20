// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { FeatureKind, FeatureId, FeatureRef, Param } from '../../shared/intent/types';
import {
  FDM_DEFAULTS,
  type DfmChannelSpec,
  type DfmFdmMetadata,
  type DfmSpec,
  type DfmSpecMetadata,
} from '../../shared/intent/dfmSpecRecord';
import { DEFAULT_PRINTER_PROFILE, PRINTER_PROFILES } from '../../kernel/export/gcode/printerProfiles';
import type {
  FeaLoadMetadata,
  FeaStudyMetadata,
  FeaStudySpec,
} from '../../shared/intent/feaStudyRecord';
import { resolveFeaMaterial } from '../../kernel/fea/feaMaterials';
import {
  DATUM_LABEL_RE,
  GDT_FORM_TYPES,
  GDT_MODIFIERS,
  GDT_TYPES,
  type DrawingDatumMetadata,
  type DrawingToleranceMetadata,
  type DrawingToleranceSpec,
} from '../../shared/intent/drawingGdtRecord';
import type { Curve3DMetadata } from '../../shared/intent/curve3dRecord';
import type {
  EmbossTextAlign,
  EmbossTextMetadata,
  EmbossTextScaleMode,
} from '../../shared/intent/embossTextRecord';
import type {
  ProjectCurveMetadata,
  ProjectCurveScaleMode,
  ProjectCurveSource,
} from '../../shared/intent/projectCurveRecord';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { HINT_TEMPLATES } from '../../shared/diagnostics/registry';
import { KernelError } from '../../shared/intent/kernelError';
import { toParam } from '../../shared/runtime/editableHelpers';
import type { Editable } from '../../shared/runtime/paramRef';

export interface AuthoringFeatureSpec {
  kind: FeatureKind;
  params: Record<string, Param>;
  inputs: Record<string, FeatureRef>;
  metadata?: Record<string, unknown>;
}

export interface Curve3DCaptureArgs {
  metadata: Curve3DMetadata;
}

export interface EmbossTextCaptureArgs {
  textContent: string;
  fontFamily?: string;
  size: Editable<number>;
  depth: Editable<number>;
  align?: EmbossTextAlign;
  anchorU?: Editable<number>;
  anchorV?: Editable<number>;
  rotation?: Editable<number>;
  scaleMode?: EmbossTextScaleMode;
}

export interface ProjectCurveCaptureArgs {
  source: ProjectCurveSource;
  scaleMode?: ProjectCurveScaleMode;
  asEdge?: boolean;
}

type BadFn = (field: string, why: string) => never;

// FDM fields first: a stray `nozzleMm` without `process: 'fdm'` deserves
// the specific fix, not the generic "declares no checks".
function validateDfmSpecCheckFields(args: DfmSpec, fdm: DfmFdmMetadata | undefined, bad: BadFn): void {
  validateDfmSpecDeclaresChecks(args, fdm, bad);
  validateDfmSpecPositiveNumber('minWall', args.minWall, bad);
  validateDfmSpecPositiveNumber('minClearance', args.minClearance, bad);
  validateDfmSpecArticulatedMates(args, bad);
}

function validateDfmSpecDeclaresChecks(args: DfmSpec, fdm: DfmFdmMetadata | undefined, bad: BadFn): void {
  if (
    args.minWall === undefined && args.minClearance === undefined &&
    !(args.channels?.length) && fdm === undefined
  ) {
    bad('spec', "declares no checks; pass minWall, minClearance, channels, and/or process: 'fdm'");
  }
}

function validateDfmSpecPositiveNumber(
  field: 'minWall' | 'minClearance',
  value: number | undefined,
  bad: BadFn,
): void {
  if (value !== undefined && !(Number.isFinite(value) && value > 0)) {
    bad(field, `must be a positive finite number; got ${value}`);
  }
}

function validateDfmSpecArticulatedMates(args: DfmSpec, bad: BadFn): void {
  if (args.includeArticulatedMates !== undefined && typeof args.includeArticulatedMates !== 'boolean') {
    bad('includeArticulatedMates', `must be a boolean; got ${JSON.stringify(args.includeArticulatedMates)}`);
  }
  if (args.includeArticulatedMates === true && args.minClearance === undefined) {
    bad('includeArticulatedMates', 'requires minClearance because it only changes which pairs that distance gate measures');
  }
}

function validateDfmSpecArrayFieldShapes(args: DfmSpec, bad: BadFn): void {
  if (args.ignore !== undefined && !Array.isArray(args.ignore)) {
    bad('ignore', `must be an array of [partA, partB] pairs; got ${JSON.stringify(args.ignore)}`);
  }
  if (args.exclude !== undefined && !Array.isArray(args.exclude)) {
    bad('exclude', `must be an array of part-name strings; got ${JSON.stringify(args.exclude)}`);
  }
  if (args.channels !== undefined && !Array.isArray(args.channels)) {
    bad('channels', `must be an array of { part, name, openings, sealed? } entries; got ${JSON.stringify(args.channels)}`);
  }
}

function validateDfmSpecIgnoreEntries(args: DfmSpec, bad: BadFn): void {
  for (const [i, pair] of (args.ignore ?? []).entries()) {
    const isPair = Array.isArray(pair) && pair.length === 2 &&
      pair.every(p => typeof p === 'string' && p.length > 0);
    if (!isPair) {
      bad(`ignore[${i}]`, `must be a [partA, partB] pair of non-empty strings; got ${JSON.stringify(pair)}`);
    }
    if (pair[0] === pair[1]) {
      bad(`ignore[${i}]`, `must name two different parts; ['${pair[0]}', '${pair[1]}'] can never match a distinct-part pair`);
    }
  }
}

function validateDfmSpecExcludeEntries(args: DfmSpec, bad: BadFn): void {
  for (const [i, name] of (args.exclude ?? []).entries()) {
    if (typeof name !== 'string' || name.length === 0) {
      bad(`exclude[${i}]`, `must be a non-empty part-name string; got ${JSON.stringify(name)}`);
    }
    const star = name.indexOf('*');
    if (star !== -1 && (star !== name.length - 1 || name.length === 1)) {
      bad(`exclude[${i}]`, `must be a literal part name or a trailing-'*' prefix glob (e.g. 'servo-*'); got ${JSON.stringify(name)}`);
    }
  }
}

function validateDfmSpecChannelFields(i: number, c: DfmChannelSpec, bad: BadFn): void {
  if (typeof c !== 'object' || c === null) {
    bad(`channels[${i}]`, `must be a { part, name, openings, sealed? } object; got ${JSON.stringify(c)}`);
  }
  if (typeof c.part !== 'string' || c.part.length === 0) {
    bad(`channels[${i}].part`, `must be a non-empty part-name string; got ${JSON.stringify(c.part)}`);
  }
  if (typeof c.name !== 'string' || c.name.length === 0) {
    bad(`channels[${i}].name`, `must be a non-empty label string; got ${JSON.stringify(c.name)}`);
  }
  if (!Number.isInteger(c.openings) || c.openings < 0) {
    bad(`channels[${i}].openings`, `must be a non-negative integer; got ${c.openings}`);
  }
  if (c.openings === 0 && c.sealed !== true) {
    bad(`channels[${i}].openings`, `is 0 but the channel is not declared sealed; pass sealed: true for an intentionally sealed void`);
  }
  if (c.sealed === true && c.openings !== 0) {
    bad(`channels[${i}].openings`, `must be 0 when sealed: true; got ${c.openings}`);
  }
}

function validateDfmSpecChannelDuplicates(args: DfmSpec, bad: BadFn): void {
  const channelKeys = new Set<string>();
  for (const [i, c] of (args.channels ?? []).entries()) {
    const key = JSON.stringify([c.part, c.name]);
    if (channelKeys.has(key)) {
      bad(`channels[${i}]`, `duplicates part '${c.part}' + name '${c.name}' declared at an earlier index`);
    }
    channelKeys.add(key);
  }
}

function validateDfmSpecChannelEntries(args: DfmSpec, bad: BadFn): void {
  for (const [i, c] of (args.channels ?? []).entries()) {
    validateDfmSpecChannelFields(i, c, bad);
  }
  validateDfmSpecChannelDuplicates(args, bad);
}

function buildDfmSpecMetadata(args: DfmSpec, fdm: DfmFdmMetadata | undefined): DfmSpecMetadata {
  return {
    virtual: true,
    ...(args.minWall !== undefined ? { minWall: args.minWall } : {}),
    ...(args.minClearance !== undefined ? { minClearance: args.minClearance } : {}),
    includeArticulatedMates: args.includeArticulatedMates ?? false,
    ignore: (args.ignore ?? []).map(([a, b]) => [a, b] as const),
    exclude: [...(args.exclude ?? [])],
    channels: (args.channels ?? []).map(c => ({
      part: c.part, name: c.name, openings: c.openings, sealed: c.sealed ?? false,
    })),
    ...(fdm !== undefined ? { fdm } : {}),
  };
}

export function buildDfmSpecFeatureSpec(args: DfmSpec): AuthoringFeatureSpec {
  const bad: BadFn = (field: string, why: string): never => {
    throw new KernelError(
      'feature.invalid-args',
      `dfmSpec: ${field} ${why}.`,
      undefined,
      `invalid-args.dfm-spec.${field} — fix the field; dfmSpec is an enforcement gate, malformed declarations fail the build rather than silently disabling checks.`,
    );
  };

  const fdm = normalizeFdmSettings(args, bad);
  validateDfmSpecCheckFields(args, fdm, bad);
  validateDfmSpecArrayFieldShapes(args, bad);
  validateDfmSpecIgnoreEntries(args, bad);
  validateDfmSpecExcludeEntries(args, bad);
  validateDfmSpecChannelEntries(args, bad);

  const metadata = buildDfmSpecMetadata(args, fdm);

  return {
    kind: 'dfmSpec',
    params: {},
    inputs: {},
    metadata: metadata as unknown as Record<string, unknown>,
  };
}

const FDM_AXIS_TOKENS: Record<string, [number, number, number]> = {
  '+x': [1, 0, 0], '-x': [-1, 0, 0],
  '+y': [0, 1, 0], '-y': [0, -1, 0],
  '+z': [0, 0, 1], '-z': [0, 0, -1],
};

/** Validate + normalize the `process: 'fdm'` fields. FDM-only fields without
 *  the process are rejected: silently ignoring a declared nozzle or overhang
 *  limit would disable the gate the author asked for. */
function normalizeFdmSettings(
  args: DfmSpec,
  bad: (field: string, why: string) => never,
): DfmFdmMetadata | undefined {
  const fdmOnly = ['buildDirection', 'nozzleMm', 'maxOverhangDeg', 'maxBridgeMm', 'printer'] as const;
  if (args.process === undefined) {
    const stray = fdmOnly.filter(k => args[k] !== undefined);
    if (stray.length > 0) {
      bad(stray[0], "is an FDM setting; add process: 'fdm' to run the FDM printability check");
    }
    return undefined;
  }
  if (args.process !== 'fdm') {
    bad('process', `must be 'fdm' (the only supported process); got ${JSON.stringify(args.process)}`);
  }

  const buildDirection = normalizeFdmBuildDirection(args, bad);
  const nozzleMm = readPositiveFdmNumber('nozzleMm', args.nozzleMm, FDM_DEFAULTS.nozzleMm, bad);
  const maxBridgeMm = readPositiveFdmNumber('maxBridgeMm', args.maxBridgeMm, FDM_DEFAULTS.maxBridgeMm, bad);
  const maxOverhangDeg = normalizeFdmOverhang(args, bad);
  const printer = normalizeFdmPrinter(args, bad);
  return { buildDirection, nozzleMm, maxOverhangDeg, maxBridgeMm, printer };
}

function normalizeFdmBuildDirection(args: DfmSpec, bad: BadFn): [number, number, number] {
  let buildDirection: [number, number, number] = [...FDM_DEFAULTS.buildDirection];
  const dir = args.buildDirection;
  if (dir !== undefined) {
    if (typeof dir === 'string') {
      const token = FDM_AXIS_TOKENS[dir];
      if (token === undefined) {
        bad('buildDirection', `must be one of ${Object.keys(FDM_AXIS_TOKENS).join(', ')} or a [x, y, z] vector; got ${JSON.stringify(dir)}`);
      }
      buildDirection = [...token];
    } else {
      const ok = Array.isArray(dir) && dir.length === 3 && dir.every(c => typeof c === 'number' && Number.isFinite(c));
      const len = ok ? Math.hypot(dir[0], dir[1], dir[2]) : 0;
      if (!ok || len < 1e-9) {
        bad('buildDirection', `must be an axis token or a non-zero finite [x, y, z] vector; got ${JSON.stringify(dir)}`);
      }
      buildDirection = [dir[0] / len, dir[1] / len, dir[2] / len];
    }
  }
  return buildDirection;
}

function readPositiveFdmNumber(
  field: 'nozzleMm' | 'maxBridgeMm',
  v: number | undefined,
  dflt: number,
  bad: BadFn,
): number {
  if (v === undefined) return dflt;
  if (!(typeof v === 'number' && Number.isFinite(v) && v > 0)) {
    bad(field, `must be a positive finite number; got ${v}`);
  }
  return v;
}

function normalizeFdmOverhang(args: DfmSpec, bad: BadFn): number {
  if (args.maxOverhangDeg === undefined) return FDM_DEFAULTS.maxOverhangDeg;
  const v = args.maxOverhangDeg;
  if (!(typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 90)) {
    bad('maxOverhangDeg', `must be a finite number of degrees in [0, 90] (0 = vertical wall, 90 = flat ceiling); got ${v}`);
  }
  return v;
}

function normalizeFdmPrinter(args: DfmSpec, bad: BadFn): string {
  const printer = args.printer ?? DEFAULT_PRINTER_PROFILE;
  if (typeof printer !== 'string' || PRINTER_PROFILES[printer] === undefined) {
    bad('printer', `must name a bundled printer profile (${Object.keys(PRINTER_PROFILES).join(', ')}); got ${JSON.stringify(printer)}`);
  }
  return printer;
}

export function buildCurve3DFeatureSpec(args: Curve3DCaptureArgs): AuthoringFeatureSpec {
  const m = args.metadata;
  const diagnostics: CompilerDiagnostic[] = [];

  if (m.controlPoints.length < m.degree + 1) {
    diagnostics.push({
      target: 'export-occt',
      code: 'feature.curve3d.degenerate-controls',
      severity: 'error',
      message: `nurbsCurve: need at least ${m.degree + 1} control points for degree=${m.degree}; got ${m.controlPoints.length}.`,
      hint: HINT_TEMPLATES['feature.curve3d.degenerate-controls'].template,
    });
  }

  if (m.weights !== undefined) {
    if (m.weights.length !== m.controlPoints.length) {
      diagnostics.push({
        target: 'export-occt',
        code: 'feature.curve3d.weights-length-mismatch',
        severity: 'error',
        message: `nurbsCurve: weights.length (${m.weights.length}) does not match controlPoints.length (${m.controlPoints.length}).`,
        hint: HINT_TEMPLATES['feature.curve3d.weights-length-mismatch'].template,
      });
    } else if (!m.weights.every((w) => Number.isFinite(w) && w > 0)) {
      diagnostics.push({
        target: 'export-occt',
        code: 'feature.curve3d.weights-non-positive',
        severity: 'error',
        message: `nurbsCurve: all weights must be finite and > 0; got ${JSON.stringify(m.weights)}.`,
        hint: HINT_TEMPLATES['feature.curve3d.weights-non-positive'].template,
      });
    }
  }

  if (m.knots !== undefined) {
    const expected = m.controlPoints.length + m.degree + 1;
    if (m.knots.length !== expected) {
      diagnostics.push({
        target: 'export-occt',
        code: 'feature.curve3d.knots-length-mismatch',
        severity: 'error',
        message: `nurbsCurve: knot vector length should be ${expected} (controlPoints.length + degree + 1); got ${m.knots.length}.`,
        hint: HINT_TEMPLATES['feature.curve3d.knots-length-mismatch'].template,
      });
    }
  }

  if (m.closed === true && m.controlPoints.length >= 2) {
    const first = m.controlPoints[0];
    const last = m.controlPoints[m.controlPoints.length - 1];
    const eps = 1e-6;
    if (
      Math.abs(first[0] - last[0]) > eps ||
      Math.abs(first[1] - last[1]) > eps ||
      Math.abs(first[2] - last[2]) > eps
    ) {
      diagnostics.push({
        target: 'export-occt',
        code: 'feature.curve3d.closed-endpoints-mismatch',
        severity: 'warn',
        message: `nurbsCurve: closed=true but first (${first.join(',')}) and last (${last.join(',')}) control points differ.`,
        hint: HINT_TEMPLATES['feature.curve3d.closed-endpoints-mismatch'].template,
      });
    }
  }

  return {
    kind: 'curve3d',
    params: {},
    inputs: {},
    metadata: {
      curve3d: m,
      virtual: true,
      ...(diagnostics.length > 0 ? { diagnostics } : {}),
    },
  };
}

function isEmbossTextAnchorOutOfRange(anchor: Param): boolean {
  return !(anchor.evaluated >= 0 && anchor.evaluated <= 1);
}

function validateEmbossTextFields(
  args: EmbossTextCaptureArgs,
  diagnostics: CompilerDiagnostic[],
): { depthParam: Param; anchorUParam: Param; anchorVParam: Param } {
  if (typeof args.textContent !== 'string' || args.textContent.trim().length === 0) {
    diagnostics.push({
      target: 'export-occt',
      code: 'sketch.text.empty-content',
      severity: 'error',
      message: `embossText: textContent must be a non-empty string with at least one printable glyph; got ${JSON.stringify(args.textContent)}.`,
      hint: HINT_TEMPLATES['sketch.text.empty-content'].template,
    });
  }

  const depthParam = toParam(args.depth, 'mm');
  if (depthParam.evaluated === 0) {
    diagnostics.push({
      target: 'export-occt',
      code: 'feature.emboss-text.depth-zero',
      severity: 'error',
      message: 'embossText: depth must be non-zero (positive=emboss out, negative=engrave in); got 0.',
      hint: HINT_TEMPLATES['feature.emboss-text.depth-zero'].template,
    });
  }

  const anchorUParam = toParam(args.anchorU ?? 0.5, 'unitless');
  const anchorVParam = toParam(args.anchorV ?? 0.5, 'unitless');
  if (isEmbossTextAnchorOutOfRange(anchorUParam) || isEmbossTextAnchorOutOfRange(anchorVParam)) {
    diagnostics.push({
      target: 'export-occt',
      code: 'feature.face.invalid-uv-anchor',
      severity: 'error',
      message: `embossText: anchor must lie in [0, 1]; got anchorU=${anchorUParam.evaluated}, anchorV=${anchorVParam.evaluated}.`,
      hint: HINT_TEMPLATES['feature.face.invalid-uv-anchor'].template,
    });
  }

  return { depthParam, anchorUParam, anchorVParam };
}

export function buildEmbossTextFeatureSpec(
  parentFeatureId: FeatureId,
  args: EmbossTextCaptureArgs,
  faceInputRef: FeatureRef,
): AuthoringFeatureSpec {
  const diagnostics: CompilerDiagnostic[] = [];
  const { depthParam, anchorUParam, anchorVParam } = validateEmbossTextFields(args, diagnostics);

  const faceRef =
    faceInputRef.kind === 'face'
      ? faceInputRef.ref
      : { kind: 'canonical' as const, face: 'top' as const };
  const metadata: EmbossTextMetadata & { diagnostics?: CompilerDiagnostic[] } = {
    textContent: args.textContent,
    ...(args.fontFamily !== undefined ? { fontFamily: args.fontFamily } : {}),
    size: toParam(args.size, 'mm'),
    depth: depthParam,
    align: args.align ?? 'center',
    anchorU: anchorUParam,
    anchorV: anchorVParam,
    rotation: toParam(args.rotation ?? 0, 'deg'),
    scaleMode: args.scaleMode ?? 'original',
    faceRef,
    ...(diagnostics.length > 0 ? { diagnostics } : {}),
  };

  return {
    kind: 'embossText',
    params: {},
    inputs: {
      parent: { kind: 'feature', id: parentFeatureId },
      face: faceInputRef,
    },
    metadata: metadata as unknown as Record<string, unknown>,
  };
}

export function buildProjectCurveFeatureSpec(
  parentFeatureId: FeatureId,
  args: ProjectCurveCaptureArgs,
  faceInputRef: FeatureRef,
): AuthoringFeatureSpec {
  const diagnostics: CompilerDiagnostic[] = [];

  if (args.source.kind === 'sketchCommands' && args.source.commands.length === 0) {
    diagnostics.push({
      target: 'export-occt',
      code: 'feature.project-curve.curve-empty',
      severity: 'error',
      message: 'projectCurve: source.commands is empty; nothing to project.',
      hint: HINT_TEMPLATES['feature.project-curve.curve-empty'].template,
    });
  }

  const faceRef =
    faceInputRef.kind === 'face'
      ? faceInputRef.ref
      : { kind: 'canonical' as const, face: 'top' as const };
  const metadata: ProjectCurveMetadata & { diagnostics?: CompilerDiagnostic[] } = {
    source: args.source,
    scaleMode: args.scaleMode ?? 'original',
    asEdge: args.asEdge ?? false,
    faceRef,
    ...(diagnostics.length > 0 ? { diagnostics } : {}),
  };

  return {
    kind: 'projectCurve',
    params: {},
    inputs: {
      parent: { kind: 'feature', id: parentFeatureId },
      face: faceInputRef,
    },
    metadata: metadata as unknown as Record<string, unknown>,
  };
}

/** Capture-time validation + normalization for `shape.feaStudy({...})`.
 *
 *  Every malformed field THROWS rather than stashing a diagnostic, for the
 *  same reason `dfmSpec` does: a structural study is an enforcement gate, and
 *  a gate that quietly disabled itself because a selector was misspelled is
 *  strictly worse than a build failure. The one thing this validator does NOT
 *  do is resolve the face selectors — that needs lowered geometry, so it
 *  happens in the runner and surfaces as `fea.study.*-unresolved`. */
export function buildFeaStudyFeatureSpec(args: FeaStudySpec, shapeRef: FeatureRef): AuthoringFeatureSpec {
  const bad: BadFn = (field: string, why: string): never => {
    throw new KernelError(
      'feature.invalid-args',
      `feaStudy: ${field} ${why}.`,
      undefined,
      `invalid-args.fea-study.${field} — fix the field; feaStudy is an enforcement gate, malformed declarations fail the build rather than silently disabling the check.`,
    );
  };

  validateFeaStudyHeader(args, bad);
  const loads = validateFeaStudyLoads(args.loads, bad);
  validateFeaStudyOptions(args, bad);

  const metadata: FeaStudyMetadata = {
    virtual: true,
    name: args.name ?? 'study',
    material: args.material,
    fixed: args.fixed,
    loads,
    ...(args.meshSize !== undefined ? { meshSize: args.meshSize } : {}),
    ...(args.minSafetyFactor !== undefined ? { minSafetyFactor: args.minSafetyFactor } : {}),
  };

  return {
    kind: 'feaStudy',
    params: {},
    inputs: { shape: shapeRef },
    metadata: metadata as unknown as Record<string, unknown>,
  };
}

function validFeaSelector(v: unknown): boolean {
  return (typeof v === 'string' && v.length > 0) || (typeof v === 'object' && v !== null && !Array.isArray(v));
}

function validateFeaStudyHeader(args: FeaStudySpec, bad: BadFn): void {
  if (args === null || typeof args !== 'object') bad('spec', 'must be an object');
  if (args.material === undefined) {
    bad('material', 'is required; pass a grade name or { E, nu, yield } in MPa');
  }
  const mat = resolveFeaMaterial(args.material);
  if (!mat.ok) {
    throw new KernelError('feature.invalid-args', mat.message, undefined, mat.hint);
  }
  if (!validFeaSelector(args.fixed)) {
    bad('fixed', `must be a FaceQuery object or a '@kc[...]' ref string; got ${JSON.stringify(args.fixed)}`);
  }
  if (!Array.isArray(args.loads) || args.loads.length === 0) {
    bad('loads', 'must be a non-empty array — a study with no load reports nothing');
  }
}

function validateFeaStudyLoads(loads: FeaStudySpec['loads'], bad: BadFn): FeaLoadMetadata[] {
  const out: FeaLoadMetadata[] = [];
  for (const [i, load] of loads.entries()) {
    if (load === null || typeof load !== 'object') bad(`loads[${i}]`, 'must be an object');
    if (!validFeaSelector(load.faces)) {
      bad(`loads[${i}].faces`, `must be a FaceQuery object or a '@kc[...]' ref string; got ${JSON.stringify(load.faces)}`);
    }
    const f = load.force;
    if (!Array.isArray(f) || f.length !== 3 || !f.every(v => typeof v === 'number' && Number.isFinite(v))) {
      bad(`loads[${i}].force`, `must be three finite numbers [Fx, Fy, Fz] in newtons; got ${JSON.stringify(f)}`);
    }
    if (f[0] === 0 && f[1] === 0 && f[2] === 0) {
      bad(`loads[${i}].force`, 'is the zero vector; a zero load would report an infinite safety factor');
    }
    if (load.name !== undefined && (typeof load.name !== 'string' || load.name.length === 0)) {
      bad(`loads[${i}].name`, `must be a non-empty string; got ${JSON.stringify(load.name)}`);
    }
    out.push({
      faces: load.faces,
      force: [f[0], f[1], f[2]],
      name: load.name ?? `load${i}`,
    });
  }
  return out;
}

function validateFeaStudyOptions(args: FeaStudySpec, bad: BadFn): void {
  if (args.meshSize !== undefined && !(Number.isFinite(args.meshSize) && args.meshSize > 0)) {
    bad('meshSize', `must be a positive finite number of mm; got ${args.meshSize}`);
  }
  if (
    args.minSafetyFactor !== undefined &&
    !(Number.isFinite(args.minSafetyFactor) && args.minSafetyFactor > 0)
  ) {
    bad('minSafetyFactor', `must be a positive finite number; got ${args.minSafetyFactor}`);
  }
  if (args.name !== undefined && (typeof args.name !== 'string' || args.name.length === 0)) {
    bad('name', `must be a non-empty string; got ${JSON.stringify(args.name)}`);
  }
}

const isQueryObject = (v: unknown): boolean =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const invalidGdt = (method: 'datum' | 'tolerance', field: string, why: string): never => {
  throw new KernelError(
    'feature.invalid-args',
    `${method}: ${field} ${why}.`,
    undefined,
    `invalid-args.drawing-${method}.${field} — fix the field; a GD&T declaration that silently vanished from the drawing would be worse than a build failure.`,
  );
};

/** Capture-time validation for `shape.datum(label, face)`. The face query is
 *  resolved by the drawing exporter against the exported geometry, where a
 *  miss surfaces as `drawing.datum.unresolved`. A letter already claimed by
 *  an earlier declaration fails here, because two faces cannot both be A. */
export function buildDrawingDatumFeatureSpec(
  label: unknown,
  face: unknown,
  shapeRef: FeatureRef,
  existingLabels: readonly string[],
): AuthoringFeatureSpec {
  if (typeof label !== 'string' || !DATUM_LABEL_RE.test(label)) {
    invalidGdt('datum', 'label', `must be one or two capital letters other than I, O and Q; got ${JSON.stringify(label)}`);
  }
  const letter = label as string;
  if (existingLabels.includes(letter)) {
    invalidGdt('datum', 'label', `'${letter}' is already declared by an earlier datum() call`);
  }
  if (!isQueryObject(face)) {
    invalidGdt('datum', 'face', `must be a FaceQuery object such as { atZ: 0 }; got ${JSON.stringify(face)}`);
  }
  const metadata: DrawingDatumMetadata = {
    virtual: true,
    label: letter,
    face: face as DrawingDatumMetadata['face'],
  };
  return {
    kind: 'drawingDatum',
    params: {},
    inputs: { shape: shapeRef },
    metadata: metadata as unknown as Record<string, unknown>,
  };
}

/** Capture-time validation for `shape.tolerance({...})`. */
export function buildDrawingToleranceFeatureSpec(
  spec: DrawingToleranceSpec,
  shapeRef: FeatureRef,
): AuthoringFeatureSpec {
  const { hasFace, hasEdge } = validateToleranceTarget(spec);
  const datums = validateToleranceDatums(spec);
  validateToleranceModifier(spec);
  const metadata = buildToleranceMetadata(spec, hasFace, hasEdge, datums);
  return {
    kind: 'drawingTolerance',
    params: {},
    inputs: { shape: shapeRef },
    metadata: metadata as unknown as Record<string, unknown>,
  };
}

function validateToleranceTarget(
  spec: DrawingToleranceSpec,
): { readonly hasFace: boolean; readonly hasEdge: boolean } {
  if (!isQueryObject(spec)) invalidGdt('tolerance', 'spec', 'must be an object');
  if (!GDT_TYPES.includes(spec.type)) {
    invalidGdt('tolerance', 'type', `must be one of ${GDT_TYPES.join(' | ')}; got ${JSON.stringify(spec.type)}`);
  }
  if (typeof spec.value !== 'number' || !Number.isFinite(spec.value) || spec.value <= 0) {
    invalidGdt('tolerance', 'value', `must be a positive finite number of mm; got ${JSON.stringify(spec.value)}`);
  }
  const hasFace = spec.face !== undefined;
  const hasEdge = spec.edge !== undefined;
  if (hasFace === hasEdge) {
    invalidGdt('tolerance', 'face', 'or edge: exactly one of the two is required');
  }
  if (hasFace && !isQueryObject(spec.face)) {
    invalidGdt('tolerance', 'face', `must be a FaceQuery object; got ${JSON.stringify(spec.face)}`);
  }
  if (hasEdge && !isQueryObject(spec.edge)) {
    invalidGdt('tolerance', 'edge', `must be an EdgeQuery object; got ${JSON.stringify(spec.edge)}`);
  }
  return { hasFace, hasEdge };
}

function validateToleranceDatums(spec: DrawingToleranceSpec): string[] {
  const datums = spec.datums ?? [];
  if (!Array.isArray(datums)) {
    invalidGdt('tolerance', 'datums', `must be an array of datum letters; got ${JSON.stringify(spec.datums)}`);
  }
  for (const d of datums) {
    if (typeof d !== 'string' || !DATUM_LABEL_RE.test(d)) {
      invalidGdt('tolerance', 'datums', `entries must be datum letters such as 'A'; got ${JSON.stringify(d)}`);
    }
  }
  if (new Set(datums).size !== datums.length) {
    invalidGdt('tolerance', 'datums', `must not repeat a letter; got ${JSON.stringify(datums)}`);
  }
  if (GDT_FORM_TYPES.includes(spec.type) && datums.length > 0) {
    invalidGdt('tolerance', 'datums', `must be empty for ${spec.type}: a form tolerance controls the feature on its own`);
  }
  return [...datums];
}

function validateToleranceModifier(spec: DrawingToleranceSpec): void {
  if (spec.modifier !== undefined && !GDT_MODIFIERS.includes(spec.modifier)) {
    invalidGdt('tolerance', 'modifier', `must be one of ${GDT_MODIFIERS.join(' | ')}; got ${JSON.stringify(spec.modifier)}`);
  }
}

function buildToleranceMetadata(
  spec: DrawingToleranceSpec,
  hasFace: boolean,
  hasEdge: boolean,
  datums: readonly string[],
): DrawingToleranceMetadata {
  return {
    virtual: true,
    type: spec.type,
    value: spec.value,
    ...(hasFace ? { face: spec.face } : {}),
    ...(hasEdge ? { edge: spec.edge } : {}),
    datums: [...datums],
    ...(spec.modifier !== undefined ? { modifier: spec.modifier } : {}),
  };
}
