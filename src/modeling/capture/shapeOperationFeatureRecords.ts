// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { FeatureMetadata } from '../../shared/intent/featureRecord';
import type { FeatureId, FeatureKind, FeatureRef, Param } from '../../shared/intent/types';
import type { FilletContinuity } from '../../shared/intent/filletContinuityRecord';
import { invalidArgs } from '../../shared/intent/invalidArgs';
import { parseTopoRef } from '../../kernel/naming/topoRef';
import { parseQuery } from '../../kernel/naming/parseQuery';
import { toParam } from '../../shared/runtime/editableHelpers';
import { isParamRef, type Editable } from '../../shared/runtime/paramRef';

export interface ShapeOperationFeatureSpec {
  kind: FeatureKind;
  params: Record<string, Param>;
  inputs: Record<string, FeatureRef>;
  metadata?: FeatureMetadata;
}

export type ShapeOperationFaceQuery = Record<string, unknown>;
export type ShapeOperationEdgeQuery = Record<string, unknown>;

export interface ShapeOperationEdgeSegment {
  id: string;
  midpoint: unknown;
  direction: unknown;
  curveType: unknown;
}

export interface ShapeOperationQueryValue {
  _kind: 'kc.query';
  target: string;
  ast: { op: string; [key: string]: unknown };
  lenient?: boolean;
}

export type ShapeOperationFaceSelector =
  | ShapeOperationFaceQuery
  | { face: ShapeOperationFaceSelector | string }
  | ShapeOperationQueryValue
  | string;

export type ShapeOperationEdgeSelector =
  | ShapeOperationEdgeQuery
  | ShapeOperationEdgeSegment
  | ShapeOperationEdgeSegment[]
  | string
  | string[]
  | { face: ShapeOperationFaceSelector | string }
  | ShapeOperationQueryValue
  | undefined;

export type ScalarEdgeFeatureKind = 'fillet' | 'chamfer' | 'shell';
export type ScalarEdgeValueKey = 'radius' | 'distance' | 'thickness';
export type VariableEdgeFeatureKind = 'fillet' | 'chamfer';
export type VariableEdgeValueKey = 'radius' | 'distance';

export interface ScalarEdgeFeatureOpts {
  continuity?: FilletContinuity;
}

export interface DraftFeatureOpts {
  face: ShapeOperationFaceSelector | string;
  neutralPlane?: string;
  pullDir?: [number, number, number];
}

export interface VariableEdgeGroup {
  edges: ShapeOperationEdgeSelector;
  radius?: Editable<number>;
  distance?: Editable<number>;
}

/** Build an `inputs.face` FeatureRef from a FaceSelector. Mirrors the
 *  face-handling branches of `buildEdgeFeatureRef` but specialized to
 *  callers (hole/holes/cutout) that always want a face ref, never an
 *  edges ref. */
export function buildFaceInputRef(
  baseId: FeatureId,
  face: ShapeOperationFaceSelector,
): FeatureRef {
  // Q8 — Query DSL value (kc.q.face(...)). Detect duck-type-shape and
  // serialize as a queryDsl FaceRef so the lowerer dispatches through
  // the Q3 evaluator at consume time.
  if (isQueryValue(face)) return queryDslFaceRef(baseId, face);
  // `{ face: <something> }` wrapper form
  if (typeof face === 'object' && face !== null && 'face' in face) {
    const faceVal = (face as { face: unknown }).face;
    if (typeof faceVal === 'string') return faceRefFromString(baseId, faceVal);
    // Wrapped Query value: { face: kc.q.face(...) }.
    if (isQueryValue(faceVal)) return queryDslFaceRef(baseId, faceVal);
    return {
      kind: 'face',
      featureId: baseId,
      ref: { kind: 'query', query: faceVal as never },
    };
  }
  if (typeof face === 'string') return faceRefFromString(baseId, face);
  // Bare FaceQuery object (no { face: ... } wrapper)
  return {
    kind: 'face',
    featureId: baseId,
    ref: { kind: 'query', query: face as never },
  };
}

function queryDslFaceRef(baseId: FeatureId, q: ShapeOperationQueryValue): FeatureRef {
  return {
    kind: 'face',
    featureId: baseId,
    ref: {
      kind: 'queryDsl',
      queryAst: q.ast as never,
      queryTarget: q.target as never,
      ...(q.lenient ? { lenient: true } : {}),
    },
  };
}

/** String face selector: an `@kc[...]` / `@kcq[...]` ref, a canonical face
 *  name, or a face label. */
