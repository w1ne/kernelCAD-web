// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Candidate fixes, derived per diagnostic kind.
//
// The contract every generator here keeps: a candidate is a CONCRETE patch
// whose numbers come from geometry the kernel already computed, not from a
// guess about what the author meant. When no such derivation exists for a
// diagnostic kind, the code is simply absent from the table below and the
// caller reports `no-automatic-candidate` — an honest gap beats a plausible
// patch that quietly changes the design.

import * as ts from 'typescript';
import type { CompilerDiagnostic, DiagnosticCode } from '../../shared/diagnostics/diagnostic';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { ShapeBackend } from '../../kernel/backends/backend';
import type { Vec3 } from '../../shared/intent/types';
import { patchFromCharEdit, patchFromCharEdits } from './applyPatch';
import type { CharRange, ScriptSpanIndex } from './scriptSpans';
import type { RepairCandidate } from './types';
import {
  bboxOf,
  bboxSize,
  canonicalFaceAxes,
  centreAlignDelta,
  edgeMidpointCoordinates,
  minEdgeLengthOf,
} from './geometryFacts';

export interface CandidateContext {
  diagnostic: CompilerDiagnostic;
  diagnosticId: string;
  /** The feature the diagnostic is attributed to. */
  record: FeatureRecord;
  recordsById: ReadonlyMap<string, FeatureRecord>;
  spans: ScriptSpanIndex;
  /** Lowered shapes from the evaluation that produced the diagnostic. The
   *  failing feature itself is usually absent; its inputs are present. */
  shapes: ReadonlyMap<string, ShapeBackend>;
}

type CandidateGenerator = (ctx: CandidateContext) => RepairCandidate[];

/** Diagnostic kinds with a mechanical fix. Everything else is honestly
 *  reported as having no automatic candidate. */
const GENERATORS: Partial<Record<DiagnosticCode, CandidateGenerator>> = {
  'feature.edge-feature.short-edges-skipped': shrinkEdgeFeatureValue,
  'feature.subtractive-noop': restoreSubtractiveContact,
  'feature.intersection-empty': restoreIntersectionOverlap,
  'feature.selection.no-match': retargetEdgeSelector,
  'feature.label.unknown-name': substituteKnownLabel,
  'feature.emboss-text.depth-zero': setNonZeroEmbossDepth,
  'feature.face.invalid-uv-anchor': clampFaceAnchor,
};

/** Diagnostic codes this module can produce candidates for. */
export const REPAIRABLE_CODES: readonly DiagnosticCode[] =
  Object.keys(GENERATORS) as DiagnosticCode[];

export function deriveCandidates(ctx: CandidateContext): RepairCandidate[] {
  const generator = GENERATORS[ctx.diagnostic.code];
  if (generator === undefined) return [];
  try {
    return generator(ctx);
  } catch {
    // A generator that trips on an unexpected script shape must not take the
    // whole diagnostic report down with it — the region is still useful.
    return [];
  }
}

// --- feature.edge-feature.short-edges-skipped --------------------------------

/**
 * A fillet/chamfer whose value exceeds every adjacent edge cannot round
 * anything. The ceiling is half the shortest adjacent edge; offer a ladder
 * under it, largest first, so the repair keeps as much of the intended blend
 * as the geometry allows.
 */
