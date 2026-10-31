// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// A param edit often moves a solid without changing it: a revolve whose
// profile slid along its axis, a boolean of two such solids, a primitive
// whose only change is a trailing translate. Those features keep the cached
// OCCT solid and place it. Anything we cannot prove — a size change, a
// rotate, a sweep, a fillet, disagreeing operand motions — is lowered again.
// A false negative only costs a lower. A placed solid is the cached one
// moved, so it cannot be a stale different shape.

import type { ShapeBackend } from '../../kernel/backends/backend';
import { OcctBackend } from '../../kernel/backends/occt/occtBackend';
import { copyRigidAnalysis, type Motion } from '../../kernel/backends/occt/analysisMemo';
import { registerOcctResetHook } from '../../kernel/backends/occt/backendInit';
import { propagateTransformHistory } from '../../kernel/naming/evolutionRecord';
import type { FeatureRecord, ShapeTransform } from '../../shared/intent/featureRecord';
import type { FeatureRef, Param, PatternSpec } from '../../shared/intent/types';
import type { ParamTable } from '../../shared/runtime/paramTable';
import { resolveParams } from '../../shared/runtime/resolveParams';
import { stableStringify } from '../compute/prefixReuse';

export type { Motion };

const EPS = 1e-6;
const ZERO: Motion = { x: 0, y: 0, z: 0 };

const PRIMITIVES = new Set(['box', 'cylinder', 'sphere', 'torus']);
// Positions only. Hermite tangents (`atx`…) and curvatures (`acx`…) are
// derivatives: a translation leaves them put, and a matching delta is a
// shape change, not a shift.
const X_KEYS = new Set(['x', 'midX', 'ax', 'bx', 'cx']);
const Y_KEYS = new Set(['y', 'midY', 'ay', 'by', 'cy']);
const INVARIANT_FIELDS = new Set(['startTangent', 'endTangent']);
const NO_FAILURES: ReadonlySet<string> = new Set();

interface Baseline {
  epoch: number;
  resolved: Map<string, FeatureRecord>;
  shapes: Map<string, ShapeBackend>;
}

interface PlaneShift {
  dx: number;
  dy: number;
}

interface PlaneAcc {
  dx?: number;
  dy?: number;
}

let epoch = 0;
const baselines = new WeakMap<object, Baseline>();
/** Features whose last lower reported an error. Their cached solid is not a baseline. */
const failedFeatures = new WeakMap<object, Set<string>>();

registerOcctResetHook(() => {
  epoch += 1;
});

function isParam(value: unknown): value is Param {
  return typeof value === 'object' && value !== null
    && typeof (value as Param).expression === 'string'
    && typeof (value as Param).unit === 'string'
    && typeof (value as Param).evaluated === 'number';
}

function close(a: number, b: number): boolean {
  return Math.abs(a - b) <= EPS;
}

function canon(value: unknown): unknown {
  if (isParam(value)) return [value.expression, value.evaluated];
  if (Array.isArray(value)) return value.map(canon);
  if (value === null || typeof value !== 'object') return value;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(value as object).sort()) {
    if (key === 'paramRefs') continue;
    out[key] = canon((value as Record<string, unknown>)[key]);
  }
  return out;
}

function sameCanon(a: unknown, b: unknown): boolean {
  return stableStringify(canon(a)) === stableStringify(canon(b));
}

