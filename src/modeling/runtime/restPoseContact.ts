// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/restPoseContact.ts
//
// Rest-pose contact gate. Runs on every mechanism, including the ones
// whose articulated pose sweep is over budget, so an assembly that paints
// with links passing through each other (or links that never touch the
// part they are mated to) cannot come back `ok`.
//
// Two checks, both on the already-lowered rest scene:
//
//   1. Penetration. Every part pair whose world AABBs overlap is measured
//      on its analysis tessellation (`getMesh()`): the shared volume is
//      integrated on a voxel grid inside the AABB overlap, a grid point
//      counting as inside a mesh when at least two of the three axis rays
//      through it cross that mesh an odd number of times. The vote keeps a
//      vendor mesh with a few open seams from reading as solid air (or
//      solid everywhere). The shared rule `isActionableOverlap` decides:
//      shared volume above 0.01 mm³ AND thicker than
//      `REST_PENETRATION_DEPTH_MM` (0.3 mm, the voxel/mesh noise floor)
//      somewhere is an error. Thinner overlaps on BREP parts are still
//      caught exactly by the default-pose BREP check (validator). Thickness is the exact overlap of the two meshes' inside
//      intervals along each axis ray, minimum over the three axes. Coincident faces, a pin in a clearance bore, and a part
//      sitting in a pocket all share ~0 volume and pass.
//
//      This is mesh-based on purpose. OCCT booleans on polyhedral solids
//      sewn from STL report wildly wrong common volumes (the SO-100 base
//      vs its pan servo: 10,857 mm³ from BRepAlgoAPI_Common, 21 mm³ by
//      point sampling and by an exact manifold boolean). The mesh integral
//      is the same for analytic BREP and for imported meshes.
//
//      A pair declared in `solvedModel({ ignore })` is exempt from this
//      penetration diagnostic. Mate-gap and joint-continuity checks remain
//      active, and the motion sweep still checks ignored pairs at moved poses.
//
//   2. Contact. The two parts of every mate must meet: their minimum
//      distance at rest must be within `REST_MATE_CONTACT_TOLERANCE_MM`.
//      A link mated to a servo it hovers next to is not seated.

import type { Assembly } from '../capture/assembly';
import type { SceneBackend } from '../../kernel/backends/sceneBackend';
import { OcctBackend, analysisBodyOf } from '../../kernel/backends/occt/occtBackend';
import { parseConnectorRef, type MateRecord } from '../mates/mate';
import { CONTACT_THICKNESS_MM, isActionableOverlap, overlapThicknessMm } from './jointContactCap';
import { JOINT_MESH_GAP_TOLERANCE_MM, measureBodyToBodyGap } from './jointMeshContinuity';
import { restWorldMesh, restMeshContact, type WorldMesh } from './restAnalysisMesh';
import { meshOverlapVolume } from './meshVolumeOverlap';
import { isMeshBackend } from '../../kernel/backends/meshBackend';
import { extractPosedWorldMesh, measureMeshPairDistance, measureMeshPairOverlap } from './meshPairCheck';
export { worldMesh } from './restAnalysisMesh';
export type { WorldMesh } from './restAnalysisMesh';
export { meshOverlapVolume } from './meshVolumeOverlap';

/** Largest rest-pose gap (mm) between the two parts of a mate. */
export const REST_MATE_CONTACT_TOLERANCE_MM = JOINT_MESH_GAP_TOLERANCE_MM;

/**
 * Shared material thinner than this (mm) everywhere is a contact sliver,
 * not a collision: tessellated coincident faces, a thread or gear-tooth
 * flank in modelled contact, a press-fit skin. 0.3 mm is about one FDM
 * line width and above the 0.05 mm analysis-mesh deflection on both sides.
 */
export const REST_PENETRATION_DEPTH_MM = 0.3;

export interface RestPenetration {
  readonly a: string;
  readonly b: string;
  readonly volumeMm3: number;
  /** Largest local thickness of the shared region (mm). */
  readonly thicknessMm: number;
  /** World-space centre of the shared region. */
  readonly at: [number, number, number];
  /** Voxel edge used for the integral (mm). */
  readonly cellMm: number;
  /** Thickness (mm) at or below which this measurement counts as contact. */
  readonly contactThicknessMm: number;
}

