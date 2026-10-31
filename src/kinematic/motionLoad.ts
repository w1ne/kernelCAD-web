// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kinematic/motionLoad.ts
//
// Motion-load study for mate assemblies: the loads each driven joint
// (`mechanicalJoint` on a revolute mate) carries while the model moves.
//
//   1. Lower the assembly once. Each part's local mass, CoM and inertia come
//      from its BREP and density (or its declared `massKg`).
//   2. Sample poses: along the animationView tracks (mode 'tracks', the
//      default), or a quasi-static grid over every driven joint's limits
//      (mode 'range').
//   3. solveMates at each sample gives every part's world transform. Along
//      tracks, CoM acceleration and body angular velocity / acceleration come
//      from central finite differences of those transforms.
//   4. Newton-Euler on the parts downstream of the joint (`subtreeJointWrench`,
//      the same calculator check_static_hold uses) gives the wrench at the
//      joint origin, with gravity and optional external loads.
//   5. The wrench splits into actuator torque, axial force and radial force
//      over the declared coaxial supports (`splitJointLoad`).
//
// v1 limits: rigid bodies; closed loops are posed (continuation along the
// samples, stopping at a branch flip or lockup) but a joint inside a closed
// loop has statically indeterminate loads and is reported as not resolved;
// revolute driven joints only, no friction, no
// contact; accelerations depend on `sampleMs` because a keyframed track has
// velocity steps at its keys.

import type { Assembly, AssemblyPartStored, MechanicalJointIntentRecord } from '../modeling/capture/assembly';
import type { NumericPoses } from '../modeling/capture/forwardKinematics';
import type { FeatureId } from '../shared/intent/types';
import type { MotionPartLoadSample, MotionLoadVector } from '../shared/intent/motionLoadRecord';
import type { SceneBackend } from '../kernel/backends/sceneBackend';
import { isSceneBackend } from '../kernel/backends/sceneBackend';
import { initOcct, OcctBackend } from '../kernel/backends/occt/occtBackend';
import { boxDistanceToAxis, nearestAxialContact, type AxialSpan } from '../kernel/backends/occt/axialContact';
import { createOcctLowerer } from '../modeling/backends/occt/occtLowerer';
import { RecomputeEngine } from '../modeling/compute/recomputeEngine';
import { solveMates } from '../modeling/mates/solver';
import { parseConnectorRef, type MateRecord } from '../modeling/mates/mate';
import { partAtFor, sceneMotion } from '../modeling/mates/partFrame';
import { rememberedRestScene } from '../modeling/mates/loweredAssemblyScene';
import { connectorDirection, resolveConnectorFrame, resolveConnectorOrigin } from '../modeling/mates/connector';
import { sampleTrackAt } from '../modeling/animation/animationSampler';
import type { NormalizedAnimationTrack } from '../shared/intent/animationViewRecord';
import { clampToParam, currentValue, evaluate, exprOf } from '../modeling/runtime/motionLimits';
import { DIAGNOSTIC_REGISTRY, type DiagnosticCode } from '../shared/diagnostics/registry';
import { Transform } from '../shared/runtime/se3';
import { localPartMass, type PartMassLocal } from './partMass';
import { LoopContinuation } from './loopContinuation';
import { sectionModulusMm3 } from './sectionProperties';
import {
  add, dot, rotateInertia, scale, splitJointLoad, sub, subtreeJointWrench, unit,
  type BodyLoadState, type M3, type PointLoad, type SupportStation, type V3,
} from './rigidBodyLoads';
import type { KinematicDiagnostic } from './types';

const MM = 1e-3;
const DEFAULT_GRAVITY: V3 = [0, 0, -9.81];
const DEFAULT_SAMPLE_MS = 20;
const MAX_SAMPLES = 2000;
const MARGIN_ERROR = 1;
const MARGIN_WARN = 2;

export interface MotionLoadExternalLoad {
  /** Part the force acts on. */
  readonly part: string;
  /** Application point in the part's own (modeled) frame, mm. */
  readonly point: readonly [number, number, number];
  /** Force on the part, world frame, N. Pencil contact: [0, 0, 0.5]. */
  readonly force: readonly [number, number, number];
  /** Active window on the timeline (tracks mode). Default: always. */
  readonly fromMs?: number;
  readonly toMs?: number;
}

export interface MotionLoadOpts {
  /** 'tracks' (default) samples the animationView timeline with inertia;
   *  'range' is a quasi-static grid over each driven joint's limits;
   *  'poses' samples exactly `poses`. */
  readonly mode?: 'tracks' | 'range' | 'poses';
  /** Explicit mate poses to sample (mode 'poses'). A user-named pose is one
   *  entry here. */
  readonly poses?: readonly Readonly<Record<string, number>>[];
  readonly sampleMs?: number;
  /** Grid points per joint in 'range' mode (default 5, capped so the grid
   *  stays under 2000 poses). */
  readonly rangeSamples?: number;
  /** Drop velocity and acceleration terms (gravity + external loads only). */
  readonly quasiStatic?: boolean;
  readonly gravity?: readonly [number, number, number];
  readonly loads?: readonly MotionLoadExternalLoad[];
  /** Per mechanicalJoint name: support parts to use instead of the declared
   *  `supports` (to compare with / without a bushing). */
  readonly supports?: Readonly<Record<string, readonly string[]>>;
}

export interface MotionLoadSupportPeak {
  readonly part: string;
  /** Distance from the joint origin along the axis, mm. */
  readonly stationMm: number;
  /** Where the station comes from: the actuator (joint origin), the
   *  support's connector on the axis, or its material nearest the axis. */
  readonly stationFrom: SupportStationSource;
  readonly peakRadialN: number;
  /** Peak bending moment the support reacts at its station, N·mm. */
  readonly peakBendingNmm: number;
}

export interface MotionLoadSample {
  readonly tMs?: number;
  readonly pose: NumericPoses;
  readonly torqueNm: number;
  readonly axialN: number;
  readonly radialN: number;
  readonly bendingNmm: number;
}

