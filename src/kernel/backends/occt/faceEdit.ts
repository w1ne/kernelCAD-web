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
  const before = body.volume();
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bodyShape = (body.getReplicadShape() as any).wrapped;
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
  const after = volumeOf(oc, result.shape);
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
  const edgeMap = mergeEdges(body.edgeHistoryMap, result.edgeHistory, result.deletedEdges);
  return {
    backend: adopt(result.shape, faceMap, edgeMap, featureId),
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
 * extruded along its normal and fused or cut. The volume must match
 * area × distance. Anything else throws `FaceEditError`.
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
