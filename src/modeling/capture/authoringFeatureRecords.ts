// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { FeatureKind, FeatureId, FeatureRef, Param } from '../../shared/intent/types';
import type { DfmSpec, DfmSpecMetadata } from '../../shared/intent/dfmSpecRecord';
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

export function buildDfmSpecFeatureSpec(args: DfmSpec): AuthoringFeatureSpec {
  const bad = (field: string, why: string): never => {
    throw new KernelError(
      'feature.invalid-args',
      `dfmSpec: ${field} ${why}.`,
      undefined,
      `invalid-args.dfm-spec.${field} — fix the field; dfmSpec is an enforcement gate, malformed declarations fail the build rather than silently disabling checks.`,
    );
  };

  if (args.minWall === undefined && args.minClearance === undefined && !(args.channels?.length)) {
    bad('spec', 'declares no checks; pass minWall, minClearance, and/or channels');
  }
  if (args.minWall !== undefined && !(Number.isFinite(args.minWall) && args.minWall > 0)) {
    bad('minWall', `must be a positive finite number; got ${args.minWall}`);
  }
  if (args.minClearance !== undefined && !(Number.isFinite(args.minClearance) && args.minClearance > 0)) {
    bad('minClearance', `must be a positive finite number; got ${args.minClearance}`);
  }
  if (args.includeArticulatedMates !== undefined && typeof args.includeArticulatedMates !== 'boolean') {
    bad('includeArticulatedMates', `must be a boolean; got ${JSON.stringify(args.includeArticulatedMates)}`);
  }
  if (args.includeArticulatedMates === true && args.minClearance === undefined) {
    bad('includeArticulatedMates', 'requires minClearance because it only changes which pairs that distance gate measures');
  }
  if (args.ignore !== undefined && !Array.isArray(args.ignore)) {
    bad('ignore', `must be an array of [partA, partB] pairs; got ${JSON.stringify(args.ignore)}`);
  }
  if (args.exclude !== undefined && !Array.isArray(args.exclude)) {
    bad('exclude', `must be an array of part-name strings; got ${JSON.stringify(args.exclude)}`);
  }
  if (args.channels !== undefined && !Array.isArray(args.channels)) {
    bad('channels', `must be an array of { part, name, openings, sealed? } entries; got ${JSON.stringify(args.channels)}`);
  }
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
  for (const [i, name] of (args.exclude ?? []).entries()) {
    if (typeof name !== 'string' || name.length === 0) {
      bad(`exclude[${i}]`, `must be a non-empty part-name string; got ${JSON.stringify(name)}`);
    }
    const star = name.indexOf('*');
    if (star !== -1 && (star !== name.length - 1 || name.length === 1)) {
      bad(`exclude[${i}]`, `must be a literal part name or a trailing-'*' prefix glob (e.g. 'servo-*'); got ${JSON.stringify(name)}`);
    }
  }
  for (const [i, c] of (args.channels ?? []).entries()) {
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

  const channelKeys = new Set<string>();
  for (const [i, c] of (args.channels ?? []).entries()) {
    const key = JSON.stringify([c.part, c.name]);
    if (channelKeys.has(key)) {
      bad(`channels[${i}]`, `duplicates part '${c.part}' + name '${c.name}' declared at an earlier index`);
    }
    channelKeys.add(key);
  }

  const metadata: DfmSpecMetadata = {
    virtual: true,
    ...(args.minWall !== undefined ? { minWall: args.minWall } : {}),
    ...(args.minClearance !== undefined ? { minClearance: args.minClearance } : {}),
    includeArticulatedMates: args.includeArticulatedMates ?? false,
    ignore: (args.ignore ?? []).map(([a, b]) => [a, b] as const),
    exclude: [...(args.exclude ?? [])],
    channels: (args.channels ?? []).map(c => ({
      part: c.part, name: c.name, openings: c.openings, sealed: c.sealed ?? false,
    })),
  };

  return {
    kind: 'dfmSpec',
    params: {},
    inputs: {},
    metadata: metadata as unknown as Record<string, unknown>,
  };
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

export function buildEmbossTextFeatureSpec(
  parentFeatureId: FeatureId,
  args: EmbossTextCaptureArgs,
  faceInputRef: FeatureRef,
): AuthoringFeatureSpec {
  const diagnostics: CompilerDiagnostic[] = [];

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
  const outOfRangeU = !(anchorUParam.evaluated >= 0 && anchorUParam.evaluated <= 1);
  const outOfRangeV = !(anchorVParam.evaluated >= 0 && anchorVParam.evaluated <= 1);
  if (outOfRangeU || outOfRangeV) {
    diagnostics.push({
      target: 'export-occt',
      code: 'feature.face.invalid-uv-anchor',
      severity: 'error',
      message: `embossText: anchor must lie in [0, 1]; got anchorU=${anchorUParam.evaluated}, anchorV=${anchorVParam.evaluated}.`,
      hint: HINT_TEMPLATES['feature.face.invalid-uv-anchor'].template,
    });
  }

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
  const bad = (field: string, why: string): never => {
    throw new KernelError(
      'feature.invalid-args',
      `feaStudy: ${field} ${why}.`,
      undefined,
      `invalid-args.fea-study.${field} — fix the field; feaStudy is an enforcement gate, malformed declarations fail the build rather than silently disabling the check.`,
    );
  };

  const validSelector = (v: unknown): boolean =>
    (typeof v === 'string' && v.length > 0) || (typeof v === 'object' && v !== null && !Array.isArray(v));

  if (args === null || typeof args !== 'object') bad('spec', 'must be an object');
  if (args.material === undefined) {
    bad('material', 'is required; pass a grade name or { E, nu, yield } in MPa');
  }
  const mat = resolveFeaMaterial(args.material);
  if (!mat.ok) {
    throw new KernelError('feature.invalid-args', mat.message, undefined, mat.hint);
  }
  if (!validSelector(args.fixed)) {
    bad('fixed', `must be a FaceQuery object or a '@kc[...]' ref string; got ${JSON.stringify(args.fixed)}`);
  }
  if (!Array.isArray(args.loads) || args.loads.length === 0) {
    bad('loads', 'must be a non-empty array — a study with no load reports nothing');
  }
  const loads: FeaLoadMetadata[] = [];
  for (const [i, load] of args.loads.entries()) {
    if (load === null || typeof load !== 'object') bad(`loads[${i}]`, 'must be an object');
    if (!validSelector(load.faces)) {
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
    loads.push({
      faces: load.faces,
      force: [f[0], f[1], f[2]],
      name: load.name ?? `load${i}`,
    });
  }
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
  if (spec.modifier !== undefined && !GDT_MODIFIERS.includes(spec.modifier)) {
    invalidGdt('tolerance', 'modifier', `must be one of ${GDT_MODIFIERS.join(' | ')}; got ${JSON.stringify(spec.modifier)}`);
  }
  const metadata: DrawingToleranceMetadata = {
    virtual: true,
    type: spec.type,
    value: spec.value,
    ...(hasFace ? { face: spec.face } : {}),
    ...(hasEdge ? { edge: spec.edge } : {}),
    datums: [...datums],
    ...(spec.modifier !== undefined ? { modifier: spec.modifier } : {}),
  };
  return {
    kind: 'drawingTolerance',
    params: {},
    inputs: { shape: shapeRef },
    metadata: metadata as unknown as Record<string, unknown>,
  };
}
