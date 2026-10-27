// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as replicad from 'replicad';
import { getOC } from 'replicad';
import type { Face } from 'replicad';
import { OcctBackend } from './occtBackend';
import { booleanShapesWithHistory, mergeBooleanHistory } from './historyAwareBooleans';
import { isValidShape, volumeOf } from './booleanRecovery';
import { stampSolid } from '../../naming/operationLineage';
import type { EdgeHistoryMap, HistoryMap } from '../../naming/evolutionRecord';

/** OCCT refused a direct face edit instead of returning a body that is not the one asked for. */
export class FaceEditError extends Error {
  readonly code:
    | 'MOVE_FACES_NOT_ALONG_NORMAL'
    | 'FACE_EDIT_NOT_PLANAR'
    | 'FACE_EDIT_FAILED'
    | 'FACE_EDIT_INCONSISTENT'
    | 'FACE_EDIT_EMPTY';
  constructor(code: FaceEditError['code'], message: string) {
    super(message);
    this.name = 'FaceEditError';
    this.code = code;
  }
}

type Vec3 = [number, number, number];
type OC = ReturnType<typeof getOC>;

const HASH_UPPER = 2147483647;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const hashOf = (shape: unknown): string => (shape as any).HashCode(HASH_UPPER).toString(16);

function outwardNormal(oc: OC, face: unknown): Vec3 {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const topo = (oc as any).TopoDS.Face_1(face);
  const uMin = { current: 0 }, uMax = { current: 0 }, vMin = { current: 0 }, vMax = { current: 0 };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (oc as any).BRepTools.UVBounds_1(topo, uMin, uMax, vMin, vMax);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = new (oc as any).gp_Pnt_1();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const n = new (oc as any).gp_Vec_1();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props = new (oc as any).BRepGProp_Face_2(topo, false);
  try {
    props.Normal(0.5 * (uMin.current + uMax.current), 0.5 * (vMin.current + vMax.current), p, n);
    const len = n.Magnitude();
    if (!(len > 0)) throw new FaceEditError('FACE_EDIT_FAILED', 'the face has no normal at its centre');
    return [n.X() / len, n.Y() / len, n.Z() / len];
  } finally {
    for (const h of [p, n, props]) h.delete();
  }
}

function normalAt(oc: OC, face: unknown, u: number, v: number): Vec3 {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const topo = (oc as any).TopoDS.Face_1(face);
  const uMin = { current: 0 }, uMax = { current: 0 }, vMin = { current: 0 }, vMax = { current: 0 };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (oc as any).BRepTools.UVBounds_1(topo, uMin, uMax, vMin, vMax);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = new (oc as any).gp_Pnt_1();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const n = new (oc as any).gp_Vec_1();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props = new (oc as any).BRepGProp_Face_2(topo, false);
  try {
    const uu = uMin.current + u * (uMax.current - uMin.current);
    const vv = vMin.current + v * (vMax.current - vMin.current);
    props.Normal(uu, vv, p, n);
    const len = n.Magnitude();
    if (!(len > 0)) return [0, 0, 0];
    return [n.X() / len, n.Y() / len, n.Z() / len];
  } finally {
    for (const h of [p, n, props]) h.delete();
  }
}

function surfaceArea(oc: OC, face: unknown): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props = new (oc as any).GProp_GProps_1();
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (oc as any).BRepGProp.SurfaceProperties_1(face, props, false, false);
    return props.Mass();
  } finally {
    props.delete();
  }
}

function surfaceCenter(oc: OC, face: unknown): Vec3 {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props = new (oc as any).GProp_GProps_1();
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (oc as any).BRepGProp.SurfaceProperties_1(face, props, false, false);
    const centre = props.CentreOfMass();
    try {
      return [centre.X(), centre.Y(), centre.Z()];
    } finally {
      centre.delete();
    }
  } finally {
    props.delete();
  }
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

type SubKind = 'face' | 'edge';

function forEachSubshape(oc: OC, shape: unknown, kind: SubKind, visit: (sub: unknown) => void): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const o = oc as any;
  const type = kind === 'face' ? o.TopAbs_ShapeEnum.TopAbs_FACE : o.TopAbs_ShapeEnum.TopAbs_EDGE;
  const explorer = new o.TopExp_Explorer_2(shape, type, o.TopAbs_ShapeEnum.TopAbs_SHAPE);
  try {
    while (explorer.More()) {
      visit(explorer.Current());
      explorer.Next();
    }
  } finally {
    explorer.delete();
  }
}