function add(a: Motion, b: Motion): Motion {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function noteDelta(current: number | undefined, delta: number): number | undefined {
  if (current === undefined) return delta;
  return close(current, delta) ? current : Number.NaN;
}

function asCoord(value: unknown): number | undefined {
  if (typeof value === 'number') return value;
  if (isParam(value)) return value.evaluated;
  return undefined;
}

function noteCoord(key: string, delta: number, acc: PlaneAcc): boolean {
  if (X_KEYS.has(key)) acc.dx = noteDelta(acc.dx, delta);
  else acc.dy = noteDelta(acc.dy, delta);
  return !Number.isNaN(acc.dx ?? 0) && !Number.isNaN(acc.dy ?? 0);
}

function walkArray(prev: unknown[], next: unknown[], key: string, acc: PlaneAcc): boolean {
  if (prev.length !== next.length) return false;
  return prev.every((item, index) => walkPlane(item, next[index], key, acc));
}

function walkObject(prev: object, next: object, acc: PlaneAcc): boolean {
  const prevObj = prev as Record<string, unknown>;
  const nextObj = next as Record<string, unknown>;
  const keys = Object.keys(prevObj);
  if (keys.length !== Object.keys(nextObj).length) return false;
  return keys.every((child) => {
    if (!(child in nextObj)) return false;
    // Spline tangents are {x,y} directions, not points.
    if (INVARIANT_FIELDS.has(child)) return sameCanon(prevObj[child], nextObj[child]);
    return walkPlane(prevObj[child], nextObj[child], child, acc);
  });
}

function coordinateDelta(key: string, prev: unknown, next: unknown): number | undefined {
  if (!X_KEYS.has(key) && !Y_KEYS.has(key)) return undefined;
  const prevCoord = asCoord(prev);
  const nextCoord = asCoord(next);
  if (prevCoord === undefined || nextCoord === undefined) return undefined;
  return nextCoord - prevCoord;
}

function bothArrays(prev: unknown, next: unknown, key: string, acc: PlaneAcc): boolean {
  if (!Array.isArray(prev) || !Array.isArray(next)) return false;
  return walkArray(prev, next, key, acc);
}

function sameLeaf(prev: unknown, next: unknown): boolean {
  if (prev === next) return true;
  return typeof prev === 'number' && typeof next === 'number' && close(prev, next);
}

function isRecord(value: unknown): value is object {
  return value !== null && typeof value === 'object';
}

function walkPlane(prev: unknown, next: unknown, key: string, acc: PlaneAcc): boolean {
  const delta = coordinateDelta(key, prev, next);
  if (delta !== undefined) return noteCoord(key, delta, acc);
  if (isParam(prev) || isParam(next)) return sameCanon(prev, next);
  if (Array.isArray(prev) || Array.isArray(next)) return bothArrays(prev, next, key, acc);
  if (isRecord(prev) && isRecord(next)) return walkObject(prev, next, acc);
  return sameLeaf(prev, next);
}

function planeMotion(prev: unknown, next: unknown): PlaneShift | null {
  const acc: PlaneAcc = {};
  if (!walkPlane(prev, next, '', acc)) return null;
  return { dx: acc.dx ?? 0, dy: acc.dy ?? 0 };
}

function transformDelta(prev: readonly ShapeTransform[], next: readonly ShapeTransform[]): Motion | null {
  if (prev.length !== next.length) return null;
  let index = prev.length - 1;
  const delta = { x: 0, y: 0, z: 0 };
  for (; index >= 0; index--) {
    const before = prev[index]!;
    const after = next[index]!;
    if (before.op !== 'translate' || after.op !== 'translate') break;
    delta.x += after.vec.x.evaluated - before.vec.x.evaluated;
    delta.y += after.vec.y.evaluated - before.vec.y.evaluated;
    delta.z += after.vec.z.evaluated - before.vec.z.evaluated;
  }
  if (!sameCanon(prev.slice(0, index + 1), next.slice(0, index + 1))) return null;
  return delta;
}

function sameBody(prev: FeatureRecord, next: FeatureRecord): boolean {
  return sameCanon(
    { kind: prev.kind, params: prev.params, inputs: prev.inputs, metadata: prev.metadata },
    { kind: next.kind, params: next.params, inputs: next.inputs, metadata: next.metadata },
  );
}

function sketchShift(
  id: string,
  baseline: Baseline,
  resolved: Map<string, FeatureRecord>,
): PlaneShift | null {
  const prev = baseline.resolved.get(id);
  const next = resolved.get(id);
  if (!prev || !next || prev.kind !== 'sketch' || next.kind !== 'sketch') return null;
  const prevCommands = (prev.metadata as { commands?: unknown } | undefined)?.commands;
  const nextCommands = (next.metadata as { commands?: unknown } | undefined)?.commands;
  // `sketch.text` has no command list. Walking two missing lists is not a zero shift.
  if (!Array.isArray(prevCommands) || !Array.isArray(nextCommands)) return null;
  return planeMotion(prevCommands, nextCommands);
}

function sharedInputMotion(record: FeatureRecord, motions: Map<string, Motion | null>): Motion | null {
  let shared: Motion | null = null;
  for (const ref of Object.values(record.inputs)) {
    if (ref.kind !== 'feature') return null;
    const motion = motions.get(ref.id);
    if (!motion) return null;
    if (!shared) shared = motion;
    else if (!close(shared.x, motion.x) || !close(shared.y, motion.y) || !close(shared.z, motion.z)) return null;
  }
  return shared ?? ZERO;
}

function alongAxis(motion: Motion, axis: readonly number[]): boolean {
  const len = Math.hypot(axis[0] ?? 0, axis[1] ?? 0, axis[2] ?? 0);
  if (len < EPS) return false;
  const ux = (axis[0] ?? 0) / len;
  const uy = (axis[1] ?? 0) / len;
  const uz = (axis[2] ?? 0) / len;
  const along = motion.x * ux + motion.y * uy + motion.z * uz;
  const px = motion.x - along * ux;
  const py = motion.y - along * uy;
  const pz = motion.z - along * uz;
  return Math.hypot(px, py, pz) <= 1e-5;
}

function provePattern(prev: FeatureRecord, next: FeatureRecord, base: Motion): Motion | null {
  const pattern = (next.metadata as { pattern?: PatternSpec } | undefined)?.pattern;
  const before = (prev.metadata as { pattern?: PatternSpec } | undefined)?.pattern;
  if (!pattern || !before || !sameCanon(before, pattern)) return null;
  if (pattern.kind === 'circular' && !alongAxis(base, pattern.axis)) return null;
  return base;
}

function proveProfile(
  next: FeatureRecord,
  delta: Motion,
  baseline: Baseline,
  resolved: Map<string, FeatureRecord>,
): Motion | null {
  const sketch = next.inputs.sketch;
  if (!sketch || sketch.kind !== 'feature') return delta;
  const profile = sketchShift(sketch.id, baseline, resolved);
  if (!profile) return null;
  // A non-zero twist spins the profile about the sketch origin, so an in-plane
  // shift is not a copy of the cached solid. A pure trailing translate is.
  const twist = asCoord(next.params.twistAngle) ?? 0;
  if (next.kind === 'extrude' && !close(twist, 0) && (!close(profile.dx, 0) || !close(profile.dy, 0))) return null;
  if (next.kind === 'revolve' && !close(profile.dx, 0)) return null;
  const intrinsic = next.kind === 'revolve'
    ? { x: 0, y: 0, z: profile.dy }
    : { x: profile.dx, y: profile.dy, z: 0 };
  return add(intrinsic, delta);
}

function proveFromInputs(
  prev: FeatureRecord,
  next: FeatureRecord,
  delta: Motion,
  motions: Map<string, Motion | null>,
): Motion | null {
  const inputs = sharedInputMotion(next, motions);
  if (!inputs) return null;
  if (next.kind === 'boolean') return add(inputs, delta);
  const placed = provePattern(prev, next, inputs);
  return placed ? add(placed, delta) : null;
}

function hasNonTranslate(transforms: readonly ShapeTransform[]): boolean {
  return transforms.some((transform) => transform.op !== 'translate');
}

/** Input motion is proved in the pre-transform frame. A rotate, scale, or
 *  reflect does not commute with it, so only a trailing translate is placed. */
function extrinsicMotion(next: FeatureRecord, motion: Motion, delta: Motion): Motion | null {
  if (!hasNonTranslate(next.transforms)) return motion;
  const dx = motion.x - delta.x;
  const dy = motion.y - delta.y;
  const dz = motion.z - delta.z;
  if (!close(dx, 0) || !close(dy, 0) || !close(dz, 0)) return null;
  return delta;
}

function proveFeature(
  prev: FeatureRecord,
  next: FeatureRecord,
  motions: Map<string, Motion | null>,
  baseline: Baseline,
  resolved: Map<string, FeatureRecord>,
): Motion | null {
  const delta = transformDelta(prev.transforms, next.transforms);
  if (!delta || !sameBody(prev, next)) return null;
  if (PRIMITIVES.has(next.kind)) return delta;
  const motion = next.kind === 'boolean' || next.kind === 'pattern'
    ? proveFromInputs(prev, next, delta, motions)
    : next.kind === 'revolve' || next.kind === 'extrude'
      ? proveProfile(next, delta, baseline, resolved)
      : null;
  return motion ? extrinsicMotion(next, motion, delta) : null;
}

function linkedFeatureId(ref: FeatureRef): string | undefined {
  if (ref.kind === 'feature') return ref.id;
  if (ref.kind === 'face' || ref.kind === 'edge' || ref.kind === 'vertex') return ref.featureId;
  return undefined;
}

function hasSelector(record: FeatureRecord): boolean {
  return Object.values(record.inputs).some((ref) => (
    ref.kind === 'face' || ref.kind === 'edge' || ref.kind === 'vertex'
  ));
}

/** A lowering selector must not consume a placed ancestor. Placement copies
 *  face history, but a partial map (one operand moved, one not) can bind a
 *  canonical name to the wrong survivor. Those ancestors lower instead. */
function blockPlacedAncestors(
  root: FeatureRecord,
  byId: ReadonlyMap<string, FeatureRecord>,
  proved: ReadonlySet<string>,
  blocked: Set<string>,
): void {
  const stack: FeatureRecord[] = [root];
  const seen = new Set<string>([root.id]);
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    for (const ref of Object.values(current.inputs)) {
      const id = linkedFeatureId(ref);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      if (proved.has(id) || ref.kind !== 'feature') blocked.add(id);
      const next = byId.get(id);
      if (next) stack.push(next);
    }
  }
}