export interface RestMateGap {
  readonly mateName: string;
  readonly a: string;
  readonly b: string;
  readonly gapMm: number;
  /** Set for a moving mate: the smallest gap between the rigid groups on
   *  its two sides (each mated part plus the parts fastened to it). */
  readonly groupGapMm?: number;
}

function boxesOverlap(a: WorldMesh, b: WorldMesh): boolean {
  for (let k = 0; k < 3; k++) {
    if (a.min[k] >= b.max[k] || b.min[k] >= a.max[k]) return false;
  }
  return true;
}

/** BREP common volume and mean thickness (2·V/A), for a part whose
 *  tessellation is not closed. */
function brepOverlap(
  a: SceneBackend['parts'][number],
  b: SceneBackend['parts'][number],
  ma: WorldMesh,
  mb: WorldMesh,
): { volumeMm3: number; thicknessMm: number; at: [number, number, number]; cellMm: number } {
  const at = [0, 1, 2].map((k) => (Math.max(ma.min[k], mb.min[k]) + Math.min(ma.max[k], mb.max[k])) / 2) as [number, number, number];
  if (!(a.shape instanceof OcctBackend) || !(b.shape instanceof OcctBackend)) {
    return { volumeMm3: NaN, thicknessMm: NaN, at, cellMm: 0 };
  }
  try {
    const wa = (analysisBodyOf(a.shape) as OcctBackend).clone().applyTransform(a.worldTransform);
    const wb = (analysisBodyOf(b.shape) as OcctBackend).clone().applyTransform(b.worldTransform);
    const m = wa.intersectionMetrics(wb);
    return { volumeMm3: m.volumeMm3, thicknessMm: overlapThicknessMm(m.volumeMm3, m.areaMm2), at, cellMm: 0 };
  } catch {
    // Unmeasured: volume 0 here is "no BREP evidence", never "no overlap" —
    // the mesh path keeps its own result when the boolean fails.
    return { volumeMm3: NaN, thicknessMm: NaN, at, cellMm: 0 };
  }
}

interface RestMeshEntry {
  readonly name: string;
  readonly mesh: WorldMesh;
  readonly part: SceneBackend['parts'][number];
}

/** Every part pair that really overlaps at rest (`isActionableOverlap`). */
export function restPosePenetrations(scene: SceneBackend): RestPenetration[] {
  const meshes: RestMeshEntry[] = [];
  for (const p of scene.parts) {
    // Display-only triangle soups are measured by the mesh-pair engine below;
    // BRep parts keep the voxel/exact path.
    if (!(p.shape instanceof OcctBackend) && !isMeshBackend(p.shape)) continue;
    const mesh = restWorldMesh(p, 'analysis')?.mesh;
    if (mesh !== undefined) meshes.push({ name: p.name, mesh, part: p });
  }
  const out: RestPenetration[] = [];
  for (let i = 0; i < meshes.length; i++) {
    for (let j = i + 1; j < meshes.length; j++) {
      const A = meshes[i];
      const B = meshes[j];
      if (!boxesOverlap(A.mesh, B.mesh)) continue;
      const hit = restPairPenetration(A, B);
      if (hit !== undefined) out.push(hit);
    }
  }
  return out;
}

function restPairPenetration(A: RestMeshEntry, B: RestMeshEntry): RestPenetration | undefined {
  if (isMeshBackend(A.part.shape) || isMeshBackend(B.part.shape)) {
    return meshPairPenetration(A.part, B.part);
  }
  return brepPairPenetration(A, B);
}

function brepPairPenetration(A: RestMeshEntry, B: RestMeshEntry): RestPenetration | undefined {
  const onMesh = A.mesh.closed && B.mesh.closed;
  const r = onMesh
    ? meshOverlapVolume(A.mesh, B.mesh)
    : brepOverlap(A.part, B.part, A.mesh, B.mesh);
  const contactThicknessMm = onMesh ? REST_PENETRATION_DEPTH_MM : CONTACT_THICKNESS_MM;
  if (!isActionableOverlap(r, contactThicknessMm)) return undefined;
  // A real overlap shows in both measurements. The voxel integral of two
  // tessellations reads a few mm³ where curved analytic faces only
  // touch; the exact BREP common then reads ~0 and wins. (On STL-sewn
  // solids the BREP common over-reads, so the mesh value still stands.)
  if (onMesh) {
    const exact = brepOverlap(A.part, B.part, A.mesh, B.mesh);
    if (Number.isFinite(exact.volumeMm3) && !isActionableOverlap(exact)) return undefined;
  }
  return { a: A.name, b: B.name, ...r, contactThicknessMm };
}

