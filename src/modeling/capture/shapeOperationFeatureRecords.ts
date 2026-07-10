// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { FeatureMetadata } from '../../shared/intent/featureRecord';
import type { FeatureId, FeatureKind, FeatureRef, Param } from '../../shared/intent/types';
import type { FilletContinuity } from '../../shared/intent/filletContinuityRecord';
import { EDGE_QUERY_KEYS as EDGE_QUERY_KEYS_ARR } from '../../shared/intent/queryKeys';
import { toParam } from '../../shared/runtime/editableHelpers';
import type { Editable } from '../../shared/runtime/paramRef';

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
  if (isQueryValue(face)) {
    return {
      kind: 'face',
      featureId: baseId,
      ref: {
        kind: 'queryDsl',
        queryAst: face.ast as never,
        queryTarget: face.target as never,
        ...(face.lenient ? { lenient: true } : {}),
      },
    };
  }
  // `{ face: <something> }` wrapper form
  if (typeof face === 'object' && face !== null && 'face' in face) {
    const faceVal = (face as { face: unknown }).face;
    if (typeof faceVal === 'string') {
      if (CANONICAL_FACES.has(faceVal)) {
        return {
          kind: 'face',
          featureId: baseId,
          ref: { kind: 'canonical', face: faceVal as 'top' },
        };
      }
      return {
        kind: 'face',
        featureId: baseId,
        ref: { kind: 'label', name: faceVal },
      };
    }
    // Wrapped Query value: { face: kc.q.face(...) }.
    if (isQueryValue(faceVal)) {
      return {
        kind: 'face',
        featureId: baseId,
        ref: {
          kind: 'queryDsl',
          queryAst: faceVal.ast as never,
          queryTarget: faceVal.target as never,
          ...(faceVal.lenient ? { lenient: true } : {}),
        },
      };
    }
    return {
      kind: 'face',
      featureId: baseId,
      ref: { kind: 'query', query: faceVal as never },
    };
  }
  if (typeof face === 'string') {
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
  // Bare FaceQuery object (no { face: ... } wrapper)
  return {
    kind: 'face',
    featureId: baseId,
    ref: { kind: 'query', query: face as never },
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

  if (typeof selector === 'object' && selector !== null && 'face' in selector &&
      !('id' in selector && 'midpoint' in selector && 'direction' in selector && 'curveType' in selector)) {
    return { key: 'face', value: buildFaceInputRef(baseId, (selector as { face: ShapeOperationFaceSelector }).face) };
  }

  if (typeof selector === 'object' && selector !== null &&
      'id' in selector && 'midpoint' in selector && 'direction' in selector && 'curveType' in selector) {
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
    const segmentIds = selector.map(s => s.id);
    return {
      key: 'edges',
      value: {
        kind: 'edge',
        featureId: baseId,
        ref: { kind: 'segments', segmentIds },
      },
    };
  }

  if (typeof selector === 'object' && selector !== null) {
    const keys = Object.keys(selector);
    if (keys.length > 0 && keys.every(k => EDGE_QUERY_KEYS.has(k))) {
      return {
        key: 'edges',
        value: {
          kind: 'edge',
          featureId: baseId,
          ref: { kind: 'query', query: selector as never },
        },
      };
    }
    return {
      key: 'edges',
      value: {
        kind: 'edge',
        featureId: baseId,
        ref: { kind: 'query', query: selector as never },
      },
    };
  }

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
  const metadataGroups: Array<{ radius?: Editable<number>; distance?: Editable<number> }> = [];
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    const ref = buildEdgeFeatureRef(baseId, group.edges);
    inputs[`edge_group_${i}`] = ref.value;
    metadataGroups.push({ [valueKey]: group[valueKey] });
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
const EDGE_QUERY_KEYS = new Set<string>(EDGE_QUERY_KEYS_ARR);
