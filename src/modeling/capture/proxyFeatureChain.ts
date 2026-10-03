// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { FeatureId } from '../../shared/intent/types';
import { isValidVec3 } from '../../shared/intent/types';
import { isParamRef } from '../../shared/runtime/paramRef';
import { invalidArgs } from '../../shared/intent/invalidArgs';
import { normalizeTopoRefOrString } from './topoRefNormalize';
import type { FaceSelector } from './proxy';

const PATTERN_LINEAR_EXAMPLE = 'plate.patternLinear({ count: 4, direction: [1, 0, 0], spacing: 20 })';
const PATTERN_CIRCULAR_EXAMPLE = 'plate.patternCircular({ count: 6, axis: [0, 0, 1], angleDeg: 360 })';

/**
 * Capture-time sign/finiteness guard for the scalar edge features
 * (`fillet` radius, `chamfer` distance, `shell` thickness).
 *
 * Before this, a zero / negative / NaN value was captured and only failed
 * inside OCCT as `feature.kernel-failed` ("BRepFilletAPI failed"), which says
 * nothing about which argument to change — that pattern is visible in the
 * triage data as repeated identical retries. A `ParamRef` is left to the
 * lowerer, which has the resolved value.
 */
export function assertScalarEdgeValue(
  kind: 'fillet' | 'chamfer' | 'shell',
  arg: 'radius' | 'distance' | 'thickness',
  value: unknown,
  featureId: FeatureId,
): void {
  if (isParamRef(value)) return;
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return;
  const examples = {
    fillet: 'box(40, 30, 10).fillet(2)',
    chamfer: 'box(40, 30, 10).chamfer(1)',
    shell: "box(40, 30, 10).shell(2, { face: 'top' })",
  } as const;
  const requires = {
    radius:
      'a finite number > 0 — the blend radius, and it must stay below half the shortest adjacent face width or OCCT cannot build the blend',
    distance:
      'a finite number > 0 — the leg length of the bevel measured along each adjacent face',
    thickness:
      'a finite number > 0 — the wall thickness left behind; the face named in opts.face is the one removed, so the sign is never negative',
  } as const;
  invalidArgs({
    api: `${kind}(${arg})`,
    path: arg,
    got: value,
    showType: typeof value !== 'number',
    requires: requires[arg],
    unit: 'mm',
    example: examples[kind],
    featureId,
  });
}

const GRID_EXAMPLE =
  'hole.patternGrid({ x: { count: 4, direction: [1, 0, 0], spacing: 20 }, y: { count: 3, direction: [0, 1, 0], spacing: 15 } })';

export function validateGridPatternAxis(
  label: 'patternGrid.x' | 'patternGrid.y',
  axis: { count: number; direction: [number, number, number]; spacing: number },
  featureId: FeatureId,
): void {
  const api = `patternGrid({ ${label.endsWith('.x') ? 'x' : 'y'} })`;
  if (!Number.isInteger(axis.count) || axis.count < 2) {
    invalidArgs({
      api,
      path: `${label}.count`,
      got: axis.count,
      showType: typeof axis.count !== 'number',
      requires:
        'an integer ≥ 2 — count is the TOTAL number of instances along this axis including the original, not the number of copies added',
      unit: 'count',
      example: GRID_EXAMPLE,
      featureId,
    });
  }
  if (!isValidVec3(axis.direction)) {
    invalidArgs({
      api,
      path: `${label}.direction`,
      got: axis.direction,
      showType: !Array.isArray(axis.direction),
      requires:
        'a 3-element array of finite numbers [x, y, z]; it only sets the direction, the step comes from spacing',
      example: GRID_EXAMPLE,
      featureId,
    });
  }
  if (typeof axis.spacing !== 'number' || !Number.isFinite(axis.spacing) || axis.spacing === 0) {
    invalidArgs({
      api,
      path: `${label}.spacing`,
      got: axis.spacing,
      showType: typeof axis.spacing !== 'number',
      requires:
        'a finite non-zero number — the centre-to-centre pitch between neighbours, not the total span (total span is spacing × (count − 1))',
      unit: 'mm',
      example: GRID_EXAMPLE,
      featureId,
    });
  }
}

/** Wrap a bare canonical-face / label string OR a `@kc[<owner>/face/<name>]`
 *  ref string into the structured `{ face: <s> }` shape so hole/holes/cutout/
 *  shell accept every input form uniformly. */
export function normalizeFaceSelector(face: FaceSelector | string): FaceSelector {
  if (typeof face === 'string') {
    return normalizeTopoRefOrString(face, 'face') as FaceSelector;
  }
  return face;
}

/** Walk records back from `targetId` via `inputs.target` (slice-2 chain
 *  semantics). Returns records in chain order (oldest first). */
export function chainRecordsFrom(
  records: ReadonlyArray<{ id: string; kind: string; inputs?: Record<string, { kind: string; id?: string }>; metadata?: Record<string, unknown> }>,
  targetId: string,
): typeof records[number][] {
  const byId = new Map<string, typeof records[number]>();
  for (const r of records) byId.set(r.id, r);
  const out: typeof records[number][] = [];
  let cur: string | undefined = targetId;
  const seen = new Set<string>();
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    const r = byId.get(cur);
    if (!r) break;
    out.unshift(r);
    const target = r.inputs?.target;
    cur = target && target.kind === 'feature' ? target.id : undefined;
  }
  return out;
}