/** Rest-pose overlap of a pair where at least one side is a display mesh. */
function meshPairPenetration(
  a: SceneBackend['parts'][number],
  b: SceneBackend['parts'][number],
): RestPenetration | undefined {
  const meshA = extractPosedWorldMesh(a.shape, a.worldTransform);
  const meshB = extractPosedWorldMesh(b.shape, b.worldTransform);
  if (meshA === undefined || meshB === undefined) return undefined;
  const overlap = measureMeshPairOverlap(meshA, meshB);
  if (!overlap.intersecting || overlap.thicknessMm <= REST_PENETRATION_DEPTH_MM) return undefined;
  const bounds = overlap.overlapBounds ?? { min: meshA.min, max: meshA.max };
  const at: [number, number, number] = [
    (bounds.min[0] + bounds.max[0]) / 2,
    (bounds.min[1] + bounds.max[1]) / 2,
    (bounds.min[2] + bounds.max[2]) / 2,
  ];
  return {
    a: a.name,
    b: b.name,
    volumeMm3: overlap.volumeMm3,
    thicknessMm: overlap.thicknessMm,
    at,
    cellMm: 0,
    contactThicknessMm: REST_PENETRATION_DEPTH_MM,
  };
}

type ScenePart = SceneBackend['parts'][number];

/** Rest-pose distance (mm) between two scene parts: the analysis mesh, with
 *  the exact BREP distance when the mesh reading sits near the tolerance.
 *  Cached per unordered pair in `seen`. */
function restPartGapMm(
  pa: ScenePart,
  pb: ScenePart,
  seen: Map<string, number | undefined>,
  toleranceMm: number,
): number | undefined {
  const key = pa.name < pb.name ? `${pa.name}\u0000${pb.name}` : `${pb.name}\u0000${pa.name}`;
  if (isMeshBackend(pa.shape) || isMeshBackend(pb.shape)) {
    if (!seen.has(key)) seen.set(key, meshPairGapMm(pa, pb));
    return seen.get(key);
  }
  if (!(pa.shape instanceof OcctBackend) || !(pb.shape instanceof OcctBackend)) return undefined;
  if (!seen.has(key)) {
    const meshContact = restMeshContact(pa, pb, 'analysis');
    seen.set(key, meshContact !== undefined && Math.abs(meshContact.distanceMm - toleranceMm) > 0.25
      ? meshContact.distanceMm
      : measureBodyToBodyGap(
        analysisBodyOf(pa.shape) as OcctBackend, pa.worldTransform,
        analysisBodyOf(pb.shape) as OcctBackend, pb.worldTransform,
      ));
  }
  return seen.get(key);
}

/** Rest-pose surface distance for a pair involving a display mesh. */
function meshPairGapMm(pa: ScenePart, pb: ScenePart): number | undefined {
  const meshA = extractPosedWorldMesh(pa.shape, pa.worldTransform);
  const meshB = extractPosedWorldMesh(pb.shape, pb.worldTransform);
  if (meshA === undefined || meshB === undefined) return undefined;
  const measured = measureMeshPairDistance(meshA, meshB, 0, { forceExact: true });
  return Number.isFinite(measured.distanceMm) ? measured.distanceMm : undefined;
}

function mateParts(mate: MateRecord): [string, string] | undefined {
  try {
    return [parseConnectorRef(mate.a).partName, parseConnectorRef(mate.b).partName];
  } catch {
    return undefined;
  }
}

/** Smallest rest gap between any member of `groupA` and any member of
 *  `groupB` (parts fastened to each mated part count as that side). */
