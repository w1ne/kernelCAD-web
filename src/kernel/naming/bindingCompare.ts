// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/naming/bindingCompare.ts
//
// Pure comparison of two binding fingerprints. "changed" means the selector
// now points at a different entity (other lineage, other surface type, a
// flipped or turned direction). "moved" means the same entity that a
// parameter edit moved or resized. Thresholds are constants, not options.

import type { BindingFingerprint, SelectionRecord } from '../../shared/intent/selectionRecord';
import type { Vec3 } from '../../shared/intent/types';

/** Direction change above this is "moved". */
export const MOVED_ANGLE_DEG = 1;
/** Direction change above this is "changed" (the query DSL's angleTolerance default). */
export const CHANGED_ANGLE_DEG = 10;
/** Relative radius / area / length change above this is "moved". */
export const MOVED_SIZE_RELATIVE = 0.01;
/** Centroid shift above max(MOVED_CENTROID_MM, MOVED_CENTROID_DIAGONAL * diagonal) is "moved". */
export const MOVED_CENTROID_MM = 0.01;
export const MOVED_CENTROID_DIAGONAL = 0.001;

export type BindingVerdict = 'same' | 'moved' | 'changed';

export interface BindingComparison {
  verdict: BindingVerdict;
  /** Why it is "changed" (one entry per trigger); empty otherwise. */
  reasons: string[];
  /** Measured deltas for the fields that exceeded the "moved" threshold. */
  deltas: {
    angleDeg?: number;
    radiusRelative?: number;
    sizeRelative?: number;
    centroidMm?: number;
  };
}

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const relative = (a: number, b: number) => Math.abs(a - b) / Math.max(Math.abs(a), 1e-9);

/** Angle between two unit directions. Edge tangents have no sign, so edges
 *  compare as axes (a reversed edge is the same edge); face normals do. */
function angleDeg(a: Vec3, b: Vec3, signed: boolean): number {
  const c = Math.max(-1, Math.min(1, signed ? dot(a, b) : Math.abs(dot(a, b))));
  return (Math.acos(c) * 180) / Math.PI;
}

/** Identity triggers: any difference here means a different entity. */
function identityReasons(before: BindingFingerprint, after: BindingFingerprint): string[] {
  const reasons: string[] = [];
  if (before.entityKind !== after.entityKind) reasons.push(`entity kind ${before.entityKind} -> ${after.entityKind}`);
  if (before.geomType !== after.geomType) reasons.push(`type ${before.geomType} -> ${after.geomType}`);
  if (before.producer !== after.producer) {
    reasons.push(`producing feature ${before.producer ?? 'unknown'} -> ${after.producer ?? 'unknown'}`);
  }
  if (before.role !== after.role) reasons.push(`name ${before.role ?? 'unnamed'} -> ${after.role ?? 'unnamed'}`);
  return reasons;
}

/** Size and position deltas above the "moved" thresholds. */
function geometryDeltas(
  before: BindingFingerprint,
  after: BindingFingerprint,
  partDiagonal: number,
): BindingComparison['deltas'] {
  const deltas: BindingComparison['deltas'] = {};
  if (before.radius !== undefined && after.radius !== undefined) {
    const r = relative(before.radius, after.radius);
    if (r > MOVED_SIZE_RELATIVE) deltas.radiusRelative = r;
  }
  const s = relative(before.size, after.size);
  if (s > MOVED_SIZE_RELATIVE) deltas.sizeRelative = s;
  const c = dist(before.centroid, after.centroid);
  if (c > Math.max(MOVED_CENTROID_MM, MOVED_CENTROID_DIAGONAL * partDiagonal)) deltas.centroidMm = c;
  return deltas;
}

export function compareFingerprints(
  before: BindingFingerprint,
  after: BindingFingerprint,
  partDiagonal: number,
): BindingComparison {
  const reasons = identityReasons(before, after);
  const deltas = geometryDeltas(before, after, partDiagonal);
  if (before.direction && after.direction) {
    const a = angleDeg(before.direction, after.direction, before.entityKind === 'face');
    if (a > CHANGED_ANGLE_DEG) reasons.push(`direction turned ${a.toFixed(1)} deg`);
    else if (a > MOVED_ANGLE_DEG) deltas.angleDeg = a;
  }
  if (reasons.length > 0) return { verdict: 'changed', reasons, deltas };
  return { verdict: Object.keys(deltas).length > 0 ? 'moved' : 'same', reasons, deltas };
}

export interface BindingPair {
  before?: BindingFingerprint;
  after?: BindingFingerprint;
  comparison: BindingComparison;
}

const identityKey = (f: BindingFingerprint) => `${f.entityKind}|${f.geomType}|${f.producer ?? ''}|${f.role ?? ''}`;

/** Pair the entities of two selections of the same selector. Entities with the
 *  same identity pair by nearest centroid; whatever is left over on either side
 *  is "changed" (an entity appeared or vanished). Deterministic. */
export function compareSelections(before: SelectionRecord, after: SelectionRecord): BindingPair[] {
  const diagonal = after.partDiagonal;
  const remaining = [...after.fingerprints];
  const pairs: BindingPair[] = [];
  const unmatched: BindingFingerprint[] = [];

  for (const b of before.fingerprints) {
    const key = identityKey(b);
    let best = -1;
    let bestDist = Infinity;
    remaining.forEach((a, i) => {
      if (identityKey(a) !== key) return;
      const d = dist(a.centroid, b.centroid);
      if (d < bestDist) { best = i; bestDist = d; }
    });
    if (best < 0) { unmatched.push(b); continue; }
    const [a] = remaining.splice(best, 1);
    pairs.push({ before: b, after: a, comparison: compareFingerprints(b, a, diagonal) });
  }

  // Leftovers of the same kind but another identity are a re-bind: pair them
  // by centroid so the report names old and new entity. The rest vanished or appeared.
  for (const b of unmatched) {
    let best = -1;
    let bestDist = Infinity;
    remaining.forEach((a, i) => {
      if (a.entityKind !== b.entityKind) return;
      const d = dist(a.centroid, b.centroid);
      if (d < bestDist) { best = i; bestDist = d; }
    });
    if (best >= 0) {
      const [a] = remaining.splice(best, 1);
      pairs.push({ before: b, after: a, comparison: compareFingerprints(b, a, diagonal) });
    } else {
      pairs.push({ before: b, comparison: { verdict: 'changed', reasons: ['entity no longer selected'], deltas: {} } });
    }
  }
  for (const a of remaining) {
    pairs.push({ after: a, comparison: { verdict: 'changed', reasons: ['entity newly selected'], deltas: {} } });
  }
  return pairs;
}