function shrinkEdgeFeatureValue(ctx: CandidateContext): RepairCandidate[] {
  const { record, spans } = ctx;
  if (record.kind !== 'fillet' && record.kind !== 'chamfer') return [];
  const paramName = record.kind === 'fillet' ? 'radius' : 'distance';
  const current = record.params[paramName]?.evaluated;
  if (typeof current !== 'number') return [];

  const baseShape = inputShape(ctx, 'base');
  const minEdge = minEdgeLengthOf(baseShape);
  if (minEdge === undefined) return [];

  const call = callOf(ctx);
  const valueChars = call === undefined ? undefined : spans.argumentChars(call, 0);
  if (call === undefined || valueChars === undefined) return [];
  if (!isNumericLiteralText(spans.text.slice(valueChars.start, valueChars.end))) return [];

  const ceiling = minEdge / 2;
  const candidates: RepairCandidate[] = [];
  for (const fraction of [0.4, 0.25, 0.1]) {
    const value = round(minEdge * fraction, 3);
    if (value <= 0 || value >= current) continue;
    const patch = patchFromCharEdit(spans, valueChars, formatNumber(value));
    if (patch === undefined) continue;
    candidates.push({
      id: `${record.id}:shrink-${paramName}:${value}`,
      diagnosticId: ctx.diagnosticId,
      code: ctx.diagnostic.code,
      featureId: record.id,
      summary: `Reduce ${record.kind} ${paramName} from ${formatNumber(current)} mm to ${formatNumber(value)} mm.`,
      predictedEffect: `${record.kind} applies to every target edge instead of being skipped; the blend reads ${formatNumber(value)} mm.`,
      patch,
      evidence: {
        shortestAdjacentEdgeMm: round(minEdge, 4),
        maxFeasibleValueMm: round(ceiling, 4),
        currentValueMm: round(current, 4),
      },
    });
  }
  return candidates;
}

// --- feature.subtractive-noop ------------------------------------------------

/** A subtractive op that removed nothing never touched the body. The fix
 *  depends on how the op is aimed: a boolean aims with a placement, a hole
 *  aims with face-local (u, v). */
function restoreSubtractiveContact(ctx: CandidateContext): RepairCandidate[] {
  if (ctx.record.kind === 'boolean') {
    return overlapTranslationCandidates(ctx, {
      operandKey: 'cutter_0',
      baseKey: 'base',
      summaryVerb: 'cutter',
      effect: 'the cutter intersects the base, so the difference removes material',
    });
  }
  if (ctx.record.kind === 'hole') return recentreHoleOnFace(ctx);
  return [];
}

/** A hole authored outside its entry face's extent drills through air. Pull the
 *  (u, v) anchor back inside the face, derived from the target body's bbox. */
function recentreHoleOnFace(ctx: CandidateContext): RepairCandidate[] {
  const { record, spans } = ctx;
  const faceRef = record.inputs.face;
  const faceName =
    faceRef !== undefined && faceRef.kind === 'face' && faceRef.ref.kind === 'canonical'
      ? faceRef.ref.face
      : undefined;
  if (faceName === undefined) return [];
  const axes = canonicalFaceAxes(faceName);
  if (axes === undefined) return [];

  const targetBbox = bboxOf(inputShape(ctx, 'target'));
  if (targetBbox === undefined) return [];
  const size = bboxSize(targetBbox);
  const diameter = record.params.diameter?.evaluated ?? 0;
  // Keep the whole bore inside the face AND leave a wall around it. Clamping
  // to "half-extent less the bore radius" alone parks the bore tangent to the
  // face edge, which clears the no-op gate but cuts a notch instead of a hole.
  // One further bore radius of wall is the smallest margin that still reads as
  // a hole.
  const wall = diameter / 2;
  const halfU = Math.max(0, size[axes[0]] / 2 - diameter / 2 - wall);
  const halfV = Math.max(0, size[axes[1]] / 2 - diameter / 2 - wall);

  const call = callOf(ctx);
  if (call === undefined) return [];
  const uChars = spans.optionValueChars(call, 1, 'u');
  const vChars = spans.optionValueChars(call, 1, 'v');
  if (uChars === undefined && vChars === undefined) return [];

  const u = record.params.u?.evaluated ?? 0;
  const v = record.params.v?.evaluated ?? 0;
  const clampedU = clamp(u, -halfU, halfU);
  const clampedV = clamp(v, -halfV, halfV);

  const candidates: RepairCandidate[] = [];
  const clampEdits = buildAnchorEdits(spans, [
    { chars: uChars, current: u, next: clampedU },
    { chars: vChars, current: v, next: clampedV },
  ]);
  if (clampEdits.length > 0) {
    const patch = patchFromCharEdits(spans, clampEdits);
    if (patch !== undefined) {
      candidates.push({
        id: `${record.id}:clamp-uv`,
        diagnosticId: ctx.diagnosticId,
        code: ctx.diagnostic.code,
        featureId: record.id,
        summary: `Clamp the hole anchor onto the '${faceName}' face, one bore radius clear of its edge (u=${formatNumber(clampedU)}, v=${formatNumber(clampedV)}).`,
        predictedEffect: 'the bore lands on the face with wall around it and removes material',
        patch,
        evidence: {
          faceName,
          maxAnchorUmm: round(halfU, 4),
          maxAnchorVmm: round(halfV, 4),
          wallAroundBoreMm: round(wall, 4),
          requestedU: round(u, 4),
          requestedV: round(v, 4),
        },
      });
    }
  }

  // Fallback: the face centre always lies on a convex body.
  const centreEdits = buildAnchorEdits(spans, [
    { chars: uChars, current: u, next: 0 },
    { chars: vChars, current: v, next: 0 },
  ]);
  if (centreEdits.length > 0) {
    const patch = patchFromCharEdits(spans, centreEdits);
    if (patch !== undefined) {
      candidates.push({
        id: `${record.id}:centre-uv`,
        diagnosticId: ctx.diagnosticId,
        code: ctx.diagnostic.code,
        featureId: record.id,
        summary: `Move the hole to the centre of the '${faceName}' face (u=0, v=0).`,
        predictedEffect: 'the bore is centred on the entry face and removes material',
        patch,
        evidence: { faceName, requestedU: round(u, 4), requestedV: round(v, 4) },
      });
    }
  }
  return candidates;
}