function hashesOf(oc: OC, shape: unknown, kind: SubKind): string[] {
  const hashes: string[] = [];
  forEachSubshape(oc, shape, kind, (sub) => hashes.push(hashOf(sub)));
  return hashes;
}

interface FaceInfo {
  hash: string;
  normal: Vec3;
  center: Vec3;
  area: number;
}

interface EdgeInfo {
  hash: string;
  mid: Vec3;
  dir: Vec3;
  length: number;
}

function faceInfos(oc: OC, shape: unknown): FaceInfo[] {
  const out: FaceInfo[] = [];
  forEachSubshape(oc, shape, 'face', (face) => {
    let normal: Vec3 = [0, 0, 0];
    try {
      normal = outwardNormal(oc, face);
    } catch {
      // A face with no centre normal cannot be the image of a planar edit.
    }
    out.push({ hash: hashOf(face), normal, center: surfaceCenter(oc, face), area: surfaceArea(oc, face) });
  });
  return out;
}

function edgeInfos(oc: OC, shape: unknown): EdgeInfo[] {
  const out: EdgeInfo[] = [];
  forEachSubshape(oc, shape, 'edge', (sub) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const edge = (oc as any).TopoDS.Edge_1(sub);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const props = new (oc as any).GProp_GProps_1();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const curve = new (oc as any).BRepAdaptor_Curve_2(edge);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (oc as any).BRepGProp.LinearProperties(edge, props, false, false);
      const centre = props.CentreOfMass();
      const a = curve.Value(curve.FirstParameter());
      const b = curve.Value(curve.LastParameter());
      try {
        const raw: Vec3 = [b.X() - a.X(), b.Y() - a.Y(), b.Z() - a.Z()];
        const chord = Math.hypot(raw[0], raw[1], raw[2]);
        if (!(chord > 0)) return;
        out.push({
          hash: hashOf(edge),
          mid: [centre.X(), centre.Y(), centre.Z()],
          dir: [raw[0] / chord, raw[1] / chord, raw[2] / chord],
          length: props.Mass(),
        });
      } finally {
        centre.delete();
        a.delete();
        b.delete();
      }
    } finally {
      props.delete();
      curve.delete?.();
    }
  });
  return out;
}

/** Shortest candidate that can contain `old` (a merged face or edge is larger). */
function closestSupport<T extends { hash: string }>(
  old: T,
  candidates: readonly T[],
  same: (a: T, b: T) => boolean,
  size: (item: T) => number,
): T | undefined {
  let best: T | undefined;
  for (const candidate of candidates) {
    if (candidate.hash === old.hash || !same(old, candidate)) continue;
    if (!best || size(candidate) < size(best)) best = candidate;
  }
  return best;
}

function supportRemap<T extends { hash: string }>(
  before: readonly T[],
  after: readonly T[],
  same: (a: T, b: T) => boolean,
  size: (item: T) => number,
): Map<string, string> {
  const afterHashes = new Set(after.map((item) => item.hash));
  const remap = new Map<string, string>();
  for (const old of before) {
    if (afterHashes.has(old.hash)) continue;
    const match = closestSupport(old, after, same, size);
    if (match) remap.set(old.hash, match.hash);
  }
  return remap;
}

function samePlane(old: FaceInfo, neu: FaceInfo): boolean {
  if (dot(old.normal, neu.normal) <= 1 - 1e-4) return false;
  if (Math.abs(dot(sub(old.center, neu.center), neu.normal)) > 1e-4) return false;
  return neu.area + 1e-3 >= old.area;
}

/** An edge that meets the edited face and runs along its normal got longer, so
 * the face slid and its boundary moved. Extra faces are then a step. When no
 * such edge grows, the outline stayed and a gained face is a glued prism. */
