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

import type { Assembly, AssemblyJointStored } from '../modeling/capture/assembly';
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
    return { poses: opts.samples.map((p) => ({ ...p })), sparseJoints: [] };
  }

  const allJoints = arm.__joints();

  // Branch 2/3: pick which joints we walk.
  const targetJointNames: string[] = opts?.joint
    ? [opts.joint]
    : allJoints.filter((j) => j.kind === 'revolute' || j.kind === 'prismatic').map((j) => j.name);

  const poses: NumericPoses[] = [];
  const sparseJoints: string[] = [];

  for (const jointName of targetJointNames) {
    const joint = allJoints.find((j) => j.name === jointName);
    if (!joint) {
      throw new Error(
        `enumeratePoses: unknown joint '${jointName}' — not declared on the supplied assembly.`,
      );
    }
    if (joint.kind === 'fixed' || joint.kind === 'ball') {
      // Fixed has no DOF; ball is XYZ-euler and not v1-swept-supported.
      // Skip silently — caller-supplied joint walks throw above (unknown),
      // default walks should just not include these.
      continue;
    }
    const [lo, hi, step] = opts?.range ?? defaultRange(joint);
    if (isSparse(joint.kind, [lo, hi, step])) sparseJoints.push(jointName);

    const count = Math.floor((hi - lo) / step) + 1;
    for (let i = 0; i < count; i++) {
      poses.push({ [jointName]: lo + i * step });
    }
  }

  return { poses, sparseJoints };
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

function defaultRange(joint: AssemblyJointStored): [number, number, number] {
  if (joint.kind === 'revolute') {
    const [lo, hi] = joint.limitsDeg ?? DEFAULT_REVOLUTE_LIMITS;
    return [lo, hi, DEFAULT_REVOLUTE_STEP_DEG];
  }
  // prismatic
  const [lo, hi] = joint.limitsMm ?? DEFAULT_PRISMATIC_LIMITS;
  return [lo, hi, DEFAULT_PRISMATIC_STEP_MM];
}
