// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { FeatureId } from '../../shared/intent/types';
import { isValidVec3, formatScalarForError } from '../../shared/intent/types';
import { KernelError } from '../../shared/intent/kernelError';
import { normalizeTopoRefOrString } from './topoRefNormalize';
import type { FaceSelector } from './proxy';

export function validateGridPatternAxis(
  label: 'patternGrid.x' | 'patternGrid.y',
  axis: { count: number; direction: [number, number, number]; spacing: number },
  featureId: FeatureId,
): void {
  if (!Number.isInteger(axis.count) || axis.count < 2) {
    throw new KernelError(
      'feature.invalid-args',
      `${label} count must be an integer >= 2.`,
      featureId,
      'Pass count: 2 or greater for both grid axes.',
    );
  }
  if (!isValidVec3(axis.direction)) {
    throw new KernelError(
      'feature.invalid-args',
      `${label} direction must be a finite Vec3; got ${formatScalarForError(axis.direction)}.`,
      featureId,
      'Pass direction: [x, y, z] for both grid axes.',
    );
  }
  if (typeof axis.spacing !== 'number' || !Number.isFinite(axis.spacing) || axis.spacing === 0) {
    throw new KernelError(
      'feature.invalid-args',
      `${label} spacing must be a non-zero finite number; got ${formatScalarForError(axis.spacing)}.`,
      featureId,
      'Pass a non-zero finite spacing for both grid axes.',
    );
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
      throw new KernelError(
        'feature.invalid-args',
        `feature name '${name}' is already used in this chain.`,
        undefined,
        `Feature name '${name}' already used in this chain. Names must be unique per chain; for variations use suffixes ('${name}-front', '${name}-back').`,
      );
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
