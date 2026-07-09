// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { FeatureKind, FeatureId, FeatureRef, Param } from '../../shared/intent/types';
import type { DfmSpec, DfmSpecMetadata } from '../../shared/intent/dfmSpecRecord';
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
