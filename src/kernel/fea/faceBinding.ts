// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/fea/faceBinding.ts
//
// Binds kernelCAD's face vocabulary to the mesh.
//
// The study says "hold the face at minX"; the mesher knows only its own surface
// tags. Rather than invent a naming convention that would have to survive the
// file handoff (the B-rep file does not carry kernelCAD's lineage names), we
// match on INVARIANTS the handoff preserves: a face's centre of mass and its area.
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
import { parseAnyTopologyInput } from '../naming/parseAnyTopologyInput';
import { evaluate } from '../naming/queryEvaluator';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { FaceQuery } from '../../shared/intent/queryTypes';
import type { FeaFaceSelector } from '../../shared/intent/feaStudyRecord';
import type { FeaSurface } from './types';

/** A kernelCAD face reduced to the two quantities that survive the file
 *  handoff, plus the ref used to name it in results. */
export interface FaceDescriptor {
  centroid: [number, number, number];
  area: number;
  ref: string;
}

/** Matching tolerances. Centroids are compared in mm against a tolerance
 *  scaled by the model size; areas are compared relatively. Both are loose
 *  enough for serialized float rounding and tight enough that two distinct
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

/** A bare face label ('bottom', 'top', 'wall'): read as withLabel. */
const BARE_LABEL = /^[A-Za-z_][\w-]*$/;

const fmt = (v: number): string => String(Math.round(v * 1000) / 1000);

/**
 * A bare label names ONE face — or one plane split into several faces (the
 * two feet of a bridge, which bind together). After a boolean, a canonical label is carried
 * by every face that inherited it ('top' on box.union(boss) is both the
 * shoulder at z=10 and the boss top at z=30), and a load spread across all
 * of them would be silently split. More than one match is an error that
 * lists the faces and the selectors that pick each one; the explicit Query
 * form keeps the bind-them-all meaning for a label that really is a set.
 */
function ambiguousBareLabel(label: string, faces: readonly FaceDescriptor[]): ResolveSelectorResult {
  const list = faces
    .map((f, i) => {
      const [x, y, z] = f.centroid.map(fmt);
      return `  ${i + 1}. centre [${x}, ${y}, ${z}], area ${fmt(f.area)} mm^2 -> { atX: ${x}, atY: ${y}, atZ: ${z} }`;
    })
    .join('\n');
  return {
    ok: false,
    ambiguous: true,
    faces: [...faces],
    error:
      `'${label}' is ambiguous: ${faces.length} faces carry that label on the built shape, so the selector would split ` +
      `the load or support across all of them:\n${list}\n` +
      'Pick one with a face query (the centre query above, or a single { atZ: <z> } / { atX: <x> } when it is unique) — or, to bind every one of them deliberately, ' +
      `write '@kcq[face(withLabel("${label}"))]'.`,
  };
}

/** Distance tolerance for "the same plane" (mm). */
const COPLANAR_TOL_MM = 1e-4;

/** Unit outward normal of a planar face, undefined for any other surface. */
function planeNormal(face: Face): [number, number, number] | undefined {
  if (face.geomType !== 'PLANE') return undefined;
  try {
    const n = face.normalAt();
    const len = Math.hypot(n.x, n.y, n.z);
    return len > 0 ? [n.x / len, n.y / len, n.z / len] : undefined;
  } catch {
    return undefined;
  }
}

/** Every matched face is planar, with the same outward normal, on one plane. */
function onePlane(allFaces: readonly Face[], matched: readonly FaceDescriptor[]): boolean {
  const faces = matched.map((d) => allFaces.find((f) => {
    const c = f.center;
    return Math.abs(c.x - d.centroid[0]) < CENTROID_TOL_MM && Math.abs(c.y - d.centroid[1]) < CENTROID_TOL_MM
      && Math.abs(c.z - d.centroid[2]) < CENTROID_TOL_MM;
  }));
  if (faces.some((f) => f === undefined)) return false;
  const normals = faces.map((f) => planeNormal(f!));
  const n0 = normals[0];
  if (n0 === undefined) return false;
  const offset = (d: FaceDescriptor): number => n0[0] * d.centroid[0] + n0[1] * d.centroid[1] + n0[2] * d.centroid[2];
  const o0 = offset(matched[0]);
  return normals.every((n, i) => n !== undefined
    && n[0] * n0[0] + n[1] * n0[1] + n[2] * n0[2] > 1 - 1e-9
    && Math.abs(offset(matched[i]) - o0) <= COPLANAR_TOL_MM);
}

