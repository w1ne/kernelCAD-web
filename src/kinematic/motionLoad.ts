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
// v1 limits: rigid bodies, tree mate graphs (a joint inside a closed loop is
// reported as not resolved), revolute driven joints only, no friction, no
// contact; accelerations depend on `sampleMs` because a keyframed track has
// velocity steps at its keys.

import type { Assembly, AssemblyPartStored, MechanicalJointIntentRecord } from '../modeling/capture/assembly';
import type { NumericPoses } from '../modeling/capture/forwardKinematics';
import type { FeatureId } from '../shared/intent/types';
import type { SceneBackend } from '../kernel/backends/sceneBackend';
import { isSceneBackend } from '../kernel/backends/sceneBackend';
import { initOcct } from '../kernel/backends/occt/occtBackend';
import { createOcctLowerer } from '../modeling/backends/occt/occtLowerer';
import { RecomputeEngine } from '../modeling/compute/recomputeEngine';
import { solveMates } from '../modeling/mates/solver';
import { parseConnectorRef, type MateRecord } from '../modeling/mates/mate';
import { partAtFor, sceneMotion } from '../modeling/mates/partFrame';
import { resolveConnectorOrigin } from '../modeling/mates/connector';
import { sampleTrackAt } from '../modeling/animation/animationSampler';
import type { NormalizedAnimationTrack } from '../shared/intent/animationViewRecord';
import { clampToParam, currentValue, evaluate, exprOf } from '../modeling/runtime/motionLimits';
import { DIAGNOSTIC_REGISTRY, type DiagnosticCode } from '../shared/diagnostics/registry';
import { Transform } from '../shared/runtime/se3';
import { localPartMass, type PartMassLocal } from './partMass';
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
   *  'range' is a quasi-static grid over each driven joint's limits. */
  readonly mode?: 'tracks' | 'range';
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
  readonly mode: 'tracks' | 'range';
  readonly quasiStatic: boolean;
  readonly samples: number;
  readonly totalMassKg: number;
  readonly joints: readonly MotionLoadJointResult[];
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
] as const;

interface PartFrameSample { readonly comM: V3; readonly rot: M3 }
interface Sample { readonly tMs?: number; readonly pose: NumericPoses; readonly placements: ReadonlyMap<string, Transform>; readonly frames: Map<string, PartFrameSample> }

/** Run the motion-load study on one assembly. */
export async function checkMotionLoad(arm: Assembly, opts: MotionLoadOpts = {}): Promise<MotionLoadResult> {
  const mode = opts.mode ?? 'tracks';
  const quasiStatic = opts.quasiStatic === true || mode === 'range';
  const diagnostics: KinematicDiagnostic[] = [];
  const prepared = await prepareStudy(arm, opts, mode);
  if (typeof prepared === 'string') return emptyResult(mode, quasiStatic, prepared, diagnostics);
  const { intents, masses, samples } = prepared;
  const kin = quasiStatic ? undefined : finiteDifferences(samples, masses, stepSeconds(samples, opts.sampleMs));
  const ctx: JointCtx = { arm, masses, samples, kin, gravity: (opts.gravity ?? DEFAULT_GRAVITY) as V3, loads: opts.loads ?? [], mode };
  const joints: MotionLoadJointResult[] = [];
  for (const intent of intents) {
    const r = await studyJoint(ctx, intent, opts.supports?.[intent.name] ?? intent.supports, diagnostics);
    if (r !== undefined) joints.push(r);
  }
  return summarize(mode, quasiStatic, samples.length, masses, joints, diagnostics);
}

interface PreparedStudy {
  readonly intents: MechanicalJointIntentRecord[];
  readonly masses: Map<string, PartMassLocal>;
  readonly samples: Sample[];
}

