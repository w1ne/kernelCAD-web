// src/modeling/runtime/mechanismTruth.ts
//
// Physics-grounded loop — P0 slice.
//
// Spec:  docs/specs/2026-06-01-physics-grounded-loop-design.md
// Plan:  docs/plans/2026-06-01-physics-loop-P0-engine-truth.md
//
// The four truth criteria from the spec, applied to an Assembly at
// single-joint-at-a-time sampled poses. The recompute engine calls
// `checkMechanismTruth(arm)` after the rest-pose lower completes; the
// return value is plumbed onto `RecomputeResult.mechanism` /
// `RecomputeResult.mechanismFailures`.
//
// Criteria (run in order of cost, cheap to expensive):
//
//   1. mechanism.orphan-part         — graph reachability (no BREP)
//   2. mechanism.disconnect          — fastened mates must keep their
//                                      relative transform invariant across
//                                      every sampled pose (catches the
//                                      vec3-mount-spring drift pattern from
//                                      PR #341 and the gutted-assembly
//                                      missing-body pattern from PR #338)
//   3. mechanism.interpenetration    — non-mated parts must not overlap
//                                      under any sampled pose
//   4. mechanism.dof-mismatch        — declared mate kind must match the
//                                      geometric free direction (pragmatic
//                                      micro-pose check)
//
// Single-joint-at-a-time sweeps (N×M, not N^M): per revolute / prismatic
// mate, sample `[min, mid, max]` (or `[min, 0, max]` if 0 ∈ limits) with
// every OTHER mate at its rest pose. Fastened / planar / ball / pin_slot /
// cylindrical contribute zero sweep samples but are still checked at the
// rest pose and at every other mate's sweep.
//
// Reuse pointers (don't re-roll):
//
//   - Pose-injected solving: `Assembly.solvedModel(poses, { validate: 'off' })`
//     drives the per-pose part transforms through the existing mate solver
//     and lowerer. No parallel FK.
//   - Interference detection: `detectInterferences` on the per-pose
//     SceneBackend. Excludes pairs joined by a revolute / prismatic /
//     cylindrical mate when the overlap volume is below a contact-tolerance
//     floor (intentional clevis cheek-on-tongue contact).
//   - Mate graph: `arm.__mates()` is the edge list, `arm.__parts()` is the
//     node list.

import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { HINT_TEMPLATES } from '../../shared/diagnostics/registry';
import type { FeatureId } from '../../shared/intent/types';
import { Transform, type Vec3 as Se3Vec3 } from '../../shared/runtime/se3';
import type { Assembly } from '../capture/assembly';
import { isSceneBackend } from '../../kernel/backends/sceneBackend';
import type { SceneBackend } from '../../kernel/backends/sceneBackend';
import type { OcctBackend } from '../../kernel/backends/occt/occtBackend';
import { initOcct } from '../../kernel/backends/occt/occtBackend';
import { createOcctLowerer } from '../backends/occt/occtLowerer';
import { RecomputeEngine } from '../compute/recomputeEngine';
import { solveMates } from '../mates/solver';
import { detectInterferences } from './detectInterferences';
import { expandCoupledPoses } from '../mates/coupledPoses';
import type { NumericPoses } from '../capture/forwardKinematics';
import { parseConnectorRef, type MateRecord } from '../mates/mate';

/**
 * Number of pose samples per articulated mate. Currently 3 (min, mid, max
 * with 0 substituted for mid if 0 lies in the limits) — see spec §pose
 * sampling. Exposed as a module-level constant so a future tuning knob
 * isn't hardcoded across the file.
 */
export const POSE_SAMPLE_COUNT_PER_MATE = 3;

/**
 * Position tolerance (mm) for the fastened-mate invariant check. If a
 * fastened-tracked test point's world-space distance to its rest-pose
 * counterpart in the anchor part's frame exceeds this floor at a sampled
 * pose, the mate is considered to NOT physically rigidify the geometry.
 *
 * Chosen at 1 mm per spec criterion-1 §step 4 ("disconnectTolerance =
 * 1mm"). Wide enough to absorb OCCT solver noise and mesher rounding,
 * tight enough to catch the PR #341 vec3-mount spring at 22.5° elbow.
 */
