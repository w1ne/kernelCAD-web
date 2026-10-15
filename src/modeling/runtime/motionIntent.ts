// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/motionIntent.ts
//
// Motion intent vs joint type. Capture-only: no lowering, no solve.
//
// A model declares motion intent when it has an animationView track that
// changes a param, a mechanicalJoint (a driven joint) or a transmission. This
// check fails when that intent lands on a joint that cannot move:
//
//   1. A mechanicalJoint or transmission names a `fastened` mate.
//   2. An animated param is the pose of a `fastened` mate (solvedModel poses).
//   3. An animated param moves a fastened mate's connector frame.
//   4. An animated param turns a part only through its geometry (the angle
//      of a rotate on the part's own features), no articulated mate or joint
//      takes that param as its pose, and every mate on that part is
//      `fastened`. The animation then shows motion the mate graph forbids.
//      Translations are not counted: a layout or exploded-view animation
//      moves fastened parts by a spacing param on purpose.
//
// One code, `mechanism.motion-on-fixed-joint`, kept apart from the solver,
// over-constraint and collision codes. Every message names the param or
// drive and the joint. `checkMechanismTruth` runs this first, so
// evaluate_script, review_cad and `kernelcad validate` all report it.

import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { HINT_TEMPLATES } from '../../shared/diagnostics/registry';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { NormalizedAnimationTrack } from '../../shared/intent/animationViewRecord';
import { collectParamRefs } from '../../shared/runtime/resolveParams';
import { isParamRef, type ParamRefExpr } from '../../shared/runtime/paramRef';
import type { Assembly } from '../capture/assembly';
import { parseConnectorRef, type MateRecord } from '../mates/mate';

export const MOTION_ON_FIXED_JOINT = 'mechanism.motion-on-fixed-joint' as const;

/** A motion-intent diagnostic. `mateName` lets Studio mark the joint row. */
export type MotionIntentDiagnostic = CompilerDiagnostic & {
  readonly mateName: string;
  readonly partName?: string;
  readonly paramName?: string;
};

function expressionNames(expr: ParamRefExpr, out: Set<string>): void {
  switch (expr.kind) {
    case 'param': out.add(expr.name); return;
    case 'lit': return;
    case 'binop': expressionNames(expr.left, out); expressionNames(expr.right, out); return;
    case 'neg': expressionNames(expr.expr, out); return;
  }
}

/** Param names in a pose or a coordinate: a ParamRef, a Param blob, a number,
 *  or an array of those. Never walks into shapes or sessions. */
function paramNamesOf(value: unknown): Set<string> {
  const out = new Set<string>();
  const visit = (v: unknown): void => {
    if (v === null || v === undefined || typeof v !== 'object') return;
    if (isParamRef(v)) { expressionNames(v._expr, out); return; }
    if (Array.isArray(v)) { v.forEach(visit); return; }
    for (const name of collectParamRefs(v)) out.add(name);
  };
  visit(value);
  return out;
}

function sessionRecords(arm: Assembly): readonly FeatureRecord[] {
  return arm.__session().getRecords();
}

/** Params whose animation track changes value. A constant track moves nothing. */
export function animatedParams(records: readonly FeatureRecord[]): Set<string> {
  const out = new Set<string>();
  for (const r of records) {
    if (r.kind !== 'animationView' || r.suppressed) continue;
    const tracks = (r.metadata as { tracks?: NormalizedAnimationTrack[] } | undefined)?.tracks ?? [];
    for (const t of tracks) {
      const values = t.keys.map((k) => k.value);
      if (values.length > 1 && Math.max(...values) !== Math.min(...values)) out.add(t.param);
    }
  }
  return out;
}

/** True when the assembly states motion: a moving animation track, a driven
 *  joint, a transmission, or any non-fastened mate or joint. */
export function hasMotionIntent(arm: Assembly): boolean {
  if (arm.__mates().some((m) => m.type !== 'fastened')) return true;
  if (arm.__joints().some((j) => j.kind !== 'fixed')) return true;
  if (arm.__mechanicalJointIntents().length > 0 || arm.__transmissionIntents().length > 0) return true;
  return animatedParams(sessionRecords(arm)).size > 0;
}

