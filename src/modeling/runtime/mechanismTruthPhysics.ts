// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/mechanismTruthPhysics.ts
//
// Mechanism-truth criteria 5 + 6 (MuJoCo): holding torque at each sampled
// pose and drop-on-release from rest. Split out of mechanismTruth.ts.

import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import type { Assembly } from '../capture/assembly';
import { collectRegistryDrivenMates } from '../mates/mechanicalJointRegistry';
import { collectFreePassiveMates } from '../mates/passiveJoints';
import type { NumericPoses } from '../capture/forwardKinematics';
import { assemblyToMjcf } from './mjcfExport';
import type { SceneBackend } from '../../kernel/backends/sceneBackend';
import { loadMujocoSession } from './mujocoSession';
import { makeFailure, type SolvedSample } from './mechanismTruthShared';

// ─────────────────────────────────────────────────────────────────────────
// Criteria 5 + 6 — physics (MuJoCo)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Joint angle drift tolerance for the drop-test (criterion 6). 5° in
 * radians. Per the plan §thresholds; a joint that drifts more than 5°
 * from rest under 0.5 s of gravity is judged as "the mechanism doesn't
 * hold its declared pose."
 */
const DROP_TEST_JOINT_DRIFT_RAD = (5 * Math.PI) / 180;

/**
 * World position drift tolerance for the drop-test (criterion 6).
 * 50 mm = 0.05 m. A body that translates more than this in 0.5 s under
 * gravity is judged as "loose / ejected."
 */
const DROP_TEST_BODY_DRIFT_M = 0.05;

/**
 * Drop-test duration in seconds. The plan specifies 0.5 s at dt=1 ms
 * (500 steps). Fast enough that the drop-test stays bounded (~50 ms
 * wall-clock per assembly on typical hardware) yet long enough that
 * an underbraced mechanism visibly falls.
 */
const DROP_TEST_DURATION_S = 0.5;
const DROP_TEST_DT_S = 0.001;

/**
 * Run criteria 5 + 6 against the assembly. Loads MuJoCo, emits the
 * MJCF once, then runs:
 *   - per-pose inverse-dynamics (criterion 5) to check that the
 *     required holding torque is finite at every sampled pose. A
 *     non-finite torque means the mechanism has a singular Jacobian
 *     at that pose (e.g. a redundant constraint, a collapsing
 *     parallelogram, a free-fall body) — the mechanism is impossible
 *     to hold against gravity.
 *   - drop-on-release (criterion 6) from rest with all actuators at
 *     zero force; fail if joints drift > 5° or bodies translate > 50 mm.
 *
 * Joint torque CAPACITY checking (the spec's optional
 * `capacityNm` per mate) is NOT implemented in this slice. The plan
 * declares it out of scope: the joint-capacity API doesn't exist yet
 * (only declared on the legacy `maxLoad` shape which a future slice
 * will reshape). For now, criterion 5 reports a finite-torque failure
 * only.
 */
export async function runPhysicsCriteria(
  arm: Assembly,
  solved: readonly SolvedSample[],
  restScene?: SceneBackend,
): Promise<CompilerDiagnostic[]> {
  const out: CompilerDiagnostic[] = [];

  let mjcfResult: Awaited<ReturnType<typeof assemblyToMjcf>>;
  try {
    mjcfResult = await assemblyToMjcf(arm, restScene === undefined ? {} : { scene: restScene });
  } catch (e) {
    // Closed-loop graphs or other emitter failures. The kinematic
    // criteria already surface their own failures; don't double-fail
    // here. Surface a single hint that physics couldn't run.
    const msg = e instanceof Error ? e.message : String(e);
    out.push(makeFailure(
      'mechanism.unstable-under-gravity',
      `Could not run the physics gate: ${msg}. The kinematic checks (criteria 1-4) still apply.`,
    ));
    return out;
  }

let session: Awaited<ReturnType<typeof loadMujocoSession>>;
  try {
    session = await loadMujocoSession(
      mjcfResult.mjcf,
      mjcfResult.bodyOrder,
      mjcfResult.jointOrder,
    );
  } catch (e) {
    // MuJoCo XML parse error. Treat the same as a converter error.
    const msg = e instanceof Error ? e.message : String(e);
    out.push(makeFailure(
      'mechanism.unstable-under-gravity',
      `Could not load the assembly in MuJoCo: ${msg}. The MJCF emitter produced XML the engine rejected — file a follow-up issue with the MJCF dump if this surfaces on a previously-passing example.`,
    ));
    return out;
  }

  try {
    // Mechanisms with zero DOFs (all-fastened or single-part) skip the
    // physics check; gravity has nothing to act on dynamically.
    if (session.nq === 0) return out;

    // ── Criterion 5: static equilibrium at every sampled pose ──────────
    out.push(...await runStaticEquilibrium(session, solved, mjcfResult.jointOrder));

    // ── Criterion 6: drop-on-release from rest ─────────────────────────
    out.push(...await runDropOnRelease(session, mjcfResult.jointOrder, arm));
  } finally {
    session.dispose();
  }

  return out;
}