export interface MotionLoadJointResult {
  /** mechanicalJoint name. */
  readonly joint: string;
  readonly mate: string;
  readonly actuator: string;
  readonly supports: readonly string[];
  readonly downstreamParts: readonly string[];
  readonly downstreamMassKg: number;
  readonly ratedTorqueNm?: number;
  readonly peakTorqueNm: number;
  /** ratedTorqueNm / peakTorqueNm. Absent without a rating. */
  readonly torqueMargin?: number;
  readonly peakAxialN: number;
  readonly peakRadialN: number;
  /** Peak bending moment about the joint origin, N·mm. */
  readonly peakBendingNmm: number;
  readonly radialLimitN?: number;
  readonly axialLimitN?: number;
  /** Sample with the largest bending moment about the joint origin. */
  readonly worstSideLoad: MotionLoadSample;
  /** Per-support peaks; absent when the split is indeterminate. */
  readonly supportLoads?: readonly MotionLoadSupportPeak[];
  readonly worst: MotionLoadSample;
  readonly series: readonly MotionLoadSample[];
  readonly maxLevel: 'ok' | 'warning' | 'error';
  readonly messages: readonly string[];
}

export interface MotionLoadResult {
  readonly ok: boolean;
  readonly source: 'local';
  readonly mode: 'tracks' | 'range' | 'poses';
  readonly quasiStatic: boolean;
  readonly samples: number;
  readonly totalMassKg: number;
  readonly joints: readonly MotionLoadJointResult[];
  /** Worst sampled wrench per part and side, in the part's source-shape
   *  frame. This is what `feaStudy({ loadsFrom })` consumes. */
  readonly partLoads: readonly MotionPartLoadSample[];
  readonly maxLevel: 'ok' | 'warning' | 'error';
  /** One line, e.g. "Loads checked: min torque margin 2.7x (shoulder)". */
  readonly statement: string;
  readonly messages: readonly string[];
  readonly diagnostics: readonly KinematicDiagnostic[];
  readonly limitations: readonly string[];
}

const LIMITATIONS = [
  'rigid bodies; no deflection, friction or contact',
  'tree mate graphs only; a joint inside a closed loop is not resolved',
  'accelerations come from finite differences of the timeline; a keyframed track has velocity steps at its keys, so peaks depend on sampleMs',
  'two coaxial supports are simple supports; three or more are indeterminate and not split',
  'a support bears at its connector on the joint axis, else at the axial span of its material nearest the axis; an ambiguous station is not split',
  'partLoads rank poses by a joint-moment or section-bending proxy; the proxy chooses the pose, an FEA solve (feaStudy loadsFrom) gives the safety factor',
] as const;

export type SupportStationSource = 'actuator' | 'connector' | 'contact';

/** One sampled pose, packed: thousands of samples × every part as objects
 *  cost ~150 MB of JS heap on a 69-part model (DRAW 01 v8). Part `i` of
 *  `PartIndex.names` owns `placements[16i..16i+16)` (column-major mate
 *  placement, NaN when the solver did not place it) and, for parts with
 *  mass, `frames[12j..12j+12)` (world CoM in m, then the world rotation
 *  row-major) where `j` is its index in `PartIndex.massNames`. */
interface Sample { readonly tMs?: number; readonly pose: NumericPoses; readonly placements: Float64Array; readonly frames: Float64Array }

interface PartIndex {
  /** Every assembly part, placement order. */
  readonly names: readonly string[];
  readonly index: ReadonlyMap<string, number>;
  /** Parts with mass properties, frame order. */
  readonly massNames: readonly string[];
  readonly massIndex: ReadonlyMap<string, number>;
}

const FRAME = 12;
const KIN = 9;

function comAt(s: Sample, j: number): V3 {
  const f = s.frames, o = j * FRAME;
  return [f[o]!, f[o + 1]!, f[o + 2]!];
}

function rotAt(s: Sample, j: number): M3 {
  const f = s.frames, o = j * FRAME + 3;
  return [[f[o]!, f[o + 1]!, f[o + 2]!], [f[o + 3]!, f[o + 4]!, f[o + 5]!], [f[o + 6]!, f[o + 7]!, f[o + 8]!]];
}

/** Run the motion-load study on one assembly. */
export async function checkMotionLoad(arm: Assembly, opts: MotionLoadOpts = {}): Promise<MotionLoadResult> {
  const mode = opts.mode ?? (opts.poses !== undefined ? 'poses' : 'tracks');
  const quasiStatic = opts.quasiStatic === true || mode === 'range';
  const diagnostics: KinematicDiagnostic[] = [];
  const prepared = await prepareStudy(arm, opts, mode);
  if (typeof prepared === 'string') return emptyResult(mode, quasiStatic, prepared, diagnostics);
  const { intents, masses, samples, scene, restPlacements, parts, loopFindings } = prepared;
  diagnostics.push(...loopFindings);
  const kin = quasiStatic ? undefined : finiteDifferences(samples, parts, stepSeconds(samples, opts.sampleMs));
  const ctx: JointCtx = { arm, masses, samples, kin, parts, gravity: (opts.gravity ?? DEFAULT_GRAVITY) as V3, loads: opts.loads ?? [], mode, scene, restPlacements, partLoads: new Map() };
  const joints: MotionLoadJointResult[] = [];
  for (const intent of intents) {
    const r = await studyJoint(ctx, intent, opts.supports?.[intent.name] ?? intent.supports, diagnostics);
    if (r !== undefined) joints.push(r);
  }
  return summarize(mode, quasiStatic, samples.length, masses, joints, [...ctx.partLoads.values()], diagnostics);
}

interface PreparedStudy {
  readonly intents: MechanicalJointIntentRecord[];
  readonly masses: Map<string, PartMassLocal>;
  readonly samples: Sample[];
  readonly parts: PartIndex;
  /** The lowered rest scene and the rest-pose mate placements. */
  readonly scene: SceneBackend;
  readonly restPlacements: ReadonlyMap<string, Transform>;
  /** Closed-loop findings from continuation along the samples; a branch
   *  flip or lockup ends the sampled motion at that pose. */
  readonly loopFindings: KinematicDiagnostic[];
}

/** Lower, weigh and sample; a string is the reason the study cannot run. */
async function prepareStudy(arm: Assembly, opts: MotionLoadOpts, mode: 'tracks' | 'range' | 'poses'): Promise<PreparedStudy | string> {
  const intents = drivenIntents(arm);
  if (intents.length === 0) return 'Loads not checked: no mechanicalJoint drives a revolute mate.';
  const scene = await lowerRestScene(arm);
  if (scene === undefined) return 'Loads not checked: the assembly did not lower to a scene.';
  const masses = partMasses(arm, scene);
  const poses = mode === 'poses'
    ? (opts.poses ?? []).map((pose) => ({ pose: { ...pose } }))
    : mode === 'range' ? rangePoses(arm, intents, opts.rangeSamples) : trackPoses(arm, opts.sampleMs);
  if (poses.length === 0) return 'Loads not checked: no poses were supplied for the motion study.';
  const parts = partIndex(arm, masses);
  const loopFindings: KinematicDiagnostic[] = [];
  const samples = await solveSamples(arm, scene, masses, parts, poses, loopFindings);
  if (samples.length === 0) return 'Loads not checked: the mates did not solve at any sampled pose.';
  let restPlacements: ReadonlyMap<string, Transform>;
  try {
    restPlacements = (await solveMates(arm, {})).poses;
  } catch {
    return 'Loads not checked: the mates did not solve at the rest pose.';
  }
  return { intents, masses, samples, scene, restPlacements, parts, loopFindings };
}

