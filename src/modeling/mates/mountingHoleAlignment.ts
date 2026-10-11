// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/mates/mountingHoleAlignment.ts
//
// Geometric fastener-hole ALIGNMENT gate for fastened mates.
//
// The hole-record gate (mountingHoleConsistency.ts) compares hole() /
// holes() diameters on the faces a connector binds, so it is blind to the
// dominant authoring shape — a vec3 connector at a coordinate — and to
// holes cut with a boolean. This gate reads the solid itself: it collects
// every full cylindrical bore of both fastened parts (BREP concave
// cylinders, no boolean probes), places them in the solved world frame,
// and looks at the bores that END on a common plane (the contact face both
// parts share). Two such bores side by side but not coaxial mean no screw
// can pass through both — the classic "bolt pattern off by a millimetre"
// error. Coaxial bores of any diameter pass (clearance over tap drill,
// bearing bore in a housing seat); bores with no near neighbour pass
// (vents, a screw into solid plastic). Emits one
// `assembly.mounting-hole.misaligned` (error) per offending pair.

import type { Assembly, AssemblyPartStored } from '../capture/assembly';
import { OcctBackend } from '../../kernel/backends/occt/occtBackend';
import { collectFullCylinders, type BoreExtent } from '../../kernel/backends/occt/holeDetection';
import { Transform } from '../../shared/runtime/se3';
import { parseConnectorRef } from './mate';
import { solveMates } from './solver';
import type { ValidatorDiagnostic } from './validator';

type Vec3 = readonly [number, number, number];

/** Bores whose ends lie within this distance along the shared axis direction
 *  open on the same contact plane. */
const COPLANAR_TOL_MM = 0.5;
/** |dirA·dirB| above this counts as parallel bores. */
const PARALLEL_DOT = 0.999;
/** Parts with more bores than this (perforated panels, grilles) are skipped:
 *  pairing every perforation is not a fastener check. */
const MAX_BORES_PER_PART = 64;

interface WorldBore {
  readonly origin: Vec3;
  /** Unit axis direction. */
  readonly dir: Vec3;
  readonly diameterMm: number;
  /** World positions of both axial ends of the bore wall. */
  readonly ends: readonly [Vec3, Vec3];
}

interface FastenedPair {
  readonly mateName: string;
  readonly partA: string;
  readonly partB: string;
}

/**
 * Check every fastened part pair for side-by-side, non-coaxial bores that
 * end on a shared contact plane. `poses` are the solved world transforms;
 * omitted, the mate solver runs. Returns [] when the mates do not solve
 * (the solver's own diagnostics cover that) or no bores face each other.
 */
export async function validateMountingHoleAlignment(
  arm: Assembly,
  poses?: ReadonlyMap<string, Transform>,
): Promise<ValidatorDiagnostic[]> {
  const pairs = fastenedPairs(arm);
  if (pairs.length === 0) return [];
  const worldPoses = poses ?? await solvedPoses(arm);
  if (worldPoses === undefined) return [];
  const partsByName = new Map(arm.__parts().map((part) => [part.name, part]));
  const boresByPart = new Map<string, readonly WorldBore[]>();
  const boresFor = async (name: string): Promise<readonly WorldBore[]> => {
    let bores = boresByPart.get(name);
    if (bores === undefined) {
      bores = await worldBoresOf(partsByName.get(name), worldPoses.get(name) ?? Transform.identity());
      boresByPart.set(name, bores);
    }
    return bores;
  };
  // A read-only probe: lowering a part here (Shape.lower) records a session
  // full-lower snapshot taken mid-script. Keep the snapshot the build had, so
  // the build's own lower, and the notes it emits, are not skipped.
  const session = arm.__session();
  const lastFullLower = session.lastFullLower;
  const out: ValidatorDiagnostic[] = [];
  try {
    for (const pair of pairs) {
      const finding = findMisalignedPair(await boresFor(pair.partA), await boresFor(pair.partB));
      if (finding !== undefined) out.push(misalignedDiagnostic(pair, finding));
    }
  } finally {
    session.lastFullLower = lastFullLower;
  }
  return out;
}

async function solvedPoses(arm: Assembly): Promise<ReadonlyMap<string, Transform> | undefined> {
  try {
    const solved = await solveMates(arm);
    return solved.status === 'solved' || solved.status === 'redundant-ok' ? solved.poses : undefined;
  } catch {
    return undefined;
  }
}

/** One entry per unordered part pair joined by at least one fastened mate. */
function fastenedPairs(arm: Assembly): FastenedPair[] {
  const seen = new Set<string>();
  const out: FastenedPair[] = [];
  for (const mate of arm.__mates()) {
    if (mate.type !== 'fastened') continue;
    let partA: string;
    let partB: string;
    try {
      partA = parseConnectorRef(mate.a).partName;
      partB = parseConnectorRef(mate.b).partName;
    } catch {
      continue;
    }
    if (partA === partB) continue;
    const key = [partA, partB].sort().join('\u0000');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ mateName: mate.name, partA, partB });
  }
  return out;
}

