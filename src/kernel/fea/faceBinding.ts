// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/fea/faceBinding.ts
//
// Binds kernelCAD's face vocabulary to the mesh.
//
// The study says "hold the face at minX"; the mesher knows only STEP surface
// tags. Rather than invent a naming convention that would have to survive the
// STEP round-trip (STEP does not carry kernelCAD's lineage names), we match on
// INVARIANTS the round-trip preserves: a face's centre of mass and its area.
// Both are computed by OCCT on the kernelCAD side and by OCC inside gmsh on
// the other side, from the same B-rep — so they agree to numerical noise.
//
// Running the same match over EVERY surface (not just the declared ones) is
// what lets the summary report hot spots as `@kc[...]` region refs instead of
// node numbers, which is the difference between an agent knowing "there is a
// stress riser" and knowing "the fillet at the boot face is the stress riser".

import { measureArea, type Face } from 'replicad';
import { resolveFaceQuery } from '../backends/occt/edgeQueries';
import type { OcctBackend } from '../backends/occt/occtBackend';
import { formatTopoRef, parseTopoRef, resolveTopoRef } from '../naming';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { FaceQuery } from '../../shared/intent/queryTypes';
import type { FeaFaceSelector } from '../../shared/intent/feaStudyRecord';
import type { FeaSurface } from './types';

/** A kernelCAD face reduced to the two quantities that survive a STEP
 *  round-trip, plus the ref used to name it in results. */
export interface FaceDescriptor {
  centroid: [number, number, number];
  area: number;
  ref: string;
}

/** Matching tolerances. Centroids are compared in mm against a tolerance
 *  scaled by the model size; areas are compared relatively. Both are loose
 *  enough for STEP's ASCII float rounding and tight enough that two distinct
 *  faces of a real part never collide. */
export const CENTROID_TOL_MM = 1e-3;
export const AREA_REL_TOL = 1e-4;

/** OCCT hash of a replicad Face — same convention as `edgeSelection.faceByHash`
 *  and `listFaces`, so hashes taken here line up with the ones the topo-ref
 *  resolver returns. */
function faceHashOf(face: Face): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wrapped = (face as any).wrapped;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (wrapped as any).HashCode(2147483647).toString(16);
}

/** Face area via OCCT's GProp surface properties. `Face.area` on the
 *  replicad wrapper is not a plain property (it lives on the physical-
 *  properties object), so reading it directly yields undefined — and an area
 *  of 0 would make every surface match fail silently, which is exactly the
 *  kind of quiet wrong answer this module exists to prevent. */
function areaOf(face: Face): number {
  try {
    const a = measureArea(face);
    return Number.isFinite(a) ? a : 0;
  } catch {
    return 0;
  }
}

function describe(face: Face, ref: string): FaceDescriptor {
  const c = face.center;
  return { centroid: [c.x, c.y, c.z], area: areaOf(face), ref };
}

export interface ResolveSelectorResult {
  ok: boolean;
  faces: FaceDescriptor[];
  /** Present when `ok` is false. */
  error?: string;
}

/**
 * Resolve one study selector (a `FaceQuery` or a `@kc[...]` ref string) to
 * face descriptors on the built shape.
 *
 * An empty match is a FAILURE, not an empty set: a study whose fixed face
 * resolved to nothing would solve an unconstrained part, and a study whose
 * load face resolved to nothing would report a pass on an unloaded part.
 */