/** Resolve a ref / Query string through the Query evaluator. */
function resolveByQuery(
  shape: OcctBackend,
  allFaces: readonly Face[],
  selector: string,
  query: string,
  ctx: { owner: string; records?: readonly FeatureRecord[] },
): ResolveSelectorResult {
  try {
    const hits = evaluate(parseAnyTopologyInput(query), {
      backend: shape,
      featureId: ctx.owner,
      ...(ctx.records !== undefined ? { records: ctx.records } : {}),
    });
    const hashes = new Set(hits.map(h => h.handle));
    const faces = allFaces.filter(f => hashes.has(faceHashOf(f)));
    if (faces.length === 0) return { ok: false, faces: [], error: `${selector} matched no face on the shape.` };
    return { ok: true, faces: faces.map(f => describe(f, selector)) };
  } catch (e) {
    return { ok: false, faces: [], error: `${selector} did not resolve: ${(e as Error).message}` };
  }
}

export interface ResolveSelectorResult {
  ok: boolean;
  /** The bound faces; on an ambiguous bare label, the candidates. */
  faces: FaceDescriptor[];
  /** Present when `ok` is false. */
  error?: string;
  /** A bare label matched more than one face (see ambiguousBareLabel). */
  ambiguous?: boolean;
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
    if (BARE_LABEL.test(selector)) {
      const r = resolveByQuery(shape, allFaces, selector, `@kcq[face(withLabel("${selector}"))]`, ctx);
      if (!r.ok || r.faces.length <= 1) return r;
      // Split faces of ONE plane (the two feet of a bridge, a bottom cut
      // by a slot) are one support: bind them together. Faces on different
      // planes or facing different ways are a real ambiguity.
      return onePlane(allFaces, r.faces) ? r : ambiguousBareLabel(selector, r.faces);
    }
    // An explicit Query string binds every face it selects.
    if (selector.startsWith('@kcq[')) return resolveByQuery(shape, allFaces, selector, selector, ctx);
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
      // The lineage resolver skips faces with no snapshot — every face of a
      // plain primitive — so '@kc[box_1/face/bottom]' missed on a box. The
      // Query evaluator reads the same lineage by feature + label.
      const viaQuery = resolveByQuery(shape, allFaces, selector, selector, ctx);
      return viaQuery.ok ? viaQuery : { ok: false, faces: [], error: `${selector} did not resolve: ${r.message}` };
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
 * Collect the mesh nodes (and surface triangles) of every surface matching
 * any of `faces`. Returns the node ids plus the surfaces that matched, so the
 * caller can tell a partial binding (2 of 3 declared faces found) from a
 * total one. A surface matched by two descriptors is counted once, so its
 * triangles never carry a load twice.
 */
export function nodesForFaces(
  surfaces: readonly FeaSurface[],
  faces: readonly FaceDescriptor[],
  scaleMm: number,
): {
  nodes: number[];
  tris: Array<readonly [number, number, number]>;
  matchedRefs: string[];
  unmatchedRefs: string[];
} {
  const nodes = new Set<number>();
  const seen = new Set<number>();
  const tris: Array<readonly [number, number, number]> = [];
  const matchedRefs: string[] = [];
  const unmatchedRefs: string[] = [];
  for (const face of faces) {
    const hits = surfaces.filter(s => surfaceMatches(s, face, scaleMm));
    if (hits.length === 0) {
      unmatchedRefs.push(face.ref);
      continue;
    }
    matchedRefs.push(face.ref);
    for (const s of hits) {
      for (const n of s.nodes) nodes.add(n);
      if (seen.has(s.tag)) continue;
      seen.add(s.tag);
      tris.push(...s.tris);
    }
  }
  return { nodes: [...nodes].sort((a, b) => a - b), tris, matchedRefs, unmatchedRefs };
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