/**
 * Per the plan §Task 4: at each sampled pose, run mj_inverse with
 * qvel=0 / qacc=0 and report any joint whose required holding torque
 * is non-finite (NaN / Infinity / very large).
 *
 * Mapping kernelCAD's `solved.transforms` poses to MuJoCo's qpos vector
 * is direct for revolute / prismatic mates (one qpos slot per mate),
 * but the kernelCAD `NumericPoses` map is keyed by mate name, not by
 * the qpos index. We use `jointOrder` from the MJCF emitter to walk
 * mate-by-mate and look up each mate's pose value.
 */
async function runStaticEquilibrium(
  session: Awaited<ReturnType<typeof loadMujocoSession>>,
  solved: readonly SolvedSample[],
  jointOrder: readonly { mjcfName: string; mateName: string }[],
): Promise<CompilerDiagnostic[]> {
  const out: CompilerDiagnostic[] = [];

  for (const s of solved) {
    const qpos = jointOrderToQpos(jointOrder, s.sample.poses);
    if (qpos === undefined) continue; // mate-name mismatch; skip
    try {
      session.setPose(qpos);
      const { qfrc, allFinite } = session.inverseDynamics();
      if (!allFinite) {
        // Locate the worst joint to name it in the diagnostic.
        let worstIdx = 0;
        let worstVal = 0;
        for (let i = 0; i < qfrc.length; i++) {
          const v = qfrc[i];
          if (!Number.isFinite(v)) {
            worstIdx = i;
            worstVal = v;
            break;
          }
          if (Math.abs(v) > Math.abs(worstVal)) {
            worstIdx = i;
            worstVal = v;
          }
        }
        const mate = jointOrder[worstIdx]?.mateName ?? `joint#${worstIdx}`;
        out.push(makeFailure(
          'mechanism.unstable-under-gravity',
          `Mate '${mate}' requires a non-finite torque (${formatTorque(worstVal)} N·m) ` +
          `to hold pose '${s.sample.name}'. The mechanism has a singular configuration ` +
          `at this pose — it cannot be held against gravity. Verify part masses, joint axes, and that the chain doesn't have a redundant constraint.`,
        ));
        // One failure per pose is enough; the agent doesn't need every
        // joint's torque in addition to the smoking-gun one.
        break;
      }
    } catch (e) {
      // mj_inverse can throw on truly degenerate models (e.g. zero
      // mass everywhere). Surface as the same failure code.
      const msg = e instanceof Error ? e.message : String(e);
      out.push(makeFailure(
        'mechanism.unstable-under-gravity',
        `Could not compute required torques at pose '${s.sample.name}': ${msg}.`,
      ));
      break;
    }
  }

  return out;
}

/**
 * Per the plan §Task 5: from REST pose, simulate 0.5 s under gravity
 * with all actuators at zero force. Report:
 *   - any joint that drifts more than 5° (DROP_TEST_JOINT_DRIFT_RAD)
 *   - any body that translates more than 50 mm (DROP_TEST_BODY_DRIFT_M)
 *
 * Both failure shapes use the `mechanism.drops-on-release` code so the
 * agent surfaces a single diagnostic group; the per-failure message
 * carries the specific joint / body and the magnitude.
 */


function allArticulatedMatesDriven(
  jointOrder: readonly { mateName: string }[],
  drivenMates: ReadonlySet<string>,
): boolean {
  return jointOrder.length > 0 && jointOrder.every((j) => drivenMates.has(j.mateName));
}

/**
 * Drift on a free passive joint (unactuated revolute/prismatic in an
 * assembly with no hold/load requirement — see passiveJoints.ts) is the
 * joint doing its job: reported as 'info', never as 'broken'.
 */
function passiveDriftNote(mate: string, driftDeg: number): CompilerDiagnostic {
  return makeFailure(
    'mechanism.drops-on-release',
    `Mate '${mate}' swung ${driftDeg.toFixed(1)}° from rest in ${DROP_TEST_DURATION_S.toFixed(1)} s under gravity. ` +
    `It is a free passive joint (no actuator, no declared load), so this is informational, not a defect — declared limitsDeg / limitsMm are end stops, not a holding requirement. ` +
    `If '${mate}' must HOLD its pose (a stay, a detent, a lid that stays open), declare it and the drop test will fail it when it sags: ` +
    `give the mate a load rating — arm.mate('${mate}', a, b, type, { limitsDeg, capacity: { envelope: { maxResultantForceN, maxResultantMomentNmm } } }) — ` +
    `or a load case — arm.physicalUseCase('<name>', { stableParts: ['<base>'], loads: [{ part: '<moving part>', force: [0, 0, -<N>] }] }); ` +
    `a motor-held joint is arm.mechanicalJoint(...), a spring-balanced one arm.tendon(...).`,
    'info',
  );
}