export function resolveSelector(
  shape: OcctBackend,
  selector: FeaFaceSelector,
  ctx: { owner: string; records?: readonly FeatureRecord[] },
): ResolveSelectorResult {
  const allFaces = (shape.getReplicadShape() as unknown as { faces: Face[] }).faces;

  if (typeof selector === 'string') {
    const parsed = parseTopoRef(selector);
    if ('error' in parsed) {
      return { ok: false, faces: [], error: `could not parse topology ref '${selector}': ${parsed.error}` };
    }
    const r = resolveTopoRef(parsed, {
      currentShape: shape,
      featureId: ctx.owner,
      ...(ctx.records !== undefined ? { records: ctx.records } : {}),
    });
    if (r.kind !== 'ok') {
      return { ok: false, faces: [], error: `${selector} did not resolve: ${r.message}` };
    }
    const match = allFaces.find(f => faceHashOf(f) === r.entityHash);
    if (match === undefined) {
      return { ok: false, faces: [], error: `${selector} resolved to a hash with no matching face on the built shape.` };
    }
    return { ok: true, faces: [describe(match, selector)] };
  }

  const matched = resolveFaceQuery(shape, selector as FaceQuery);
  if (matched.length === 0) {
    return {
      ok: false,
      faces: [],
      error: `face query ${JSON.stringify(selector)} matched no face on the shape.`,
    };
  }
  const hashes = allFaces.map(faceHashOf);
  return {
    ok: true,
    faces: matched.map(f => {
      const idx = hashes.indexOf(faceHashOf(f));
      return describe(f, formatTopoRef({ owner: ctx.owner, kind: 'face', segments: [`f${idx >= 0 ? idx : 0}`] }));
    }),
  };
}

/** Descriptors for EVERY face of the shape, used to name hot-spot regions. */
export function describeAllFaces(shape: OcctBackend, owner: string): FaceDescriptor[] {
  const allFaces = (shape.getReplicadShape() as unknown as { faces: Face[] }).faces;
  return allFaces.map((f, i) =>
    describe(f, formatTopoRef({ owner, kind: 'face', segments: [`f${i}`] })),
  );
}

/** Distance-and-area match between a kernelCAD face and a meshed surface. */
export function surfaceMatches(surface: FeaSurface, face: FaceDescriptor, scaleMm: number): boolean {
  const tol = Math.max(CENTROID_TOL_MM, scaleMm * 1e-5);
  const d = Math.hypot(
    surface.centroid[0] - face.centroid[0],
    surface.centroid[1] - face.centroid[1],
    surface.centroid[2] - face.centroid[2],
  );
  if (d > tol) return false;
  const denom = Math.max(Math.abs(face.area), Math.abs(surface.area), 1e-9);
  return Math.abs(surface.area - face.area) / denom <= Math.max(AREA_REL_TOL, 1e-3);
}

/**
 * Collect the mesh nodes of every surface matching any of `faces`.
 * Returns the node ids plus the surfaces that matched, so the caller can tell
 * a partial binding (2 of 3 declared faces found) from a total one.
 */
export function nodesForFaces(
  surfaces: readonly FeaSurface[],
  faces: readonly FaceDescriptor[],
  scaleMm: number,
): { nodes: number[]; matchedRefs: string[]; unmatchedRefs: string[] } {
  const nodes = new Set<number>();
  const matchedRefs: string[] = [];
  const unmatchedRefs: string[] = [];
  for (const face of faces) {
    const hits = surfaces.filter(s => surfaceMatches(s, face, scaleMm));
    if (hits.length === 0) {
      unmatchedRefs.push(face.ref);
      continue;
    }
    matchedRefs.push(face.ref);
    for (const s of hits) for (const n of s.nodes) nodes.add(n);
  }
  return { nodes: [...nodes].sort((a, b) => a - b), matchedRefs, unmatchedRefs };
}

/** Label each meshed surface with the kernelCAD face ref it corresponds to,
 *  where one exists. Surfaces with no counterpart keep a `surface#<tag>` name
 *  rather than being dropped — a hot spot on an unnamed surface still needs
 *  reporting. */
export function labelSurfaces(
  surfaces: readonly FeaSurface[],
  faces: readonly FaceDescriptor[],
  scaleMm: number,
): FeaSurface[] {
  return surfaces.map(s => {
    const hit = faces.find(f => surfaceMatches(s, f, scaleMm));
    return hit !== undefined ? { ...s, ref: hit.ref } : { ...s };
  });
}