function restGroupGapMm(
  groupA: readonly string[],
  groupB: readonly string[],
  byName: Map<string, ScenePart>,
  seen: Map<string, number | undefined>,
  toleranceMm: number,
): number | undefined {
  let best: number | undefined;
  for (const a of groupA) {
    for (const b of groupB) {
      if (a === b) return 0;
      const pa = byName.get(a);
      const pb = byName.get(b);
      if (pa === undefined || pb === undefined) continue;
      const gap = restPartGapMm(pa, pb, seen, toleranceMm);
      if (gap !== undefined && (best === undefined || gap < best)) best = gap;
      if (best !== undefined && best <= toleranceMm) return best;
    }
  }
  return best;
}

/** Every mate whose two parts do not meet at rest. A moving mate (anything
 *  but fastened) is judged across the rigid groups: in a servo joint the
 *  revolute links two printed parts that never touch, while the servo on
 *  one and the horn on the other carry the load. */
function restPoseMateGapFor(
  mate: MateRecord,
  byName: Map<string, ScenePart>,
  seen: Map<string, number | undefined>,
  toleranceMm: number,
  groups: ReadonlyMap<string, readonly string[]> | undefined,
): RestMateGap | undefined {
  const ends = mateParts(mate);
  if (ends === undefined) return undefined;
  const [a, b] = ends;
  if (a === b) return undefined;
  const pa = byName.get(a);
  const pb = byName.get(b);
  if (pa === undefined || pb === undefined) return undefined;
  const gap = restPartGapMm(pa, pb, seen, toleranceMm);
  if (gap === undefined || gap <= toleranceMm) return undefined;
  if (mate.type === 'fastened' || groups === undefined) return { mateName: mate.name, a, b, gapMm: gap };
  const groupGap = restGroupGapMm(groups.get(a) ?? [a], groups.get(b) ?? [b], byName, seen, toleranceMm);
  if (groupGap !== undefined && groupGap <= toleranceMm) return undefined;
  return { mateName: mate.name, a, b, gapMm: gap, groupGapMm: groupGap ?? gap };
}

/**
 * Rigid groups at rest: parts joined transitively by fastened mates whose
 * two parts actually touch (gap within `toleranceMm`). A part fastened to a
 * host it floats away from is not held by it, so it does not join the
 * group. Returns part name -> every member of its group (itself included).
 */
export function restFastenedGroups(
  arm: Assembly,
  scene: SceneBackend,
  toleranceMm: number = REST_MATE_CONTACT_TOLERANCE_MM,
): Map<string, string[]> {
  const byName = new Map(scene.parts.map((p) => [p.name, p]));
  const seen = new Map<string, number | undefined>();
  const parent = new Map<string, string>(scene.parts.map((p) => [p.name, p.name]));
  const find = (name: string): string => {
    let root = name;
    while (parent.get(root) !== root) root = parent.get(root)!;
    return root;
  };
  for (const mate of arm.__mates()) {
    if (mate.type !== 'fastened') continue;
    const ends = mateParts(mate);
    if (ends === undefined || !parent.has(ends[0]) || !parent.has(ends[1])) continue;
    const gap = restPartGapMm(byName.get(ends[0])!, byName.get(ends[1])!, seen, toleranceMm);
    if (gap === undefined || gap > toleranceMm) continue;
    parent.set(find(ends[0]), find(ends[1]));
  }
  const members = new Map<string, string[]>();
  for (const name of parent.keys()) members.set(find(name), [...(members.get(find(name)) ?? []), name]);
  return new Map([...parent.keys()].map((name) => [name, members.get(find(name))!]));
}

export function restPoseMateGaps(
  arm: Assembly,
  scene: SceneBackend,
  toleranceMm: number = REST_MATE_CONTACT_TOLERANCE_MM,
  includeMate: (mate: MateRecord) => boolean = () => true,
  groups?: ReadonlyMap<string, readonly string[]>,
): RestMateGap[] {
  const byName = new Map(scene.parts.map((p) => [p.name, p]));
  const out: RestMateGap[] = [];
  const seen = new Map<string, number | undefined>();
  for (const mate of arm.__mates()) {
    if (!includeMate(mate)) continue;
    const gap = restPoseMateGapFor(mate, byName, seen, toleranceMm, groups);
    if (gap !== undefined) out.push(gap);
  }
  return out;
}