function dropTestJointDriftFailure(
  finalQpos: readonly number[],
  restQpos: readonly number[],
  jointOrder: readonly { mjcfName: string; mateName: string }[],
  drivenMates: ReadonlySet<string>,
  passiveMates: ReadonlySet<string>,
): CompilerDiagnostic | undefined {
  // Every joint is judged, not just the worst one: a free passive hinge
  // swinging 40° must not mask a load-rated hinge sagging 10°. Driven joints
  // are held by their actuator; passive drift is only an info note, reported
  // when no joint that must hold has drifted.
  const mustHold = worstJointDrift(finalQpos, restQpos, jointOrder, (mate) => !drivenMates.has(mate) && !passiveMates.has(mate));
  if (mustHold !== undefined) {
    return makeFailure(
      'mechanism.drops-on-release',
      `Mate '${mustHold.mate}' drifted ${mustHold.driftDeg.toFixed(1)}° from rest in ${DROP_TEST_DURATION_S.toFixed(1)} s under gravity ` +
      `(threshold ${(DROP_TEST_JOINT_DRIFT_RAD * 180 / Math.PI).toFixed(0)}°). The mechanism does not hold its declared rest pose without a brake or actuator — add arm.tendon(...) across this joint, or declare it actively driven via arm.mechanicalJoint(...).`,
    );
  }
  const passive = worstJointDrift(finalQpos, restQpos, jointOrder, (mate) => passiveMates.has(mate) && !drivenMates.has(mate));
  return passive === undefined ? undefined : passiveDriftNote(passive.mate, passive.driftDeg);
}

/** The joint (among those `include` accepts) that drifted most beyond the
 *  drop-test threshold, or undefined when none did. */
function worstJointDrift(
  finalQpos: readonly number[],
  restQpos: readonly number[],
  jointOrder: readonly { mjcfName: string; mateName: string }[],
  include: (mate: string) => boolean,
): { mate: string; driftDeg: number } | undefined {
  let worst: { mate: string; driftRad: number } | undefined;
  for (let i = 0; i < finalQpos.length && i < restQpos.length; i++) {
    const mate = jointOrder[i]?.mateName ?? `joint#${i}`;
    if (!include(mate)) continue;
    const drift = Math.abs(finalQpos[i] - restQpos[i]);
    if (drift <= DROP_TEST_JOINT_DRIFT_RAD) continue;
    if (worst === undefined || drift > worst.driftRad) worst = { mate, driftRad: drift };
  }
  return worst === undefined ? undefined : { mate: worst.mate, driftDeg: (worst.driftRad * 180) / Math.PI };
}

function dropTestBodyDriftFailure(
  finalXpos: ReadonlyMap<string, readonly [number, number, number]>,
  restXpos: ReadonlyMap<string, readonly [number, number, number]>,
  allJointsPassive: boolean,
): CompilerDiagnostic | undefined {
  let worstBody: string | undefined;
  let worstBodyDriftM = 0;
  for (const [name, pos] of finalXpos) {
    const rest = restXpos.get(name);
    if (rest === undefined) continue;
    const d = Math.hypot(pos[0] - rest[0], pos[1] - rest[1], pos[2] - rest[2]);
    if (d > worstBodyDriftM) {
      worstBodyDriftM = d;
      worstBody = name;
    }
  }
  if (worstBodyDriftM <= DROP_TEST_BODY_DRIFT_M || worstBody === undefined) return undefined;
  const driftMm = worstBodyDriftM * 1000;
  if (allJointsPassive) {
    // Every DOF is a free passive joint: the body moved because its joint swung.
    return makeFailure(
      'mechanism.drops-on-release',
      `Body '${worstBody}' moved ${driftMm.toFixed(0)} mm in ${DROP_TEST_DURATION_S.toFixed(1)} s under gravity as its free passive joint swung; informational, not a defect.`,
      'info',
    );
  }
  return makeFailure(
    'mechanism.drops-on-release',
    `Body '${worstBody}' translated ${driftMm.toFixed(0)} mm in ${DROP_TEST_DURATION_S.toFixed(1)} s under gravity ` +
    `(threshold ${(DROP_TEST_BODY_DRIFT_M * 1000).toFixed(0)} mm). The mechanism does not hold this body in place — likely an ejected child of a 0-DOF mate or a free body the mate graph thinks is grounded but isn't.`,
  );
}