// --- feature.intersection-empty ----------------------------------------------

function restoreIntersectionOverlap(ctx: CandidateContext): RepairCandidate[] {
  if (ctx.record.kind !== 'boolean') return [];
  return overlapTranslationCandidates(ctx, {
    operandKey: 'cutter_0',
    baseKey: 'base',
    summaryVerb: 'second operand',
    effect: 'the two bodies share volume, so the intersection is a real solid',
  });
}

/**
 * Move one boolean operand so the two bounding boxes coincide at their centres.
 * The placement is rewritten in the operand's own statement — which the repair
 * region admits as a parameter source of the boolean — either by correcting an
 * existing `.translate(…)` or by adding one to the chain.
 */
function overlapTranslationCandidates(
  ctx: CandidateContext,
  opts: { operandKey: string; baseKey: string; summaryVerb: string; effect: string },
): RepairCandidate[] {
  const { record, spans } = ctx;
  const operandRef = record.inputs[opts.operandKey];
  if (operandRef === undefined || operandRef.kind !== 'feature') return [];
  const operandRecord = ctx.recordsById.get(operandRef.id);
  if (operandRecord?.scriptLocation === undefined) return [];

  const baseBbox = bboxOf(inputShape(ctx, opts.baseKey));
  const operandBbox = bboxOf(ctx.shapes.get(operandRef.id));
  if (baseBbox === undefined || operandBbox === undefined) return [];
  const delta = centreAlignDelta(operandBbox, baseBbox);

  const operandCall = spans.callNodeAt(operandRecord.scriptLocation);
  if (operandCall === undefined) return [];

  const existingTranslate = spans.chainedCallAfter(operandCall, 'translate');
  const evidence = {
    baseBboxMm: formatVec([...baseBbox.min]) + ' .. ' + formatVec([...baseBbox.max]),
    operandBboxMm: formatVec([...operandBbox.min]) + ' .. ' + formatVec([...operandBbox.max]),
    centreAlignDeltaMm: formatVec(delta),
  };

  if (existingTranslate !== undefined) {
    const edits: Array<{ chars: CharRange; replacement: string }> = [];
    for (let axis = 0; axis < 3; axis++) {
      const chars = spans.argumentChars(existingTranslate, axis);
      if (chars === undefined) return [];
      const text = spans.text.slice(chars.start, chars.end);
      if (!isNumericLiteralText(text)) return [];
      const next = round(Number(text) + delta[axis], 4);
      edits.push({ chars, replacement: formatNumber(next) });
    }
    const patch = patchFromCharEdits(spans, edits);
    if (patch === undefined) return [];
    return [{
      id: `${record.id}:retarget-translate`,
      diagnosticId: ctx.diagnosticId,
      code: ctx.diagnostic.code,
      featureId: record.id,
      summary: `Move the ${opts.summaryVerb} by ${formatVec(delta)} mm so it overlaps the base.`,
      predictedEffect: opts.effect,
      patch,
      evidence,
    }];
  }

  const tail = spans.chainTail(operandCall);
  const insertAt: CharRange = { start: tail.getEnd(), end: tail.getEnd() };
  const patch = patchFromCharEdit(
    spans,
    insertAt,
    `.translate(${delta.map(n => formatNumber(round(n, 4))).join(', ')})`,
  );
  if (patch === undefined) return [];
  return [{
    id: `${record.id}:add-translate`,
    diagnosticId: ctx.diagnosticId,
    code: ctx.diagnostic.code,
    featureId: record.id,
    summary: `Place the ${opts.summaryVerb} at the base centre with .translate(${formatVec(delta)}).`,
    predictedEffect: opts.effect,
    patch,
    evidence,
  }];
}