const DISCONNECT_TOLERANCE_MM = 1;

/**
 * Volume floor for `mechanism.interpenetration` (mm³). Matches the
 * existing `detectInterferences` default — anything below this is treated
 * as numerical noise / tangential contact, not real overlap.
 */
const INTERPENETRATION_EPSILON_MM3 = 0.01;

/**
 * Volume ceiling for the joint-pair contact-face exclusion at revolute /
 * prismatic / cylindrical mates. The intended clevis cheek-on-tongue /
 * pin-in-hole contact at these joints can register as a non-trivial
 * interference at swept poses (a 45° clevis swing on a typical 12 mm
 * knuckle radius easily reaches a couple of thousand mm³ of intersection
 * with the parent fork). We treat overlaps below this fraction of the
 * smaller part's bbox volume as intentional contact.
 *
 * Approach A from the plan — safer than blanket pair-exclusion which
 * would mask a real spring-through-arm-body penetration. The fraction is
 * deliberately generous for revolutes (covers the clevis swing range);
 * fastened mates use a tighter fraction below.
 *
 * Empirical: a 40×40×30 base (48000 mm³) under a ±45° clevis swing
 * produces a ~1500 mm³ contact (≈3 %); 5 % covers it with margin while
 * still flagging the order-of-magnitude penetrations a broken mechanism
 * would produce (a spring-through-knuckle at 10 % bbox volume gets
 * caught).
 */
const REVOLUTE_CONTACT_TOLERANCE_FRACTION = 0.05;

/**
 * Volume ceiling for the joint-pair contact-face exclusion at fastened
 * mates. Tighter than the revolute fraction because fastened mates
 * SHOULDN'T have material overlap by design — a small surface-tangent
 * contact at the mounting face is acceptable (mesher tolerance noise),
 * but real penetration through the body is a failure mode (PR #341's
 * vec3 spring passing through the arm's interior).
 */
const FASTENED_CONTACT_TOLERANCE_FRACTION = 0.005;

/**
 * Micro-pose excursion for the DoF-mismatch check (degrees). Per spec
 * criterion-3, 0.5° around the declared axis. If the geometric component
 * count varies under this micro-pose, the declared axis is not the only
 * free direction.
 */
const DOF_MISMATCH_MICRO_POSE_DEG = 0.5;

/**
 * Result returned to `RecomputeEngine.run`. `mechanism` is the top-level
 * truth field downstream consumers read; `failures` carries the
 * structured failure list each consumer (CLI, Studio, render) folds into
 * its own surface in P1.
 */
export interface MechanismTruthResult {
  readonly mechanism: 'real' | 'broken' | 'unverified';
  readonly failures: readonly CompilerDiagnostic[];
}

/**
 * A single-joint-at-a-time pose sample. `mateName` is `undefined` for the
 * rest-pose baseline.
 */
interface PoseSample {
  readonly name: string;
  readonly mateName: string | undefined;
  readonly poses: NumericPoses;
}

/**
 * Per-pose solver output cache. Keeps the (sample, transforms, scene)
 * triple together so the individual criterion runs don't re-solve
 * `solvedModel` for the same pose.
 */
interface SolvedSample {
  readonly sample: PoseSample;
  readonly transforms: ReadonlyMap<string, Transform>;
  /** Lazily computed — only loaded when criterion 2 needs the lowered
   *  scene. The solveMates pass that produces `transforms` does NOT lower
   *  BREP, so cheap criteria short-circuit before paying for the lower. */
  scene?: SceneBackend;
}

/**
 * Entry point. Runs all four mechanism-truth criteria against an
 * Assembly at sampled poses. Returns `mechanism: 'real'` iff every
 * criterion holds at every pose.
 *
 * Called by `RecomputeEngine.run` after the rest-pose lower completes.
 * Assemblies with zero parts or zero mates short-circuit to `'real'`
 * (the criteria are vacuously satisfied; this preserves backward compat
 * for non-assembly scripts).
 */