interface PoseDriver {
  readonly name: string;
  /** Mate type, or the joint kind for body-tree joints. */
  readonly type: string;
}

/** Every mate / joint pose that takes a param, keyed by param name, across
 *  all assemblies in the session (a sub-assembly may own the moving joint). */
function poseDrivers(arm: Assembly): Map<string, PoseDriver[]> {
  const drivers = new Map<string, PoseDriver[]>();
  const add = (param: string, d: PoseDriver) => {
    const list = drivers.get(param) ?? [];
    list.push(d);
    drivers.set(param, list);
  };
  const assemblies = Array.from(arm.__session().assemblies.values()) as Assembly[];
  const typeByName = new Map<string, string>();
  for (const a of assemblies) {
    for (const m of a.__mates()) {
      typeByName.set(m.name, m.type);
      for (const p of paramNamesOf(m.pose)) add(p, { name: m.name, type: m.type });
    }
    for (const j of a.__joints()) typeByName.set(j.name, j.kind);
  }
  for (const r of sessionRecords(arm)) {
    if (r.kind !== 'solvedAssembly') continue;
    const poses = (r.metadata as { poses?: Record<string, unknown> } | undefined)?.poses ?? {};
    for (const [name, pose] of Object.entries(poses)) {
      for (const p of paramNamesOf(pose)) add(p, { name, type: typeByName.get(name) ?? 'unknown' });
    }
  }
  return drivers;
}

/** Record ids that build a part: its shape record and every upstream input. */
function lineage(rootId: string, byId: ReadonlyMap<string, FeatureRecord>): FeatureRecord[] {
  const out: FeatureRecord[] = [];
  const seen = new Set<string>();
  const stack = [rootId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const r = byId.get(id);
    if (r === undefined) continue;
    out.push(r);
    for (const ref of Object.values(r.inputs)) {
      if (ref.kind === 'feature') stack.push(ref.id);
      else if (ref.kind === 'face' || ref.kind === 'edge' || ref.kind === 'vertex') stack.push(ref.featureId);
    }
  }
  return out;
}

function matesOfPart(mates: readonly MateRecord[], partName: string): MateRecord[] {
  return mates.filter((m) => sideParts(m).includes(partName));
}

function sideParts(m: MateRecord): string[] {
  const parts: string[] = [];
  for (const ref of [m.a, m.b]) {
    try { parts.push(parseConnectorRef(ref).partName); } catch { /* malformed refs are reported elsewhere */ }
  }
  return parts;
}

function diagnostic(message: string, mateName: string, extra: { partName?: string; paramName?: string } = {}): MotionIntentDiagnostic {
  const spec = HINT_TEMPLATES[MOTION_ON_FIXED_JOINT];
  return {
    target: 'export-occt',
    code: MOTION_ON_FIXED_JOINT,
    severity: 'error',
    message,
    hint: spec.template,
    nextAction: spec.nextAction,
    mateName,
    ...(extra.partName !== undefined ? { partName: extra.partName } : {}),
    ...(extra.paramName !== undefined ? { paramName: extra.paramName } : {}),
  };
}

function driveOnFastened(arm: Assembly, matesByName: ReadonlyMap<string, MateRecord>): MotionIntentDiagnostic[] {
  const out: MotionIntentDiagnostic[] = [];
  for (const intent of arm.__mechanicalJointIntents()) {
    if (matesByName.get(intent.mate)?.type !== 'fastened') continue;
    out.push(diagnostic(
      `Joint drive '${intent.name}' (actuator '${intent.actuator}') turns joint '${intent.mate}', but '${intent.mate}' is fastened, so nothing can move.`,
      intent.mate,
      { partName: intent.output },
    ));
  }
  for (const t of arm.__transmissionIntents()) {
    for (const mate of [t.sourceMate, ...t.drivenMates]) {
      if (matesByName.get(mate)?.type !== 'fastened') continue;
      out.push(diagnostic(
        `Transmission '${t.name}' moves joint '${mate}', but '${mate}' is fastened, so nothing can move.`,
        mate,
      ));
    }
  }
  return out;
}