function boundaryMoved(
  oc: OC,
  bodyShape: unknown,
  resultShape: unknown,
  origin: Vec3,
  normal: Vec3,
  distance: number,
): boolean {
  const before = edgeInfos(oc, bodyShape);
  const after = edgeInfos(oc, resultShape);
  const span = Math.abs(distance);
  return before.some((old) => {
    if (Math.abs(Math.abs(dot(old.dir, normal)) - 1) > 1e-4) return false;
    const half = old.length / 2;
    const ends: Vec3[] = [
      [old.mid[0] - old.dir[0] * half, old.mid[1] - old.dir[1] * half, old.mid[2] - old.dir[2] * half],
      [old.mid[0] + old.dir[0] * half, old.mid[1] + old.dir[1] * half, old.mid[2] + old.dir[2] * half],
    ];
    if (!ends.some((point) => Math.abs(dot(sub(point, origin), normal)) <= 1e-3)) return false;
    return after.some((neu) => {
      if (Math.abs(Math.abs(dot(old.dir, neu.dir)) - 1) > 1e-4) return false;
      const rel = sub(old.mid, neu.mid);
      const along = dot(rel, neu.dir);
      const off = Math.hypot(rel[0] - neu.dir[0] * along, rel[1] - neu.dir[1] * along, rel[2] - neu.dir[2] * along);
      if (off > 1e-3) return false;
      return neu.length > old.length + span * 0.5;
    });
  });
}

function sameEdge(old: EdgeInfo, neu: EdgeInfo): boolean {
  if (Math.abs(dot(old.dir, neu.dir)) <= 1 - 1e-4) return false;
  const rel = sub(old.mid, neu.mid);
  const along = dot(rel, neu.dir);
  const off = Math.hypot(rel[0] - neu.dir[0] * along, rel[1] - neu.dir[1] * along, rel[2] - neu.dir[2] * along);
  if (off > 1e-4) return false;
  if (Math.abs(along) > neu.length / 2 + 1e-4) return false;
  return neu.length + 1e-3 >= old.length;
}

interface SewnSolid {
  shape: unknown;
  faceRemap: Map<string, string>;
  edgeRemap: Map<string, string>;
  error?: string;
}

/**
 * `ShapeUpgrade_UnifySameDomain` with face unify did not finish in five minutes
 * on a large B-spline solid in this WASM build. Above this size, leave the
 * seams and let the face-count gate reject the edit.
 */
const MAX_COPLANAR_SEW_FACES = 256;

/**
 * Merge faces that the prism glued on as a coplanar seam.
 * Linear tolerance stays at 1e-6. The boolean's own SimplifyResult would pass
 * the exact fuse's fuzzy value, which is 0, and a 0 tolerance never treats two
 * distinct planes as one domain.
 */
function sewCoplanar(oc: OC, shape: unknown): SewnSolid {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let unify: any;
  try {
    const beforeFaces = faceInfos(oc, shape);
    if (beforeFaces.length > MAX_COPLANAR_SEW_FACES) {
      return { shape, faceRemap: new Map(), edgeRemap: new Map() };
    }
    const beforeEdges = edgeInfos(oc, shape);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    unify = new (oc as any).ShapeUpgrade_UnifySameDomain_2(shape, true, true, false);
    unify.SetLinearTolerance(1e-6);
    unify.SetAngularTolerance(1e-4);
    unify.AllowInternalEdges(false);
    unify.Build();
    const unified = unify.Shape();
    // Pin the result before the unifier is deleted. Shape() is a handle copy.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pinned = replicad.cast(unified as any) as { wrapped: unknown };
    const sewn = pinned.wrapped;
    return {
      shape: sewn,
      faceRemap: supportRemap(beforeFaces, faceInfos(oc, sewn), samePlane, (face) => face.area),
      edgeRemap: supportRemap(beforeEdges, edgeInfos(oc, sewn), sameEdge, (edge) => edge.length),
    };
  } catch (e) {
    return {
      shape,
      faceRemap: new Map(),
      edgeRemap: new Map(),
      error: e instanceof Error ? e.message : String(e),
    };
  } finally {
    unify?.delete?.();
  }
}

/** Point boolean children at the sewn face or edge, collapsing a seam split. */
function remapEvolution(
  history: Map<string, string[]>,
  remap: Map<string, string>,
): Map<string, string[]> {
  if (remap.size === 0) return history;
  const out = new Map<string, string[]>();
  const children = new Set<string>();
  for (const [input, kids] of history) {
    const mapped: string[] = [];
    const seen = new Set<string>();
    for (const kid of kids) {
      const next = remap.get(kid) ?? kid;
      children.add(kid);
      if (seen.has(next)) continue;
      seen.add(next);
      mapped.push(next);
    }
    out.set(input, mapped);
  }
  for (const [before, after] of remap) {
    if (!children.has(before) && !out.has(before)) out.set(before, [after]);
  }
  return out;
}