function blockRigidSeeds(
  records: readonly FeatureRecord[],
  affected: ReadonlySet<string>,
  proved: ReadonlySet<string>,
): Set<string> {
  const blocked = new Set<string>();
  const byId = new Map(records.map((record) => [record.id, record]));
  for (const record of records) {
    if (affected.has(record.id) && !proved.has(record.id)) blocked.add(record.id);
  }
  for (const record of records) {
    if (blocked.has(record.id) && hasSelector(record)) blockPlacedAncestors(record, byId, proved, blocked);
  }
  return blocked;
}

function withKind(source: OcctBackend, moved: OcctBackend, motion: Motion, history: OcctBackend['historyMap']): OcctBackend {
  const carried = new OcctBackend(moved.getReplicadShape(), source.kind, history);
  if (moved.analysisBody !== undefined) carried.analysisBody = moved.analysisBody;
  copyRigidAnalysis(source, carried, motion);
  return carried;
}

/** Keep `kind` and face lineage. A face-count change is not a rigid copy.
 *  Solids with no lineage skip the face walk; a translate does not change it. */
function carryPlacement(source: OcctBackend, moved: OcctBackend, motion: Motion): OcctBackend | null {
  if (source.historyMap === undefined) return withKind(source, moved, motion, undefined);
  const inputHashes = source.faceHashes();
  const outputHashes = moved.faceHashes();
  if (outputHashes.length !== inputHashes.length) return null;
  const history = propagateTransformHistory(source.historyMap, inputHashes, outputHashes);
  return withKind(source, moved, motion, history);
}

