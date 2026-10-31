// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/capture/feaStudyLoads.ts
//
// Capture-time load validation for `shape.feaStudy`. Split out of
// authoringFeatureRecords so the motion -> FEA hand-off keeps the main
// authoring file under its size ratchet. Everything here THROWS through the
// caller's `bad` function: a structural study that quietly drops or invents a
// load would report a safety factor that means nothing.

import type { FeaLoadMetadata, FeaStudySpec } from '../../shared/intent/feaStudyRecord';
import type { MotionPartLoadSample } from '../../shared/intent/motionLoadRecord';

export type FieldError = (field: string, why: string) => never;

export function validFeaSelector(v: unknown): boolean {
  return (typeof v === 'string' && v.length > 0) || (typeof v === 'object' && v !== null && !Array.isArray(v));
}

function isFiniteVec3(v: unknown): v is readonly [number, number, number] {
  return Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === 'number' && Number.isFinite(n));
}

/** Resolve `loadsFrom` to the concrete worst sampled wrench. Throws at capture
 *  when the motion result has no sample for the named part: a structural
 *  study that quietly analysed no load would report an infinite safety
 *  factor, which is exactly the fabricated pass S5 forbids. */
export function resolveFeaLoadsFromMotion(args: FeaStudySpec, bad: FieldError): FeaLoadMetadata {
  const from = args.loadsFrom!;
  const partLoads = validateLoadsFromMotion(from, bad);
  const worst = selectMotionLoad(partLoads, from, bad);
  return motionLoadAsFeaLoad(worst, from, bad);
}

function validateLoadsFromMotion(
  from: NonNullable<FeaStudySpec['loadsFrom']>,
  bad: FieldError,
): readonly MotionPartLoadSample[] {
  if (from === null || typeof from !== 'object') bad('loadsFrom', 'must be an object');
  if (typeof from.part !== 'string' || from.part.length === 0) {
    bad('loadsFrom.part', 'must name the assembly part the study shape is');
  }
  const motion = from.motion as { partLoads?: unknown } | undefined;
  if (motion === null || typeof motion !== 'object' || !Array.isArray(motion.partLoads)) {
    bad('loadsFrom.motion', 'must be the result of kinematic.motionLoad(...) or checkMotionLoad(...)');
  }
  return (motion as { partLoads: readonly MotionPartLoadSample[] }).partLoads;
}

function selectMotionLoad(
  partLoads: readonly MotionPartLoadSample[],
  from: NonNullable<FeaStudySpec['loadsFrom']>,
  bad: FieldError,
): MotionPartLoadSample {
  let candidates = partLoads.filter((p) => p.part === from.part);
  if (from.joint !== undefined) candidates = candidates.filter((p) => p.joint === from.joint);
  if (from.pose !== undefined) {
    const wanted = Object.entries(from.pose);
    candidates = candidates.filter((p) => wanted.every(([k, v]) => typeof p.pose[k] === 'number' && Math.abs(p.pose[k]! - v) <= 1e-6));
  }
  if (candidates.length === 0) {
    const why = from.joint !== undefined ? ` for joint '${from.joint}'` : '';
    const pose = from.pose !== undefined ? ' at the requested pose' : '';
    bad(
      'loadsFrom',
      `has no sampled load on part '${from.part}'${why}${pose}. ` +
      'Run motionLoad on an assembly whose mechanicalJoint drives that part, or sample the named pose with motionLoad({ poses: [...] }).',
    );
  }
  return candidates.reduce((a, b) => (b.proxy.value > a.proxy.value ? b : a));
}

function motionLoadAsFeaLoad(
  worst: MotionPartLoadSample,
  from: NonNullable<FeaStudySpec['loadsFrom']>,
  bad: FieldError,
): FeaLoadMetadata {
  const { forceN: force, momentNmm: moment, pointMm: point } = worst;
  const magnitude = Math.hypot(force[0], force[1], force[2]) + Math.hypot(moment[0], moment[1], moment[2]);
  if (!(magnitude > 0)) {
    bad('loadsFrom', `resolved to a zero wrench on part '${from.part}' at joint '${worst.joint}' — an unloaded solve would report a pass`);
  }
  if (!isFiniteVec3(point)) {
    bad('loadsFrom', `resolved to a non-finite joint origin on part '${from.part}'`);
  }
  return {
    faces: from.faces ?? { containsPoint: [point[0], point[1], point[2]] },
    force: [force[0], force[1], force[2]],
    name: `motion:${worst.joint}`,
    pointMm: [point[0], point[1], point[2]],
    momentNmm: [moment[0], moment[1], moment[2]],
    fromMotion: worst,
  };
}

export function validateFeaStudyLoads(loads: FeaStudySpec['loads'], bad: FieldError): FeaLoadMetadata[] {
  if (loads === undefined) return [];
  return loads.map((load, i) => validateFeaStudyLoad(load, i, bad));
}

function validateFeaStudyLoad(
  load: NonNullable<FeaStudySpec['loads']>[number],
  i: number,
  bad: FieldError,
): FeaLoadMetadata {
  if (load === null || typeof load !== 'object') bad(`loads[${i}]`, 'must be an object');
  if (!validFeaSelector(load.faces)) {
    bad(`loads[${i}].faces`, `must be a FaceQuery object or a '@kc[...]' ref string; got ${JSON.stringify(load.faces)}`);
  }
  const f = load.force;
  if (!isFiniteVec3(f)) {
    bad(`loads[${i}].force`, `must be three finite numbers [Fx, Fy, Fz] in newtons; got ${JSON.stringify(f)}`);
  }
  const remote = validateRemoteLoad(load, i, bad);
  if (load.name !== undefined && (typeof load.name !== 'string' || load.name.length === 0)) {
    bad(`loads[${i}].name`, `must be a non-empty string; got ${JSON.stringify(load.name)}`);
  }
  return {
    faces: load.faces,
    force: [f[0], f[1], f[2]],
    name: load.name ?? `load${i}`,
    ...remote,
    ...(load.fromMotion !== undefined ? { fromMotion: load.fromMotion } : {}),
  };
}

/** Validate the optional remote-wrench fields and return them normalised. */
function validateRemoteLoad(
  load: NonNullable<FeaStudySpec['loads']>[number],
  i: number,
  bad: FieldError,
): { pointMm?: [number, number, number]; momentNmm?: [number, number, number] } {
  const { pointMm: point, momentNmm: moment, force: f } = load;
  if (moment !== undefined && point === undefined) {
    bad(`loads[${i}].momentNmm`, 'needs pointMm (the moment is taken about that point)');
  }
  if (point !== undefined && !isFiniteVec3(point)) {
    bad(`loads[${i}].pointMm`, `must be three finite numbers in mm; got ${JSON.stringify(point)}`);
  }
  if (moment !== undefined && !isFiniteVec3(moment)) {
    bad(`loads[${i}].momentNmm`, `must be three finite numbers in N·mm; got ${JSON.stringify(moment)}`);
  }
  const momentMagnitude = moment === undefined ? 0 : Math.hypot(moment[0], moment[1], moment[2]);
  if (f[0] === 0 && f[1] === 0 && f[2] === 0 && momentMagnitude === 0) {
    bad(`loads[${i}].force`, 'and moment are the zero vector; a zero load would report an infinite safety factor');
  }
  return {
    ...(isFiniteVec3(point) ? { pointMm: [point[0], point[1], point[2]] } : {}),
    ...(isFiniteVec3(moment) ? { momentNmm: [moment[0], moment[1], moment[2]] } : {}),
  };
}

