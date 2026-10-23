// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
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
// Closed loops: each walk (one per swept joint) runs closed-loop
// continuation (`loopContinuation`), seeding every pose from the previous
// solved pose and lowering exactly that configuration. A branch flip,
// lockup or over-driven loop ends the walk at the pose it names; the
// finding is in `diagnostics` and later poses are not sampled.
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
import { LoopContinuation } from './loopContinuation';
import { jointGraphHasLoops, type NumericPoses as FullPoses } from '../modeling/capture/forwardKinematics';
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

  const { poses, sparseJoints, walks } = enumeratePoses(arm, opts);

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

  const epsilon = opts?.collisionToleranceMm3 ?? 0.01;
  const { collidingPoses, posesSampled, loopDiagnostics } = await sweepWalks(arm, walks, epsilon);
  diagnostics.push(...loopDiagnostics);

  // K1 — one error record. Carries the worst-pose context (first colliding
  // pose encountered; collidingPoses[] holds the full list for the agent).
  if (collidingPoses.length > 0) {
    diagnostics.push(buildSweptCollisionError(collidingPoses, opts));
  }

  return {
    ok: collidingPoses.length === 0 && !loopDiagnostics.some((d) => d.severity === 'error'),
    collidingPoses,
    posesSampled,
    diagnostics,
    source: 'local',
  };
}

/** Joint-graph assemblies get every non-fixed joint stamped at zero: the
 *  `solvedAssembly` lowerer requires a pose for each, and the sweep only
 *  varies one joint per pose. Mate poses are never prefilled — on a closed
 *  loop a prefilled mate would be driven too and over-drive the loop. */
function jointPoseDefaults(arm: Assembly): FullPoses {
  const defaults: FullPoses = {};
  // On a closed joint loop the unposed joints are solved, not zero.
  if (jointGraphHasLoops(arm.__joints())) return defaults;
  for (const j of arm.__joints()) {
    if (j.kind === 'fixed') continue;
    defaults[j.name] = j.kind === 'ball' ? [0, 0, 0] : 0;
  }
  return defaults;
}

/** Solved loop coordinates restricted to articulated mates (cut-joint
 *  measurements included). */
function loopPose(arm: Assembly, coords: Readonly<Record<string, number | readonly [number, number, number]>> | undefined): FullPoses {
  const out: FullPoses = {};
  if (coords === undefined) return out;
  for (const m of arm.__mates()) {
    const v = coords[m.name];
    if (v === undefined || m.type === 'fastened' || m.type === 'planar') continue;
    out[m.name] = typeof v === 'number' ? v : [v[0], v[1], v[2]];
  }
  return out;
}

/** Walk each pose group with closed-loop continuation. A loop finding
 *  (branch flip, lockup, over-driven) ends that walk at the pose it names;
 *  poses after it are not sampled. */
async function sweepWalks(
  arm: Assembly,
  walks: ReadonlyArray<ReadonlyArray<NumericPoses>>,
  epsilon: number,
): Promise<{ collidingPoses: SweptCollidingPose[]; posesSampled: number; loopDiagnostics: KinematicDiagnostic[] }> {
  const collidingPoses: SweptCollidingPose[] = [];
  const loopDiagnostics: KinematicDiagnostic[] = [];
  const defaults = jointPoseDefaults(arm);
  const continuation = new LoopContinuation(arm);
  const hasMates = (arm.__mates?.() ?? []).length > 0;
  let posesSampled = 0;
  for (const walk of walks) {
    continuation.reset();
    for (const pose of walk) {
      let lowerPose: FullPoses = pose;
      if (hasMates) {
        const step = await continuation.step(pose);
        if (step.stop !== undefined) {
          loopDiagnostics.push(step.stop);
          break;
        }
        // Lower exactly the configuration continuation solved: every loop
        // coordinate is passed, so the lowerer's loop solve is already
        // closed and cannot pick another branch.
        lowerPose = { ...pose, ...loopPose(arm, step.result.loop?.coordinates) };
      }
      posesSampled++;
      const pairs = await detectInterferencesForPoses(arm, { ...defaults, ...lowerPose }, epsilon);
      if (pairs.length === 0) continue;
      const contacts: SweptCollisionContact[] = pairs.map((p) => ({
        partA: p.a,
        partB: p.b,
        volumeMm3: p.volumeMm3,
      }));
      collidingPoses.push({ pose: { ...pose }, contacts });
    }
  }
  loopDiagnostics.unshift(...continuation.advisories());
  return { collidingPoses, posesSampled, loopDiagnostics };
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
