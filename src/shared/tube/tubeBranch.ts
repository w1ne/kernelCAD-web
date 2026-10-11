// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// A tube that branches off another tube at a 90 degree tee. A branch end is
// captured as `{ tube, at, axis }`: `at` mm along the trunk centreline from
// the trunk's `from` end. Where that is in space is not captured. It is
// worked out here from the trunk's resolved path every time the branch is
// lowered or checked, so a param that moves the trunk moves the joint.
//
// The branch centreline starts on the trunk's outer wall: its end straight
// and its cut length are measured from there. Pure math; no kernel imports.

import type { FeatureRecord } from '../intent/featureRecord';
import { isTubeMetadata, tubeCornerPoints, type TubeEndMeta } from '../intent/tubeRecord';
import type { FeatureId } from '../intent/types';
import {
  add, buildTubePath, dot, isTubePathError, norm, scale, sub, unit,
  type TubePath, type TubePathError, type V3,
} from './tubePath';

export type TubeEndName = 'from' | 'to';

/** The record input that names the trunk of each branch end. It is what makes
 *  the recompute engine lower the trunk first. */
export const TRUNK_INPUT: Record<TubeEndName, string> = { from: 'fromTrunk', to: 'toTrunk' };

/** A station on a path: on a straight, on a bend, or off the path. */
export type StationHit =
  | { on: 'straight'; point: V3; dir: V3; before: number; after: number; startsAtEnd: boolean; endsAtEnd: boolean;
      /** Bends of the path before this straight; the next bend is number `bendsBefore + 1`. */
      bendsBefore: number }
  | { on: 'bend'; bend: number; start: number; end: number }
  | { on: 'outside'; length: number };

const segmentLength = (path: TubePath, i: number): number => {
  const s = path.segments[i];
  return s.kind === 'line' ? norm(sub(s.b, s.a)) : (path.bendRadius * s.angleDeg * Math.PI) / 180;
};

/** The stations each straight of the path covers, as `[start, end]` in mm. */
export function straightRanges(path: TubePath): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  let start = 0;
  path.segments.forEach((s, i) => {
    const end = start + segmentLength(path, i);
    if (s.kind === 'line') out.push([start, end]);
    start = end;
  });
  return out;
}

/** What is `at` mm along the path from its first point. `before` and `after`
 *  are the distances to the two ends of the straight it lands on. */
export function stationOnPath(path: TubePath, at: number): StationHit {
  if (!Number.isFinite(at) || at < 0 || at > path.cutLength) return { on: 'outside', length: path.cutLength };
  let start = 0;
  let bend = 0;
  const last = path.segments.length - 1;
  for (let i = 0; i <= last; i++) {
    const s = path.segments[i];
    const end = i === last ? path.cutLength : start + segmentLength(path, i);
    if (s.kind === 'arc') bend += 1;
    if (at <= end) {
      if (s.kind === 'arc') return { on: 'bend', bend, start, end };
      const dir = unit(sub(s.b, s.a));
      return { on: 'straight', point: add(s.a, scale(dir, at - start)), dir, before: at - start, after: end - at,
        startsAtEnd: i === 0, endsAtEnd: i === last, bendsBefore: bend };
    }
    start = end;
  }
  return { on: 'outside', length: path.cutLength };
}

export interface TubeJoint {
  which: TubeEndName;
  trunkId: FeatureId;
  trunk: string;
  /** Station on the trunk centreline, mm from the trunk's `from` end. */
  at: number;
  /** The station, on the trunk centreline. */
  center: V3;
  /** Where the branch centreline starts: on the trunk's outer wall. */
  wall: V3;
  /** Unit direction the branch leaves along, square to the trunk leg. */
  axis: V3;
  /** Unit direction of the trunk leg. */
  legDir: V3;
  /** How far the declared axis is from square to the leg, degrees. */
  offSquareDeg: number;
  trunkOd: number;
  /** Distance along the trunk from the station to each end of its straight,
   *  and whether that end is an end of the trunk (else it is a bend). */
  before: number;
  after: number;
  startsAtEnd: boolean;
  endsAtEnd: boolean;
  /** Bends of the trunk before the station; the next bend is number `bendsBefore + 1`. */
  bendsBefore: number;
}