/** Timeline step between the first two samples, s. */
function stepSeconds(samples: readonly Sample[], sampleMs: number | undefined): number {
  const [a, b] = samples;
  if (a?.tMs !== undefined && b?.tMs !== undefined) return (b.tMs - a.tMs) / 1000;
  return (sampleMs ?? DEFAULT_SAMPLE_MS) / 1000;
}

// ─── Inputs ──────────────────────────────────────────────────────────────

function drivenIntents(arm: Assembly): MechanicalJointIntentRecord[] {
  const mates = new Map(arm.__mates().map((m) => [m.name, m]));
  return arm.__mechanicalJointIntents().filter((i) => mates.get(i.mate)?.type === 'revolute');
}

async function lowerRestScene(arm: Assembly): Promise<SceneBackend | undefined> {
  // The mechanism probe's rest scene, when it ran first (evaluate_script).
  const remembered = rememberedRestScene(arm);
  if (remembered !== undefined) return remembered;
  await initOcct();
  const jointDefaults: Record<string, number | [number, number, number]> = {};
  for (const j of arm.__joints()) {
    if (j.kind !== 'fixed') jointDefaults[j.name] = j.kind === 'ball' ? [0, 0, 0] : 0;
  }
  const solved = await arm.solvedModel(jointDefaults, { validate: 'off' });
  const engine = new RecomputeEngine(createOcctLowerer(arm.__session()));
  const result = await engine.run(arm.__session().getRecords(), {
    paramTable: arm.__session().paramTable,
    gatedFeatureNames: arm.__session().gatedFeatureNames,
    seedShapes: arm.__session().reusableLoweredPrefix(),
  });
  const id: FeatureId | undefined = solved.__sourceFeatureId();
  const lowered = id === undefined ? undefined : result.shapes.get(id);
  return lowered !== undefined && isSceneBackend(lowered) ? lowered : undefined;
}

function partMasses(arm: Assembly, scene: SceneBackend): Map<string, PartMassLocal> {
  const byName = new Map(arm.__parts().map((p) => [p.name, p]));
  const out = new Map<string, PartMassLocal>();
  for (const sp of scene.parts) {
    const part = byName.get(sp.name);
    if (part !== undefined) out.set(sp.name, localPartMass(part, sp));
  }
  return out;
}

/** Param-driven mate poses: mate name -> expression. */
function mateExpressions(arm: Assembly): Array<{ mate: MateRecord; expr: NonNullable<ReturnType<typeof exprOf>> }> {
  const out = [];
  for (const m of arm.__mates()) {
    if (m.type === 'fastened') continue;
    const expr = exprOf(m.pose);
    if (expr !== undefined) out.push({ mate: m, expr });
  }
  return out;
}

function animationTracks(arm: Assembly): { tracks: NormalizedAnimationTrack[]; durationMs: number } {
  for (const r of arm.__session().getRecords()) {
    if (r.kind !== 'animationView' || r.suppressed) continue;
    const md = r.metadata as { tracks?: NormalizedAnimationTrack[]; durationMs?: number } | undefined;
    if (md?.tracks && md.tracks.length > 0) return { tracks: md.tracks, durationMs: md.durationMs ?? 0 };
  }
  return { tracks: [], durationMs: 0 };
}

interface PoseAt { readonly tMs?: number; readonly pose: NumericPoses }

function trackPoses(arm: Assembly, sampleMs = DEFAULT_SAMPLE_MS): PoseAt[] {
  const { tracks, durationMs } = animationTracks(arm);
  const table = arm.__session().paramTable;
  const exprs = mateExpressions(arm);
  const step = Math.max(sampleMs, durationMs / MAX_SAMPLES, 1);
  const out: PoseAt[] = [];
  for (let t = 0; t <= durationMs + 1e-9; t += step) {
    const values = new Map(tracks.map((tr) => [tr.param, clampToParam(table, tr.param, sampleTrackAt(tr, t))]));
    const pose: Record<string, number> = {};
    for (const { mate, expr } of exprs) {
      const v = evaluate(expr, (n) => values.get(n) ?? currentValue(table, n));
      if (Number.isFinite(v)) pose[mate.name] = v;
    }
    out.push({ tMs: t, pose });
  }
  return out;
}

function rangePoses(arm: Assembly, intents: readonly MechanicalJointIntentRecord[], rangeSamples = 5): PoseAt[] {
  const mates = new Map(arm.__mates().map((m) => [m.name, m]));
  const axes: Array<{ name: string; values: number[] }> = [];
  for (const i of intents) {
    const lim = mates.get(i.mate)?.limitsDeg;
    if (lim !== undefined) axes.push({ name: i.mate, values: [] });
  }
  let n = Math.max(2, rangeSamples);
  while (n > 2 && n ** axes.length > MAX_SAMPLES) n -= 1;
  for (const a of axes) {
    const [lo, hi] = mates.get(a.name)!.limitsDeg!;
    for (let k = 0; k < n; k++) a.values.push(lo + ((hi - lo) * k) / (n - 1));
  }
  let poses: Array<Record<string, number>> = [{}];
  for (const a of axes) poses = poses.flatMap((p) => a.values.map((v) => ({ ...p, [a.name]: v })));
  return poses.slice(0, MAX_SAMPLES).map((pose) => ({ pose }));
}

// ─── Kinematics ──────────────────────────────────────────────────────────

function rotationOf(t: Transform): M3 {
  const x = t.axisDir([1, 0, 0]), y = t.axisDir([0, 1, 0]), z = t.axisDir([0, 0, 1]);
  return [[x[0], y[0], z[0]], [x[1], y[1], z[1]], [x[2], y[2], z[2]]];
}