function place(shape: ShapeBackend, motion: Motion): ShapeBackend | null {
  if (!(shape instanceof OcctBackend)) return null;
  if (close(motion.x, 0) && close(motion.y, 0) && close(motion.z, 0)) return shape;
  const moved = shape.clone().translate(motion.x, motion.y, motion.z);
  return carryPlacement(shape, moved, motion);
}

/** Snapshot the shapes that match the session's current param table. */
export function captureBaseline(
  session: { paramTable: ParamTable; cachedShapes: ReadonlyMap<string, ShapeBackend> },
  records: readonly FeatureRecord[],
): void {
  baselines.set(session, {
    epoch,
    resolved: new Map(records.map((record) => [record.id, resolveParams(record, session.paramTable)])),
    shapes: new Map(session.cachedShapes),
  });
}

/** Feature ids whose last lower failed. Empty when this session has none. */
export function failedFeatureIds(session: object): ReadonlySet<string> {
  return failedFeatures.get(session) ?? NO_FAILURES;
}

/**
 * Remember features that lowered with an error so the next edit does not
 * seed that solid. A feature that lowers cleanly is dropped from the set.
 * Any failure also drops the rigid baseline: the run is not a provable state.
 */
export function settleFeatureFailures(
  session: object,
  failedIds: readonly string[],
  relowered: readonly string[],
): void {
  const set = failedFeatures.get(session) ?? new Set<string>();
  const failed = new Set(failedIds);
  for (const id of relowered) if (!failed.has(id)) set.delete(id);
  for (const id of failedIds) set.add(id);
  if (set.size === 0) failedFeatures.delete(session);
  else failedFeatures.set(session, set);
  if (failedIds.length > 0) baselines.delete(session);
}

