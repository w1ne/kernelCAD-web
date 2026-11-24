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
//   - kinematic.collision.swept.unmeasured       — one error when a sampled
//     pose could not be lowered or a pair's exact check failed.
//
// Refinement (#1680): each single-joint walk bisects the step where a pair
// changes between overlap and clear (`sweptOverlapRefine`), and
// `result.walks[]` reports stretch ends, the worst overlap and its pose.

import type { Assembly } from '../modeling/capture/assembly';
import { createOcctLowerer } from '../modeling/backends/occt/occtLowerer';
import { RecomputeEngine } from '../modeling/compute/recomputeEngine';
import { reposedLoweredAssemblyScene } from '../modeling/mates/loweredAssemblyScene';
import { solveMates } from '../modeling/mates/solver';
import type { Transform } from '../shared/runtime/se3';
import { detectInterferences } from '../modeling/runtime/detectInterferences';
import { buildSweepProxies, relativePoseKey } from '../modeling/runtime/sweepCollisionProxy';
import { proxyPairsNeedingExactConfirm } from '../modeling/runtime/convexHullBroadphase';
import { initOcct, OcctBackend } from '../kernel/backends/occt/occtBackend';
import { isMeshBackend } from '../kernel/backends/meshBackend';
import { isSceneBackend, type SceneBackend } from '../kernel/backends/sceneBackend';
import {
  DIAGNOSTIC_REGISTRY,
  type DiagnosticCode,
} from '../shared/diagnostics/registry';
import { enumeratePoses } from './sweptPoseEnumeration';
import { LoopContinuation } from './loopContinuation';
import { forwardKinematics, jointGraphHasLoops, type NumericPoses as FullPoses } from '../modeling/capture/forwardKinematics';
import {
  DEFAULT_REFINE_ROUNDS,
  pairKey,
  refineWalk,
  type MeasureAt,
  type PairHit,
  type PairState,
  type WalkSample,
} from './sweptOverlapRefine';
import type {
  KinematicDiagnostic,
  NumericPoses,
  SweptCollidingPose,
  SweptCollisionContact,
  SweptCollisionOpts,
  SweptCollisionResult,
  SweptWalkReport,
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
  const { collidingPoses, posesSampled, loopDiagnostics, reports, unknownPoses } =
    await sweepWalks(arm, walks, epsilon, refineOptions(opts));
  diagnostics.push(...loopDiagnostics);
  if (unknownPoses.length > 0) diagnostics.push(buildUnmeasuredError(unknownPoses, opts));

  // K1 — one error record. Carries the worst-pose context (first colliding
  // pose encountered; collidingPoses[] holds the full list for the agent).
  if (collidingPoses.length > 0) {
    diagnostics.push(buildSweptCollisionError(collidingPoses, opts));
  }

  return {
    ok: collidingPoses.length === 0 && unknownPoses.length === 0 && !loopDiagnostics.some((d) => d.severity === 'error'),
    collidingPoses,
    posesSampled,
    ...(reports.length > 0 ? { walks: reports } : {}),
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

/** Bisection settings; explicit samples have no joint axis to bisect along. */
function refineOptions(
  opts: SweptCollisionOpts | undefined,
): { readonly rounds: number; readonly step?: number } | undefined {
  if (opts?.samples !== undefined && opts.samples.length > 0) return undefined;
  return { rounds: Math.max(0, Math.floor(opts?.refineRounds ?? DEFAULT_REFINE_ROUNDS)), step: opts?.range?.[2] };
}

/** Lowered scene and broadphase proxies shared by every sample of a sweep. */
interface SweepCache {
  scene?: SceneBackend;
  proxies?: ReturnType<typeof buildSweepProxies>;
}

interface SweepContext {
  readonly arm: Assembly;
  readonly defaults: FullPoses;
  readonly hasMates: boolean;
  readonly epsilon: number;
  readonly cache: SweepCache;
}

/** Walk each pose group with closed-loop continuation. A loop finding
 *  (branch flip, lockup, over-driven) ends that walk at the pose it names;
 *  poses after it are not sampled. A single-joint walk is then refined
 *  between samples where a pair changes state (#1680). */
async function sweepWalks(
  arm: Assembly,
  walks: ReadonlyArray<ReadonlyArray<NumericPoses>>,
  epsilon: number,
  refine: { readonly rounds: number; readonly step?: number } | undefined,
): Promise<{
  collidingPoses: SweptCollidingPose[];
  posesSampled: number;
  loopDiagnostics: KinematicDiagnostic[];
  reports: SweptWalkReport[];
  unknownPoses: NumericPoses[];
}> {
  const collidingPoses: SweptCollidingPose[] = [];
  const loopDiagnostics: KinematicDiagnostic[] = [];
  const reports: SweptWalkReport[] = [];
  const unknownPoses: NumericPoses[] = [];
  const ctx: SweepContext = {
    arm,
    defaults: jointPoseDefaults(arm),
    hasMates: (arm.__mates?.() ?? []).length > 0,
    epsilon,
    cache: {},
  };
  const continuation = new LoopContinuation(arm);
  let posesSampled = 0;
  for (const walk of walks) {
    continuation.reset();
    const joint = refine === undefined ? undefined : singleJoint(walk);
    const run = await walkSamples(ctx, walk, continuation, joint);
    posesSampled += run.posesSampled;
    collidingPoses.push(...run.collidingPoses);
    unknownPoses.push(...run.unknownPoses);
    if (run.stop !== undefined) loopDiagnostics.push(run.stop);
    if (joint !== undefined && refine !== undefined) {
      reports.push(await refineSweptWalk(ctx, joint, run.samples, refine));
    }
  }
  loopDiagnostics.unshift(...continuation.advisories());
  return { collidingPoses, posesSampled, loopDiagnostics, reports, unknownPoses };
}

/** Sample one walk in order; a loop stop ends it. */
async function walkSamples(
  ctx: SweepContext,
  walk: ReadonlyArray<NumericPoses>,
  continuation: LoopContinuation,
  joint: string | undefined,
): Promise<{
  posesSampled: number;
  collidingPoses: SweptCollidingPose[];
  unknownPoses: NumericPoses[];
  samples: WalkSample<LoopContinuation>[];
  stop?: KinematicDiagnostic;
}> {
  const collidingPoses: SweptCollidingPose[] = [];
  const unknownPoses: NumericPoses[] = [];
  const samples: WalkSample<LoopContinuation>[] = [];
  let posesSampled = 0;
  for (const pose of walk) {
    const { state, stop } = await sampleSweepPose(ctx, pose, continuation);
    if (state === undefined) return { posesSampled, collidingPoses, unknownPoses, samples, stop };
    posesSampled++;
    if (state.unknownReason !== undefined || state.unknownPairs.size > 0) unknownPoses.push({ ...pose });
    if (state.hits.size > 0) collidingPoses.push({ pose: { ...pose }, contacts: contactsOf(state) });
    if (joint !== undefined) samples.push({ ...state, value: Number(pose[joint]), seed: continuation.fork() });
  }
  return { posesSampled, collidingPoses, unknownPoses, samples };
}

/** Bisect a single-joint walk between samples; each step continues from
 *  the loop state of the lower bracket end. */
async function refineSweptWalk(
  ctx: SweepContext,
  joint: string,
  samples: ReadonlyArray<WalkSample<LoopContinuation>>,
  refine: { readonly rounds: number; readonly step?: number },
): Promise<SweptWalkReport> {
  const step = refine.step ?? (samples.length > 1 ? samples[1].value - samples[0].value : 0);
  const measure: MeasureAt<LoopContinuation> = async (value, seed) => {
    const next = seed.fork();
    const sample = await sampleSweepPose(ctx, { [joint]: value }, next);
    return sample.state === undefined ? undefined : { state: sample.state, seed: next };
  };
  return refineWalk(joint, step, samples, measure, refine.rounds);
}

/** The one joint a walk varies, or undefined for an explicit pose list. */
function singleJoint(walk: ReadonlyArray<NumericPoses>): string | undefined {
  const keys = walk.length === 0 ? [] : Object.keys(walk[0]);
  if (keys.length !== 1) return undefined;
  const [joint] = keys;
  return walk.every((p) => Object.keys(p).length === 1 && typeof p[joint] === 'number') ? joint : undefined;
}

function contactsOf(state: PairState): SweptCollisionContact[] {
  return [...state.hits.values()].map((p) => ({ partA: p.a, partB: p.b, volumeMm3: p.volumeMm3 }));
}

/** Solve one walk sample and measure it against the cached scene. A pose
 *  the lowerer cannot build, or a pair whose exact check fails, is
 *  reported unknown, not clear. */
async function sampleSweepPose(
  ctx: SweepContext,
  pose: NumericPoses,
  continuation: LoopContinuation,
): Promise<{ stop?: KinematicDiagnostic; state?: PairState }> {
  const { arm, cache } = ctx;
  let lowerPose: FullPoses = pose;
  if (ctx.hasMates) {
    const step = await continuation.step(pose);
    if (step.stop !== undefined) return { stop: step.stop };
    // Lower exactly the configuration continuation solved: every loop
    // coordinate is passed, so the lowerer's loop solve is already
    // closed and cannot pick another branch.
    lowerPose = { ...pose, ...loopPose(arm, step.result.loop?.coordinates) };
  }
  const scene = await posedSceneForSweep(arm, { ...ctx.defaults, ...lowerPose }, cache.scene);
  if (scene === undefined) {
    return { state: { hits: new Map(), unknownPairs: new Map(), unknownReason: 'pose could not be lowered' } };
  }
  cache.scene ??= scene;
  cache.proxies ??= buildSweepProxies(scene);
  const explicit = proxyPairsNeedingExactConfirm(cache.proxies, scene);
  const result = detectInterferences(scene, ctx.epsilon, new Set(), [], undefined, explicit);
  const hits = new Map<string, PairHit>();
  for (const p of result.pairs) {
    hits.set(pairKey(p.a, p.b), {
      a: p.a,
      b: p.b,
      volumeMm3: p.volumeMm3,
      ...(p.overlapBounds === undefined ? {} : { overlapBounds: p.overlapBounds }),
    });
  }
  const unknownPairs = new Map<string, { a: string; b: string }>();
  // A pair whose mesh extraction failed stays unknown at every pose. Display
  // mesh pairs that were measured cleanly are never listed here.
  for (const p of result.unconfirmedPairs ?? []) {
    unknownPairs.set(pairKey(p.a, p.b), { a: p.a, b: p.b });
  }
  return { state: { hits, unknownPairs, poseKeys: pairPoseKeys(scene) } };
}

/** Relative pose key of every BRep or display-mesh part pair in one posed
 *  scene. Mesh-involving pairs share the same fixed-pair reasoning. */
function pairPoseKeys(scene: SceneBackend): Map<string, string> {
  const parts = scene.parts.filter((p) => p.shape instanceof OcctBackend || isMeshBackend(p.shape));
  const keys = new Map<string, string>();
  for (let i = 0; i < parts.length; i++) {
    for (let j = i + 1; j < parts.length; j++) {
      keys.set(pairKey(parts[i].name, parts[j].name), relativePoseKey(parts[i].worldTransform, parts[j].worldTransform));
    }
  }
  return keys;
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
  arm.__session().discardProbeRecord(sourceId);
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

/** A sampled position whose overlap could not be measured is not clear. */
function buildUnmeasuredError(
  unknownPoses: ReadonlyArray<NumericPoses>,
  opts: SweptCollisionOpts | undefined,
): KinematicDiagnostic {
  const code: DiagnosticCode = 'kinematic.collision.swept.unmeasured';
  const entry = DIAGNOSTIC_REGISTRY[code];
  const diag: KinematicDiagnostic = {
    code,
    severity: 'error',
    message:
      `Swept-collision could not measure ${unknownPoses.length} sampled pose(s) ` +
      `(first: ${formatPose(unknownPoses[0])}). These poses are not shown clear; ` +
      'inspect result.walks[].unknown.',
    hint: entry.hintTemplate,
    nextAction: entry.nextAction,
    source: 'local',
    poseContext: { ...unknownPoses[0] },
  };
  return opts?.joint ? { ...diag, element: opts.joint } : diag;
}

function formatPose(pose: NumericPoses): string {
  return Object.entries(pose)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ');
}