function keepLive<T>(map: Map<string, T>, live: readonly string[]): Map<string, T> {
  const keep = new Set(live);
  const out = new Map<string, T>();
  for (const [hash, lineage] of map) {
    if (keep.has(hash)) out.set(hash, lineage);
  }
  return out;
}

/** Result faces that sit on the plane `distance` mm along `normal` from `origin`. */
function facesOnOffsetPlane(oc: OC, shape: unknown, origin: Vec3, normal: Vec3, distance: number): string[] {
  const tol = Math.max(1e-4, Math.abs(distance) * 1e-6);
  const hits: string[] = [];
  for (const face of faceInfos(oc, shape)) {
    if (dot(face.normal, normal) <= 1 - 1e-4) continue;
    if (Math.abs(dot(sub(face.center, origin), normal) - distance) > tol) continue;
    hits.push(face.hash);
  }
  return hits;
}

function assertPlanar(oc: OC, face: unknown, op: string, geomType: string): Vec3 {
  const samples = [normalAt(oc, face, 0.5, 0.5), normalAt(oc, face, 0.2, 0.8), normalAt(oc, face, 0.8, 0.2)];
  const n = samples[0];
  const flat = samples.every((s) => {
    const dot = n[0] * s[0] + n[1] * s[1] + n[2] * s[2];
    return dot > 1 - 1e-6;
  });
  if (geomType === 'PLANE' && flat) return n;
  throw new FaceEditError(
    'FACE_EDIT_NOT_PLANAR',
    `${op}: this face is ${geomType || 'not a plane'}. OCCT moves a planar face along its normal ` +
      `(a prism of that face, fused or cut). A cylinder, cone, sphere or free-form face would change ` +
      `radius or be rebuilt differently, so this call stops. Select a planar face, or change the solid with a boolean.`,
  );
}

function distanceAlongNormal(by: Vec3, normal: Vec3): number {
  const along = by[0] * normal[0] + by[1] * normal[1] + by[2] * normal[2];
  const tang = Math.hypot(by[0] - normal[0] * along, by[1] - normal[1] * along, by[2] - normal[2] * along);
  const scale = Math.max(1e-6, 1e-4 * Math.hypot(by[0], by[1], by[2]));
  if (tang > scale) {
    const fmt = (v: Vec3) => v.map((n) => Number(n.toPrecision(4))).join(', ');
    throw new FaceEditError(
      'MOVE_FACES_NOT_ALONG_NORMAL',
      `moveFaces: displacement [${fmt(by)}] is not along the face normal [${fmt(normal)}]. ` +
        `Pass a vector parallel to that normal, or call offsetFaces(faces, distance) to move the face along its normal.`,
    );
  }
  return along;
}

function findFace(body: OcctBackend, hash: string): Face {
  const faces = (body.getReplicadShape() as unknown as { faces: Face[] }).faces;
  const found = faces.find((face) => hashOf((face as unknown as { wrapped: unknown }).wrapped) === hash);
  if (!found) {
    throw new FaceEditError(
      'FACE_EDIT_FAILED',
      'a selected face is not on the solid after an earlier face in this edit moved. Select one face, or faces that do not split each other.',
    );
  }
  return found;
}

function imageHash(hash: string, history: Map<string, string[]>): string {
  const kids = history.get(hash);
  if (!kids || kids.length === 0) return hash;
  if (kids.length === 1) return kids[0];
  throw new FaceEditError(
    'FACE_EDIT_FAILED',
    `a selected face split into ${kids.length} pieces. Offset one piece at a time.`,
  );
}

function adopt(
  raw: unknown,
  faces: HistoryMap | undefined,
  edges: EdgeHistoryMap | undefined,
  featureId: string,
): OcctBackend {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wrapped = replicad.cast(raw as any) as replicad.Shape3D;
  const probe = new OcctBackend(wrapped);
  const stamped = stampSolid(faces, probe.faceHashes(), edges, probe.edgeHashes(), featureId);
  const out = new OcctBackend(wrapped, undefined, stamped.historyMap);
  out.edgeHistoryMap = stamped.edgeHistoryMap;
  return out;
}