export interface TubeGeometry {
  /** The centreline the rules and the report read: a branch end starts on the trunk wall. */
  path: TubePath;
  /** One per branch end. */
  joints: TubeJoint[];
}

/** A branch end that cannot be placed on its trunk. */
export type BranchFault = { kind: 'branch'; which: TubeEndName; trunk: string } & (
  | { reason: 'trunk-unavailable' }
  | { reason: 'off-straight'; at: number; hit: Exclude<StationHit, { on: 'straight' }>; straights: Array<[number, number]> }
  | { reason: 'axis-along-trunk'; legDir: V3 }
);

export type TubeGeometryError = TubePathError | BranchFault;

export function isTubeGeometryError(v: TubeGeometry | TubeGeometryError): v is TubeGeometryError {
  return 'kind' in v;
}

export function isBranchFault(v: TubeGeometryError): v is BranchFault {
  return v.kind === 'branch';
}

/** Below this sine the declared axis runs along the trunk leg: no square direction to take. */
const ALONG_SIN = 1e-6;
/** A trunk is itself a branch of a tube declared before it, so the chain is
 *  finite; the limit only stops a hand-made record that names itself. */
const MAX_CHAIN = 64;

const DEG = 180 / Math.PI;
const f2 = (n: number): string => n.toFixed(2);
const xyz = (p: readonly number[]): string => `[${p.map(f2).join(', ')}]`;

function jointOn(
  which: TubeEndName, end: TubeEndMeta, trunkId: FeatureId, trunk: FeatureRecord, trunkPath: TubePath,
): TubeJoint | BranchFault {
  const branch = end.branch!;
  const at = branch.at.evaluated;
  const hit = stationOnPath(trunkPath, at);
  if (hit.on !== 'straight') {
    return { kind: 'branch', which, trunk: branch.tube, reason: 'off-straight', at, hit, straights: straightRanges(trunkPath) };
  }
  const declared = end.axis ?? [0, 0, 0];
  const along = dot(declared, hit.dir);
  const square = sub(declared, scale(hit.dir, along));
  if (norm(square) < ALONG_SIN) return { kind: 'branch', which, trunk: branch.tube, reason: 'axis-along-trunk', legDir: hit.dir };
  const axis = unit(square);
  const trunkOd = trunk.params.od.evaluated;
  return {
    which, trunkId, trunk: branch.tube, at, center: hit.point, wall: add(hit.point, scale(axis, trunkOd / 2)), axis,
    legDir: hit.dir, offSquareDeg: Math.abs(Math.asin(Math.min(1, Math.abs(along))) * DEG), trunkOd,
    before: hit.before, after: hit.after, startsAtEnd: hit.startsAtEnd, endsAtEnd: hit.endsAtEnd, bendsBefore: hit.bendsBefore,
  };
}

type RecordLookup = (id: FeatureId) => FeatureRecord | undefined;

/** The joint of one branch end: the trunk named by the record's input, its
 *  own centreline worked out first (a trunk may be a branch too). */
function branchJoint(
  record: FeatureRecord, which: TubeEndName, end: TubeEndMeta, resolved: RecordLookup, depth: number,
): TubeJoint | BranchFault {
  const unavailable: BranchFault = { kind: 'branch', which, trunk: end.branch!.tube, reason: 'trunk-unavailable' };
  const ref = record.inputs[TRUNK_INPUT[which]];
  if (ref?.kind !== 'feature' || depth >= MAX_CHAIN) return unavailable;
  const trunk = resolved(ref.id);
  if (trunk === undefined) return unavailable;
  const trunkGeometry = tubeGeometry(trunk, resolved, depth + 1);
  return isTubeGeometryError(trunkGeometry) ? unavailable : jointOn(which, end, ref.id, trunk, trunkGeometry.path);
}