// --- feature.selection.no-match ----------------------------------------------

/**
 * An `atX` / `atY` / `atZ` selector that matched nothing is pointing at a
 * coordinate the shape has no edge on. Retarget it to the nearest coordinate
 * that does carry edges.
 */
function retargetEdgeSelector(ctx: CandidateContext): RepairCandidate[] {
  const { record, spans } = ctx;
  const call = callOf(ctx);
  if (call === undefined) return [];
  const baseShape = inputShape(ctx, 'base');
  if (baseShape === undefined) return [];

  const axisKeys: Array<{ key: 'atX' | 'atY' | 'atZ'; axis: 0 | 1 | 2 }> = [
    { key: 'atX', axis: 0 },
    { key: 'atY', axis: 1 },
    { key: 'atZ', axis: 2 },
  ];

  for (const { key, axis } of axisKeys) {
    const chars = findOptionInAnyArgument(spans, call, key);
    if (chars === undefined) continue;
    const text = spans.text.slice(chars.start, chars.end);
    if (!isNumericLiteralText(text)) continue;
    const requested = Number(text);
    const available = edgeMidpointCoordinates(baseShape, axis);
    if (available.length === 0) continue;

    const ranked = [...available].sort(
      (a, b) => Math.abs(a - requested) - Math.abs(b - requested),
    );
    const candidates: RepairCandidate[] = [];
    for (const value of ranked.slice(0, 2)) {
      const patch = patchFromCharEdit(spans, chars, formatNumber(round(value, 4)));
      if (patch === undefined) continue;
      candidates.push({
        id: `${record.id}:retarget-${key}:${round(value, 4)}`,
        diagnosticId: ctx.diagnosticId,
        code: ctx.diagnostic.code,
        featureId: record.id,
        summary: `Retarget ${key} from ${formatNumber(requested)} to ${formatNumber(round(value, 4))}, where the shape has edges.`,
        predictedEffect: `${record.kind} selects the edge loop at ${key}=${formatNumber(round(value, 4))} instead of matching nothing`,
        patch,
        evidence: {
          requested: round(requested, 4),
          nearestEdgeCoordinate: round(value, 4),
          availableCoordinates: available.map(n => formatNumber(round(n, 3))).join(', '),
        },
      });
    }
    if (candidates.length > 0) return candidates;
  }
  return [];
}

// --- feature.label.unknown-name ----------------------------------------------

/** A label that resolves nowhere is usually a near-miss on a label the model
 *  really declares. Offer the declared labels, closest spelling first. */