function partIndex(arm: Assembly, masses: ReadonlyMap<string, PartMassLocal>): PartIndex {
  const names = arm.__parts().map((p) => p.name);
  const massNames = [...masses.keys()];
  return { names, index: new Map(names.map((n, i) => [n, i])), massNames, massIndex: new Map(massNames.map((n, i) => [n, i])) };
}

async function solveSamples(
  arm: Assembly,
  scene: SceneBackend,
  masses: Map<string, PartMassLocal>,
  parts: PartIndex,
  poses: readonly PoseAt[],
  loopFindings: KinematicDiagnostic[],
): Promise<Sample[]> {
  const continuation = new LoopContinuation(arm);
  const atOf = partAtFor(arm.__mates(), arm.__parts(), arm.__session().paramTable);
  const restT = new Map(scene.parts.map((p) => [p.name, p.worldTransform]));
  const out: Sample[] = [];
  for (const p of poses) {
    let solved: ReadonlyMap<string, Transform>;
    try {
      // Continuation: each sample seeds the next, so a closed loop follows
      // its as-built branch; a flip or lockup ends the motion there.
      const step = await continuation.step(p.pose);
      if (step.stop !== undefined) {
        loopFindings.push(step.stop);
        break;
      }
      const r = step.result;
      if (r.status !== 'solved' && r.status !== 'redundant-ok') continue;
      solved = r.poses;
    } catch {
      continue;
    }
    const placements = new Float64Array(parts.names.length * 16).fill(Number.NaN);
    parts.names.forEach((name, i) => solved.get(name)?.writeTo(placements, i * 16));
    const frames = new Float64Array(parts.massNames.length * FRAME);
    parts.massNames.forEach((name, j) => {
      const m = masses.get(name)!;
      const placement = solved.get(name);
      const at = atOf(name);
      const world = placement === undefined ? restT.get(name) ?? Transform.identity() : at === undefined ? placement : sceneMotion(placement, at);
      const c = scale(world.point(m.comLocalMm), MM);
      const r = rotationOf(world);
      frames.set([c[0], c[1], c[2], r[0][0], r[0][1], r[0][2], r[1][0], r[1][1], r[1][2], r[2][0], r[2][1], r[2][2]], j * FRAME);
    });
    out.push({ ...(p.tMs !== undefined ? { tMs: p.tMs } : {}), pose: p.pose, placements, frames });
  }
  loopFindings.unshift(...continuation.advisories());
  return out;
}

/** Angular velocity from R(t-dt) -> R(t+dt). Rp·Rmᵀ ≈ I + [θ]x with
 *  θ = 2·dt·ω, and (Q - Qᵀ)/2 = [θ]x, so ω = vee(Q - Qᵀ) / (4·dt). */
function omegaBetween(rm: M3, rp: M3, dt: number): V3 {
  const q = (i: number, j: number): number => rp[i][0] * rm[j][0] + rp[i][1] * rm[j][1] + rp[i][2] * rm[j][2];
  const d = 4 * dt;
  return [(q(2, 1) - q(1, 2)) / d, (q(0, 2) - q(2, 0)) / d, (q(1, 0) - q(0, 1)) / d];
}

/** Per sample: part `j`'s CoM acceleration, angular velocity and angular
 *  acceleration at `kin[k][9j..9j+9)`, by central differences. */
function finiteDifferences(samples: readonly Sample[], parts: PartIndex, h: number): Float64Array[] {
  const n = samples.length;
  const nm = parts.massNames.length;
  const at = (k: number): Sample => samples[Math.min(n - 1, Math.max(0, k))]!;
  const omegas: Float64Array[] = samples.map((_, k) => {
    const w = new Float64Array(nm * 3);
    const span = (Math.min(n - 1, k + 1) - Math.max(0, k - 1)) * h;
    if (span > 0) {
      for (let j = 0; j < nm; j++) w.set(omegaBetween(rotAt(at(k - 1), j), rotAt(at(k + 1), j), span / 2), j * 3);
    }
    return w;
  });
  return samples.map((_, k) => {
    const out = new Float64Array(nm * KIN);
    const interior = k > 0 && k < n - 1;
    const w0 = omegas[Math.max(0, k - 1)]!, w1 = omegas[k]!, w2 = omegas[Math.min(n - 1, k + 1)]!;
    for (let j = 0; j < nm; j++) {
      const o = j * KIN;
      if (interior) {
        const p0 = comAt(at(k - 1), j), p1 = comAt(samples[k]!, j), p2 = comAt(at(k + 1), j);
        const acc = scale(add(sub(p2, p1), sub(p0, p1)), 1 / (h * h));
        out[o] = acc[0]; out[o + 1] = acc[1]; out[o + 2] = acc[2];
        for (let c = 0; c < 3; c++) out[o + 6 + c] = (w2[j * 3 + c]! - w0[j * 3 + c]!) / (2 * h);
      }
      out[o + 3] = w1[j * 3]!; out[o + 4] = w1[j * 3 + 1]!; out[o + 5] = w1[j * 3 + 2]!;
    }
    return out;
  });
}

// ─── Per joint ───────────────────────────────────────────────────────────

interface JointCtx {
  readonly arm: Assembly;
  /** Worst part-load sample per joint/side/part, collected while sampling. */
  readonly partLoads: Map<string, MotionPartLoadSample>;
  readonly masses: Map<string, PartMassLocal>;
  readonly samples: readonly Sample[];
  readonly kin: Float64Array[] | undefined;
  readonly parts: PartIndex;
  readonly gravity: V3;
  readonly loads: readonly MotionLoadExternalLoad[];
  readonly mode: 'tracks' | 'range' | 'poses';
  readonly scene: SceneBackend;
  readonly restPlacements: ReadonlyMap<string, Transform>;
}

/** Parts reachable from `start` without entering `blocked`. */
function reach(adj: ReadonlyMap<string, string[]>, start: string, blocked: ReadonlySet<string>): Set<string> {
  const seen = new Set<string>([start]);
  const stack = [start];
  while (stack.length > 0) {
    for (const nb of adj.get(stack.pop()!) ?? []) {
      if (seen.has(nb) || blocked.has(nb)) continue;
      seen.add(nb);
      stack.push(nb);
    }
  }
  return seen;
}

/** Parts on the far side of `mate` from the grounded part. Undefined when
 *  the mate sits in a closed loop (cutting it leaves the graph connected). */
