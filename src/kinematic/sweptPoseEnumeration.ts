// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kinematic/sweptPoseEnumeration.ts
//
// Pure pose enumeration for the swept-collision loop. Three branches:
//
//   1. opts.samples present       → forward the explicit list verbatim.
//   2. opts.joint + opts.range    → walk a single joint across [lo, hi].
//   3. neither                    → walk every declared joint at the default
//                                    step (1° revolute / 1 mm prismatic) over
//                                    each joint's declared limits.
//
// Reports a `sparseJoints` list — joint names for which the (range, step)
// product fell below the D3 safe floor (< 36 samples for revolute, < 25
// for prismatic). The checkSweptCollision wrapper emits one
// kinematic.collision.swept.sample-density-warning per entry.

import type { Assembly } from '../modeling/capture/assembly';
import type { NumericPoses, SweptCollisionOpts } from './types';

/** D3: safe-floor sample counts per joint kind. Below this the swept loop
 *  may miss mid-range collisions; checkSweptCollision emits K2 warn. */
export const REVOLUTE_SAFE_FLOOR = 36;
export const PRISMATIC_SAFE_FLOOR = 25;

/** Default step sizes when the caller does not supply a range. */
const DEFAULT_REVOLUTE_STEP_DEG = 1;
const DEFAULT_PRISMATIC_STEP_MM = 1;

/** Default limit fallback when a joint declares no limitsDeg/limitsMm. */
const DEFAULT_REVOLUTE_LIMITS: readonly [number, number] = [-180, 180];
const DEFAULT_PRISMATIC_LIMITS: readonly [number, number] = [0, 100];

export interface EnumeratedPoses {
  readonly poses: ReadonlyArray<NumericPoses>;
  readonly sparseJoints: ReadonlyArray<string>;
  /** The same poses grouped by walk: one group per swept joint (each walk
   *  starts again from the as-built pose), or a single group for explicit
   *  samples. Closed-loop continuation runs within a group. */
  readonly walks: ReadonlyArray<ReadonlyArray<NumericPoses>>;
}

/** A sweepable joint: a joint-graph revolute/prismatic, or an articulated
 *  scalar mate (revolute / prismatic / cylindrical / pin_slot). */
interface Sweepable {
  readonly name: string;
  readonly kind: 'revolute' | 'prismatic';
  readonly limits?: readonly [number, number];
}

function sweepables(arm: Assembly): Sweepable[] {
  const out: Sweepable[] = [];
  for (const j of arm.__joints()) {
    if (j.kind === 'revolute') out.push({ name: j.name, kind: 'revolute', limits: j.limitsDeg });
    else if (j.kind === 'prismatic') out.push({ name: j.name, kind: 'prismatic', limits: j.limitsMm });
  }
  for (const m of arm.__mates?.() ?? []) {
    if (m.type === 'prismatic') out.push({ name: m.name, kind: 'prismatic', limits: m.limitsMm });
    else if (m.type === 'revolute' || m.type === 'cylindrical' || m.type === 'pin_slot') {
      out.push({ name: m.name, kind: 'revolute', limits: m.limitsDeg });
    }
  }
  return out;
}

/**
 * Enumerate the joint poses that the swept-collision loop will sample.
 * Pure: never lowers geometry, never runs FK — just expands the option
 * shape into a flat list of `NumericPoses` records.
 */
export function enumeratePoses(
  arm: Assembly,
  opts: SweptCollisionOpts | undefined,
): EnumeratedPoses {
  // Branch 1: explicit samples win.
  if (opts?.samples && opts.samples.length > 0) {
    const poses = opts.samples.map((p) => ({ ...p }));
    return { poses, sparseJoints: [], walks: [poses] };
  }

  const all = sweepables(arm);
  const jointNames = new Set(arm.__joints().map((j) => j.name));
  // Branch 2/3: pick which joints we walk. The default walk covers every
  // joint-graph joint and every articulated mate that declares limits.
  const targets: string[] = opts?.joint
    ? [opts.joint]
    : all.filter((j) => jointNames.has(j.name) || j.limits !== undefined).map((j) => j.name);

  const walks: NumericPoses[][] = [];
  const sparseJoints: string[] = [];
  for (const jointName of targets) {
    const joint = all.find((j) => j.name === jointName);
    if (!joint) {
      if (arm.__joints().some((j) => j.name === jointName)) continue; // fixed / ball: no scalar sweep
      throw new Error(
        `enumeratePoses: unknown joint '${jointName}' — not a revolute/prismatic joint or articulated mate on the supplied assembly.`,
      );
    }
    const [lo, hi, step] = opts?.range ?? defaultRange(joint);
    if (isSparse(joint.kind, [lo, hi, step])) sparseJoints.push(jointName);
    const count = Math.floor((hi - lo) / step) + 1;
    walks.push(Array.from({ length: count }, (_, i) => ({ [jointName]: lo + i * step })));
  }

  return { poses: walks.flat(), sparseJoints, walks };
}

/**
 * Sparse-density predicate. Per D3 the safe floor for the swept walk is
 * 36 samples for a revolute joint and 25 for a prismatic. Sample count is
 * `(hi - lo) / step` — endpoint inclusivity adds one but the floor check
 * compares against the bare ratio per spec.
 */
export function isSparse(
  kind: 'revolute' | 'prismatic',
  range: readonly [number, number, number],
): boolean {
  const [lo, hi, step] = range;
  if (step <= 0) return true; // degenerate input is treated as sparse
  const samples = (hi - lo) / step;
  const floor = kind === 'revolute' ? REVOLUTE_SAFE_FLOOR : PRISMATIC_SAFE_FLOOR;
  return samples < floor;
}

function defaultRange(joint: Sweepable): [number, number, number] {
  if (joint.kind === 'revolute') {
    const [lo, hi] = joint.limits ?? DEFAULT_REVOLUTE_LIMITS;
    return [lo, hi, DEFAULT_REVOLUTE_STEP_DEG];
  }
  const [lo, hi] = joint.limits ?? DEFAULT_PRISMATIC_LIMITS;
  return [lo, hi, DEFAULT_PRISMATIC_STEP_MM];
}