function faceRefFromString(baseId: FeatureId, face: string): FeatureRef {
  if (isRefString(face)) return faceRefFromRefString(baseId, face);
  if (CANONICAL_FACES.has(face)) {
    return {
      kind: 'face',
      featureId: baseId,
      ref: { kind: 'canonical', face: face as 'top' },
    };
  }
  return {
    kind: 'face',
    featureId: baseId,
    ref: { kind: 'label', name: face },
  };
}

/** True for the `{ face: <selector> }` wrapper form (and not a segment). */
function isFaceWrapperSelector(selector: ShapeOperationEdgeSelector): boolean {
  return typeof selector === 'object' && selector !== null && 'face' in selector &&
    !('id' in selector && 'midpoint' in selector && 'direction' in selector && 'curveType' in selector);
}

/** True for a bare edge-segment descriptor (`{ id, midpoint, direction, curveType }`). */
function isEdgeSegmentSelector(selector: ShapeOperationEdgeSelector): boolean {
  return typeof selector === 'object' && selector !== null &&
    'id' in selector && 'midpoint' in selector && 'direction' in selector && 'curveType' in selector;
}

/** Query-DSL (`kc.q.*`) branch of {@link buildEdgeFeatureRef}. */
function buildQueryFeatureRef(
  baseId: FeatureId,
  selector: ShapeOperationQueryValue,
): { key: 'face' | 'edges'; value: FeatureRef } {
  const key: 'face' | 'edges' = selector.target === 'face' ? 'face' : 'edges';
  return {
    key,
    value: {
      kind: key === 'face' ? 'face' : 'edge',
      featureId: baseId,
      ref: {
        kind: 'queryDsl',
        queryAst: selector.ast as never,
        queryTarget: selector.target as never,
        ...(selector.lenient ? { lenient: true } : {}),
      },
    },
  };
}

/**
 * Translate the user-facing EdgeSelector (or face wrapper) into either an
 * `inputs.face` or `inputs.edges` FeatureRef. The lowerer dispatches on the
 * resulting ref kind.
 */
export function buildEdgeFeatureRef(
  baseId: FeatureId,
  selector: ShapeOperationEdgeSelector,
): { key: 'face' | 'edges'; value: FeatureRef } {
  if (isQueryValue(selector)) {
    return buildQueryFeatureRef(baseId, selector);
  }

  // A bare string: an `@kc[...]` / `@kcq[...]` ref, or a canonical face name
  // / face label (`.fillet(2, 'top')` ≡ `.fillet(2, { face: 'top' })`).
  // Without this branch the string was spread into an EdgeQuery and failed
  // with "unknown keys: 0, 1, 2, …".
  if (typeof selector === 'string') {
    return edgeFeatureRefFromString(baseId, selector);
  }

  if (Array.isArray(selector) && selector.length > 0 && selector.every((s) => typeof s === 'string')) {
    return {
      key: 'edges',
      value: {
        kind: 'edge',
        featureId: baseId,
        ref: { kind: 'segments', segmentIds: (selector as string[]).map((s) => edgeSegmentIdFromRef(baseId, s)) },
      },
    };
  }

  if (isFaceWrapperSelector(selector)) {
    return { key: 'face', value: buildFaceInputRef(baseId, (selector as { face: ShapeOperationFaceSelector }).face) };
  }

  if (isEdgeSegmentSelector(selector)) {
    return {
      key: 'edges',
      value: {
        kind: 'edge',
        featureId: baseId,
        ref: { kind: 'segment', segmentId: (selector as { id: string }).id },
      },
    };
  }

  if (Array.isArray(selector)) {
    const segmentIds = (selector as ShapeOperationEdgeSegment[]).map(s => s.id);
    return {
      key: 'edges',
      value: {
        kind: 'edge',
        featureId: baseId,
        ref: { kind: 'segments', segmentIds },
      },
    };
  }

  // Any other object is an EdgeQuery; key / value validation happens in
  // the kernel resolver (normalizeEdgeQuery) so every consumer shares it.
  return {
    key: 'edges',
    value: {
      kind: 'edge',
      featureId: baseId,
      ref: { kind: 'query', query: selector as never },
    },
  };
}

export function buildScalarEdgeFeatureSpec(
  kind: ScalarEdgeFeatureKind,
  baseId: FeatureId,
  valueParamName: ScalarEdgeValueKey,
  value: Editable<number>,
  selector?: ShapeOperationEdgeSelector,
  opts?: ScalarEdgeFeatureOpts,
): ShapeOperationFeatureSpec {
  const inputs = buildOperationInputs(baseId, selector);
  const metadata: FeatureMetadata | undefined =
    (kind === 'fillet' && opts?.continuity !== undefined)
      ? { continuity: opts.continuity }
      : undefined;

  return {
    kind,
    params: { [valueParamName]: toParam(value, 'mm') },
    inputs,
    ...(metadata !== undefined ? { metadata } : {}),
  };
}