export function downstreamOfMate(parts: readonly { name: string }[], mates: readonly MateRecord[], mateName: string, ground: string): { downstream: Set<string>; parentPart: string } | undefined {
  const target = mates.find((m) => m.name === mateName);
  if (target === undefined) return undefined;
  const adj = new Map<string, string[]>(parts.map((p) => [p.name, []]));
  for (const m of mates) {
    if (m === target) continue;
    const a = parseConnectorRef(m.a).partName, b = parseConnectorRef(m.b).partName;
    adj.get(a)?.push(b);
    adj.get(b)?.push(a);
  }
  const grounded = reach(adj, ground, new Set());
  const a = parseConnectorRef(target.a).partName, b = parseConnectorRef(target.b).partName;
  if (grounded.has(a) === grounded.has(b)) return undefined;
  const [parentPart, child] = grounded.has(a) ? [a, b] : [b, a];
  return { downstream: reach(adj, child, grounded), parentPart };
}

function groundPart(arm: Assembly): string {
  const stable = arm.__physicalUseCases().flatMap((u) => (u as { stableParts?: readonly string[] }).stableParts ?? []);
  return stable[0] ?? arm.__parts()[0]?.name ?? '';
}

async function jointFrame(arm: Assembly, mate: MateRecord, parentPart: string): Promise<{ originLocal: V3; axisLocal: V3 } | undefined> {
  const side = parseConnectorRef(mate.a).partName === parentPart ? mate.a : mate.b;
  const ref = parseConnectorRef(side);
  const part = arm.__parts().find((p) => p.name === ref.partName) as AssemblyPartStored | undefined;
  const c = part?.mateConnectors.find((x) => x.name === ref.connectorName);
  if (part === undefined || c === undefined) return undefined;
  const frame = await resolveConnectorFrame(part.originalShape, c.origin, arm.__session().getRecords());
  return { originLocal: frame.origin as V3, axisLocal: connectorDirection(frame.axis, c.axis) as V3 };
}

function bodiesAt(ctx: JointCtx, k: number, names: ReadonlySet<string>): BodyLoadState[] {
  const s = ctx.samples[k]!;
  const out: BodyLoadState[] = [];
  for (const name of names) {
    const m = ctx.masses.get(name), j = ctx.parts.massIndex.get(name);
    if (m === undefined || j === undefined) continue;
    const kin = ctx.kin?.[k];
    const o = j * KIN;
    out.push({
      massKg: m.mass, comM: comAt(s, j), inertiaWorld: rotateInertia(rotAt(s, j), m.inertiaLocal),
      ...(kin !== undefined ? { accM: [kin[o]!, kin[o + 1]!, kin[o + 2]!] as V3, omega: [kin[o + 3]!, kin[o + 4]!, kin[o + 5]!] as V3, alpha: [kin[o + 6]!, kin[o + 7]!, kin[o + 8]!] as V3 } : {}),
    });
  }
  return out;
}

function placementOf(ctx: JointCtx, k: number, part: string): Transform {
  const i = ctx.parts.index.get(part);
  const pl = ctx.samples[k]!.placements;
  if (i === undefined || Number.isNaN(pl[i * 16]!)) return Transform.identity();
  return Transform.fromColumnMajor(pl, i * 16);
}

function loadsAt(ctx: JointCtx, k: number, names: ReadonlySet<string>): PointLoad[] {
  const t = ctx.samples[k].tMs;
  const out: PointLoad[] = [];
  for (const l of ctx.loads) {
    if (!names.has(l.part)) continue;
    if (t !== undefined && ((l.fromMs !== undefined && t < l.fromMs) || (l.toMs !== undefined && t > l.toMs))) continue;
    out.push({ pointM: scale(placementOf(ctx, k, l.part).point(l.point as V3), MM), forceN: l.force as V3 });
  }
  return out;
}

/** Record the joint wrench on the parent and every downstream part, in each
 *  part's source-shape frame. Ranking uses the declared cross-section when
 *  there is one; otherwise the joint-moment magnitude. The FEA solve, not
 *  this proxy, produces the safety factor. */
function recordPartLoads(
  ctx: JointCtx,
  k: number,
  sampleIndex: number,
  intent: MechanicalJointIntentRecord,
  mate: MateRecord,
  tree: { downstream: ReadonlySet<string>; parentPart: string },
  w: { forceN: V3; momentNm: V3 },
  originM: V3,
): void {
  const s = ctx.samples[k]!;
  const originMm = scale(originM, 1 / MM);
  const parts = ctx.arm.__parts();
  const byName = new Map(parts.map((p) => [p.name, p]));
  const record = (part: string, side: 'parent' | 'downstream'): void => {
    const inv = placementOf(ctx, k, part).inverse();
    const sign = side === 'parent' ? -1 : 1;
    const pointMm = inv.point(originMm) as V3;
    const forceN = inv.axisDir(scale(w.forceN, sign)) as V3;
    const momentNmm = scale(inv.axisDir(scale(w.momentNm, sign)) as V3, 1000);
    const section = byName.get(part)?.crossSection;
    const momentMag = Math.hypot(momentNmm[0], momentNmm[1], momentNmm[2]);
    const proxy = section !== undefined
      ? { kind: 'von-mises-section' as const, value: momentMag / sectionModulusMm3(section), unit: 'MPa' as const }
      : { kind: 'joint-moment' as const, value: momentMag, unit: 'N*mm' as const };
    const forceMag = Math.hypot(forceN[0], forceN[1], forceN[2]);
    if (!forceN.every(Number.isFinite) || !momentNmm.every(Number.isFinite) || !(proxy.value > 0 || forceMag > 0)) return;
    const key = `${intent.name}:${side}:${part}`;
    const prev = ctx.partLoads.get(key);
    if (prev !== undefined && prev.proxy.value >= proxy.value) return;
    ctx.partLoads.set(key, {
      part,
      joint: intent.name,
      mate: mate.name,
      actuator: intent.actuator,
      side,
      sampleIndex,
      ...(s.tMs !== undefined ? { tMs: s.tMs } : {}),
      pose: Object.fromEntries(Object.entries(s.pose).filter(([, v]) => typeof v === 'number')) as Record<string, number>,
      pointMm: pointMm as unknown as MotionLoadVector,
      forceN: forceN as unknown as MotionLoadVector,
      momentNmm: momentNmm as unknown as MotionLoadVector,
      proxy,
    });
  };
  record(tree.parentPart, 'parent');
  for (const name of tree.downstream) record(name, 'downstream');
}