/**
 * The centreline of one `tube` record, with each branch end placed on its
 * trunk. `record` must already be resolved through the param table;
 * `resolved(id)` gives another record resolved the same way (a captured Param
 * that references a script parameter has `evaluated: 0`).
 */
export function tubeGeometry(record: FeatureRecord, resolved: RecordLookup, depth = 0): TubeGeometry | TubeGeometryError {
  const meta = (record.metadata as { tube?: unknown } | undefined)?.tube;
  if (!isTubeMetadata(meta)) return { kind: 'too-few-points' };
  const points = tubeCornerPoints(meta);
  const joints: TubeJoint[] = [];
  for (const which of ['from', 'to'] as const) {
    if (meta[which].branch === undefined) continue;
    const joint = branchJoint(record, which, meta[which], resolved, depth);
    if ('kind' in joint) return joint;
    joints.push(joint);
    points[which === 'from' ? 0 : points.length - 1] = joint.wall;
  }
  const path = buildTubePath(points, record.params.bendRadius.evaluated);
  return isTubePathError(path) ? path : { path, joints };
}

/** The path the branch solid is swept along: each branch end run on to the
 *  trunk centreline, so that cutting it with the trunk's outer cylinder
 *  leaves the end on the trunk wall. */
export function branchSweepPath(geometry: TubeGeometry): TubePath | TubePathError {
  const points = geometry.path.points.map((p) => [...p] as V3);
  for (const j of geometry.joints) points[j.which === 'from' ? 0 : points.length - 1] = j.center;
  return buildTubePath(points, geometry.path.bendRadius);
}

export type BranchFaultCode = 'tube.branch.not-on-straight' | 'tube.branch.axis-not-square';

const ranges = (straights: ReadonlyArray<[number, number]>): string =>
  straights.map(([a, b]) => `${f2(a)} to ${f2(b)}`).join(', ');

/** The diagnostic for a branch end that could not be placed; undefined when
 *  the trunk itself is missing or did not build (its own error says why). */
export function branchFaultDiagnostic(name: string, fault: BranchFault): { code: BranchFaultCode; text: string } | undefined {
  const end = `tube '${name}' ${fault.which} end`;
  if (fault.reason === 'off-straight') {
    const where = fault.hit.on === 'bend' ?
      `is on bend ${fault.hit.bend} of tube '${fault.trunk}' (${f2(fault.hit.start)} to ${f2(fault.hit.end)} mm)` :
      `is off tube '${fault.trunk}', which is ${f2(fault.hit.length)} mm long`;
    return { code: 'tube.branch.not-on-straight',
      text: `${end}: at ${f2(fault.at)} mm ${where}. The trunk is straight from ${ranges(fault.straights)} mm.` };
  }
  if (fault.reason === 'axis-along-trunk') {
    return { code: 'tube.branch.axis-not-square',
      text: `${end}: its axis runs along tube '${fault.trunk}', whose leg there runs along ${xyz(fault.legDir)}; ` +
        'a branch leaves at 90 deg to the trunk.' };
  }
  return undefined;
}

/** The joints whose branch end cannot be run on to the trunk centreline: the
 *  first (or last) leg leaves the joint off the branch axis enough to change
 *  the bend after it. When no single joint fails on its own, all of them. */
export function offAxisJoints(geometry: TubeGeometry): TubeJoint[] {
  const failing = geometry.joints.filter((j) => isTubePathError(branchSweepPath({ ...geometry, joints: [j] })));
  return failing.length > 0 ? failing : [...geometry.joints];
}

/** The `tube.port.misaligned` text for a branch end that cannot be cut to its trunk. */
export function offAxisJointText(name: string, joint: TubeJoint): string {
  const corner = joint.which === 'from' ? 'first' : 'last';
  return `tube '${name}' ${joint.which} end leaves its joint on tube '${joint.trunk}' off the branch axis, so it cannot be cut ` +
    `to the trunk wall; put the ${corner} corner on the line from ${xyz(joint.wall)} along ${xyz(joint.axis)}.`;
}