export function buildBendFeatureSpec(
  baseId: FeatureId,
  angleParam: Param,
  radiusParam: Param,
  selector: ShapeOperationEdgeSelector,
): ShapeOperationFeatureSpec {
  return {
    kind: 'sheetMetalBend',
    params: { angle: angleParam, radius: radiusParam },
    inputs: buildOperationInputs(baseId, selector),
  };
}

export function buildDraftFeatureSpec(
  baseId: FeatureId,
  angleDeg: Editable<number>,
  opts: DraftFeatureOpts,
): ShapeOperationFeatureSpec {
  const faceSelector = typeof opts.face === 'string' || (typeof opts.face === 'object' && opts.face !== null && !('face' in opts.face))
    ? { face: opts.face }
    : (opts.face as { face: ShapeOperationFaceSelector | string });
  const ref = buildEdgeFeatureRef(baseId, faceSelector);
  const inputs: Record<string, FeatureRef> = {
    base: { kind: 'feature', id: baseId },
  };
  if (ref.key === 'face') inputs.face = ref.value;

  const neutralPlane = opts.neutralPlane ?? (typeof opts.face === 'string' ? opts.face : '');
  const metadata: FeatureMetadata = {
    neutralPlane,
    ...(opts.pullDir !== undefined ? { pullDir: opts.pullDir } : {}),
  };

  return {
    kind: 'draft',
    params: { angle: toParam(angleDeg, 'deg') },
    inputs,
    metadata,
  };
}

export function buildVariableEdgeFeatureSpec(
  kind: VariableEdgeFeatureKind,
  baseId: FeatureId,
  valueKey: VariableEdgeValueKey,
  groups: readonly VariableEdgeGroup[],
): ShapeOperationFeatureSpec {
  const inputs: Record<string, FeatureRef> = {
    base: { kind: 'feature', id: baseId },
  };
  const metadataGroups: Array<{ radius?: number | Param; distance?: number | Param }> = [];
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    const ref = buildEdgeFeatureRef(baseId, group.edges);
    inputs[`edge_group_${i}`] = ref.value;
    // A param() ParamRef is stored as a Param so the recompute pre-resolve
    // substitutes it. Plain numbers and already-built Param records keep
    // the historical record shape.
    const value = group[valueKey];
    const stored =
      value === undefined || typeof value === 'number'
        ? value
        : isParamRef(value)
          ? toParam(value, 'mm')
          : value;
    metadataGroups.push({ [valueKey]: stored });
  }
  return {
    kind,
    params: {},
    inputs,
    metadata: {
      variable: true,
      groups: metadataGroups,
    },
  };
}

function buildOperationInputs(
  baseId: FeatureId,
  selector?: ShapeOperationEdgeSelector,
): Record<string, FeatureRef> {
  const inputs: Record<string, FeatureRef> = {
    base: { kind: 'feature', id: baseId },
  };
  if (selector !== undefined) {
    const ref = buildEdgeFeatureRef(baseId, selector);
    if (ref.key === 'face') inputs.face = ref.value;
    if (ref.key === 'edges') inputs.edges = ref.value;
  }
  return inputs;
}

function isQueryValue(v: unknown): v is ShapeOperationQueryValue {
  return (
    typeof v === 'object' &&
    v !== null &&
    (v as { _kind?: unknown })._kind === 'kc.query' &&
    typeof (v as { target?: unknown }).target === 'string' &&
    typeof (v as { ast?: unknown }).ast === 'object' &&
    (v as { ast: { op?: unknown } }).ast !== null &&
    typeof (v as { ast: { op?: unknown } }).ast.op === 'string'
  );
}

const CANONICAL_FACES = new Set(['top', 'bottom', 'left', 'right', 'front', 'back']);

// ---------------------------------------------------------------------------
// `@kc[...]` / `@kcq[...]` ref strings as feature selectors.
// ---------------------------------------------------------------------------

function isRefString(s: string): boolean {
  return s.startsWith('@kc[') || s.startsWith('@kcq[');
}

function badRef(ref: string, why: string, hintTag: string, requires: string): never {
  return invalidArgs({
    api: 'fillet / chamfer / shell (…, selector)',
    path: 'selector',
    gotText: `${JSON.stringify(ref)} — ${why}`,
    requires,
    example: ".fillet(1, '@kc[box_1/edge/e3]') or .fillet(1, '@kc[box_1/face/top]')",
    hintSlug: `invalid-args.selector.${hintTag}`,
  });
}