async function studyJoint(ctx: JointCtx, intent: MechanicalJointIntentRecord, supports: readonly string[], diagnostics: KinematicDiagnostic[]): Promise<MotionLoadJointResult | undefined> {
  const mate = ctx.arm.__mates().find((m) => m.name === intent.mate)!;
  const tree = downstreamOfMate(ctx.arm.__parts(), ctx.arm.__mates(), mate.name, groundPart(ctx.arm));
  if (tree === undefined) {
    diagnostics.push(diag('mechanism.load.not-resolved', 'warn', `Joint '${intent.name}': mate '${mate.name}' is inside a closed loop, so its loads are not resolved.`, intent.name));
    return undefined;
  }
  const frame = await jointFrame(ctx.arm, mate, tree.parentPart);
  if (frame === undefined) return undefined;
  const anchors = await supportAnchors(ctx, intent, supports, tree.parentPart, tree.downstream, frame);
  const unresolved = anchors.filter((a): a is UnresolvedAnchor => a.from === 'unresolved');
  for (const a of unresolved) {
    diagnostics.push(diag('mechanism.load.not-resolved', 'warn', `Joint '${intent.name}': support '${a.name}' — ${a.reason}, so the support split is not reported. Name the part that bears on the shaft, or add a connector on the joint axis where '${a.name}' bears.`, intent.name));
  }
  const resolved = anchors.filter((a): a is ResolvedAnchor => a.from !== 'unresolved');
  const series: MotionLoadSample[] = [];
  const supportPeaks = new Map<string, { stationMm: number; from: SupportStationSource; radial: number; bending: number }>();
  let indeterminate = false;
  for (let k = 0; k < ctx.samples.length; k++) {
    const pT = placementOf(ctx, k, tree.parentPart);
    const origin = scale(pT.point(frame.originLocal), MM);
    const axis = unit(pT.axisDir(frame.axisLocal));
    const w = subtreeJointWrench(bodiesAt(ctx, k, tree.downstream), origin, ctx.gravity, loadsAt(ctx, k, tree.downstream));
    recordPartLoads(ctx, k, k, intent, mate, tree, w, origin);
    const stations = supportStations(ctx, k, resolved, origin, axis);
    const split = splitJointLoad(w, axis, stations);
    if (split.supports === undefined) indeterminate = true;
    for (const s of split.supports ?? []) {
      const from = resolved.find((a) => a.name === s.name)!.from;
      const prev = supportPeaks.get(s.name) ?? { stationMm: s.stationM / MM, from, radial: 0, bending: 0 };
      supportPeaks.set(s.name, { ...prev, radial: Math.max(prev.radial, s.radialN), bending: Math.max(prev.bending, s.bendingNm / MM) });
    }
    const s = ctx.samples[k];
    series.push({ ...(s.tMs !== undefined ? { tMs: s.tMs } : {}), pose: s.pose, torqueNm: split.torqueNm, axialN: split.axialN, radialN: split.radialN, bendingNmm: split.bendingAtOriginNm / MM });
  }
  const split = unresolved.length > 0 || indeterminate ? undefined : supportPeaks;
  return jointResult(intent, mate, supports, tree.downstream, ctx, series, split, { indeterminate, unresolved: unresolved.map((a) => a.name) }, diagnostics);
}

/** A support's bearing point, fixed in its part frame (the frame mate
 *  placements move), or the reason it has none. */
interface ResolvedAnchor { readonly name: string; readonly from: SupportStationSource; readonly localMm?: V3 }
interface UnresolvedAnchor { readonly name: string; readonly from: 'unresolved'; readonly reason: string }
type SupportAnchor = ResolvedAnchor | UnresolvedAnchor;

/** Connector origin closer than this to the joint axis lies on it, mm. */
const ON_AXIS_TOLERANCE_MM = 0.1;
/** Two stations closer than this are one, mm. */
const STATION_TOLERANCE_MM = 0.5;

/**
 * Where each support bears on the shaft, at the rest pose:
 *   - the actuator at the joint origin (station 0);
 *   - else the support's connector on the joint axis (one station);
 *   - else the middle of the axial span of its material nearest the axis
 *     (`nearestAxialContact`: a bushing's bore, a plate's hole wall).
 * A whole multi-feature body used to bear at its centroid projected on the
 * axis, which can sit far from where it touches the shaft. Two separate
 * spans at the nearest radius, or no material near the axis, leave the
 * station unresolved: a warning, not a number.
 */
async function supportAnchors(
  ctx: JointCtx, intent: MechanicalJointIntentRecord, supports: readonly string[], parentPart: string,
  downstream: ReadonlySet<string>, frame: { originLocal: V3; axisLocal: V3 },
): Promise<SupportAnchor[]> {
  const restParent = ctx.restPlacements.get(parentPart) ?? Transform.identity();
  const origin = restParent.point(frame.originLocal) as V3;
  const axis = unit(restParent.axisDir(frame.axisLocal));
  let shaft: AxialSpan | undefined | null = null;
  const out: SupportAnchor[] = [];
  for (const name of new Set(supports)) {
    if (name === intent.actuator) { out.push({ name, from: 'actuator' }); continue; }
    const part = ctx.arm.__parts().find((p) => p.name === name) as AssemblyPartStored | undefined;
    if (part === undefined) { out.push({ name, from: 'unresolved', reason: 'is not a part of the assembly' }); continue; }
    const placement = ctx.restPlacements.get(name) ?? Transform.identity();
    const onAxis = await connectorStations(ctx, part, placement, origin, axis);
    if (onAxis.length === 1) { out.push({ name, from: 'connector', localMm: onAxis[0]! }); continue; }
    if (shaft === null) shaft = shaftSpan(ctx, downstream, origin, axis);
    out.push(contactAnchor(ctx, name, placement, origin, axis, shaft));
  }
  return out;
}

/** A shaft is near its axis: material of the moving side within this
 *  radius of the joint axis is the shaft a support can bear on, mm. */
const SHAFT_RADIUS_MM = 5;
/** A support bears on the shaft only with material this close to the
 *  joint axis, mm (a bushing bore, a bearing seat, a hole wall). */
const SUPPORT_CONTACT_RADIUS_MM = 10;

/** Axial extent of the moving side's material near the joint axis (the
 *  shaft, the horn, the rod). A support bears on the shaft, so its contact
 *  is searched only there: a base plate under the servo is on the axis but
 *  touches no shaft. Undefined when nothing of the moving side is near the
 *  axis. */
