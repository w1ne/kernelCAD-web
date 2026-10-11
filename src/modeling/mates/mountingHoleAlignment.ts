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
// parts share). Two findings mean no screw can pass through both:
//
//  - overlapping bores: two bores whose circles overlap on the contact
//    plane (lateral offset < rA + rB) but are not coaxial;
//  - an unpartnered interface bore: when BOTH parts have bores ending on
//    the contact plane, a bore of one part that opens onto the other
//    part's material (inside the contact footprint) with no coaxial
//    partner, while the other part has a fastener-sized bore on that plane
//    — the pattern is offset, however far ("bolt pattern 32x22 on a 30x20
//    plate", or one shifted by 7 mm).
//
// Coaxial bores of any diameter pass (clearance over tap drill, bearing
// bore in a housing seat); a bore that does not open onto the other part
// (outside the footprint) passes; a bore of a different size class from
// every bore on the other side passes (a bearing bore beside the screw
// holes); bores with no counterpart bores at all pass (vents, a screw into
// solid plastic). Emits one `assembly.mounting-hole.misaligned` (error) per
// fastened part pair.

import type { Assembly, AssemblyPartStored } from '../capture/assembly';
import { OcctBackend } from '../../kernel/backends/occt/occtBackend';
import { collectFullCylinders, probePointInsideMaterial, type BoreExtent } from '../../kernel/backends/occt/holeDetection';
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
/** Two bores are the same fastener size class (clearance vs tap drill,
 *  M3 3.4 / 2.5, M2 2.4 / 1.6) when the larger diameter is at most this
 *  multiple of the smaller. */
const SIZE_CLASS_RATIO = 2;
/** Probe offset off the contact plane into the other part (mm). */
const PROBE_OFFSET_MM = 0.2;

interface WorldBore {
  readonly origin: Vec3;
  /** Unit axis direction. */
  readonly dir: Vec3;
  readonly diameterMm: number;
  /** World positions of both axial ends of the bore wall. */
  readonly ends: readonly [Vec3, Vec3];
}

/** True when `point` (world) lies in the part's material. */
type MaterialProbe = (point: Vec3) => boolean;

