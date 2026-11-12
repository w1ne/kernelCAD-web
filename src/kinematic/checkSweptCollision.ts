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
//   - One full RecomputeEngine lower, then `reposedLoweredAssemblyScene`
//     for every later sample (`solveMates` supplies the FK transforms).
//     `detectInterferences` memoizes each pair on its relative pose, so a
//     fastened cluster is measured once for the whole walk.
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
import { createOcctLowerer } from '../modeling/backends/occt/occtLowerer';
import { RecomputeEngine } from '../modeling/compute/recomputeEngine';
import { reposedLoweredAssemblyScene } from '../modeling/mates/loweredAssemblyScene';
import { solveMates } from '../modeling/mates/solver';
import type { Transform } from '../shared/runtime/se3';
import { detectInterferences } from '../modeling/runtime/detectInterferences';
import { buildSweepProxies } from '../modeling/runtime/sweepCollisionProxy';
import { proxyPairsNeedingExactConfirm } from '../modeling/runtime/convexHullBroadphase';
import { initOcct } from '../kernel/backends/occt/occtBackend';
import { isSceneBackend, type SceneBackend } from '../kernel/backends/sceneBackend';
import {
  DIAGNOSTIC_REGISTRY,
  type DiagnosticCode,
} from '../shared/diagnostics/registry';
import { enumeratePoses } from './sweptPoseEnumeration';
import { LoopContinuation } from './loopContinuation';
import { forwardKinematics, jointGraphHasLoops, type NumericPoses as FullPoses } from '../modeling/capture/forwardKinematics';
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
  // One lowered scene's part BREPs are local-frame geometry. Later samples
  // only swap world transforms; a missing transform falls back to a full
  // lower so a partial FK result cannot silently skip a pose.
  let cachedScene: SceneBackend | undefined;
  let proxies: ReturnType<typeof buildSweepProxies> | undefined;
  for (const walk of walks) {
    continuation.reset();
    for (const pose of walk) {
      const sample = await sampleSweepPose(
        arm, pose, defaults, continuation, hasMates, cachedScene, proxies, epsilon,
      );
      if (sample.stop !== undefined) {
        loopDiagnostics.push(sample.stop);
        break;
      }
      posesSampled++;
      cachedScene = sample.cachedScene;
      proxies = sample.proxies;
      if (sample.contacts !== undefined) {
        collidingPoses.push({ pose: { ...pose }, contacts: sample.contacts });
      }
    }
  }
  loopDiagnostics.unshift(...continuation.advisories());
  return { collidingPoses, posesSampled, loopDiagnostics };
}

/** Solve one walk sample and measure it against the cached scene. */
async function sampleSweepPose(
  arm: Assembly,
  pose: NumericPoses,
  defaults: FullPoses,
  continuation: LoopContinuation,
  hasMates: boolean,
  cachedScene: SceneBackend | undefined,
  proxies: ReturnType<typeof buildSweepProxies> | undefined,
  epsilon: number,
): Promise<{
  stop?: KinematicDiagnostic;
  cachedScene?: SceneBackend;
  proxies?: ReturnType<typeof buildSweepProxies>;
  contacts?: SweptCollisionContact[];
}> {
  let lowerPose: FullPoses = pose;
  if (hasMates) {
    const step = await continuation.step(pose);
    if (step.stop !== undefined) return { stop: step.stop, cachedScene, proxies };
    // Lower exactly the configuration continuation solved: every loop
    // coordinate is passed, so the lowerer's loop solve is already
    // closed and cannot pick another branch.
    lowerPose = { ...pose, ...loopPose(arm, step.result.loop?.coordinates) };
  }
  const scene = await posedSceneForSweep(arm, { ...defaults, ...lowerPose }, cachedScene);
  const nextScene = cachedScene ?? scene;
  const nextProxies = proxies ?? (scene === undefined ? undefined : buildSweepProxies(scene));
  const explicit = scene === undefined || nextProxies === undefined
    ? undefined
    : proxyPairsNeedingExactConfirm(nextProxies, scene);
  const pairs = scene === undefined
    ? []
    : detectInterferences(scene, epsilon, new Set(), [], undefined, explicit).pairs;
  const contacts = pairs.length === 0
    ? undefined
    : pairs.map((p) => ({
      partA: p.a,
      partB: p.b,
      volumeMm3: p.volumeMm3,
    }));
  return { cachedScene: nextScene, proxies: nextProxies, contacts };
}

/** Re-pose the cached lowered scene, or lower the feature tree once. */
async function posedSceneForSweep(
  arm: Assembly,
  poses: FullPoses,
  cached: SceneBackend | undefined,
): Promise<SceneBackend | undefined> {
  if (cached !== undefined) {
    try {
      const transforms = await transformsForSweepPose(arm, poses);
      const reposed = transforms === undefined
        ? undefined
        : reposedLoweredAssemblyScene(arm, cached, transforms);
      if (reposed !== undefined) return reposed;
    } catch {
      // Incomplete FK is not clearance: fall through to a full lower.
    }
  }
  return lowerAssemblySceneForPoses(arm, poses);
}

/**
 * World transforms for one sweep sample. Mate-only assemblies use
 * `solveMates`. Joint-only body trees use `forwardKinematics` — `solveMates`
 * ignores joint poses and would otherwise re-check the rest pose while
 * still incrementing `posesSampled`. A hybrid of mates and articulated
 * joints falls through so `solvedModel` remains the source of truth.
 */
async function transformsForSweepPose(
  arm: Assembly,
  poses: FullPoses,
): Promise<ReadonlyMap<string, Transform> | undefined> {
  const hasArticulatedJoints = arm.__joints().some((joint) => joint.kind !== 'fixed');
  const hasMates = (arm.__mates?.() ?? []).length > 0;
  if (hasArticulatedJoints && hasMates) return undefined;
  if (hasArticulatedJoints) {
    const fk = forwardKinematics(arm.__parts(), arm.__joints(), poses);
    const byName = new Map<string, Transform>();
    for (const part of arm.__parts()) {
      const placement = fk.get(part.id);
      if (placement === undefined) return undefined;
      byName.set(part.name, placement);
    }
    return byName;
  }
  const solved = await solveMates(arm, poses);
  return solved.poses;
}

/** Full `solvedModel` + RecomputeEngine lower — the first sample, or any
 *  sample whose `solveMates` map could not re-pose the cached scene. */
async function lowerAssemblySceneForPoses(
  arm: Assembly,
  poses: FullPoses,
): Promise<SceneBackend | undefined> {
  await initOcct();
  const scene = await arm.solvedModel(poses, { validate: 'off' });
  const engine = new RecomputeEngine(createOcctLowerer(arm.__session()));
  const result = await engine.run(arm.__session().getRecords(), {
    paramTable: arm.__session().paramTable,
    gatedFeatureNames: arm.__session().gatedFeatureNames,
    // Only the appended pose scene needs lowering; the part records are
    // unchanged since the last full lower.
    seedShapes: arm.__session().reusableLoweredPrefix(),
  });
  const sourceId = scene.__sourceFeatureId();
  if (sourceId === undefined) return undefined;
  const lowered = result.shapes.get(sourceId);
  if (!lowered || !isSceneBackend(lowered)) return undefined;
  return lowered;
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
