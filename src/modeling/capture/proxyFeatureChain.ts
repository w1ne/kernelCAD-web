// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { FeatureId } from '../../shared/intent/types';
import { isValidVec3 } from '../../shared/intent/types';
import { invalidArgs } from '../../shared/intent/invalidArgs';
import { normalizeTopoRefOrString } from './topoRefNormalize';
import type { FaceSelector } from './proxy';

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