function offsetOne(
  body: OcctBackend,
  face: Face,
  distance: number,
  featureId: string,
): { backend: OcctBackend; history: Map<string, string[]> } {
  const oc = getOC();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const topo = (face as any).wrapped as unknown;
  const normal = outwardNormal(oc, topo);
  const area = surfaceArea(oc, topo);
  if (!(area > 0)) throw new FaceEditError('FACE_EDIT_FAILED', 'the selected face has no area');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bodyShape = (body.getReplicadShape() as any).wrapped;
  const origin = surfaceCenter(oc, topo);
  const consumed = body.historyMap?.get(hashOf(topo));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dir = new (oc as any).gp_Vec_4(normal[0] * distance, normal[1] * distance, normal[2] * distance);
  // Positive distance follows the outward normal: the prism is fused on.
  // Negative distance runs into the material: the prism is cut away.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prism = new (oc as any).BRepPrimAPI_MakePrism_1(topo, dir, true, true);
  let tool: unknown;
  try {
    if (!prism.IsDone()) throw new FaceEditError('FACE_EDIT_FAILED', 'OCCT could not extrude the selected face');
    tool = prism.Shape();
  } finally {
    dir.delete();
    prism.delete();
  }
  let result;
  try {
    result = booleanShapesWithHistory(bodyShape, [tool], distance > 0 ? 'fuse' : 'cut');
  } catch (e) {
    throw new FaceEditError(
      'FACE_EDIT_FAILED',
      `OCCT could not ${distance > 0 ? 'add' : 'remove'} the face prism: ${e instanceof Error ? e.message : String(e)}. ` +
        `Use a smaller distance, or build the change as a boolean.`,
    );
  }
  if (!isValidShape(oc, result.shape)) {
    throw new FaceEditError(
      'FACE_EDIT_FAILED',
      'OCCT built a solid that fails its topology check. Use a smaller distance, or build the change as a boolean.',
    );
  }
  const sewn = sewCoplanar(oc, result.shape);
  result = {
    ...result,
    shape: sewn.shape,
    faceHistory: remapEvolution(result.faceHistory, sewn.faceRemap),
    edgeHistory: remapEvolution(result.edgeHistory, sewn.edgeRemap),
  };
  if (!isValidShape(oc, result.shape)) {
    throw new FaceEditError(
      'FACE_EDIT_FAILED',
      'OCCT built a solid that fails its topology check after sewing coplanar faces. Use a smaller distance, or build the change as a boolean.',
    );
  }
  const faceHashes = hashesOf(oc, result.shape, 'face');
  const after = volumeOf(oc, result.shape);
  // An empty cut has volume 0, and area × distance is 0 too. Reject before that comparison.
  if (faceHashes.length === 0 || !(after > 0)) {
    throw new FaceEditError(
      'FACE_EDIT_FAILED',
      `moving this face by ${distance} mm removed the solid. Use a smaller distance so some material remains.`,
    );
  }
  // The prism sew also merges coplanar seams the input still carried.
  // Compare with that same unify, and measure area × distance from it.
  const baseline = sewCoplanar(oc, bodyShape);
  const beforeFaces = hashesOf(oc, baseline.shape, 'face').length;
  const before = volumeOf(oc, baseline.shape);
  if (faceHashes.length !== beforeFaces) {
    const sewNotes = [sewn.error, baseline.error].filter((note): note is string => Boolean(note));
    const sewNote = sewNotes.length ? ` Sewing coplanar faces failed: ${sewNotes.join(' ')}.` : '';
    const glued = faceHashes.length > beforeFaces && !boundaryMoved(oc, bodyShape, result.shape, origin, normal, distance)
      ? ' A gained face means a glued prism was added instead of the neighbouring faces extending.'
      : '';
    throw new FaceEditError(
      'FACE_EDIT_INCONSISTENT',
      `moving this face by ${distance} mm left ${faceHashes.length} faces; the sewn solid had ${beforeFaces}. ` +
        `The face count changed against the sewn solid.${glued} ` +
        `Pick a face whose boundary can move with it, or build the change as a boolean.${sewNote}`,
    );
  }
  const landed = facesOnOffsetPlane(oc, result.shape, origin, normal, distance);
  if (landed.length !== 1) {
    throw new FaceEditError(
      'FACE_EDIT_INCONSISTENT',
      `moving this face by ${distance} mm did not leave it on the plane ${distance} mm along its outward normal ` +
        `(found ${landed.length} faces there). The face did not slide along its normal.`,
    );
  }
  const expected = before + area * distance;
  const tol = Math.max(1e-4, Math.abs(expected) * 1e-3);
  if (Math.abs(after - expected) > tol) {
    throw new FaceEditError(
      'FACE_EDIT_INCONSISTENT',
      `moving this face by ${distance} mm would change the volume by ${area * distance} mm³ ` +
        `(face area ${area} mm²), but OCCT produced ${after - before} mm³. ` +
        `The face did not slide along its normal. Pick a face whose boundary can move with it, or use a smaller distance.`,
    );
  }
  const faceMap = mergeBooleanHistory(body.historyMap, undefined, result);
  // The prism consumes the selected face. The face on the offset plane is that face, moved.
  if (consumed) faceMap.set(landed[0], consumed);
  const edgeMap = keepLive(
    mergeEdges(body.edgeHistoryMap, result.edgeHistory, result.deletedEdges),
    hashesOf(oc, result.shape, 'edge'),
  );
  return {
    backend: adopt(result.shape, keepLive(faceMap, faceHashes), edgeMap, featureId),
    history: result.faceHistory,
  };
}

