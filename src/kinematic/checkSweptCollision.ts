// src/kinematic/checkSweptCollision.ts
//
// Sampled-pose loop for swept-volume collision detection. The headline
// differentiator of the kinematic-grounding slice: agents declare a joint
// range (or explicit pose list), the wrapper enumerates poses, solves
// forward kinematics per pose, runs BREP interference detection on the
// lowered scene, and aggregates colliding (pose, contacts[]) tuples.
//
// Reuses the existing in-process substrate:
//   - sweptPoseEnumeration.enumeratePoses   — branch over opts shape.
//   - mates/poseEnvelope.detectInterferencesForPoses — per-pose lower + FK
//     + bbox-prefiltered pairwise BREP intersect (defined in modeling/mates
//     because it predates this slice; v2 may inline the loop here once we
//     cache the lowered SceneBackend across poses).
//
// Diagnostic emission:
//   - K1 kinematic.collision.swept              — one error per colliding pose
//     (carries pose context + element=jointName for the swept joint).
//   - K2 kinematic.collision.swept.sample-density-warning — one warn per
//     joint whose (range, step) fell below the D3 safe floor.

import type { Assembly } from '../modeling/capture/assembly';
import { detectInterferencesForPoses } from '../modeling/mates/poseEnvelope';
import {
  DIAGNOSTIC_REGISTRY,
  type DiagnosticCode,
} from '../shared/diagnostics/registry';
import { enumeratePoses } from './sweptPoseEnumeration';
import type {
  KinematicDiagnostic,
  NumericPoses,
  SweptCollidingPose,
  SweptCollisionContact,
  SweptCollisionOpts,
  SweptCollisionResult,
} from './types';

/**
 * Sweep the assembly across declared joint range(s) and report poses at
 * which any link-pair collides. Returns the empty-success envelope on an
 * assembly with no parts/joints (so the facade-shape gate keeps working).
 *
 * Emits:
 *   - `kinematic.collision.swept` (error) per colliding pose.
 *   - `kinematic.collision.swept.sample-density-warning` (warn) per joint
 *     whose (range, step) is below the D3 safe floor.
 *
 * Every diagnostic in the result carries `source: 'local'`. Local in-process
 * compute; no network round-trip. Cookbook recipes:
 * `src/agent/skills/kernelcad-kinematic/cookbook/01-swept-collision-shoulder.kcad.ts`,
 * `04-scissor-jack-swept.kcad.ts`, `05-clamshell-hinge-swept.kcad.ts`.
 *
 * @see DIAGNOSTIC_REGISTRY['kinematic.collision.swept']
 * @see DIAGNOSTIC_REGISTRY['kinematic.collision.swept.sample-density-warning']
 */
export async function checkSweptCollision(
  arm: Assembly,
  opts?: SweptCollisionOpts,
): Promise<SweptCollisionResult> {
  const diagnostics: KinematicDiagnostic[] = [];

  const { poses, sparseJoints } = enumeratePoses(arm, opts);

  // K2 — one warn per joint whose (range, step) was sparser than the safe
  // floor (D3: 36 revolute / 25 prismatic). The result still computes; the
  // warn flags that mid-range collisions may have been missed.
  for (const jointName of sparseJoints) {
    diagnostics.push(buildSparseDensityWarn(jointName, opts?.range));
  }

  if (poses.length === 0) {
    // Empty assembly / no walkable joints → empty-success envelope. Preserves
    // the T2 facade-shape test that calls checkSweptCollision(emptyArm).
    return {
      ok: true,
      collidingPoses: [],
      posesSampled: 0,
      diagnostics,
      source: 'local',
    };
  }

  const collidingPoses: SweptCollidingPose[] = [];
  const epsilon = opts?.collisionToleranceMm3 ?? 0.01;

  // Pre-fill every declared non-fixed joint with a zero default. The
  // `solvedAssembly` lowerer requires a pose value for every non-fixed
  // joint (it raises feature.invalid-args otherwise); the swept loop only
  // varies one joint per pose, so we stamp the rest at zero so the lower
  // succeeds and the FK still positions all parts deterministically.
  const fullPoseDefaults: Record<string, number | [number, number, number]> = {};
  for (const j of arm.__joints()) {
    if (j.kind === 'fixed') continue;
    fullPoseDefaults[j.name] = j.kind === 'ball' ? [0, 0, 0] : 0;
  }

  for (const pose of poses) {
    const fullPose = { ...fullPoseDefaults, ...pose };
    // detectInterferencesForPoses currently lowers the whole assembly per
    // call — fine for v1 correctness, can be cached across poses in v2.
    // Forward NumericPoses verbatim; the substrate consumes the same shape.
    const pairs = await detectInterferencesForPoses(arm, fullPose, epsilon);
    if (pairs.length === 0) continue;
    const contacts: SweptCollisionContact[] = pairs.map((p) => ({
      partA: p.a,
      partB: p.b,
      volumeMm3: p.volumeMm3,
    }));
    collidingPoses.push({ pose: { ...pose }, contacts });
  }

  // K1 — one error record. Carries the worst-pose context (first colliding
  // pose encountered; collidingPoses[] holds the full list for the agent).
  if (collidingPoses.length > 0) {
    diagnostics.push(buildSweptCollisionError(collidingPoses, opts));
  }

  return {
    ok: collidingPoses.length === 0,
    collidingPoses,
    posesSampled: poses.length,
    diagnostics,
    source: 'local',
  };
}

function buildSparseDensityWarn(
  jointName: string,
  range: readonly [number, number, number] | undefined,
): KinematicDiagnostic {
  const code: DiagnosticCode = 'kinematic.collision.swept.sample-density-warning';
  const entry = DIAGNOSTIC_REGISTRY[code];
  const rangeStr = range ? `[${range[0]}, ${range[1]}, ${range[2]}]` : '<default>';
  return {
    code,
    severity: 'warn',
    message:
      `Sample density on joint '${jointName}' is below the safe floor for the joint type ` +
      `(range=${rangeStr}). The swept-collision result may miss mid-range collisions.`,
    hint: entry.hintTemplate,
    nextAction: entry.nextAction,
    element: jointName,
    source: 'local',
  };
}

function buildSweptCollisionError(
  collidingPoses: ReadonlyArray<SweptCollidingPose>,
  opts: SweptCollisionOpts | undefined,
): KinematicDiagnostic {
  const code: DiagnosticCode = 'kinematic.collision.swept';
  const entry = DIAGNOSTIC_REGISTRY[code];
  const first = collidingPoses[0];
  const firstContact = first.contacts[0];
  const message =
    `Swept-collision sweep found ${collidingPoses.length} pose(s) at which two parts ` +
    `interpenetrate (first: ${firstContact.partA} ↔ ${firstContact.partB} at ${formatPose(first.pose)}). ` +
    `Inspect result.collidingPoses for the full list.`;
  const diag: KinematicDiagnostic = {
    code,
    severity: 'error',
    message,
    hint: entry.hintTemplate,
    nextAction: entry.nextAction,
    source: 'local',
    poseContext: { ...first.pose },
  };
  // If the caller swept a single named joint, stamp it on `element` so the
  // agent can correlate the error with the swept axis.
  if (opts?.joint) {
    return { ...diag, element: opts.joint };
  }
  return diag;
}

function formatPose(pose: NumericPoses): string {
  return Object.entries(pose)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ');
}