function substituteKnownLabel(ctx: CandidateContext): RepairCandidate[] {
  const { record, spans } = ctx;
  const known = declaredLabels(ctx);
  if (known.length === 0) return [];

  const call = callOf(ctx);
  if (call === undefined) return [];
  const target = findUnknownLabelLiteral(spans, call, known);
  if (target === undefined) return [];

  const ranked = [...known].sort(
    (a, b) => editDistance(a, target.value) - editDistance(b, target.value),
  );
  const candidates: RepairCandidate[] = [];
  for (const label of ranked.slice(0, 3)) {
    const patch = patchFromCharEdit(spans, target.chars, quote(label, target.quoteChar));
    if (patch === undefined) continue;
    candidates.push({
      id: `${record.id}:relabel:${label}`,
      diagnosticId: ctx.diagnosticId,
      code: ctx.diagnostic.code,
      featureId: record.id,
      summary: `Use the declared label '${label}' instead of '${target.value}'.`,
      predictedEffect: `${record.kind} resolves against the '${label}' face declared upstream`,
      patch,
      evidence: {
        unknownLabel: target.value,
        declaredLabels: known.join(', '),
        editDistance: editDistance(label, target.value),
      },
    });
  }
  return candidates;
}

/**
 * Every label this script declares, from both declaration sites: `faceLabels`
 * on a creating op, and `path().label(...)` on a sketch segment. A suggestion
 * drawn from only one of the two would miss the common case.
 */
function declaredLabels(ctx: CandidateContext): string[] {
  const labels = new Set<string>();
  for (const record of ctx.recordsById.values()) {
    for (const name of Object.keys(record.metadata?.faceLabels ?? {})) labels.add(name);
    const commands = record.metadata?.commands;
    if (!Array.isArray(commands)) continue;
    for (const command of commands as Array<{ label?: unknown }>) {
      if (typeof command?.label === 'string') labels.add(command.label);
    }
  }
  return [...labels];
}

function findUnknownLabelLiteral(
  spans: ScriptSpanIndex,
  call: ts.CallExpression,
  known: readonly string[],
): { chars: CharRange; value: string; quoteChar: string } | undefined {
  let found: { chars: CharRange; value: string; quoteChar: string } | undefined;
  const visit = (node: ts.Node): void => {
    if (found !== undefined) return;
    if (ts.isStringLiteralLike(node) && !known.includes(node.text)) {
      const text = spans.text.slice(node.getStart(), node.getEnd());
      found = {
        chars: { start: node.getStart(), end: node.getEnd() },
        value: node.text,
        quoteChar: text.startsWith('"') ? '"' : "'",
      };
      return;
    }
    ts.forEachChild(node, visit);
  };
  for (const argument of call.arguments) visit(argument);
  return found;
}

// --- feature.emboss-text.depth-zero ------------------------------------------

/** Zero depth neither embosses nor engraves. Pick a depth the base body can
 *  carry: 5 % of its thinnest dimension, capped at a legible 0.4 mm. */
function setNonZeroEmbossDepth(ctx: CandidateContext): RepairCandidate[] {
  const { record, spans } = ctx;
  if (record.kind !== 'embossText') return [];
  const parentBbox = bboxOf(inputShape(ctx, 'parent'));
  if (parentBbox === undefined) return [];
  const thinnest = Math.min(...bboxSize(parentBbox));
  const depth = round(Math.max(0.05, Math.min(0.4, thinnest * 0.05)), 3);

  const call = callOf(ctx);
  const chars = call === undefined ? undefined : spans.optionValueChars(call, 0, 'depth');
  if (chars === undefined) return [];
  const patch = patchFromCharEdit(spans, chars, formatNumber(depth));
  if (patch === undefined) return [];

  return [{
    id: `${record.id}:emboss-depth:${depth}`,
    diagnosticId: ctx.diagnosticId,
    code: ctx.diagnostic.code,
    featureId: record.id,
    summary: `Set the emboss depth to ${formatNumber(depth)} mm (positive = raised).`,
    predictedEffect: `the glyphs stand ${formatNumber(depth)} mm proud of the face instead of being a no-op`,
    patch,
    evidence: { thinnestBaseDimensionMm: round(thinnest, 4), chosenDepthMm: depth },
  }];
}