function connectorParams(arm: Assembly, ref: string): Set<string> {
  let partName: string;
  let connectorName: string;
  try { ({ partName, connectorName } = parseConnectorRef(ref)); } catch { return new Set(); }
  const part = arm.__parts().find((p) => p.name === partName);
  const conn = part?.mateConnectors.find((c) => c.name === connectorName);
  if (conn === undefined) return new Set();
  const origin = conn.origin as { value?: unknown };
  return paramNamesOf([origin.value, conn.axis, conn.normal]);
}

function animatedParamOnFastened(
  arm: Assembly,
  animated: ReadonlySet<string>,
  drivers: ReadonlyMap<string, PoseDriver[]>,
): MotionIntentDiagnostic[] {
  const out: MotionIntentDiagnostic[] = [];
  const articulated = (p: string) => (drivers.get(p) ?? []).some((d) => d.type !== 'fastened' && d.type !== 'fixed');
  for (const p of animated) {
    for (const d of drivers.get(p) ?? []) {
      if (d.type !== 'fastened' && d.type !== 'fixed') continue;
      out.push(diagnostic(`Param '${p}' is animated and is the pose of joint '${d.name}', but '${d.name}' is ${d.type}, so it cannot move.`, d.name, { paramName: p }));
    }
  }
  for (const m of arm.__mates()) {
    if (m.type !== 'fastened') continue;
    const params = new Set([...connectorParams(arm, m.a), ...connectorParams(arm, m.b)]);
    for (const p of params) {
      if (!animated.has(p) || articulated(p)) continue;
      out.push(diagnostic(`Param '${p}' is animated and moves the connector of joint '${m.name}', but '${m.name}' is fastened. The animation moves a part the joint holds still.`, m.name, { paramName: p }));
    }
  }
  return out;
}

function geometryOnlyMotion(
  arm: Assembly,
  animated: ReadonlySet<string>,
  drivers: ReadonlyMap<string, PoseDriver[]>,
): MotionIntentDiagnostic[] {
  const free = [...animated].filter((p) => !(drivers.get(p) ?? []).some((d) => d.type !== 'fastened' && d.type !== 'fixed'));
  if (free.length === 0) return [];
  const byId = new Map(sessionRecords(arm).map((r) => [r.id, r]));
  const mates = arm.__mates();
  const out: MotionIntentDiagnostic[] = [];
  for (const part of arm.__parts()) {
    const partMates = matesOfPart(mates, part.name);
    if (partMates.length === 0 || partMates.some((m) => m.type !== 'fastened')) continue;
    const moving = new Set<string>();
    for (const r of lineage(part.originalShape.id, byId)) {
      for (const t of r.transforms) {
        if (t.op === 'rotateAxis') for (const p of collectParamRefs(t.degrees)) moving.add(p);
      }
    }
    for (const p of free) {
      if (!moving.has(p)) continue;
      const held = partMates.map((m) => `'${m.name}'`).join(', ');
      out.push(diagnostic(
        `Param '${p}' is animated and turns part '${part.name}' through its geometry, but no joint takes '${p}' as its pose: '${part.name}' is held by fastened joint ${held}. The animation shows motion the assembly does not allow.`,
        partMates[0].name,
        { partName: part.name, paramName: p },
      ));
    }
  }
  return out;
}

/**
 * Motion intent that lands on a fastened joint. Capture-only and cheap.
 * Empty for a static assembly (no animation, no drives).
 */
export function checkMotionIntent(arm: Assembly): MotionIntentDiagnostic[] {
  const mates = arm.__mates();
  const matesByName = new Map(mates.map((m) => [m.name, m]));
  const out = driveOnFastened(arm, matesByName);
  const animated = animatedParams(sessionRecords(arm));
  if (animated.size === 0) return out;
  const drivers = poseDrivers(arm);
  out.push(...animatedParamOnFastened(arm, animated, drivers));
  out.push(...geometryOnlyMotion(arm, animated, drivers));
  return out;
}