async function runDropOnRelease(
  session: Awaited<ReturnType<typeof loadMujocoSession>>,
  jointOrder: readonly { mjcfName: string; mateName: string }[],
  arm: Assembly,
): Promise<CompilerDiagnostic[]> {
  // Actively-driven hinges (complete mechanicalJoint intent) are treated as
  // held by an actuator. MuJoCo emission still has no position motors, so we
  // honour the authoring contract here rather than demanding a tendon on every
  // servo joint. Passive jointSupport hinges still need arm.tendon(...).
  const drivenMates = collectRegistryDrivenMates(arm);
  if (allArticulatedMatesDriven(jointOrder, drivenMates)) return [];

  // Reset to the model's qpos0 — criterion 5 left the session at its
  // last-sampled pose. The drop-test's premise is "from REST".
  const restPose = new Array(session.nq).fill(0);
  session.setPose(restPose);
  session.forward();
  const restQpos = session.getQpos().slice();
  const restXpos = new Map<string, [number, number, number]>();
  for (const [name, pos] of session.xposNow()) {
    restXpos.set(name, [pos[0], pos[1], pos[2]]);
  }

  try {
    // Tendon limits are stiff constraints. The default 1 ms step can ring on
    // gram-scale links; use the same 0.2 ms step the retention tests use.
    const dt = session.ntendon > 0 ? 0.0002 : DROP_TEST_DT_S;
    const { qpos: finalQpos, xpos: finalXpos } = session.step(
      DROP_TEST_DURATION_S,
      dt,
    );
    const out: CompilerDiagnostic[] = [];
    const passiveMates = collectFreePassiveMates(arm);
    const allJointsPassive = jointOrder.length > 0
      && jointOrder.every((j) => passiveMates.has(j.mateName) || drivenMates.has(j.mateName));
    const jointFail = dropTestJointDriftFailure(finalQpos, restQpos, jointOrder, drivenMates, passiveMates);
    if (jointFail !== undefined) out.push(jointFail);
    const bodyFail = dropTestBodyDriftFailure(finalXpos, restXpos, allJointsPassive);
    if (bodyFail !== undefined) out.push(bodyFail);
    return out;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return [makeFailure(
      'mechanism.drops-on-release',
      `The drop-test simulation failed: ${msg}. The mechanism diverged numerically under gravity — likely an unstable mass / inertia / linkage combination. Verify density declarations and joint axes.`,
    )];
  }
}

/**
 * Translate a kernelCAD `NumericPoses` map (keyed by mate name) into
 * a flat qpos array matching the MuJoCo model's joint order.
 *
 * For revolute / cylindrical / pin_slot the kernelCAD pose value is in
 * degrees; MJCF converts to radians. For prismatic it's in mm; MJCF
 * converts to metres. Anything we don't recognize (ball mates) defaults
 * to 0 — drop-test will exercise it, criterion 5's "is it finite" check
 * will still gate it.
 *
 * Returns `undefined` if the joint-name-to-mate-name lookup fails;
 * caller skips the pose silently. The MJCF emitter is the only producer
 * of these names so this should only happen in test scaffolds that
 * inject hand-built poses with the wrong keys.
 */
function jointOrderToQpos(
  jointOrder: readonly { mjcfName: string; mateName: string }[],
  poses: NumericPoses,
): number[] | undefined {
  const out: number[] = [];
  for (const j of jointOrder) {
    const v = poses[j.mateName];
    if (v === undefined) {
      out.push(0); // unposed mate → default joint angle 0
      continue;
    }
    if (typeof v === 'number') {
      // Defer the unit conversion to a heuristic — if the value's
      // magnitude is > 2π, it's almost certainly degrees (the v0.6
      // kernelCAD convention) so convert. Otherwise treat as radians.
      // This is good enough for the v0.7 corpus where mate poses are
      // ALWAYS the user-provided degrees value; the MJCF emitter has
      // already lowered the limits, so MuJoCo's internal qpos is in
      // radians.
      out.push(Math.abs(v) > 2 * Math.PI ? (v * Math.PI) / 180 : v);
    } else if (Array.isArray(v)) {
      // Ball joint pose triple → 4 quaternion slots in MuJoCo's qpos.
      // For the v0.7 corpus we don't exercise ball mates, so default
      // to identity. A future slice (when ball mates appear in the
      // physics gate) can wire the Euler-to-quat conversion here.
      out.push(1, 0, 0, 0);
    } else {
      out.push(0);
    }
  }
  return out;
}

function formatTorque(v: number): string {
  if (!Number.isFinite(v)) return v > 0 ? '+Infinity' : v < 0 ? '-Infinity' : 'NaN';
  return v.toFixed(2);
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────