function shaftSpan(ctx: JointCtx, downstream: ReadonlySet<string>, origin: V3, axis: V3): AxialSpan | undefined {
  let from = Infinity;
  let to = -Infinity;
  for (const sp of ctx.scene.parts) {
    if (!downstream.has(sp.name) || !(sp.shape instanceof OcctBackend)) continue;
    const world = sp.shape.located(sp.worldTransform);
    try {
      if (boxDistanceToAxis(world.boundingBox(), origin, axis) > SHAFT_RADIUS_MM) continue;
      const near = nearestAxialContact(world, origin, axis, { maxRadiusMm: SHAFT_RADIUS_MM });
      for (const s of near?.spans ?? []) {
        from = Math.min(from, s.fromMm);
        to = Math.max(to, s.toMm);
      }
    } catch {
      // A part the probe cannot cut does not define the shaft.
    } finally {
      world.dispose();
    }
  }
  return Number.isFinite(from) && Number.isFinite(to) && to > from ? { fromMm: from, toMm: to } : undefined;
}

/** Local origins of `part`'s connectors on the joint axis, one per
 *  distinct station. */
async function connectorStations(ctx: JointCtx, part: AssemblyPartStored, placement: Transform, origin: V3, axis: V3): Promise<V3[]> {
  const found: Array<{ local: V3; t: number }> = [];
  for (const c of part.mateConnectors) {
    let local: V3;
    try {
      local = (await resolveConnectorOrigin(part.originalShape, c.origin, ctx.arm.__session().getRecords())).value as V3;
    } catch {
      continue;
    }
    const d = sub(placement.point(local) as V3, origin);
    const t = dot(d, axis);
    const radial = Math.hypot(d[0] - axis[0] * t, d[1] - axis[1] * t, d[2] - axis[2] * t);
    if (radial > ON_AXIS_TOLERANCE_MM) continue;
    if (found.some((f) => Math.abs(f.t - t) <= STATION_TOLERANCE_MM)) continue;
    found.push({ local, t });
  }
  return found.map((f) => f.local);
}

function contactAnchor(ctx: JointCtx, name: string, placement: Transform, origin: V3, axis: V3, shaft: AxialSpan | undefined): SupportAnchor {
  const sp = ctx.scene.parts.find((p) => p.name === name);
  if (sp === undefined || !(sp.shape instanceof OcctBackend)) {
    return { name, from: 'unresolved', reason: 'has no BRep geometry to find where it touches the shaft' };
  }
  const world = sp.shape.located(sp.worldTransform);
  let contact: ReturnType<typeof nearestAxialContact>;
  try {
    contact = nearestAxialContact(world, origin, axis, { maxRadiusMm: SUPPORT_CONTACT_RADIUS_MM, ...(shaft === undefined ? {} : { within: shaft }) });
  } catch {
    contact = undefined;
  } finally {
    world.dispose();
  }
  if (contact === undefined || contact.spans.length === 0) {
    const where = shaft === undefined ? '' : ` along the shaft (${fmt(shaft.fromMm)}..${fmt(shaft.toMm)} mm on the axis)`;
    return { name, from: 'unresolved', reason: `has no material near the joint axis (within ${SUPPORT_CONTACT_RADIUS_MM} mm)${where}` };
  }
  if (contact.spans.length > 1) {
    const spans = contact.spans.map((s) => `${fmt(s.fromMm)}..${fmt(s.toMm)}`).join(', ');
    return { name, from: 'unresolved', reason: `touches the axis at ${contact.spans.length} separate stations (${spans} mm along the axis, within ${fmt(contact.radiusMm)} mm of it), so its station is ambiguous` };
  }
  const span = contact.spans[0]!;
  const t = (span.fromMm + span.toMm) / 2;
  const world0: V3 = [origin[0] + axis[0] * t, origin[1] + axis[1] * t, origin[2] + axis[2] * t];
  return { name, from: 'contact', localMm: placement.inverse().point(world0) as V3 };
}

function supportStations(ctx: JointCtx, k: number, anchors: readonly ResolvedAnchor[], origin: V3, axis: V3): SupportStation[] {
  return anchors.map((a) => {
    if (a.localMm === undefined) return { name: a.name, stationM: 0 };
    const p = scale(placementOf(ctx, k, a.name).point(a.localMm) as V3, MM);
    return { name: a.name, stationM: dot(sub(p, origin), axis) };
  });
}

function peakAbs(series: readonly MotionLoadSample[], key: 'torqueNm' | 'axialN' | 'radialN' | 'bendingNmm'): number {
  return series.reduce((m, s) => Math.max(m, Math.abs(s[key])), 0);
}

function jointResult(
  intent: MechanicalJointIntentRecord, mate: MateRecord, supports: readonly string[], downstream: ReadonlySet<string>,
  ctx: JointCtx, series: MotionLoadSample[], supportPeaks: Map<string, { stationMm: number; from: SupportStationSource; radial: number; bending: number }> | undefined,
  notSplit: { indeterminate: boolean; unresolved: readonly string[] }, diagnostics: KinematicDiagnostic[],
): MotionLoadJointResult {
  const peakTorqueNm = peakAbs(series, 'torqueNm');
  const worst = series.reduce((w, s) => (Math.abs(s.torqueNm) > Math.abs(w.torqueNm) ? s : w), series[0]);
  const worstSideLoad = series.reduce((w, s) => (s.bendingNmm > w.bendingNmm ? s : w), series[0]);
  const supportLoads = supportPeaks === undefined ? undefined : [...supportPeaks].map(([part, p]) => ({ part, stationMm: round(p.stationMm), stationFrom: p.from, peakRadialN: p.radial, peakBendingNmm: p.bending }));
  const actuatorRadial = supportLoads?.find((s) => s.part === intent.actuator)?.peakRadialN ?? peakAbs(series, 'radialN');
  const peakAxialN = peakAbs(series, 'axialN');
  // No torque about the axis (e.g. gravity on a vertical axis): the margin is unbounded, so it is omitted.
  const torqueMargin = intent.torqueNm === undefined || !(peakTorqueNm > 1e-9) ? undefined : intent.torqueNm / peakTorqueNm;
  const { maxLevel, messages } = jointVerdict(intent, torqueMargin, peakTorqueNm, actuatorRadial, peakAxialN, notSplit, diagnostics);
  return {
    joint: intent.name, mate: mate.name, actuator: intent.actuator, supports: [...supports],
    downstreamParts: [...downstream], downstreamMassKg: [...downstream].reduce((m, n) => m + (ctx.masses.get(n)?.mass ?? 0), 0),
    ...(intent.torqueNm !== undefined ? { ratedTorqueNm: intent.torqueNm } : {}),
    peakTorqueNm, ...(torqueMargin !== undefined ? { torqueMargin } : {}),
    peakAxialN, peakRadialN: peakAbs(series, 'radialN'), peakBendingNmm: peakAbs(series, 'bendingNmm'),
    ...(intent.radialLimitN !== undefined ? { radialLimitN: intent.radialLimitN } : {}),
    ...(intent.axialLimitN !== undefined ? { axialLimitN: intent.axialLimitN } : {}),
    ...(supportLoads !== undefined ? { supportLoads } : {}),
    worst, worstSideLoad, series, maxLevel, messages,
  };
}