/** Lower, weigh and sample; a string is the reason the study cannot run. */
async function prepareStudy(arm: Assembly, opts: MotionLoadOpts, mode: 'tracks' | 'range'): Promise<PreparedStudy | string> {
  const intents = drivenIntents(arm);
  if (intents.length === 0) return 'Loads not checked: no mechanicalJoint drives a revolute mate.';
  const scene = await lowerRestScene(arm);
  if (scene === undefined) return 'Loads not checked: the assembly did not lower to a scene.';
  const masses = partMasses(arm, scene);
  const poses = mode === 'range' ? rangePoses(arm, intents, opts.rangeSamples) : trackPoses(arm, opts.sampleMs);
  const samples = await solveSamples(arm, scene, masses, poses);
  if (samples.length === 0) return 'Loads not checked: the mates did not solve at any sampled pose.';
  return { intents, masses, samples };
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

async function solveSamples(arm: Assembly, scene: SceneBackend, masses: Map<string, PartMassLocal>, poses: readonly PoseAt[]): Promise<Sample[]> {
  const atOf = partAtFor(arm.__mates(), arm.__parts(), arm.__session().paramTable);
  const restT = new Map(scene.parts.map((p) => [p.name, p.worldTransform]));
  const out: Sample[] = [];
  for (const p of poses) {
    let placements: Map<string, Transform>;
    try {
      const r = await solveMates(arm, p.pose);
      if (r.status !== 'solved' && r.status !== 'redundant-ok') continue;
      placements = r.poses;
    } catch {
      continue;
    }
    const frames = new Map<string, PartFrameSample>();
    for (const [name, m] of masses) {
      const placement = placements.get(name);
      const at = atOf(name);
      const world = placement === undefined ? restT.get(name) ?? Transform.identity() : at === undefined ? placement : sceneMotion(placement, at);
      frames.set(name, { comM: scale(world.point(m.comLocalMm), MM), rot: rotationOf(world) });
    }
    out.push({ ...(p.tMs !== undefined ? { tMs: p.tMs } : {}), pose: p.pose, placements, frames });
  }
  return out;
}

interface Kin { readonly acc: V3; readonly omega: V3; readonly alpha: V3 }

/** Angular velocity from R(t-dt) -> R(t+dt). Rp·Rmᵀ ≈ I + [θ]x with
 *  θ = 2·dt·ω, and (Q - Qᵀ)/2 = [θ]x, so ω = vee(Q - Qᵀ) / (4·dt). */
function omegaBetween(rm: M3, rp: M3, dt: number): V3 {
  const q = (i: number, j: number): number => rp[i][0] * rm[j][0] + rp[i][1] * rm[j][1] + rp[i][2] * rm[j][2];
  const d = 4 * dt;
  return [(q(2, 1) - q(1, 2)) / d, (q(0, 2) - q(2, 0)) / d, (q(1, 0) - q(0, 1)) / d];
}

function finiteDifferences(samples: readonly Sample[], masses: Map<string, PartMassLocal>, h: number): Array<Map<string, Kin>> {
  const n = samples.length;
  const at = (k: number): Sample => samples[Math.min(n - 1, Math.max(0, k))];
  const omegas: Array<Map<string, V3>> = samples.map((_, k) => {
    const m = new Map<string, V3>();
    for (const name of masses.keys()) {
      const a = at(k - 1).frames.get(name)!, b = at(k + 1).frames.get(name)!;
      const span = (Math.min(n - 1, k + 1) - Math.max(0, k - 1)) * h;
      m.set(name, span > 0 ? omegaBetween(a.rot, b.rot, span / 2) : [0, 0, 0]);
    }
    return m;
  });
  return samples.map((_, k) => {
    const m = new Map<string, Kin>();
    for (const name of masses.keys()) {
      const p0 = at(k - 1).frames.get(name)!.comM, p1 = samples[k].frames.get(name)!.comM, p2 = at(k + 1).frames.get(name)!.comM;
      const interior = k > 0 && k < n - 1;
      const acc = interior ? scale(add(sub(p2, p1), sub(p0, p1)), 1 / (h * h)) : [0, 0, 0] as V3;
      const w0 = omegas[Math.max(0, k - 1)].get(name)!, w2 = omegas[Math.min(n - 1, k + 1)].get(name)!;
      const alpha = interior ? scale(sub(w2, w0), 1 / (2 * h)) : [0, 0, 0] as V3;
      m.set(name, { acc, omega: omegas[k].get(name)!, alpha });
    }
    return m;
  });
}

// ─── Per joint ───────────────────────────────────────────────────────────

interface JointCtx {
  readonly arm: Assembly;
  readonly masses: Map<string, PartMassLocal>;
  readonly samples: readonly Sample[];
  readonly kin: Array<Map<string, Kin>> | undefined;
  readonly gravity: V3;
  readonly loads: readonly MotionLoadExternalLoad[];
  readonly mode: 'tracks' | 'range';
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
  const o = await resolveConnectorOrigin(part.originalShape, c.origin, arm.__session().getRecords());
  return { originLocal: o.value as V3, axisLocal: (c.axis ?? [0, 0, 1]) as V3 };
}

function bodiesAt(ctx: JointCtx, k: number, names: ReadonlySet<string>): BodyLoadState[] {
  const s = ctx.samples[k];
  const out: BodyLoadState[] = [];
  for (const name of names) {
    const m = ctx.masses.get(name), f = s.frames.get(name);
    if (m === undefined || f === undefined) continue;
    const kin = ctx.kin?.[k].get(name);
    out.push({
      massKg: m.mass, comM: f.comM, inertiaWorld: rotateInertia(f.rot, m.inertiaLocal),
      ...(kin !== undefined ? { accM: kin.acc, omega: kin.omega, alpha: kin.alpha } : {}),
    });
  }
  return out;
}

function placementOf(ctx: JointCtx, k: number, part: string): Transform {
  return ctx.samples[k].placements.get(part) ?? Transform.identity();
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

async function studyJoint(ctx: JointCtx, intent: MechanicalJointIntentRecord, supports: readonly string[], diagnostics: KinematicDiagnostic[]): Promise<MotionLoadJointResult | undefined> {
  const mate = ctx.arm.__mates().find((m) => m.name === intent.mate)!;
  const tree = downstreamOfMate(ctx.arm.__parts(), ctx.arm.__mates(), mate.name, groundPart(ctx.arm));
  if (tree === undefined) {
    diagnostics.push(diag('mechanism.load.not-resolved', 'warn', `Joint '${intent.name}': mate '${mate.name}' is inside a closed loop, so its loads are not resolved.`, intent.name));
    return undefined;
  }
  const frame = await jointFrame(ctx.arm, mate, tree.parentPart);
  if (frame === undefined) return undefined;
  const series: MotionLoadSample[] = [];
  const supportPeaks = new Map<string, { stationMm: number; radial: number; bending: number }>();
  let indeterminate = false;
  for (let k = 0; k < ctx.samples.length; k++) {
    const pT = placementOf(ctx, k, tree.parentPart);
    const origin = scale(pT.point(frame.originLocal), MM);
    const axis = unit(pT.axisDir(frame.axisLocal));
    const w = subtreeJointWrench(bodiesAt(ctx, k, tree.downstream), origin, ctx.gravity, loadsAt(ctx, k, tree.downstream));
    const stations = supportStations(ctx, k, intent, supports, origin, axis);
    const split = splitJointLoad(w, axis, stations);
    if (split.supports === undefined) indeterminate = true;
    for (const s of split.supports ?? []) {
      const prev = supportPeaks.get(s.name) ?? { stationMm: s.stationM / MM, radial: 0, bending: 0 };
      supportPeaks.set(s.name, { stationMm: prev.stationMm, radial: Math.max(prev.radial, s.radialN), bending: Math.max(prev.bending, s.bendingNm / MM) });
    }
    const s = ctx.samples[k];
    series.push({ ...(s.tMs !== undefined ? { tMs: s.tMs } : {}), pose: s.pose, torqueNm: split.torqueNm, axialN: split.axialN, radialN: split.radialN, bendingNmm: split.bendingAtOriginNm / MM });
  }
  return jointResult(intent, mate, supports, tree.downstream, ctx, series, indeterminate ? undefined : supportPeaks, diagnostics);
}

function supportStations(ctx: JointCtx, k: number, intent: MechanicalJointIntentRecord, supports: readonly string[], origin: V3, axis: V3): SupportStation[] {
  const seen = new Set<string>();
  const out: SupportStation[] = [];
  for (const name of supports) {
    if (seen.has(name)) continue;
    seen.add(name);
    if (name === intent.actuator) { out.push({ name, stationM: 0 }); continue; }
    const f = ctx.samples[k].frames.get(name);
    out.push({ name, stationM: f === undefined ? 0 : dot(sub(f.comM, origin), axis) });
  }
  return out;
}

function peakAbs(series: readonly MotionLoadSample[], key: 'torqueNm' | 'axialN' | 'radialN' | 'bendingNmm'): number {
  return series.reduce((m, s) => Math.max(m, Math.abs(s[key])), 0);
}

function jointResult(
  intent: MechanicalJointIntentRecord, mate: MateRecord, supports: readonly string[], downstream: ReadonlySet<string>,
  ctx: JointCtx, series: MotionLoadSample[], supportPeaks: Map<string, { stationMm: number; radial: number; bending: number }> | undefined,
  diagnostics: KinematicDiagnostic[],
): MotionLoadJointResult {
  const peakTorqueNm = peakAbs(series, 'torqueNm');
  const worst = series.reduce((w, s) => (Math.abs(s.torqueNm) > Math.abs(w.torqueNm) ? s : w), series[0]);
  const worstSideLoad = series.reduce((w, s) => (s.bendingNmm > w.bendingNmm ? s : w), series[0]);
  const supportLoads = supportPeaks === undefined ? undefined : [...supportPeaks].map(([part, p]) => ({ part, stationMm: round(p.stationMm), peakRadialN: p.radial, peakBendingNmm: p.bending }));
  const actuatorRadial = supportLoads?.find((s) => s.part === intent.actuator)?.peakRadialN ?? peakAbs(series, 'radialN');
  const peakAxialN = peakAbs(series, 'axialN');
  // No torque about the axis (e.g. gravity on a vertical axis): the margin is unbounded, so it is omitted.
  const torqueMargin = intent.torqueNm === undefined || !(peakTorqueNm > 1e-9) ? undefined : intent.torqueNm / peakTorqueNm;
  const { maxLevel, messages } = jointVerdict(intent, torqueMargin, peakTorqueNm, actuatorRadial, peakAxialN, supportLoads === undefined, diagnostics);
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
  indeterminate: boolean, diagnostics: KinematicDiagnostic[],
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
  if (indeterminate) {
    raise('warning');
    messages.push(`${j}: three or more supports, or two at one station; the support split is indeterminate in a rigid model and is not reported.`);
    diagnostics.push(diag('mechanism.load.not-resolved', 'warn', messages[messages.length - 1], j));
  }
  return { maxLevel: level, messages };
}

// ─── Summary ─────────────────────────────────────────────────────────────

function summarize(mode: 'tracks' | 'range', quasiStatic: boolean, samples: number, masses: Map<string, PartMassLocal>, joints: MotionLoadJointResult[], diagnostics: KinematicDiagnostic[]): MotionLoadResult {
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
    joints, maxLevel, statement, messages: joints.flatMap((j) => j.messages), diagnostics, limitations: [...LIMITATIONS],
  };
}

function emptyResult(mode: 'tracks' | 'range', quasiStatic: boolean, statement: string, diagnostics: KinematicDiagnostic[]): MotionLoadResult {
  return { ok: true, source: 'local', mode, quasiStatic, samples: 0, totalMassKg: 0, joints: [], maxLevel: 'warning', statement, messages: [statement], diagnostics, limitations: [...LIMITATIONS] };
}

function fmt(n: number): string {
  return Math.abs(n) >= 100 ? n.toFixed(0) : Math.abs(n) >= 10 ? n.toFixed(1) : n.toFixed(2);
}
function round(n: number): number { return Math.round(n * 1000) / 1000; }

function diag(code: DiagnosticCode, severity: 'info' | 'warn' | 'error', message: string, element?: string): KinematicDiagnostic {
  const entry = DIAGNOSTIC_REGISTRY[code];
  return { code, severity, message, hint: entry.hintTemplate, nextAction: entry.nextAction, source: 'local', ...(element !== undefined ? { element } : {}) };
}