interface PartBores {
  readonly bores: readonly WorldBore[];
  readonly material: MaterialProbe;
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
  loweredParts?: ReadonlyMap<string, OcctBackend>,
): Promise<ValidatorDiagnostic[]> {
  const pairs = fastenedPairs(arm);
  if (pairs.length === 0) return [];
  const worldPoses = poses ?? await solvedPoses(arm);
  if (worldPoses === undefined) return [];
  const partsByName = new Map(arm.__parts().map((part) => [part.name, part]));
  const boresByPart = new Map<string, PartBores>();
  const boresFor = async (name: string): Promise<PartBores> => {
    let bores = boresByPart.get(name);
    if (bores === undefined) {
      bores = await worldBoresOf(partsByName.get(name), worldPoses.get(name) ?? Transform.identity(), loweredParts?.get(name));
      boresByPart.set(name, bores);
    }
    return bores;
  };
  const out: ValidatorDiagnostic[] = [];
  for (const pair of pairs) {
    const finding = findMisalignedPair(await boresFor(pair.partA), await boresFor(pair.partB));
    if (finding !== undefined) out.push(misalignedDiagnostic(pair, finding));
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

const NO_BORES: PartBores = { bores: [], material: () => false };

/** `prelowered`: the part's local-frame shape from an earlier scene
 *  lowering, when the caller has one; otherwise the part is lowered here. */
async function worldBoresOf(
  part: AssemblyPartStored | undefined,
  pose: Transform,
  prelowered?: OcctBackend,
): Promise<PartBores> {
  if (part === undefined) return NO_BORES;
  let bores: BoreExtent[];
  let backend: OcctBackend;
  try {
    const lowered = prelowered ?? await part.originalShape.lower();
    if (!(lowered instanceof OcctBackend)) return NO_BORES;
    backend = lowered;
    bores = collectFullCylinders(backend, 'hole');
  } catch {
    return NO_BORES;
  }
  if (bores.length > MAX_BORES_PER_PART) return NO_BORES;
  const toLocal = pose.inverse();
  return {
    bores: bores.map((bore) => toWorldBore(bore, pose)),
    material: (point) => probePointInsideMaterial(backend, toLocal.point(point)),
  };
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

interface FacingPair {
  readonly a: WorldBore;
  readonly b: WorldBore;
  readonly offsetMm: number;
  readonly plane: Vec3;
}

/**
 * The first misaligned interface: two non-coaxial bores whose circles
 * overlap on a shared plane, else an interface bore on either side that
 * opens onto the other part's material with no coaxial partner.
 */
function findMisalignedPair(partA: PartBores, partB: PartBores): MisalignedFinding | undefined {
  const facing: FacingPair[] = [];
  for (const a of partA.bores) {
    for (const b of partB.bores) {
      const plane = sharedEnd(a, b);
      if (plane === undefined) continue;
      facing.push({ a, b, offsetMm: lateralOffset(a, b), plane });
    }
  }
  if (facing.length === 0) return undefined;
  const aligned = facing.filter((f) => f.offsetMm <= alignToleranceMm(f.a, f.b));
  const alignedA = new Set(aligned.map((f) => f.a));
  const alignedB = new Set(aligned.map((f) => f.b));
  const overlapping = facing.find((f) =>
    !alignedA.has(f.a) && !alignedB.has(f.b) &&
    f.offsetMm > alignToleranceMm(f.a, f.b) &&
    f.offsetMm < (f.a.diameterMm + f.b.diameterMm) / 2);
  if (overlapping !== undefined) return overlapping;
  return findUnpartneredBore(facing, alignedA, partB.material, 'a')
    ?? findUnpartneredBore(facing, alignedB, partA.material, 'b');
}

/**
 * A bore on `side` that ends on a plane shared with same-size-class bores
 * of the other part, has no coaxial partner, and opens onto the other
 * part's material there (so it lies inside the contact footprint).
 */
function findUnpartneredBore(
  facing: readonly FacingPair[],
  alignedOnSide: ReadonlySet<WorldBore>,
  otherMaterial: MaterialProbe,
  side: 'a' | 'b',
): MisalignedFinding | undefined {
  const probed = new Set<WorldBore>();
  const candidates = facing
    .filter((f) => !alignedOnSide.has(f[side]) && sameSizeClass(f.a, f.b))
    .sort((x, y) => x.offsetMm - y.offsetMm);
  for (const f of candidates) {
    const bore = f[side];
    if (probed.has(bore)) continue;
    probed.add(bore);
    const end = endOnPlane(bore, f.plane);
    if (opensOntoMaterial(end, bore.dir, otherMaterial)) {
      return f;
    }
  }
  return undefined;
}

function sameSizeClass(a: WorldBore, b: WorldBore): boolean {
  const big = Math.max(a.diameterMm, b.diameterMm);
  const small = Math.min(a.diameterMm, b.diameterMm);
  return small > 0 && big / small <= SIZE_CLASS_RATIO;
}

/** The end of `bore` lying on the plane through `plane` normal to its axis. */
function endOnPlane(bore: WorldBore, plane: Vec3): Vec3 {
  const [e0, e1] = bore.ends;
  return Math.abs(dot(sub(e0, plane), bore.dir)) <= Math.abs(dot(sub(e1, plane), bore.dir)) ? e0 : e1;
}

/** The other part has material just off the contact plane on either side
 *  of the bore mouth (the side the bore's own part is not on is where the
 *  other part sits; probing both is order-independent). */
function opensOntoMaterial(end: Vec3, dir: Vec3, material: MaterialProbe): boolean {
  for (const sign of [1, -1]) {
    const p: Vec3 = [
      end[0] + dir[0] * PROBE_OFFSET_MM * sign,
      end[1] + dir[1] * PROBE_OFFSET_MM * sign,
      end[2] + dir[2] * PROBE_OFFSET_MM * sign,
    ];
    if (material(p)) return true;
  }
  return false;
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