// --- feature.face.invalid-uv-anchor ------------------------------------------

/** Face-local anchors are normalised: anything outside [0, 1] is off the face.
 *  Clamp back onto it. */
function clampFaceAnchor(ctx: CandidateContext): RepairCandidate[] {
  const { record, spans } = ctx;
  const call = callOf(ctx);
  if (call === undefined) return [];

  const edits: Array<{ chars: CharRange; replacement: string }> = [];
  const evidence: Record<string, string | number> = {};
  for (const key of ['anchorU', 'anchorV'] as const) {
    const chars = findOptionInAnyArgument(spans, call, key);
    if (chars === undefined) continue;
    const text = spans.text.slice(chars.start, chars.end);
    if (!isNumericLiteralText(text)) continue;
    const value = Number(text);
    if (value >= 0 && value <= 1) continue;
    const clamped = clamp(value, 0, 1);
    edits.push({ chars, replacement: formatNumber(clamped) });
    evidence[`${key}Requested`] = value;
    evidence[`${key}Clamped`] = clamped;
  }
  if (edits.length === 0) return [];
  const patch = patchFromCharEdits(spans, edits);
  if (patch === undefined) return [];

  return [{
    id: `${record.id}:clamp-anchor`,
    diagnosticId: ctx.diagnosticId,
    code: ctx.diagnostic.code,
    featureId: record.id,
    summary: 'Clamp the face anchor into the [0, 1] face-local range.',
    predictedEffect: 'the feature anchors on the target face instead of past its edge',
    patch,
    evidence,
  }];
}

// --- shared helpers -----------------------------------------------------------

function callOf(ctx: CandidateContext): ts.CallExpression | undefined {
  const location = ctx.record.scriptLocation;
  if (location === undefined) return undefined;
  return ctx.spans.callNodeAt(location);
}

function inputShape(ctx: CandidateContext, key: string): ShapeBackend | undefined {
  const ref = ctx.record.inputs[key];
  if (ref === undefined || ref.kind !== 'feature') return undefined;
  return ctx.shapes.get(ref.id);
}

/** Look for an option key in any object-literal argument of the call — edge
 *  selectors and feature options ride in different argument slots per API. */
function findOptionInAnyArgument(
  spans: ScriptSpanIndex,
  call: ts.CallExpression,
  name: string,
): CharRange | undefined {
  for (let index = 0; index < call.arguments.length; index++) {
    const chars = spans.optionValueChars(call, index, name);
    if (chars !== undefined) return chars;
  }
  return undefined;
}

function buildAnchorEdits(
  spans: ScriptSpanIndex,
  wanted: ReadonlyArray<{ chars: CharRange | undefined; current: number; next: number }>,
): Array<{ chars: CharRange; replacement: string }> {
  const edits: Array<{ chars: CharRange; replacement: string }> = [];
  for (const item of wanted) {
    if (item.chars === undefined) continue;
    if (!isNumericLiteralText(spans.text.slice(item.chars.start, item.chars.end))) continue;
    if (round(item.current, 6) === round(item.next, 6)) continue;
    edits.push({ chars: item.chars, replacement: formatNumber(round(item.next, 4)) });
  }
  return edits;
}

function isNumericLiteralText(text: string): boolean {
  return /^-?\d+(\.\d+)?$/.test(text.trim());
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value);
}

function formatVec(vec: Vec3 | number[]): string {
  return `(${vec.map(n => formatNumber(round(n, 4))).join(', ')})`;
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

function quote(value: string, quoteChar: string): string {
  return `${quoteChar}${value}${quoteChar}`;
}

/** Levenshtein distance — ranks label suggestions by spelling proximity. */
function editDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const columns = b.length + 1;
  let previous = Array.from({ length: columns }, (_, i) => i);
  for (let i = 1; i < rows; i++) {
    const current = [i];
    for (let j = 1; j < columns; j++) {
      const substitution = previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, substitution);
    }
    previous = current;
  }
  return previous[columns - 1];
}