function mergeEdges(
  input: EdgeHistoryMap | undefined,
  history: Map<string, string[]>,
  deleted: Set<string>,
): EdgeHistoryMap {
  const out: EdgeHistoryMap = new Map();
  if (!input) return out;
  for (const [hash, lineage] of input) {
    if (deleted.has(hash)) continue;
    const children = history.get(hash);
    if (children && children.length > 0) {
      for (const child of children) if (!out.has(child)) out.set(child, lineage);
    } else if (!out.has(hash)) out.set(hash, lineage);
  }
  return out;
}

export interface PlanarFaceEdit {
  face: Face;
  /** Set for offsetFaces. Positive moves the face along its outward normal. */
  distance?: number;
  /** Set for moveFaces. Must be parallel to the face normal. */
  by?: Vec3;
}

/**
 * Move planar faces along their outward normals. `BRepOffset_MakeOffset`
 * (per-face offset values) is not in this OCCT build, so each planar face is
 * extruded along its normal and fused or cut. Coplanar faces are then sewn.
 * The face count must match the input after the same coplanar sew, the moved
 * face must lie on the offset plane, the solid must stay non-empty, and the
 * volume change must match area × distance against that sewn solid. Anything
 * else throws `FaceEditError`.
 */
export function editPlanarFaces(
  body: OcctBackend,
  edits: readonly PlanarFaceEdit[],
  featureId: string,
  op: 'moveFaces' | 'offsetFaces',
): OcctBackend {
  if (edits.length === 0) {
    throw new FaceEditError('FACE_EDIT_EMPTY', `${op}: select at least one face.`);
  }
  const oc = getOC();
  const pending = edits.map((edit) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const topo = (edit.face as any).wrapped as unknown;
    const geomType = String((edit.face as { geomType?: string }).geomType ?? '');
    const normal = assertPlanar(oc, topo, op, geomType);
    const distance = edit.by ? distanceAlongNormal(edit.by, normal) : edit.distance;
    if (distance === undefined || !Number.isFinite(distance)) {
      throw new FaceEditError('FACE_EDIT_FAILED', `${op}: distance must be a finite number.`);
    }
    return { hash: hashOf(topo), distance };
  });
  let current = body;
  for (const step of pending) {
    if (Math.abs(step.distance) <= 1e-9) continue;
    const face = findFace(current, step.hash);
    const { backend, history } = offsetOne(current, face, step.distance, featureId);
    for (const other of pending) other.hash = imageHash(other.hash, history);
    current = backend;
  }
  if (current === body) {
    const clone = body.clone();
    const stamped = stampSolid(body.historyMap, clone.faceHashes(), body.edgeHistoryMap, clone.edgeHashes(), featureId);
    const out = new OcctBackend(clone.getReplicadShape(), body.kind, stamped.historyMap);
    out.edgeHistoryMap = stamped.edgeHistoryMap;
    return out;
  }
  return current;
}