const POSITIONAL_EDGE = /^e\d+$/;
const POSITIONAL_FACE = /^f\d+$/;

/** Map one `@kc[<owner>/edge/e<N>]` ref (the form list_edges / inspect emit)
 *  to its positional segment id. Positional ids index the edge list of the
 *  shape they were listed on, so the ref's owner must be the shape this
 *  feature is applied to. */
function edgeSegmentIdFromRef(baseId: FeatureId, ref: string): string {
  const parsed = parseTopoRef(ref);
  if ('error' in parsed) {
    badRef(ref, `malformed @kc[...] ref (${parsed.error}).`, 'bad-ref',
      "the exact ref string printed by inspect / list_edges, e.g. '@kc[box_1/edge/e3]'");
  }
  const name = parsed.segments.length === 1 ? parsed.segments[0] : undefined;
  if (parsed.kind !== 'edge' || name === undefined || !POSITIONAL_EDGE.test(name)) {
    badRef(ref, `only positional edge refs '@kc[<feature>/edge/e<N>]' can select edges here (got kind '${parsed.kind}').`,
      'bad-ref', "an edge ref from inspect({ of: 'edges' }), a face ref / face name (all edges of that face), or an EdgeQuery");
  }
  if (parsed.owner !== baseId) {
    badRef(ref, `edge ids are positional within the shape they were listed on ('${parsed.owner}'), but this feature is applied to '${baseId}'.`,
      'ref-owner-mismatch', `refs listed on '${baseId}' itself (inspect({ of: 'edges', feature_id: '${baseId}' })), or an EdgeQuery`);
  }
  return name;
}

/** `@kc[...]` / `@kcq[...]` string → face FeatureRef. Face refs resolve
 *  through the Query evaluator's `fromString` op (lineage-aware: the owner
 *  may be an upstream feature, the name a canonical face or label). */
function faceRefFromRefString(baseId: FeatureId, ref: string): FeatureRef {
  if (ref.startsWith('@kcq[')) {
    const q = parseQuery(ref);
    return {
      kind: 'face',
      featureId: baseId,
      ref: { kind: 'queryDsl', queryAst: q.ast as never, queryTarget: q.target as never },
    };
  }
  const parsed = parseTopoRef(ref);
  if ('error' in parsed) {
    badRef(ref, `malformed @kc[...] ref (${parsed.error}).`, 'bad-ref',
      "the exact ref string printed by inspect / list_faces, e.g. '@kc[box_1/face/top]'");
  }
  if (parsed.kind !== 'face') {
    badRef(ref, `expected a face ref, got kind '${parsed.kind}'.`, 'bad-ref',
      "a face ref '@kc[<feature>/face/<name>]'");
  }
  const name = parsed.segments[parsed.segments.length - 1];
  if (name !== undefined && POSITIONAL_FACE.test(name)) {
    badRef(ref, `positional face ids ('${name}') are not stable selectors and cannot be resolved by a feature.`,
      'positional-face-ref', "a canonical/labelled face ref (e.g. '@kc[box_1/face/top]'), a face label, or a FaceQuery such as { near: <centroid from inspect> }");
  }
  return {
    kind: 'face',
    featureId: baseId,
    ref: { kind: 'queryDsl', queryAst: { op: 'fromString', ref } as never, queryTarget: 'face' },
  };
}

/** Bare-string edge selector → `inputs.edges` (edge refs / @kcq edge
 *  queries) or `inputs.face` (face refs, canonical names, labels). */
function edgeFeatureRefFromString(
  baseId: FeatureId,
  selector: string,
): { key: 'face' | 'edges'; value: FeatureRef } {
  if (selector.startsWith('@kcq[')) {
    const q = parseQuery(selector);
    return buildQueryFeatureRef(baseId, q as unknown as ShapeOperationQueryValue);
  }
  if (selector.startsWith('@kc[')) {
    const parsed = parseTopoRef(selector);
    if (!('error' in parsed) && parsed.kind === 'face') {
      return { key: 'face', value: faceRefFromRefString(baseId, selector) };
    }
    return {
      key: 'edges',
      value: {
        kind: 'edge',
        featureId: baseId,
        ref: { kind: 'segment', segmentId: edgeSegmentIdFromRef(baseId, selector) },
      },
    };
  }
  return { key: 'face', value: buildFaceInputRef(baseId, selector) };
}