function jointVerdict(
  intent: MechanicalJointIntentRecord, margin: number | undefined, peakTorqueNm: number, actuatorRadialN: number, peakAxialN: number,
  notSplit: { indeterminate: boolean; unresolved: readonly string[] }, diagnostics: KinematicDiagnostic[],
): { maxLevel: 'ok' | 'warning' | 'error'; messages: string[] } {
  const messages: string[] = [];
  let level: 'ok' | 'warning' | 'error' = 'ok';
  const raise = (l: 'warning' | 'error'): void => { if (level !== 'error') level = l; };
  const j = intent.name;
  if (margin === undefined && intent.torqueNm !== undefined) {
    messages.push(`${j}: no torque about the joint axis in the sampled poses (peak ${fmt(peakTorqueNm * 1000)} N·mm); the ${fmt(intent.torqueNm * 1000)} N·mm rating is not loaded.`);
  } else if (margin === undefined) {
    messages.push(`${j}: peak torque ${fmt(peakTorqueNm * 1000)} N·mm; no torqueNm rating, torque not checked.`);
  } else if (margin < MARGIN_ERROR) {
    raise('error');
    messages.push(`${j}: peak torque ${fmt(peakTorqueNm * 1000)} N·mm exceeds the ${fmt(intent.torqueNm! * 1000)} N·mm rating (margin ${fmt(margin)}x).`);
    diagnostics.push(diag('mechanism.load.torque-exceeded', 'error', messages[messages.length - 1], j));
  } else if (margin < MARGIN_WARN) {
    raise('warning');
    messages.push(`${j}: torque margin ${fmt(margin)}x is below 2x (peak ${fmt(peakTorqueNm * 1000)} N·mm, rating ${fmt(intent.torqueNm! * 1000)} N·mm).`);
    diagnostics.push(diag('mechanism.load.torque-margin-low', 'warn', messages[messages.length - 1], j));
  } else {
    messages.push(`${j}: torque margin ${fmt(margin)}x (peak ${fmt(peakTorqueNm * 1000)} N·mm).`);
  }
  for (const [label, value, limit] of [['radial', actuatorRadialN, intent.radialLimitN], ['axial', peakAxialN, intent.axialLimitN]] as const) {
    if (limit === undefined) {
      messages.push(`${j}: ${label} load on '${intent.actuator}' ${fmt(value)} N; no rating, not checked.`);
    } else if (value > limit) {
      raise('error');
      messages.push(`${j}: ${label} load on '${intent.actuator}' ${fmt(value)} N exceeds its ${fmt(limit)} N rating.`);
      diagnostics.push(diag('mechanism.load.side-load-exceeded', 'error', messages[messages.length - 1], j));
    } else {
      messages.push(`${j}: ${label} load on '${intent.actuator}' ${fmt(value)} N is within its ${fmt(limit)} N rating.`);
    }
  }
  if (notSplit.unresolved.length > 0) {
    // The per-support warning names each support and was pushed already.
    raise('warning');
    messages.push(`${j}: the station of support ${notSplit.unresolved.map((n) => `'${n}'`).join(', ')} on the shaft is ambiguous or unknown; the support split is not reported.`);
  } else if (notSplit.indeterminate) {
    raise('warning');
    messages.push(`${j}: three or more supports, or two at one station; the support split is indeterminate in a rigid model and is not reported.`);
    diagnostics.push(diag('mechanism.load.not-resolved', 'warn', messages[messages.length - 1], j));
  }
  return { maxLevel: level, messages };
}

// ─── Summary ─────────────────────────────────────────────────────────────

function summarize(mode: 'tracks' | 'range' | 'poses', quasiStatic: boolean, samples: number, masses: Map<string, PartMassLocal>, joints: MotionLoadJointResult[], partLoads: readonly MotionPartLoadSample[], diagnostics: KinematicDiagnostic[]): MotionLoadResult {
  const order = { ok: 0, warning: 1, error: 2 } as const;
  const maxLevel = joints.reduce<'ok' | 'warning' | 'error'>((l, j) => (order[j.maxLevel] > order[l] ? j.maxLevel : l), 'ok');
  const rated = joints.filter((j) => j.torqueMargin !== undefined);
  const min = rated.reduce<MotionLoadJointResult | undefined>((m, j) => (m === undefined || j.torqueMargin! < m.torqueMargin! ? j : m), undefined);
  const statement = min === undefined
    ? `Loads computed on ${joints.length} joint(s); no torque rating declared, torque not checked.`
    : `Loads checked: min torque margin ${fmt(min.torqueMargin!)}x (${min.joint}).`;
  return {
    ok: maxLevel !== 'error', source: 'local', mode, quasiStatic, samples,
    totalMassKg: [...masses.values()].reduce((m, p) => m + p.mass, 0),
    joints, partLoads, maxLevel, statement, messages: joints.flatMap((j) => j.messages), diagnostics, limitations: [...LIMITATIONS],
  };
}

function emptyResult(mode: 'tracks' | 'range' | 'poses', quasiStatic: boolean, statement: string, diagnostics: KinematicDiagnostic[]): MotionLoadResult {
  return { ok: true, source: 'local', mode, quasiStatic, samples: 0, totalMassKg: 0, joints: [], partLoads: [], maxLevel: 'warning', statement, messages: [statement], diagnostics, limitations: [...LIMITATIONS] };
}

function fmt(n: number): string {
  return Math.abs(n) >= 100 ? n.toFixed(0) : Math.abs(n) >= 10 ? n.toFixed(1) : n.toFixed(2);
}
function round(n: number): number { return Math.round(n * 1000) / 1000; }

function diag(code: DiagnosticCode, severity: 'info' | 'warn' | 'error', message: string, element?: string): KinematicDiagnostic {
  const entry = DIAGNOSTIC_REGISTRY[code];
  return { code, severity, message, hint: entry.hintTemplate, nextAction: entry.nextAction, source: 'local', ...(element !== undefined ? { element } : {}) };
}