export interface RigidReusePlan {
  seeds: Map<string, ShapeBackend>;
  /** Must lower even when the edit did not touch them. */
  blocked: ReadonlySet<string>;
}

/**
 * Cached solids that may be seeded in place of a lower. Empty when this
 * session has no baseline for the current kernel epoch (first edit, or the
 * kernel was reset).
 */
function proveRecords(
  records: readonly FeatureRecord[],
  affected: ReadonlySet<string>,
  failed: ReadonlySet<string> | undefined,
  baseline: Baseline,
  resolved: Map<string, FeatureRecord>,
): { motions: Map<string, Motion | null>; proved: Set<string> } {
  const motions = new Map<string, Motion | null>();
  const proved = new Set<string>();
  for (const record of records) {
    if (failed?.has(record.id)) {
      motions.set(record.id, null);
      continue;
    }
    if (!affected.has(record.id)) {
      motions.set(record.id, ZERO);
      continue;
    }
    const prev = baseline.resolved.get(record.id);
    const next = resolved.get(record.id);
    const motion = prev && next ? proveFeature(prev, next, motions, baseline, resolved) : null;
    motions.set(record.id, motion);
    if (motion) proved.add(record.id);
  }
  return { motions, proved };
}

export function planRigidReuse(
  session: { paramTable: ParamTable; cachedShapes: ReadonlyMap<string, ShapeBackend> },
  records: readonly FeatureRecord[],
  affected: ReadonlySet<string>,
): RigidReusePlan {
  const baseline = baselines.get(session);
  const seeds = new Map<string, ShapeBackend>();
  if (!baseline || baseline.epoch !== epoch) return { seeds, blocked: NO_FAILURES };
  const resolved = new Map(records.map((record) => [record.id, resolveParams(record, session.paramTable)]));
  const { motions, proved } = proveRecords(records, affected, failedFeatures.get(session), baseline, resolved);
  const blocked = blockRigidSeeds(records, affected, proved);
  for (const record of records) {
    if (!proved.has(record.id) || blocked.has(record.id)) continue;
    const cached = baseline.shapes.get(record.id);
    const motion = motions.get(record.id);
    const placed = cached && motion ? place(cached, motion) : null;
    if (placed) seeds.set(record.id, placed);
  }
  return { seeds, blocked };
}