/** Throw `feature.invalid-args` if any prior feature in the chain ending
 *  at `targetId` already used the given `name`. */
export function assertFeatureNameUniqueOnChain(
  records: ReadonlyArray<{ id: string; kind: string; inputs?: Record<string, { kind: string; id?: string }>; metadata?: Record<string, unknown> }>,
  targetId: string,
  name: string,
): void {
  const chain = chainRecordsFrom(records, targetId);
  for (const r of chain) {
    const prev = (r.metadata as { name?: unknown } | undefined)?.name;
    if (typeof prev === 'string' && prev === name) {
      invalidArgs({
        api: 'hole(face, { name })',
        path: 'opts.name',
        got: name,
        requires:
          `a name not yet used on this chain — '${name}' is already taken by the '${r.kind}' feature; add a suffix for variants`,
        example: `plate.hole(top, { u: 10, v: 10, diameter: 3.4, depth: 'through', name: '${name}-front' })`,
      });
    }
  }
}

/** 1-based ordinal among unnamed features of the given `kind` in the chain
 *  ending at `targetId`. */
export function nextOrdinalForKindOnChain(
  records: ReadonlyArray<{ id: string; kind: string; inputs?: Record<string, { kind: string; id?: string }>; metadata?: Record<string, unknown> }>,
  targetId: string,
  kind: string,
): number {
  const chain = chainRecordsFrom(records, targetId);
  let count = 0;
  for (const r of chain) {
    if (r.kind !== kind) continue;
    const meta = r.metadata as { name?: unknown } | undefined;
    if (typeof meta?.name === 'string') continue;  // named features don't consume an ordinal slot
    count++;
  }
  return count + 1;
}

/** `patternLinear` arg checks. Lives beside `validateGridPatternAxis` so the
 *  three pattern forms share one home and `proxy.ts` stays under its
 *  max-lines budget. */
export function validateLinearPatternOpts(
  opts: { count: number; direction: [number, number, number]; spacing: number },
  featureId: FeatureId,
): void {
    if (!Number.isInteger(opts.count) || opts.count < 2) {
      invalidArgs({
        api: 'patternLinear({ count })',
        path: 'opts.count',
        got: opts.count,
        showType: typeof opts.count !== 'number',
        requires:
          'an integer ≥ 2 — count is the TOTAL number of instances including the original, not the number of copies added',
        unit: 'count',
        example: PATTERN_LINEAR_EXAMPLE,
        featureId,
      });
    }
    if (!isValidVec3(opts.direction)) {
      invalidArgs({
        api: 'patternLinear({ direction })',
        path: 'opts.direction',
        got: opts.direction,
        showType: !Array.isArray(opts.direction),
        requires:
          'a 3-element array of finite numbers [x, y, z]; direction only sets the axis, the step comes from spacing',
        example: PATTERN_LINEAR_EXAMPLE,
        featureId,
      });
    }
    if (typeof opts.spacing !== 'number' || !Number.isFinite(opts.spacing) || opts.spacing === 0) {
      invalidArgs({
        api: 'patternLinear({ spacing })',
        path: 'opts.spacing',
        got: opts.spacing,
        showType: typeof opts.spacing !== 'number',
        requires:
          'a finite non-zero number — the centre-to-centre pitch between neighbours, not the total span (total span is spacing × (count − 1))',
        unit: 'mm',
        example: PATTERN_LINEAR_EXAMPLE,
        featureId,
      });
    }
}

/** `patternCircular` arg checks. Returns the resolved `angleDeg` (default 360). */
export function validateCircularPatternOpts(
  opts: { count: number; axis: [number, number, number]; angleDeg?: number },
  featureId: FeatureId,
): number {
    if (!Number.isInteger(opts.count) || opts.count < 2) {
      invalidArgs({
        api: 'patternCircular({ count })',
        path: 'opts.count',
        got: opts.count,
        showType: typeof opts.count !== 'number',
        requires:
          'an integer ≥ 2 — count is the TOTAL number of instances including the original; with the default angleDeg: 360 they are spaced 360 / count apart',
        unit: 'count',
        example: PATTERN_CIRCULAR_EXAMPLE,
        featureId,
      });
    }
    if (!isValidVec3(opts.axis)) {
      invalidArgs({
        api: 'patternCircular({ axis })',
        path: 'opts.axis',
        got: opts.axis,
        showType: !Array.isArray(opts.axis),
        requires:
          'a 3-element array of finite numbers [x, y, z] — the rotation axis through the world origin ([0, 0, 1] for a bolt circle on an XY plate)',
        example: PATTERN_CIRCULAR_EXAMPLE,
        featureId,
      });
    }
    const angleDeg = opts.angleDeg ?? 360;
    if (typeof angleDeg !== 'number' || !Number.isFinite(angleDeg) || angleDeg === 0) {
      invalidArgs({
        api: 'patternCircular({ angleDeg })',
        path: 'opts.angleDeg',
        got: angleDeg,
        showType: typeof angleDeg !== 'number',
        requires:
          'a finite non-zero number — the TOTAL sweep covered by all instances (360 for a full circle, the default); instances land angleDeg / count apart',
        unit: 'deg',
        example: PATTERN_CIRCULAR_EXAMPLE,
        featureId,
      });
    }
  return angleDeg;
}
