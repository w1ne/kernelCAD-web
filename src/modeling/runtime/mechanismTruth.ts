// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
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
import { initOcct } from '../../kernel/backends/occt/occtBackend';
import { createOcctLowerer } from '../backends/occt/occtLowerer';
import { RecomputeEngine } from '../compute/recomputeEngine';
import { solveMates } from '../mates/solver';
import { detectInterferences, pairKey } from './detectInterferences';
import { describeOverlap, formatOverlapMm3, isActionableOverlap, overlapRuleText, INTERPENETRATION_EPSILON_MM3 } from './jointContactCap';
import { reposedLoweredAssemblyScene } from '../mates/loweredAssemblyScene';
import { resolvedPartAt } from '../mates/partFrame';
import { expandCoupledPoses } from '../mates/coupledPoses';
import { parseConnectorRef, type MateRecord } from '../mates/mate';
import { checkOrphanParts } from './mechanismOrphan';
import { estimateSweepWork, type SweepWorkEstimate } from './sweepWork';
import { checkMotionIntent, hasMotionIntent } from './motionIntent';
import { checkMotionLimits } from './motionLimits';
import { checkMateClosure, type ClosureSample } from './mateClosure';
import {
  REST_MATE_CONTACT_TOLERANCE_MM,
  restPoseMateGaps,
  restPosePenetrations,
} from './restPoseContact';
import type { RestMateGap } from './restPoseContact';
import {
  checkJointMeshContinuity,
  JOINT_BEARING_AXIS_RADIUS_MM,
  JOINT_MESH_GAP_TOLERANCE_MM,
} from './jointMeshContinuity';
import {
  checkTendonBodyIntersectAtPose,
  TENDON_BODY_CLEARANCE_MM,
} from './tendonBodyIntersect';
import { makeFailure, type PoseSample, type SolvedSample } from './mechanismTruthShared';
import { runPhysicsCriteria } from './mechanismTruthPhysics';

/**
 * Number of pose samples per articulated mate. Currently 3 (min, mid, max
 * with 0 substituted for mid if 0 lies in the limits) — see spec §pose
 * sampling. Exposed as a module-level constant so a future tuning knob
 * isn't hardcoded across the file.
 */
export const POSE_SAMPLE_COUNT_PER_MATE = 3;

/**
 * Deterministic work budget for the BREP pose sweep (criteria 2
 * interpenetration, 3 dof-mismatch, 8 tendon-body-intersect). Criterion 7
 * (joint-mesh-gap) is NOT in the sweep: it probes the rest pose only, and a
 * disconnected link must still fail when the sweep is skipped.
 *
 * The sweep lowers the assembly once and re-poses it per sample; its cost
 * is the pairwise boolean overlap probes. `estimateSweepWork`
 * (`./sweepWork`) counts the probes the sweep would run: part pairs whose
 * bounding boxes touch at a relative pose not seen before. Parts in one
 * rigid cluster (fastened together) keep their relative pose, so they cost
 * one probe for the whole sweep. Each probe is weighted by the face count
 * of its two parts. The estimate reads only the rest scene, FK transforms
 * and bounding boxes, so it is deterministic and machine-independent.
 *
 * Calibration (2026-10, Apple M-series Mac under heavy load; boolean time
 * of criteria 2 + 3): 0.1–0.5 ms per work unit on every measured assembly
 * except the 34-part ratchet stool (4.7 ms/unit, 915 units).
 *   - DRAW 01 v7 drawing robot, 71 parts / 5 clusters: 18 061 units, ~4–6 s
 *   - desktop-3axis-mates arm, 16 parts: 7 328 units, ~1 s
 *   - spice-dispenser carousel, 11 parts: 6 087 units, ~3.4 s
 *   - Gearfinity planetary stage, 24 parts of gear teeth: 94 127 units, ~44 s
 * 40 000 lets every measured assembly up to DRAW 01 sweep with 2× margin
 * (≤ ~20 s of booleans at the worst measured rate) and skips the Gearfinity
 * stage, whose rest criteria alone take over a minute. When the estimate
 * exceeds the budget the sweep is SKIPPED and the verdict degrades to
 * `'unverified'` with a `mechanism.unverified-budget-exceeded` diagnostic.
 * Not counted: criterion 8 (tendon routing), a no-op without tendons.
 */
export const BREP_SWEEP_BUDGET = 40_000;

/**
 * Resolve the BREP-sweep budget. The fixed {@link BREP_SWEEP_BUDGET} is
 * calibrated from measured sweep times (see its doc); it does not scale
 * with the assembly. A caller `override` is the escape hatch / test seam
 * (`Infinity` forces a full sweep, `0` forces the skip path).
 */
export function effectiveSweepBudget(override?: number): number {
  return override ?? BREP_SWEEP_BUDGET;
}

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
 * Volume floor for `mechanism.interpenetration` (mm³). Imported from
 * `./jointContactCap` (`INTERPENETRATION_EPSILON_MM3`, 0.01) so the
 * "any overlap at all" floor stays in lockstep with the legacy
 * `validateAssembly` interference surface. Anything below it is BREP
 * boolean / tessellation roundoff, not real overlap.
 */

// Interference classification (absolute caps, SOTA-grounded) is shared with
// the legacy `validateAssembly` interference surface — see
// `./jointContactCap` for the model and the constants.

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
  /** What the probe actually checked, so a 'real' verdict is never read as
   *  more than it is. Absent on the empty-assembly short-circuit. */
  readonly coverage?: MechanismCoverage;
}

/** Scope of one mechanism-truth run. */
export interface MechanismCoverage {
  /** Pose samples that solved (rest + each articulated joint at its limits). */
  readonly poses: number;
  /** Articulated (non-fastened) mates swept one at a time. */
  readonly joints: number;
  /** Fastened mates whose rigidity was checked at every pose. */
  readonly fastened: number;
  /** False when the BREP pose sweep (collision / dof / tendon) was skipped. */
  readonly sweep: boolean;
  /** True when gravity hold + drop-on-release (MuJoCo) ran. */
  readonly physics: boolean;
  /** Animated joints whose animation keys were checked against their limits. */
  readonly limitsChecked: number;
  /** True when every mate's connector gap was measured at every solved pose. */
  readonly matesChecked: boolean;
  /** Moving DOFs nobody limited: "joint 'x' offset has no limits, range not checked". */
  readonly skipped: readonly string[];
}