async function worldBoresOf(part: AssemblyPartStored | undefined, pose: Transform): Promise<readonly WorldBore[]> {
  if (part === undefined) return [];
  let bores: BoreExtent[];
  try {
    const backend = await part.originalShape.lower();
    if (!(backend instanceof OcctBackend)) return [];
    bores = collectFullCylinders(backend, 'hole');
  } catch {
    return [];
  }
  if (bores.length > MAX_BORES_PER_PART) return [];
  return bores.map((bore) => toWorldBore(bore, pose));
}

function toWorldBore(bore: BoreExtent, pose: Transform): WorldBore {
  const at = (t: number): Vec3 => pose.point([
    bore.loc0[0] + bore.dir0[0] * t,
    bore.loc0[1] + bore.dir0[1] * t,
    bore.loc0[2] + bore.dir0[2] * t,
  ]);
  return {
    origin: pose.point(bore.loc0),
    dir: normalize(pose.axisDir(bore.dir0)),
    diameterMm: bore.radiusMm * 2,
    ends: [at(bore.tMin), at(bore.tMax)],
  };
}

interface MisalignedFinding {
  readonly a: WorldBore;
  readonly b: WorldBore;
  readonly offsetMm: number;
  readonly plane: Vec3;
}

/**
 * The first pair of interface bores (one per part, parallel, ending on a
 * shared plane) that sit close enough to be meant for the same screw but
 * are not coaxial — skipping any bore already coaxial with a partner.
 */
function findMisalignedPair(boresA: readonly WorldBore[], boresB: readonly WorldBore[]): MisalignedFinding | undefined {
  const facing: Array<{ a: WorldBore; b: WorldBore; offsetMm: number; plane: Vec3 }> = [];
  for (const a of boresA) {
    for (const b of boresB) {
      const plane = sharedEnd(a, b);
      if (plane === undefined) continue;
      facing.push({ a, b, offsetMm: lateralOffset(a, b), plane });
    }
  }
  const aligned = facing.filter((f) => f.offsetMm <= alignToleranceMm(f.a, f.b));
  const alignedA = new Set(aligned.map((f) => f.a));
  const alignedB = new Set(aligned.map((f) => f.b));
  return facing.find((f) =>
    !alignedA.has(f.a) && !alignedB.has(f.b) &&
    f.offsetMm > alignToleranceMm(f.a, f.b) &&
    f.offsetMm < f.a.diameterMm + f.b.diameterMm);
}

/** Coaxial within the slack a clearance hole leaves a screw (≥ 0.3 mm). */
function alignToleranceMm(a: WorldBore, b: WorldBore): number {
  return Math.max(0.3, 0.1 * Math.min(a.diameterMm, b.diameterMm));
}

/** The end point of `a` lying on a plane (normal = shared axis) that also
 *  holds an end of `b`; undefined when the bores are not parallel. */
function sharedEnd(a: WorldBore, b: WorldBore): Vec3 | undefined {
  if (Math.abs(dot(a.dir, b.dir)) < PARALLEL_DOT) return undefined;
  for (const endA of a.ends) {
    for (const endB of b.ends) {
      if (Math.abs(dot(sub(endA, endB), a.dir)) <= COPLANAR_TOL_MM) return endA;
    }
  }
  return undefined;
}

/** Perpendicular distance between two parallel bore axes. */
function lateralOffset(a: WorldBore, b: WorldBore): number {
  const d = sub(b.origin, a.origin);
  const along = dot(d, a.dir);
  return Math.hypot(d[0] - a.dir[0] * along, d[1] - a.dir[1] * along, d[2] - a.dir[2] * along);
}

function misalignedDiagnostic(pair: FastenedPair, finding: MisalignedFinding): ValidatorDiagnostic {
  const at = finding.plane.map((v) => round(v)).join(', ');
  const message =
    `Fastened parts '${pair.partA}' and '${pair.partB}' (mate '${pair.mateName}') have holes ` +
    `(Ø${round(finding.a.diameterMm)} mm and Ø${round(finding.b.diameterMm)} mm) meeting at the contact face near [${at}] ` +
    `${round(finding.offsetMm)} mm off-axis — no screw passes through both.`;
  return {
    code: 'assembly.mounting-hole.misaligned',
    severity: 'error',
    mateName: pair.mateName,
    partA: pair.partA,
    partB: pair.partB,
    message,
    hint:
      `mounting-hole.misaligned — make the hole pattern on '${pair.partA}' coaxial with the one on '${pair.partB}' ` +
      `(same pitch and offset; move the hole()/holes() u, v positions or the part), so each screw axis passes through a hole on both parts.`,
  };
}

function round(v: number): number {
  return Math.round(v * 100) / 100;
}

function normalize(v: Vec3): Vec3 {
  const length = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