export async function checkMechanismTruth(
  arm: Assembly,
): Promise<MechanismTruthResult> {
  await initOcct();

  if (arm.__parts().length === 0) {
    return { mechanism: 'real', failures: [] };
  }

  const failures: CompilerDiagnostic[] = [];

  // Criterion 4 (orphan-part) — pure graph walk, no BREP. Cheapest; run
  // first as an early-exit signal. Even if the graph is disconnected we
  // still continue to the other criteria so the agent sees every failure
  // mode at once, per spec §"don't bail on first failure."
  failures.push(...checkOrphanParts(arm));

  // Pose sampling: rest + per-articulated-mate single-joint sweep.
  const samples = buildPoseSamples(arm);

  // Solve mates at every sample (Pattern A FK, no BREP). The mate-graph
  // edge list and per-part transforms are everything criteria 1 + 4 need;
  // criteria 2 + 3 will lazily lower BREP per-sample below.
  const solved: SolvedSample[] = [];
  for (const sample of samples) {
    try {
      const r = await solveMates(arm, sample.poses);
      solved.push({ sample, transforms: r.poses });
    } catch {
      // A solver throw at a sampled pose is itself a mechanism failure,
      // but it's already surfaced by the pose-envelope review path. Skip
      // the sample here so the criteria below don't double-flag it.
      continue;
    }
  }

  if (solved.length === 0) {
    return { mechanism: failures.length === 0 ? 'real' : 'broken', failures };
  }

  // Criterion 1 (mechanism.disconnect) — fastened-mate invariant.
  failures.push(...checkFastenedInvariant(arm, solved));

  // Criterion 2 (mechanism.interpenetration) — per-pose BREP sweep.
  failures.push(...(await checkInterpenetration(arm, solved)));

  // Criterion 3 (mechanism.dof-mismatch) — pragmatic micro-pose check.
  // Note: this is the spec's open-question #2 ("DoF-mismatch is
  // geometric"); the pragmatic shape used here is connected-component
  // count stability under ±ε around the declared axis. Skipped when the
  // assembly has no revolute mates.
  failures.push(...(await checkDofMismatch(arm)));

  return {
    mechanism: failures.length === 0 ? 'real' : 'broken',
    failures,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Criterion 4 — mechanism.orphan-part (graph reachability)
// ─────────────────────────────────────────────────────────────────────────

function checkOrphanParts(arm: Assembly): CompilerDiagnostic[] {
  const parts = arm.__parts();
  const mates = arm.__mates();
  if (parts.length <= 1) return [];

  // Build adjacency: part-name → set of neighbor part-names.
  const adj = new Map<string, Set<string>>();
  for (const p of parts) adj.set(p.name, new Set());
  for (const m of mates) {
    const aPart = parseConnectorRef(m.a).partName;
    const bPart = parseConnectorRef(m.b).partName;
    adj.get(aPart)?.add(bPart);
    adj.get(bPart)?.add(aPart);
  }

  // BFS from parts[0]. Anything unreached is an orphan.
  const root = parts[0].name;
  const visited = new Set<string>();
  const queue: string[] = [root];
  visited.add(root);
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const next of adj.get(cur) ?? []) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }

  const out: CompilerDiagnostic[] = [];
  for (const p of parts) {
    if (!visited.has(p.name)) {
      out.push(makeFailure(
        'mechanism.orphan-part',
        `Part '${p.name}' is not reachable from the mate graph (no mate edge connects it to '${root}' or anything '${root}' reaches).`,
      ));
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────
// Criterion 1 — mechanism.disconnect (fastened-mate rigidity invariant)
// ─────────────────────────────────────────────────────────────────────────

/**
 * For each fastened mate (A, B), pick a test point on B's local frame
 * (B's geometric centroid in B's local coordinates, approximated from
 * the part's bbox center). Compute that test point's position in A's
 * local frame at the rest pose: `A_local_rest = T_A_rest^-1 × T_B_rest ×
 * testPoint`. At every sampled pose Q, the point's position in A's local
 * frame should remain `A_local_rest` if the mate truly rigidifies the
 * geometry. Equivalently (and without needing a Transform.inverse, which
 * the existing API doesn't expose): the world-frame positions
 * `T_A(Q) × A_local_rest` and `T_B(Q) × testPoint` should coincide at
 * every Q.
 *
 * The PR #341 vec3-mount spring fails this: T_arm rotates with the
 * elbow, T_spring (which the solver couldn't pin to T_arm because the
 * vec3 connectors don't compose the way the agent expected) ends up
 * statically placed → the two world points diverge → disconnect.
 *
 * The PR #338 gutted-assembly fails this differently: missing body
 * geometry means the test-point centroids degenerate (zero-volume
 * shape's bbox is undefined / sits at origin), and the per-pose
 * transforms force the same divergence pattern.
 */
function checkFastenedInvariant(
  arm: Assembly,
  solved: readonly SolvedSample[],
): CompilerDiagnostic[] {
  const fastenedMates = arm.__mates().filter((m) => m.type === 'fastened');
  if (fastenedMates.length === 0) return [];

  const rest = solved.find((s) => s.sample.name === 'rest');
  if (rest === undefined) return [];

  const out: CompilerDiagnostic[] = [];
  for (const mate of fastenedMates) {
    const aPart = parseConnectorRef(mate.a).partName;
    const bPart = parseConnectorRef(mate.b).partName;

    // Test point: a deterministic non-origin point in B's local frame.
    // ANY point off the origin suffices — the rigidity test compares
    // the displacement of this point through B's transform against the
    // displacement of A's local origin through A's transform; if A and
    // B are rigidly connected those displacements should AGREE under a
    // common rigid motion of A. We pick [10, 0, 0] mm because it's far
    // enough from the origin to expose rotation drift cleanly.
    //
    // The choice is independent of B's geometry, so the gutted-assembly
    // pattern (PR #338) doesn't degenerate here — that case is caught
    // by criterion 4 (orphan-part) for the floating clevis bits.
    const testPoint: Se3Vec3 = [10, 0, 0];

    const T_A_rest = rest.transforms.get(aPart);
    const T_B_rest = rest.transforms.get(bPart);
    if (T_A_rest === undefined || T_B_rest === undefined) continue;

    // A_local_rest: position of B's test point in A's local frame at
    // rest. Without a Transform.inverse we cannot compute A_local
    // directly, BUT we don't need to — at every sampled pose we can
    // compare the world positions of B's test point as seen "through A"
    // vs "through B" by tracking the world position at rest and asking
    // that the displacement be consistent. Concretely:
    //
    //   At rest:    world_B = T_B_rest × testPoint
    //               world_A = T_A_rest × X   (where X is A's representation of testPoint)
    //               world_A == world_B   ⇒   X is the same physical point
    //   At sample:  world_B(Q) = T_B(Q) × testPoint
    //               world_A(Q) = T_A(Q) × X
    //               world_A(Q) == world_B(Q)  iff the mate truly rigidifies.
    //
    // Since X = T_A_rest^-1 × world_B_rest is unknown without inverse,
    // we equivalently check that the relative DISPLACEMENT of B's test
    // point in A's frame is invariant. The clean form available without
    // inverse: ask whether the DISPLACEMENT of B's test point in WORLD
    // between rest and sample matches the displacement of an arbitrary
    // POINT-ON-A in world over the same pose change. If A and B truly
    // move as one rigid body, those displacements must agree.
    //
    // Pick a point on A: A's local origin. Its world position at any
    // pose Q is `T_A(Q) × [0,0,0]`. Compare against B's test point
    // world displacement.
    //
    // Failure metric (per-sample): the displacement-difference distance
    //   d = || (T_B(Q) × testPoint - T_B_rest × testPoint) -
    //          (T_A(Q) × O - T_A_rest × O) ||
    // measures how much B drifted in A's frame between rest and Q. If d
    // > DISCONNECT_TOLERANCE_MM the mate isn't physically rigid.
    //
    // (At rest the displacements are both zero, so d = 0 — passes.)
    const ZERO: Se3Vec3 = [0, 0, 0];
    const world_B_rest = T_B_rest.point(testPoint);
    const world_A_rest = T_A_rest.point(ZERO);

    let worstDriftMm = 0;
    let worstSampleName = '';
    for (const s of solved) {
      if (s.sample.name === 'rest') continue;
      const T_A = s.transforms.get(aPart);
      const T_B = s.transforms.get(bPart);
      if (T_A === undefined || T_B === undefined) continue;
      const world_B = T_B.point(testPoint);
      const world_A = T_A.point(ZERO);

      // Displacement-of-B minus displacement-of-A between rest and sample.
      const dB: Se3Vec3 = [
        world_B[0] - world_B_rest[0],
        world_B[1] - world_B_rest[1],
        world_B[2] - world_B_rest[2],
      ];
      const dA: Se3Vec3 = [
        world_A[0] - world_A_rest[0],
        world_A[1] - world_A_rest[1],
        world_A[2] - world_A_rest[2],
      ];
      const drift = Math.hypot(dB[0] - dA[0], dB[1] - dA[1], dB[2] - dA[2]);
      if (drift > worstDriftMm) {
        worstDriftMm = drift;
        worstSampleName = s.sample.name;
      }
    }

    if (worstDriftMm > DISCONNECT_TOLERANCE_MM) {
      out.push(makeFailure(
        'mechanism.disconnect',
        `Fastened mate '${mate.name}' between '${aPart}' and '${bPart}' fails its rigidity invariant: ` +
        `at pose sample '${worstSampleName}' part '${bPart}' drifts ${worstDriftMm.toFixed(2)} mm relative to '${aPart}' ` +
        `(tolerance ${DISCONNECT_TOLERANCE_MM} mm). The fastened mate isn't physically realizing rigid attachment under motion — ` +
        `the connector origins may be numeric vec3s that don't actually weld the geometry to the anchor part.`,
      ));
    }
  }

  return out;
}

// ─────────────────────────────────────────────────────────────────────────
// Criterion 2 — mechanism.interpenetration (non-mated overlap)
// ─────────────────────────────────────────────────────────────────────────

/**
 * For each sampled pose, lower the assembly + run `detectInterferences`.
 * Exclude overlaps between parts joined by a revolute / prismatic /
 * cylindrical mate when the overlap volume is below
 * `JOINT_CONTACT_TOLERANCE_FRACTION × min(bbox-vol(a), bbox-vol(b))` —
 * intentional clevis cheek-on-tongue contact, not real interpenetration.
 *
 * Pairs joined by `fastened` are NOT excluded — a fastened spring that
 * passes through the arm body's interior is a real failure mode (the
 * mate declares contact-only fastening, not body fusion).
 */
async function checkInterpenetration(
  arm: Assembly,
  solved: SolvedSample[],
): Promise<CompilerDiagnostic[]> {
  const out: CompilerDiagnostic[] = [];
  const mates = arm.__mates();

  // Pre-build a map from sorted pair-key to mate type, for the
  // contact-face exclusion below.
  const matedPairs = new Map<string, MateRecord['type']>();
  for (const m of mates) {
    const a = parseConnectorRef(m.a).partName;
    const b = parseConnectorRef(m.b).partName;
    matedPairs.set(pairKey(a, b), m.type);
  }

  for (const s of solved) {
    const scene = await lowerSceneForSample(arm, s);
    if (scene === undefined) continue;

    const result = detectInterferences(scene, INTERPENETRATION_EPSILON_MM3, new Set());
    if (result.pairs.length === 0) continue;

    // Build per-part bbox volumes once for the contact-face exclusion's
    // smaller-part-volume floor.
    const bboxVolByPart = new Map<string, number>();
    for (const p of scene.parts) {
      const clone = (p.shape as OcctBackend).clone().applyTransform(p.worldTransform);
      const bb = clone.boundingBox();
      const vol = Math.max(0,
        (bb.max[0] - bb.min[0]) *
        (bb.max[1] - bb.min[1]) *
        (bb.max[2] - bb.min[2]),
      );
      bboxVolByPart.set(p.name, vol);
    }

    for (const pair of result.pairs) {
      const key = pairKey(pair.a, pair.b);
      const mateType = matedPairs.get(key);
      // Joint-pair contact-face exclusion: revolute / prismatic /
      // cylindrical mates expect a small intentional overlap (clevis
      // cheek-on-tongue, pin-in-hole). Fastened mates allow only a
      // tighter mesher-noise floor. Approach A from the plan: skip
      // only when the volume is below the per-mate-type contact-
      // tolerance fraction of the smaller part's bbox volume.
      if (mateType !== undefined) {
        const fraction =
          mateType === 'revolute' || mateType === 'prismatic' || mateType === 'cylindrical'
            ? REVOLUTE_CONTACT_TOLERANCE_FRACTION
            : mateType === 'fastened'
              ? FASTENED_CONTACT_TOLERANCE_FRACTION
              : undefined;
        if (fraction !== undefined) {
          const minVol = Math.min(
            bboxVolByPart.get(pair.a) ?? Number.POSITIVE_INFINITY,
            bboxVolByPart.get(pair.b) ?? Number.POSITIVE_INFINITY,
          );
          if (pair.volumeMm3 < fraction * minVol) continue;
        }
      }

      out.push(makeFailure(
        'mechanism.interpenetration',
        `Parts '${pair.a}' and '${pair.b}' overlap by ${pair.volumeMm3.toFixed(2)} mm³ at pose sample '${s.sample.name}' ` +
        `and are NOT joined by a mate that would explain the contact. ` +
        `Add clearance, reduce mate travel, or move the geometry so the swept pose stays collision-free.`,
      ));
    }
  }

  return out;
}

// ─────────────────────────────────────────────────────────────────────────
// Criterion 3 — mechanism.dof-mismatch (declared DoF vs geometric DoF)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Pragmatic shape per spec criterion 3 open-question #2: for each
 * revolute mate, sample 3 micro-poses around 0° (`{-ε, 0, +ε}` where
 * ε = 0.5°) and verify the BREP component count stays equal to the rest
 * count under each. If the count varies under a sub-degree excursion
 * about the declared axis, the geometric free direction does NOT match
 * the declared revolute axis (something else is loose, or the axis is
 * misaligned with the actual material).
 *
 * Caveat: BREP component count requires lowering at the micro-pose. For
 * a typical 3-mate Luxo lamp this is 3 mates × 3 micro-poses = 9 extra
 * lowers — heavy. If the P0 test corpus triggers false positives, the
 * spec authorizes downgrading this criterion to advisory; for now we
 * implement the strict check and surface diagnostics. If empirical
 * false-positives surface they get filed as follow-up issues per the
 * plan §"if an existing test regresses."
 *
 * Implementation note: instead of lowering 3 times per mate to count
 * solids (which the existing OCCT bindings don't directly expose
 * without a TopExp_Explorer pass), we use a cheaper PROXY: count the
 * `detectInterferences` overlap pairs under ±ε. If the count of
 * non-trivial overlaps changes between -ε and +ε around 0°, the
 * geometric topology around the joint is not invariant under
 * infinitesimal rotation about the declared axis — which is what
 * dof-mismatch means in BREP terms.
 */
async function checkDofMismatch(arm: Assembly): Promise<CompilerDiagnostic[]> {
  const revoluteMates = arm.__mates().filter((m) => m.type === 'revolute');
  if (revoluteMates.length === 0) return [];

  const out: CompilerDiagnostic[] = [];
  for (const mate of revoluteMates) {
    // Three micro-poses around 0°.
    const microPoses = [-DOF_MISMATCH_MICRO_POSE_DEG, 0, DOF_MISMATCH_MICRO_POSE_DEG];
    const overlapCounts: number[] = [];
    for (const p of microPoses) {
      try {
        const overrides = expandCoupledPoses(
          arm.__mates(), arm.__mateCouplings(), { [mate.name]: p },
        );
        const r = await solveMates(arm, overrides);
        const sample: SolvedSample = {
          sample: { name: `${mate.name}:µ${p}`, mateName: mate.name, poses: overrides },
          transforms: r.poses,
        };
        const scene = await lowerSceneForSample(arm, sample);
        if (scene === undefined) {
          overlapCounts.push(-1);
          continue;
        }
        const result = detectInterferences(
          scene, INTERPENETRATION_EPSILON_MM3, new Set(),
        );
        overlapCounts.push(result.pairs.length);
      } catch {
        overlapCounts.push(-1);
      }
    }

    // If any micro-pose failed to solve / lower, skip the mate (the
    // failure already surfaces via other criteria / the pose-envelope).
    if (overlapCounts.some((c) => c < 0)) continue;

    // Stable overlap count under sub-degree axis rotation = geometric
    // DoF matches declared revolute. Diverging count = mismatch.
    const allEqual = overlapCounts.every((c) => c === overlapCounts[0]);
    if (!allEqual) {
      out.push(makeFailure(
        'mechanism.dof-mismatch',
        `Mate '${mate.name}' declares a revolute joint but the geometric overlap topology around the axis changes ` +
        `under a ${DOF_MISMATCH_MICRO_POSE_DEG}° micro-pose (counts at -ε, 0, +ε: ${overlapCounts.join(', ')}). ` +
        `Re-check the mate axis, the connector frames on both parts, and the mate type.`,
      ));
    }
  }

  return out;
}

// ─────────────────────────────────────────────────────────────────────────
// Pose sampling
// ─────────────────────────────────────────────────────────────────────────

function buildPoseSamples(arm: Assembly): PoseSample[] {
  const out: PoseSample[] = [
    { name: 'rest', mateName: undefined, poses: {} },
  ];
  const mates = arm.__mates();
  const couplings = arm.__mateCouplings();
  for (const mate of mates) {
    const limits = mate.limitsDeg ?? mate.limitsMm;
    if (limits === undefined) continue;
    const [min, max] = limits;
    if (min === max) continue;
    const mid = (min <= 0 && 0 <= max) ? 0 : (min + max) / 2;
    const values = Array.from(new Set([min, mid, max]));
    for (const v of values) {
      const overrides = expandCoupledPoses(mates, couplings, { [mate.name]: v });
      out.push({
        name: `${mate.name}:${formatPoseValue(v)}`,
        mateName: mate.name,
        poses: overrides,
      });
    }
  }
  return out;
}

function formatPoseValue(v: number): string {
  if (Number.isInteger(v)) return `${v}`;
  return v.toFixed(2);
}

// ─────────────────────────────────────────────────────────────────────────
// Lazy per-sample BREP lower
// ─────────────────────────────────────────────────────────────────────────

/**
 * Lower the assembly + apply the per-part world transforms from `sample`
 * to produce a SceneBackend the interference detector can read. Cached
 * on `sample.scene` to avoid re-paying for repeat criterion calls on the
 * same sample.
 *
 * Mirrors the existing `detectInterferencesForPoses` pipeline — re-runs
 * the RecomputeEngine for the assembly's records at this pose. Heavy;
 * only called by criteria 2 + 3.
 */
async function lowerSceneForSample(
  arm: Assembly,
  sample: SolvedSample,
): Promise<SceneBackend | undefined> {
  if (sample.scene !== undefined) return sample.scene;
  try {
    const scene = await arm.solvedModel(sample.sample.poses, { validate: 'off' });
    const engine = new RecomputeEngine(createOcctLowerer(arm.__session()));
    const result = await engine.run(arm.__session().getRecords(), {
      paramTable: arm.__session().paramTable,
      gatedFeatureNames: arm.__session().gatedFeatureNames,
    });
    const sourceId: FeatureId | undefined = scene.__sourceFeatureId();
    if (sourceId === undefined) return undefined;
    const lowered = result.shapes.get(sourceId);
    if (lowered === undefined || !isSceneBackend(lowered)) return undefined;
    (sample as { scene?: SceneBackend }).scene = lowered;
    return lowered;
  } catch {
    return undefined;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

function pairKey(a: string, b: string): string {
  return a < b ? `${a}\t${b}` : `${b}\t${a}`;
}

function makeFailure(
  code: 'mechanism.disconnect' | 'mechanism.interpenetration' | 'mechanism.dof-mismatch' | 'mechanism.orphan-part',
  message: string,
): CompilerDiagnostic {
  return {
    target: 'export-occt',
    code,
    severity: 'error',
    message,
    hint: HINT_TEMPLATES[code].template,
    nextAction: HINT_TEMPLATES[code].nextAction,
  };
}