/**
 * Optional knobs for `checkMechanismTruth`. The default is the cheap
 * kinematic-only check (criteria 1-4); `physicsCheck: true` adds
 * criteria 5 + 6, which spin up MuJoCo and run inverse dynamics + a
 * 0.5 s drop-test simulation.
 *
 * Physics is OFF by default because:
 *   - It loads a ~9 MB WASM blob.
 *   - The drop-test is ~50 ms even on a small assembly.
 *   - The recompute engine calls `checkMechanismTruth` on every
 *     keystroke in Studio; the physics layer belongs on the
 *     `validate` path, not the live recompute.
 */
export interface MechanismTruthOptions {
  /** Run criteria 5 (static equilibrium) + 6 (drop-on-release). Default false. */
  readonly physicsCheck?: boolean;
  /**
   * Override for the deterministic BREP-sweep work budget (see
   * {@link BREP_SWEEP_BUDGET}). When the estimated sweep work exceeds
   * this, criteria 2/3/8 (pose sweep) are skipped and the verdict
   * degrades to `'unverified'` unless rest-pose joint-mesh continuity
   * (criterion 7) finds a disconnected body, which is `'broken'`.
   * Mainly a test seam (pass a tiny budget to force the degradation
   * path) and an escape hatch for tractable large assemblies
   * (pass `Infinity` to always sweep). Defaults to `BREP_SWEEP_BUDGET`.
   */
  readonly sweepBudget?: number;
}



/**
 * One full BREP lower shared by every pose in a sweep. A scene's part
 * shapes are local-frame geometry, so a single lower can be re-posed per
 * sample by swapping in that sample's `solveMates` world transforms
 * (`reposedLoweredAssemblyScene`) instead of re-running the whole
 * RecomputeEngine per sample. Populated by the first sample that needs a
 * lowered scene (the rest sample in practice); a missing/partial pose map
 * falls back to a full lower per sample (see `lowerSceneForSample`).
 */
interface LoweredSceneBase {
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
/** Rest-pose criteria (1, 7, 9). They run whatever the sweep budget:
 *  one lowered rest scene, shared through `loweredBase` with the sweep. */
async function checkRestCriteria(
  arm: Assembly,
  solved: SolvedSample[],
  loweredBase: LoweredSceneBase,
): Promise<CompilerDiagnostic[]> {
  const out: CompilerDiagnostic[] = [];
  // One lowered rest scene is shared by criterion 1 (local bbox corners),
  // criterion 7 (joint-mesh continuity), and — when the sweep runs — the
  // per-pose detection (re-posed via `solveMates` transforms) plus
  // criterion 8. `Shape.lower()` re-runs the ENTIRE record chain, so the
  // old per-fastened-part bbox lowering was O(parts) full-assembly lowers.
  // The rest lower always runs: criterion 7 needs it even when the pose
  // sweep is over budget. That is one lower, not the Cartesian sweep.
  const restSample = solved.find((s) => s.sample.name === 'rest');
  if (restSample !== undefined) {
    await lowerSceneForSample(arm, restSample, loweredBase);
  }
  if (loweredBase.scene === undefined && arm.__mates().length > 0) {
    // A failed lower used to skip criterion 7 and leave the verdict
    // 'unverified'. That is a pass for a disconnected body. If the
    // bodies cannot be measured, the chain is not certified connected.
    out.push(makeFailure(
      'mechanism.joint-mesh-gap',
      'Rest-pose body continuity could not be measured because the assembly did not lower. A link that cannot be shown to meet its joint is not an unverified mechanism.',
    ));
  }

  // Criterion 1 (mechanism.disconnect) — fastened-mate invariant. Reads the
  // part local bboxes from the shared rest scene when available; falls back
  // to per-part `originalShape.lower()` only when that scene is missing.
  out.push(...(await checkFastenedInvariant(arm, solved, loweredBase.scene)));

  // Criterion 7 (mechanism.joint-mesh-gap) — at REST pose, every joint
  // pivot must lie inside both its parent and child body meshes, or the
  // two rigid groups must bear on each other. This is the "connected to
  // a body" gate. It does not honor `solvedModel({ ignore })` and it runs
  // even when the pose sweep is skipped: a floating claw is a defect, not
  // an unverified sweep. P8 slice; closes the visual-mesh-gap hole MJCF
  // cannot see.
  out.push(...(await checkJointMeshContinuityCriterion(arm, solved, loweredBase)));

  // Criterion 9 (rest-pose contact) — the drawing as it paints must be
  // physically consistent: no two solids share volume, and the two parts
  // of every mate touch. Mesh-based and independent of the sweep budget,
  // so a heavy assembly cannot pass as 'unverified' with links passing
  // through each other. See `./restPoseContact`.
  // Only mechanisms: a mate-less multi-part scene is independent bodies
  // (a display layout, a car body with its glass), not a mechanism.
  if (loweredBase.scene !== undefined && arm.__mates().length > 0) {
    out.push(...checkRestPoseContact(arm, loweredBase.scene));
  }

  return out;
}

export async function checkMechanismTruth(
  arm: Assembly,
  opts: MechanismTruthOptions = {},
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

  // Motion intent vs joint type — capture-only, no BREP. An animation or a
  // drive on a fastened joint is 'broken' whatever the sweep finds.
  failures.push(...checkMotionIntent(arm));
  // Joint ranges along the animation (capture-only). Only a model that
  // claims to move gets range notes; a static one stays quiet.
  const moving = hasMotionIntent(arm);
  const limits = moving ? checkMotionLimits(arm) : { failures: [], skipped: [], checked: 0 };
  failures.push(...limits.failures);

  // Pose sampling: rest + per-articulated-mate single-joint sweep.
  const samples = buildPoseSamples(arm);

  // Solve mates at every sample (Pattern A FK, no BREP). The mate-graph
  // edge list and per-part transforms are everything criteria 1 + 4 need;
  // criteria 2 + 3 will lazily lower BREP per-sample below.
  const solved: SolvedSample[] = [];
  const closure: ClosureSample[] = [];
  for (const sample of samples) {
    try {
      const r = await solveMates(arm, sample.poses);
      solved.push({ sample, transforms: r.poses });
      closure.push({ name: sample.name, status: r.status, ...(r.loopResiduals ? { loopResiduals: r.loopResiduals } : {}) });
    } catch {
      // A solver throw at a sampled pose is itself a mechanism failure,
      // but it's already surfaced by the pose-envelope review path. Skip
      // the sample here so the criteria below don't double-flag it.
      continue;
    }
  }

  // Per-mate satisfaction at every solved pose (loop mates; tree mates are
  // placed by the FK walk). Moving models only: a static rigid loop keeps
  // its existing validator surface.
  if (moving) failures.push(...checkMateClosure(closure));

  const joints = arm.__mates().filter((m) => m.type !== 'fastened').length;
  const fastened = arm.__mates().length - joints;
  const scope = { fastened, limitsChecked: limits.checked, matesChecked: moving && solved.length > 0, skipped: limits.skipped };
  if (solved.length === 0) {
    const coverage = { poses: 0, joints, ...scope, sweep: false, physics: false };
    return { mechanism: failures.length === 0 ? 'real' : 'broken', failures, coverage };
  }

  // BREP-sweep budget gate (issue #348). Criteria 2/3/8 re-pose the rest
  // scene per pose sample and probe pairwise overlap. Estimate the probes
  // from the rest scene (FK + bounding boxes, no boolean) and skip the
  // sweep when it is intractable; the verdict then degrades to
  // 'unverified' rather than timing out.
  // Criterion 7 is not part of the sweep: one rest lower is enough to
  // tell a floating end-effector from a connected chain, and skipping it
  // let a disconnected claw pass as 'unverified' (ok: true).
  const loweredBase: LoweredSceneBase = {};
  failures.push(...(await checkRestCriteria(arm, solved, loweredBase)));

  const sweep = await runPoseSweep(arm, solved, loweredBase, effectiveSweepBudget(opts.sweepBudget));
  failures.push(...sweep.failures);
  const sweepSkipped = sweep.skipped;

  // Criteria 5 + 6 (physics) — gated on `opts.physicsCheck`. The MuJoCo
  // session is shared between the two passes so the ~9 MB WASM module
  // and the MJCF compile only happen once per call.
  if (opts.physicsCheck === true) {
    const physicsFailures = await runPhysicsCriteria(arm, solved, loweredBase.scene);
    failures.push(...physicsFailures);
  }

  // Precedence: a definitive failure (broken) dominates; otherwise a
  // skipped sweep leaves us unable to certify (unverified); otherwise
  // every criterion held (real).
  //
  // The budget-exceeded diagnostic is a non-fatal carrier (severity 'warn')
  // that lives in `failures` so consumers surface it — but it must NOT make
  // the verdict 'broken'. Only an error-severity criterion failure means
  // 'broken'.
  const hasDefinitiveFailure = failures.some((d) => d.severity === 'error');
  const mechanism: 'real' | 'broken' | 'unverified' =
    hasDefinitiveFailure ? 'broken' : sweepSkipped ? 'unverified' : 'real';
  const coverage = { poses: solved.length, joints, ...scope, sweep: !sweepSkipped, physics: opts.physicsCheck === true };
  return { mechanism, failures, coverage };
}

/**
 * The budgeted BREP pose sweep (criteria 2, 3, 8). The estimate reads the
 * rest scene the rest criteria lowered. With no rest scene there is nothing
 * to re-pose, the sweep would measure nothing, and the rest criteria
 * already marked the mechanism broken.
 */
async function runPoseSweep(
  arm: Assembly,
  solved: SolvedSample[],
  loweredBase: LoweredSceneBase,
  sweepBudget: number,
): Promise<{ failures: CompilerDiagnostic[]; skipped: boolean }> {
  if (loweredBase.scene === undefined) return { failures: [], skipped: true };
  const sweepEstimate = await estimateArmSweepWork(arm, solved, loweredBase.scene);
  // A budget of 0 is the documented force-skip seam, even for zero work.
  if (sweepBudget <= 0 || sweepEstimate.work > sweepBudget) {
    // LOUD skip (T3): the over-budget skip used to emit ONLY a console.warn
    // and push nothing into `failures`, so the resulting 'unverified'
    // verdict carried no machine-readable signal — an agent saw "not
    // broken" and moved on. Push a structured, non-fatal diagnostic
    // carrying the work estimate, the budget, and the part count so
    // 'unverified' is evidence, not silence. Severity 'warn': "couldn't
    // verify" must NOT make `ok: false` on its own (that's reserved for a
    // definitive 'broken', including a rest-pose joint-mesh gap).
    return { failures: [makeBudgetExceeded(sweepEstimate, sweepBudget)], skipped: true };
  }
  const failures: CompilerDiagnostic[] = [];
  // `loweredBase` holds the rest sample's full lower; every other pose
  // re-poses it with that sample's `solveMates` transforms instead of
  // re-lowering the whole assembly.

  // Criterion 2 (mechanism.interpenetration) — per-pose BREP sweep.
  failures.push(...(await checkInterpenetration(arm, solved, loweredBase)));

  // Criterion 3 (mechanism.dof-mismatch) — pragmatic micro-pose check.
  // Note: this is the spec's open-question #2 ("DoF-mismatch is
  // geometric"); the pragmatic shape used here is connected-component
  // count stability under ±ε around the declared axis. Skipped when the
  // assembly has no revolute mates.
  failures.push(...(await checkDofMismatch(arm, loweredBase)));

  // Criterion 8 (mechanism.tendon-body-intersect) — a balance tendon's
  // routed path must not cut through a non-anchor body at any sampled
  // pose. The static authoring backstop for "the spring goes through the
  // arm"; MuJoCo wrap routing (Slice 2 MJCF) is the runtime side, this is
  // the design-time gate. No-op for assemblies with no tendons.
  failures.push(...(await checkTendonBodyIntersectCriterion(arm, solved, loweredBase)));
  return { failures, skipped: false };
}

/**
 * Estimate of the BREP-sweep cost (see `./sweepWork`) from the rest scene
 * re-posed at every solved sample and dof micro-pose: FK (`solveMates`)
 * and bounding boxes only, no boolean. Used by {@link checkMechanismTruth}
 * to decide whether the sweep fits {@link BREP_SWEEP_BUDGET}. See issue #348.
 */
async function estimateArmSweepWork(
  arm: Assembly,
  solved: readonly SolvedSample[],
  restScene: SceneBackend,
): Promise<SweepWorkEstimate> {
  const poses: Array<ReadonlyMap<string, Transform>> = solved
    .filter((s) => s.sample.name !== 'rest')
    .map((s) => s.transforms);
  const coupledDriven = new Set(arm.__mateCouplings().map((c) => c.driven));
  for (const mate of arm.__mates()) {
    if (mate.type !== 'revolute' || coupledDriven.has(mate.name)) continue;
    for (const p of microPosesWithinLimits(mate)) {
      if (p === 0) continue;
      try {
        const overrides = expandCoupledPoses(arm.__mates(), arm.__mateCouplings(), { [mate.name]: p });
        poses.push((await solveMates(arm, overrides)).poses);
      } catch {
        // checkDofMismatch skips a micro-pose that does not solve.
      }
    }
  }
  const scenes: SceneBackend[] = [restScene];
  for (const transforms of poses) {
    // A pose the re-pose helper refuses is fully re-lowered by the sweep;
    // its pairs are not counted here (rare: an incomplete pose map).
    const scene = reposedLoweredAssemblyScene(arm, restScene, transforms);
    if (scene !== undefined) scenes.push(scene);
  }
  return estimateSweepWork(scenes);
}

// ─────────────────────────────────────────────────────────────────────────
// Criterion 1 — mechanism.disconnect (fastened-mate rigidity invariant)
// ─────────────────────────────────────────────────────────────────────────

/**
 * FK-aware rigidity test: for each fastened mate (A, B), sample the
 * 8 bbox corners of B's local geometry and assert that EVERY corner
 * lands at its FK-expected position under every sampled pose. The
 * "FK-expected position" is computed by composing A's per-pose
 * transform with the constant rigid offset between A's and B's rest
 * frames:
 *
 *   T_AB_local = T_A_rest^-1 ∘ T_B_rest           (constant)
 *   expected_B(pose) = T_A(pose) ∘ T_AB_local     (per pose)
 *   drift = || T_B(pose) · corner − expected_B(pose) · corner ||
 *
 * For a TRULY rigid attachment, the assembly FK pipeline computes
 * `T_B(pose) = T_A(pose) ∘ T_AB_local` by construction (the fastened
 * mate contributes identity at the joint frame), so every corner
 * lands at exactly its expected position and drift = 0 for all corners
 * at all poses — regardless of how the parent moves. For a mate that
 * doesn't actually rigidify the geometry (e.g. an FK quirk that fails
 * to propagate parent rotation into the child's transform), T_B(pose)
 * diverges from T_A(pose) ∘ T_AB_local and the drift grows with the
 * rotation arc — exactly the failure mode the gate exists to catch.
 *
 * Why this replaces the pre-P0.2 displacement-difference test: the
 * pre-P0.2 implementation compared the child's per-corner world
 * displacement (between rest and sample) against the PARENT's origin
 * displacement. For a child rigidly attached to a rotating parent
 * those displacements agree only at the parent's origin — every
 * off-axis corner of the child sweeps a rotation arc that the parent's
 * origin doesn't follow, producing 2·r·sin(θ/2) of spurious "drift"
 * (e.g. 167 mm at corner #5 of a 50 mm off-axis body under a 90°
 * parent rotation). That made the gate reject rigid attachments by
 * construction, causing the P2/P4 Luxo lamp failures and forcing an
 * ablation pattern (mount springs to the stationary base, not the
 * rotating arm).
 *
 * Why bbox corners specifically (P0.1 carry-over): they span the
 * part's extent. The same FK-expected check applied at a single test
 * point can miss a mate that's "rigid at the origin but loose at the
 * extents" — e.g. a connector pinned to the rotation axis where every
 * sane test would see zero drift. Sampling all 8 corners catches a
 * body whose far edges diverge from the FK-expected attachment under
 * motion.
 *
 * The PR #338 gutted-assembly fails on criterion 4 (orphan-part); its
 * missing body geometry produces a degenerate bbox that wouldn't fire
 * here anyway.
 */
async function checkFastenedInvariant(
  arm: Assembly,
  solved: readonly SolvedSample[],
  baseScene?: SceneBackend,
): Promise<CompilerDiagnostic[]> {
  const fastenedMates = arm.__mates().filter((m) => m.type === 'fastened');
  if (fastenedMates.length === 0) return [];

  const rest = solved.find((s) => s.sample.name === 'rest');
  if (rest === undefined) return [];

  const out: CompilerDiagnostic[] = [];
  // Local-frame bboxes come from the shared rest scene when it was lowered
  // (one full lower); otherwise `getOrComputeBboxCorners` falls back to the
  // per-part `originalShape.lower()` (a full record-chain lower per part).
  const localBboxByPart = baseScene === undefined ? undefined : sourceFrameBboxes(arm, baseScene);
  // Cache local-frame bbox corners per part — we may visit the same part
  // across multiple mates.
  const cornersByPart = new Map<string, readonly Se3Vec3[]>();

  for (const mate of fastenedMates) {
    const aPart = parseConnectorRef(mate.a).partName;
    const bPart = parseConnectorRef(mate.b).partName;

    const T_A_rest = rest.transforms.get(aPart);
    const T_B_rest = rest.transforms.get(bPart);
    if (T_A_rest === undefined || T_B_rest === undefined) continue;

    const corners = await getOrComputeBboxCorners(arm, bPart, cornersByPart, localBboxByPart);
    if (corners === undefined || corners.length === 0) continue;

    // FK-expected-position rigidity test:
    //
    //   T_AB_local = T_A_rest^-1 ∘ T_B_rest        (constant rigid offset)
    //   expected_B(pose) = T_A(pose) ∘ T_AB_local  (per-pose)
    //   drift_i = || T_B(pose) · corner_i − expected_B(pose) · corner_i ||
    //
    // For a true rigid attachment, T_B(pose) = T_A(pose) ∘ T_AB_local
    // by construction (the fastened mate is identity at the joint
    // frame), so drift_i = 0 for every corner at every pose. > tolerance
    // at ANY corner ⇒ the mate's FK output doesn't realize rigid
    // attachment under motion.
    const T_AB_local = T_A_rest.inverse().compose(T_B_rest);
    const { worstDriftMm, worstSampleName, worstCornerIndex } =
      worstFastenedDrift(aPart, bPart, T_AB_local, solved, corners);

    if (worstDriftMm > DISCONNECT_TOLERANCE_MM) {
      out.push(makeFailure(
        'mechanism.disconnect',
        `Fastened mate '${mate.name}' between '${aPart}' and '${bPart}' fails its rigidity invariant: ` +
        `at pose sample '${worstSampleName}' part '${bPart}' bbox-corner #${worstCornerIndex} ` +
        `drifts ${worstDriftMm.toFixed(2)} mm from its FK-expected rigid position relative to '${aPart}' ` +
        `(tolerance ${DISCONNECT_TOLERANCE_MM} mm; rigidity tested at all 8 part bbox corners). ` +
        `The fastened mate isn't physically realizing rigid attachment under motion — ` +
        `the FK output for '${bPart}' diverges from T_${aPart}(pose) ∘ T_AB_local, ` +
        `which means the mate's connector composition is failing to propagate the parent's motion into the child's transform.`,
      ));
    }
  }

  return out;
}

type Bbox3 = { min: [number, number, number]; max: [number, number, number] };

/** Bounding box of each scene part in the part's own frame. A scene part's
 *  shape carries its `at`, while the `solveMates` placements the corners are
 *  moved by place the part's own frame, so each box moves back by `at`. This
 *  covers every part, not only mated ones (so not `partAtFor`): the box then
 *  matches the `originalShape.lower()` fallback for every part, and criterion
 *  1 only reads parts on fastened mates. */
function sourceFrameBboxes(arm: Assembly, scene: SceneBackend): Map<string, Bbox3> {
  const table = arm.__session().paramTable;
  const atByName = new Map(arm.__parts().map((p) => [p.name, p.at]));
  const out = new Map<string, Bbox3>();
  for (const p of scene.parts) {
    const at = resolvedPartAt(atByName.get(p.name), table);
    const back = (v: readonly number[]): [number, number, number] => [v[0] - at[0], v[1] - at[1], v[2] - at[2]];
    const bb = p.shape.boundingBox();
    out.set(p.name, { min: back(bb.min), max: back(bb.max) });
  }
  return out;
}

/** Worst FK-rigidity drift of `bPart` relative to `aPart` across every
 *  non-rest pose and every bbox corner. The fastened-mate invariant holds iff
 *  this stays under `DISCONNECT_TOLERANCE_MM`; the returned sample name and
 *  corner index pinpoint the offending corner for the diagnostic. */
function worstFastenedDrift(
  aPart: string,
  bPart: string,
  offset: Transform,
  solved: readonly SolvedSample[],
  corners: readonly Se3Vec3[],
): { worstDriftMm: number; worstSampleName: string; worstCornerIndex: number } {
  let worstDriftMm = 0;
  let worstSampleName = '';
  let worstCornerIndex = -1;
  for (const s of solved) {
    if (s.sample.name === 'rest') continue;
    const T_A = s.transforms.get(aPart);
    const T_B = s.transforms.get(bPart);
    if (T_A === undefined || T_B === undefined) continue;
    const expected_B = T_A.compose(offset);
    for (let i = 0; i < corners.length; i++) {
      const observed = T_B.point(corners[i]);
      const expected = expected_B.point(corners[i]);
      const drift = Math.hypot(
        observed[0] - expected[0],
        observed[1] - expected[1],
        observed[2] - expected[2],
      );
      if (drift > worstDriftMm) {
        worstDriftMm = drift;
        worstSampleName = s.sample.name;
        worstCornerIndex = i;
      }
    }
  }
  return { worstDriftMm, worstSampleName, worstCornerIndex };
}

/** 8 corners of an AABB, in the same x→y→z nesting order the old
 *  per-part lower used (so the drift diagnostic's corner index is stable). */
function bboxCorners(
  bb: { min: [number, number, number]; max: [number, number, number] },
): Se3Vec3[] {
  const corners: Se3Vec3[] = [];
  for (const x of [bb.min[0], bb.max[0]]) {
    for (const y of [bb.min[1], bb.max[1]]) {
      for (const z of [bb.min[2], bb.max[2]]) {
        corners.push([x, y, z]);
      }
    }
  }
  return corners;
}

/**
 * Compute the 8 bbox corners of `partName`'s local-frame geometry,
 * caching the result. Prefers the shared rest scene's local part bbox when
 * one is supplied (one full lower total); otherwise falls back to
 * `originalShape.lower()` — which re-runs the ENTIRE record chain, so the
 * fallback is O(parts) full lowers on a dense assembly. Returns `undefined`
 * if the part isn't found or the lower / bbox call throws (the part may be
 * on a session that hasn't been initialized in this engine — caller should
 * skip).
 */
async function getOrComputeBboxCorners(
  arm: Assembly,
  partName: string,
  cache: Map<string, readonly Se3Vec3[]>,
  localBboxByPart?: ReadonlyMap<string, { min: [number, number, number]; max: [number, number, number] }>,
): Promise<readonly Se3Vec3[] | undefined> {
  const cached = cache.get(partName);
  if (cached !== undefined) return cached;

  const sceneBbox = localBboxByPart?.get(partName);
  if (sceneBbox !== undefined) {
    const corners = bboxCorners(sceneBbox);
    cache.set(partName, corners);
    return corners;
  }

  const part = arm.__parts().find((p) => p.name === partName);
  if (part === undefined) return undefined;

  try {
    const backend = await part.originalShape.lower();
    const corners = bboxCorners(backend.boundingBox());
    cache.set(partName, corners);
    return corners;
  } catch {
    return undefined;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Criterion 9 — mechanism.rest-interpenetration / mechanism.mate-gap
// ─────────────────────────────────────────────────────────────────────────

function checkRestPoseContact(arm: Assembly, scene: SceneBackend): CompilerDiagnostic[] {
  const out: CompilerDiagnostic[] = [];
  for (const p of restPosePenetrations(scene)) {
    const at = p.at.map((v) => v.toFixed(1)).join(', ');
    out.push(makeFailure(
      'mechanism.rest-interpenetration',
      `Parts '${p.a}' and '${p.b}' interpenetrate by ${formatOverlapMm3(p.volumeMm3)} mm³ at the rest pose ` +
      `(${Number.isFinite(p.thicknessMm) ? `${p.thicknessMm.toFixed(2)} mm thick` : 'thickness unknown'}; rule: ${overlapRuleText(p.contactThicknessMm)}; shared region centred near [${at}] mm, ` +
      `${p.cellMm > 0 ? `${p.cellMm.toFixed(2)} mm voxels` : 'no voxels'}). Seated parts share faces, not volume.`,
    ));
  }
  out.push(...restPoseMateGaps(arm, scene).map(mateGapFailure));
  return out;
}

function mateGapFailure(g: RestMateGap): CompilerDiagnostic {
  return makeFailure(
    'mechanism.mate-gap',
    `Mate '${g.mateName}': parts '${g.a}' and '${g.b}' are ${g.gapMm.toFixed(2)} mm apart at the rest pose ` +
    `(tolerance ${REST_MATE_CONTACT_TOLERANCE_MM} mm). The mate is declared but the parts do not touch.`,
  );
}

/**
 * The cheap part of criterion 9 for surfaces that skip the full mechanism
 * probe (default `kernelcad validate`, a review_cad without the pose
 * envelope): every FASTENED mate's two parts must touch at rest. A fastened
 * mate has no motion to sweep, so a gap is a defect on every surface, never
 * an "unverified" mechanism. Same measurement and message as the full probe.
 */
export function checkFastenedMateContact(arm: Assembly, scene: SceneBackend): CompilerDiagnostic[] {
  return restPoseMateGaps(arm, scene, REST_MATE_CONTACT_TOLERANCE_MM, (m) => m.type === 'fastened')
    .map(mateGapFailure);
}

// ─────────────────────────────────────────────────────────────────────────
// Criterion 2 — mechanism.interpenetration (non-mated overlap)
// ─────────────────────────────────────────────────────────────────────────

/**
 * For each sampled pose, lower the assembly + run `detectInterferences`.
 * Classify every overlap pair by the shared rule `isActionableOverlap`,
 * UNIFORMLY regardless of the mate type joining the pair (decision #1):
 * face contact (a sliver ≤ 0.01 mm thick) passes; any thicker overlap above
 * 0.01 mm³ is a real interference → `mechanism: broken`, for ALL pairs.
 *
 * Adjacency does NOT excuse a real overlap. A correctly-modeled rotating
 * joint is a clearance fit (ISO 286): the clevis primitive drills the pin
 * bore through both knuckles so the pin floats in air and pin-in-tongue
 * shared volume is ~0. The only escape hatch for a genuine intended overlap
 * is the per-pair user `ignore` list on `solvedModel({ ignore: [...] })`.
 */
async function checkInterpenetration(
  arm: Assembly,
  solved: SolvedSample[],
  loweredBase: LoweredSceneBase,
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

  // The documented escape hatch for a genuine intended overlap is the
  // per-pair user `ignore` list on `solvedModel({ ignore: [...] })`
  // (SolidWorks "Ignore" / press-fit). Fold it into the detector's
  // symmetric pair-key set so the mechanism-truth criterion honors the
  // same silencing the validator diagnostic stream does.
  const ignored = new Set<string>();
  for (const [a, b] of arm.__ignoreInterference()) ignored.add(pairKey(a, b));

  for (const s of solved) {
    const scene = await lowerSceneForSample(arm, s, loweredBase);
    if (scene === undefined) continue;

    const result = detectInterferences(scene, INTERPENETRATION_EPSILON_MM3, ignored);
    if (result.pairs.length === 0) continue;

    for (const pair of result.pairs) {
      const key = pairKey(pair.a, pair.b);
      const mateType = matedPairs.get(key);
      // The shared interference rule (`isActionableOverlap`) applies to every
      // pair, adjacent or not (decision #1) — a correct clearance-fit joint has
      // ~0 overlap, so adjacency earns no extra budget.
      if (!isActionableOverlap(pair)) continue;

      const relation = mateType === undefined
        ? `are NOT joined by a mate that would explain the contact`
        : `overlap far more than the ${mateType} joint's clearance-fit contact ` +
          `(rule: ${overlapRuleText()} — a drilled clearance bore has ~0 overlap)`;
      out.push(makeFailure(
        'mechanism.interpenetration',
        `Parts '${pair.a}' and '${pair.b}' interpenetrate by ${describeOverlap(pair)} at pose sample '${s.sample.name}' — ` +
        `they ${relation}. A correctly-modeled joint is a clearance fit (ISO 286) with ~0 shared solid volume. ` +
        `Add clearance, reduce mate travel, move the geometry so the swept pose stays collision-free, ` +
        `or pass { ignore: [['${pair.a}', '${pair.b}']] } to solvedModel(...) if this overlap is genuinely intended.`,
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
async function checkDofMismatch(
  arm: Assembly,
  loweredBase: LoweredSceneBase,
): Promise<CompilerDiagnostic[]> {
  // A coupled (driven) mate never moves on its own: perturbing it alone
  // turns a meshing gear into a collision. Its motion is exercised through
  // its source mate's micro-pose, which expandCoupledPoses propagates.
  const coupledDriven = new Set(arm.__mateCouplings().map((coupling) => coupling.driven));
  const revoluteMates = arm.__mates().filter((m) => m.type === 'revolute' && !coupledDriven.has(m.name));
  if (revoluteMates.length === 0) return [];

  // Same symmetric `solvedModel({ ignore })` silencing the interpenetration
  // criterion applies — an intended contact must not make the micro-pose
  // overlap count wobble and fire a spurious dof-mismatch.
  const ignored = new Set<string>();
  for (const [a, b] of arm.__ignoreInterference()) ignored.add(pairKey(a, b));

  const out: CompilerDiagnostic[] = [];
  for (const mate of revoluteMates) {
    // Micro-poses around 0° that lie inside the declared travel: a lid
    // resting on its end stop must not be pushed through the stop.
    const microPoses = microPosesWithinLimits(mate);
    if (microPoses.length < 2) continue;
    const overlapCounts = await microPoseOverlapCounts(arm, mate, microPoses, loweredBase, ignored);

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
        `under a ${DOF_MISMATCH_MICRO_POSE_DEG}° micro-pose (counts at ${microPoses.map(formatMicroPose).join(', ')}: ${overlapCounts.join(', ')}). ` +
        `Re-check the mate axis, the connector frames on both parts, and the mate type.`,
      ));
    }
  }

  return out;
}

/** {-ε, 0, +ε}, minus any excursion outside the mate's declared limitsDeg. */
function microPosesWithinLimits(mate: MateRecord): number[] {
  const microPoses = [-DOF_MISMATCH_MICRO_POSE_DEG, 0, DOF_MISMATCH_MICRO_POSE_DEG];
  const limits = mate.limitsDeg;
  if (!Array.isArray(limits) || limits.length !== 2 || !limits.every(Number.isFinite)) return microPoses;
  const [min, max] = limits as readonly [number, number];
  return microPoses.filter((p) => p >= min - 1e-9 && p <= max + 1e-9);
}

function formatMicroPose(p: number): string {
  if (p === 0) return '0';
  return p < 0 ? '-ε' : '+ε';
}

/** Interference-pair count at each micro-pose of `mate`; -1 where the pose
 *  failed to solve or lower. */
async function microPoseOverlapCounts(
  arm: Assembly,
  mate: MateRecord,
  microPoses: readonly number[],
  loweredBase: LoweredSceneBase,
  ignored: ReadonlySet<string>,
): Promise<number[]> {
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
      const scene = await lowerSceneForSample(arm, sample, loweredBase);
      if (scene === undefined) {
        overlapCounts.push(-1);
        continue;
      }
      const result = detectInterferences(
        scene, INTERPENETRATION_EPSILON_MM3, ignored,
      );
      overlapCounts.push(result.pairs.length);
    } catch {
      overlapCounts.push(-1);
    }
  }
  return overlapCounts;
}

// ─────────────────────────────────────────────────────────────────────────
// Criterion 7 — mechanism.joint-mesh-gap (joint-mesh-continuity at rest)
// ─────────────────────────────────────────────────────────────────────────

/**
 * For every mate, at REST pose, the joint pivot must lie inside both
 * mated bodies' BREP solids within
 * `JOINT_MESH_GAP_TOLERANCE_MM` — or, when the pivot is deliberately in
 * open space, the two mated rigid groups must maintain bearing contact
 * within the same tolerance somewhere (see the bearing-contact fallback
 * in `jointMeshContinuity.ts`). The mate-FK pose envelope rides on
 * the constraint surface for the rest of the joint sweep, so a clean
 * rest-pose pin guarantees the pin stays inside for the full travel
 * (the spec's non-goal: pose-swept sampling).
 *
 * Reuses the rest-pose `SolvedSample.scene` lazily lowered by criteria
 * 2 + 3 — no new pose solve, no new BREP lower.
 */
/** Appended to the joint-mesh-gap hint: the tempting fix (move the
 *  connector onto the body) drags the mated part along with it. */
const JOINT_MESH_GAP_CONNECTOR_MOVE_WARNING =
  'Moving a connector also moves the part mated to it (the mate re-aligns the partner), which can silently reopen a collision — prefer growing the geometry, and re-run the collision check after any connector move.';

async function checkJointMeshContinuityCriterion(
  arm: Assembly,
  solved: SolvedSample[],
  loweredBase: LoweredSceneBase,
): Promise<CompilerDiagnostic[]> {
  const rest = solved.find((s) => s.sample.name === 'rest');
  if (rest === undefined) return [];
  const scene = await lowerSceneForSample(arm, rest, loweredBase);
  if (scene === undefined) return [];

  const results = checkJointMeshContinuity(arm, {
    transforms: rest.transforms,
    scene,
  });

  const out: CompilerDiagnostic[] = [];
  for (const r of results) {
    // Decision #3 reframe: the knuckle SOLID must be present around the
    // pivot, not the pivot POINT inside solid. A drilled clevis knuckle's
    // nearest solid is the bore wall at `clearanceRadiusMm`; accept a gap up
    // to that plus the mesher-noise margin. Non-drilled connectors carry
    // clearanceRadiusMm = 0, so this collapses to the original 1 mm
    // point-in-solid tolerance.
    const allowedGap = r.clearanceRadiusMm + JOINT_MESH_GAP_TOLERANCE_MM;
    if (r.signedDistanceMm <= allowedGap) continue;
    // Bearing-contact fallback: a pivot deliberately in open space
    // (annular rim seat, spindle in a fastened block's bore) is fine
    // when the two mated rigid groups maintain bearing contact /
    // clearance within the same tolerance ANYWHERE — the joint is
    // constrained by material away from the axis, not floating.
    if (r.bearingGapMm !== undefined && r.bearingGapMm <= JOINT_MESH_GAP_TOLERANCE_MM) continue;
    const bearingNote = r.bearingGapMm !== undefined
      ? ` Nearest contact between the two mated bodies is ` +
        `${r.bearingGapMm.toFixed(1)}mm — no bearing surface constrains ` +
        `the joint within tolerance either.`
      : '';
    const offAxisNote = r.bearingOffAxisRadialMm !== undefined
      ? ` The closest surface contact sits ${r.bearingOffAxisRadialMm.toFixed(1)}mm ` +
        `off the joint axis, outside the ${JOINT_BEARING_AXIS_RADIUS_MM.toFixed(0)}mm ` +
        `knuckle radius, so it does not connect the link to the body.`
      : '';
    const failure = makeFailure(
      'mechanism.joint-mesh-gap',
      `Joint '${r.mateName}' ${r.side} body '${r.partName}': nearest solid is ` +
      `${r.signedDistanceMm.toFixed(1)}mm from the pivot origin (allowed ` +
      `${allowedGap.toFixed(1)}mm = clearance bore ${r.clearanceRadiusMm.toFixed(1)}mm + ` +
      `${JOINT_MESH_GAP_TOLERANCE_MM.toFixed(1)}mm margin). The link mesh does not ` +
      `reach the joint it pivots on — extend the body geometry so its OCCT ` +
      `knuckle solid surrounds the joint origin at rest pose.` + bearingNote + offAxisNote +
      ` Do not fix this by moving the connector alone: the mate re-aligns the ` +
      `mated part '${r.otherPartName}' onto the moved connector, which can ` +
      `silently reopen a collision elsewhere — re-run the collision check ` +
      `after any connector move.`,
    );
    out.push({
      ...failure,
      hint: `${failure.hint} ${JOINT_MESH_GAP_CONNECTOR_MOVE_WARNING}`,
    });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────
// Criterion 8 — mechanism.tendon-body-intersect
// ─────────────────────────────────────────────────────────────────────────

/**
 * For every tendon, at every sampled pose, the routed cable polyline must
 * not pass through the solid interior of any part other than its anchor
 * parts and the wrap-geom parts it rides on. Reuses the per-sample lowered
 * scene (criteria 2/3/7) — no extra lower for poses already evaluated.
 *
 * No-op when the assembly declares no tendons.
 */
async function checkTendonBodyIntersectCriterion(
  arm: Assembly,
  solved: SolvedSample[],
  loweredBase: LoweredSceneBase,
): Promise<CompilerDiagnostic[]> {
  if (arm.__tendons().length === 0) return [];
  const out: CompilerDiagnostic[] = [];
  const seen = new Set<string>(); // dedupe (tendon, part) across poses
  for (const s of solved) {
    const scene = await lowerSceneForSample(arm, s, loweredBase);
    if (scene === undefined) continue;
    const results = checkTendonBodyIntersectAtPose(arm, { transforms: s.transforms, scene });
    for (const r of results) {
      const key = `${r.tendonName}|${r.partName}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(makeFailure(
        'mechanism.tendon-body-intersect',
        `Tendon '${r.tendonName}' routes through part '${r.partName}' ` +
        `(${r.gapMm <= 0 ? 'inside the solid' : `${r.gapMm.toFixed(2)}mm clearance`}, ` +
        `tolerance ${TENDON_BODY_CLEARANCE_MM.toFixed(1)}mm) at pose '${s.sample.name}'. ` +
        `The cable cuts through a body it is not anchored to or routing around — ` +
        `add a wrap geom on '${r.partName}' to the tendon's wrapGeoms so the cable rides ` +
        `over it, or relocate the anchors so the line stays clear at every pose.`,
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
 * Produce a SceneBackend for `sample` the interference detector can read.
 *
 * Fast path: once `loweredBase.scene` holds one fully lowered scene, every
 * other sample re-poses it with that sample's `solveMates` world transforms
 * (`reposedLoweredAssemblyScene`) — part BREPs are local-frame geometry, so
 * the source feature tree does NOT need re-lowering per pose. This turns
 * the sweep's `(samples × parts)` full lowers into ONE lower plus cheap
 * clone-free re-poses.
 *
 * Slow path (first sample, or a partial pose map the re-pose helper
 * refuses): run `arm.solvedModel(poses)` + RecomputeEngine exactly like the
 * old per-sample lower. Results are cached on `sample.scene` to avoid
 * re-paying for repeat criterion calls on the same sample.
 */
async function lowerSceneForSample(
  arm: Assembly,
  sample: SolvedSample,
  loweredBase: LoweredSceneBase = {},
): Promise<SceneBackend | undefined> {
  if (sample.scene !== undefined) return sample.scene;
  try {
    const reposed = loweredBase.scene === undefined
      ? undefined
      : reposedLoweredAssemblyScene(arm, loweredBase.scene, sample.transforms);
    const lowered = reposed ?? await lowerAssemblySceneForPose(arm, sample);
    if (lowered === undefined) return undefined;
    (sample as { scene?: SceneBackend }).scene = lowered;
    if (loweredBase.scene === undefined) loweredBase.scene = lowered;
    return lowered;
  } catch {
    return undefined;
  }
}

/** Full-assembly lower at one pose — the slow path behind
 *  {@link lowerSceneForSample}. Runs the RecomputeEngine over the
 *  assembly's records (mirrors `detectInterferencesForPoses`). */
async function lowerAssemblySceneForPose(
  arm: Assembly,
  sample: SolvedSample,
): Promise<SceneBackend | undefined> {
  // The `solvedAssembly` lowerer needs a pose for every non-fixed v0.5
  // joint (`arm.revolute(...)`); samples only name the mates they move, so
  // stamp the rest at zero, as checkSweptCollision does.
  const jointDefaults: Record<string, number | [number, number, number]> = {};
  for (const j of arm.__joints()) {
    if (j.kind === 'fixed') continue;
    jointDefaults[j.name] = j.kind === 'ball' ? [0, 0, 0] : 0;
  }
  const scene = await arm.solvedModel({ ...jointDefaults, ...sample.sample.poses }, { validate: 'off' });
  const engine = new RecomputeEngine(createOcctLowerer(arm.__session()));
  const result = await engine.run(arm.__session().getRecords(), {
    paramTable: arm.__session().paramTable,
    gatedFeatureNames: arm.__session().gatedFeatureNames,
    // Only the appended pose scene needs lowering; the part records are
    // unchanged since the last full lower.
    seedShapes: arm.__session().reusableLoweredPrefix(),
  });
  const sourceId: FeatureId | undefined = scene.__sourceFeatureId();
  if (sourceId === undefined) return undefined;
  const lowered = result.shapes.get(sourceId);
  if (lowered === undefined || !isSceneBackend(lowered)) return undefined;
  return lowered;
}

/**
 * Build the LOUD non-fatal diagnostic for a skipped (over-budget) BREP
 * pose-sweep. Severity 'warn' so it carries the 'unverified' verdict with
 * evidence without flipping the verdict to 'broken' (see precedence in
 * {@link checkMechanismTruth}).
 */
function makeBudgetExceeded(
  estimate: SweepWorkEstimate,
  sweepBudget: number,
): CompilerDiagnostic {
  const code = 'mechanism.unverified-budget-exceeded';
  const { work, candidates, parts, clusters, lowers } = estimate;
  return {
    target: 'export-occt',
    code,
    severity: 'warn',
    message:
      `The articulated BREP pose-sweep (collision/dof/tendon criteria) was SKIPPED: ` +
      `estimated work ${work} exceeds the budget ${sweepBudget} ` +
      `(${parts} part${parts === 1 ? '' : 's'} in ${clusters} rigid cluster${clusters === 1 ? '' : 's'}, ` +
      `${lowers} pose${lowers === 1 ? '' : 's'}, ${candidates} pair overlap probe${candidates === 1 ? '' : 's'}; ` +
      `work is the summed face count of the probed pairs). The mechanism ` +
      `is NOT certified collision-free across its travel. Rest-pose joint-mesh ` +
      `continuity still ran — a link that does not meet its body is 'broken', ` +
      `not unverified. Reduce the part/pose count, verify a tractable ` +
      `sub-assembly, or pass a larger sweepBudget to force the full sweep.`,
    hint: HINT_TEMPLATES[code].template,
    nextAction: HINT_TEMPLATES[code].nextAction,
  };
}

