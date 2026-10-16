// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// General edge-break geometry inspection; no machining/tool-diameter rules.
import { getOC, measureArea, type Edge, type Face } from 'replicad';
import type { OcctBackend } from './occtBackend';
import { MIN_ANGULAR_COVERAGE_RAD } from './holeDetection';
import { evalSurfaceProps } from './surfaceQuality';
import type { Vec3 } from '../../../shared/intent/types';

export interface EdgeBreakFace {
  faceIndex: number;
  kind: 'fillet' | 'chamfer';
  surfaceType: string;
  radiusMm: number | null;
  /** Tangent blend boundaries or the two chamfer rails; not strip end edges. */
  edgeIndices: number[];
}
export interface EdgeBreakEdge {
  edgeIndex: number;
  faceIndices: number[];
  kind: 'sharp' | 'smooth' | 'filleted' | 'chamfered' | 'unknown' | 'seam' | 'degenerate';
  side: 'external' | 'internal' | 'unknown';
  point: Vec3;
}
const dot = (a: Vec3, b: Vec3) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const vec = (p: { x: number; y: number; z: number }): Vec3 => [p.x, p.y, p.z];
const unit = (p: Vec3): Vec3 => { const n = Math.hypot(...p); return n > 1e-12 ? [p[0]/n,p[1]/n,p[2]/n] : [0,0,0]; };
const ANGLE_COS = Math.cos(1e-4 * Math.PI / 180);

/** Exact topology identity, including closed circles (endpoints are insufficient). */
function contains(face: Face, edge: Edge): Edge | undefined {
  return face.edges.find(e => e.isSame(edge));
}

function edgeNormals(edge: Edge, a: Face, b: Face): { smooth: boolean; side: EdgeBreakEdge['side'] } | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- installed OCCT API
  const oc = getOC() as any;
  const oriented = contains(a, edge);
  if (!oriented) return undefined;
  const reversed = oriented.wrapped.Orientation() === oc.TopAbs_Orientation.TopAbs_REVERSED;
  let smooth = true;
  const signs: number[] = [];
  try {
    for (const t of [0.2, 0.5, 0.8]) {
      const point = edge.pointAt(t);
      const na = a.normalAt(point).normalize();
      const nb = b.normalAt(point).normalize();
      const tangent = edge.tangentAt(t).normalize();
      try {
        const av = vec(na), bv = vec(nb);
        if (dot(av, bv) < ANGLE_COS) smooth = false;
        const sign = dot(cross(av, bv), vec(tangent)) * (reversed ? -1 : 1);
        if (Math.abs(sign) > 1e-6) signs.push(sign);
      } finally { point.delete(); na.delete(); nb.delete(); tangent.delete(); }
    }
  } catch { return undefined; }
  const side = !signs.length ? 'unknown' : signs.every(s => s > 0) ? 'external' : signs.every(s => s < 0) ? 'internal' : 'unknown';
  return { smooth, side };
}

/** Read existing analytic surface APIs; release all temporary OCCT handles. */
function analyticRadius(face: Face): number | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- installed OCCT API
  const oc = getOC() as any;
  const adaptor = new oc.BRepAdaptor_Surface(face.wrapped, true);
  try {
    const type = face.geomType;
    // Same angular-coverage exclusion as holeDetection: full bores/bosses
    // are not edge fillets even if their lips touch another blend.
    if (type === 'CYLINDRE' && adaptor.LastUParameter() - adaptor.FirstUParameter() >= MIN_ANGULAR_COVERAGE_RAD) return null;
    if (type === 'TORUS') {
      // A full minor circle is a tube/hoop, not an edge break.
      if (adaptor.LastVParameter() - adaptor.FirstVParameter() >= MIN_ANGULAR_COVERAGE_RAD) return null;
      // gp_Torus is unbound in the shipped build. V traverses its minor
      // circle: the existing fundamental-form evaluator gives 1/r directly.
      const props = evalSurfaceProps(face, (adaptor.FirstUParameter()+adaptor.LastUParameter())/2, (adaptor.FirstVParameter()+adaptor.LastVParameter())/2);
      const k = props?.normalCurvatureV;
      return k !== undefined && Math.abs(k) > 1e-12 ? 1/Math.abs(k) : null;
    }
    const surface = type === 'CYLINDRE' ? adaptor.Cylinder() : type === 'SPHERE' ? adaptor.Sphere() : null;
    if (!surface) return null;
    try { return surface.Radius(); }
    finally { surface.delete(); }
  } finally { adaptor.delete(); }
}

/** Blend rails follow cylinder V (axis) or torus U (major circle).
 * Lip blends on a sectioned boss must not turn its main cylinder into a fillet. */
function followsBlendRail(face: Face, edge: Edge): boolean {
  const p = edge.pointAt(0.5), tangent = edge.tangentAt(0.5).normalize();
  try {
    const uv = face.uvCoordinates(p);
    const props = evalSurfaceProps(face,uv[0],uv[1]);
    if (!props) return false;
    const rail = face.geomType === 'CYLINDRE' ? props.tangentV : props.tangentU;
    return Math.abs(dot(rail,vec(tangent))) > 0.999999;
  } catch { return false; }
  finally { p.delete(); tangent.delete(); }
}

function stripNormalBetween(n: Vec3, a: Vec3, b: Vec3): boolean {
  const ab = dot(a,b), na = dot(n,a), nb = dot(n,b);
  if (ab > 0.95 || ab < -0.95 || na <= 0 || nb <= 0 || na <= ab || nb <= ab) return false;
  return dot(n,unit([a[0]+b[0],a[1]+b[1],a[2]+b[2]])) >= 0.9;
}

function chamferRails(faceIndex: number, faces: Face[], edges: Edge[], records: EdgeBreakEdge[]): number[] {
  const face = faces[faceIndex];
  if (face.geomType !== 'PLANE') return [];
  const boundary = records.filter(e => e.faceIndices.includes(faceIndex));
  if (boundary.length !== 4 || boundary.some(e => e.faceIndices.length !== 2)) return [];
  const sorted = [...boundary].sort((a,b) => edges[b.edgeIndex].length - edges[a.edgeIndex].length);
  const rails = sorted.slice(0,2);
  const lengths = sorted.map(e => edges[e.edgeIndex].length);
  if (lengths[1] <= 2*lengths[2] || Math.abs(lengths[0]-lengths[1]) > 1e-5) return [];
  if (rails.some(e => e.kind !== 'sharp')) return [];
  const supports = rails.map(e => faces[e.faceIndices.find(f => f !== faceIndex)!]);
  if (supports.some(f => f.geomType !== 'PLANE' || measureArea(f) <= measureArea(face))) return [];
  const t0 = edges[rails[0].edgeIndex].tangentAt().normalize();
  const t1 = edges[rails[1].edgeIndex].tangentAt().normalize();
  const n = face.normalAt().normalize();
  const a = supports[0].normalAt().normalize(), b = supports[1].normalAt().normalize();
  try {
    if (Math.abs(dot(vec(t0),vec(t1))) < 0.999999) return [];
    // The strip normal lies between both support normals, excluding thin walls.
    if (!stripNormalBetween(vec(n),vec(a),vec(b))) return [];
    return rails.map(e => e.edgeIndex);
  } finally { t0.delete(); t1.delete(); n.delete(); a.delete(); b.delete(); }
}

/** Inspect a body's final BREP, independently of feature-history parameters. */
export function inspectEdgeBreaks(body: OcctBackend): { breaks: EdgeBreakFace[]; edges: EdgeBreakEdge[] } {
  const shape = body.getReplicadShape();
  const faces = shape.faces, edges = shape.edges;
  const records: EdgeBreakEdge[] = edges.map((edge, edgeIndex) => {
    const faceIndices = faces.flatMap((f,i) => contains(f,edge) ? [i] : []);
    const p = edge.pointAt(0.5);
    const point = vec(p); p.delete();
    if (faceIndices.length === 1) {
      // One adjacent face only: distinguish true periodic seams from open edges.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const oc = getOC() as any;
      const degenerate = oc.BRep_Tool.Degenerated(edge.wrapped);
      const seam = oc.BRep_Tool.IsClosed(edge.wrapped, faces[faceIndices[0]].wrapped);
      return { edgeIndex, faceIndices, point, kind: degenerate ? 'degenerate' : seam ? 'seam' : 'unknown', side: 'unknown' };
    }
    const normals = faceIndices.length === 2 ? edgeNormals(edge, faces[faceIndices[0]], faces[faceIndices[1]]) : undefined;
    return { edgeIndex, faceIndices, point, kind: normals ? (normals.smooth ? 'smooth' : 'sharp') : 'unknown', side: normals?.side ?? 'unknown' };
  });
  const breaks: EdgeBreakFace[] = [];
  faces.forEach((face, faceIndex) => {
    if (!['CYLINDRE','TORUS'].includes(face.geomType)) return;
    const radiusMm = analyticRadius(face);
    if (radiusMm === null) return;
    const tangentEdges = records.filter(e => e.kind === 'smooth' && e.faceIndices.includes(faceIndex));
    const rails = tangentEdges.filter(e => followsBlendRail(face,edges[e.edgeIndex]));
    const neighbours = new Set(rails.flatMap(e => e.faceIndices.filter(f => f !== faceIndex)));
    if (neighbours.size < 2) return;
    breaks.push({ faceIndex, kind: 'fillet', surfaceType: face.geomType, radiusMm, edgeIndices: tangentEdges.map(e => e.edgeIndex) });
  });
  // Spherical corner patches are junctions only when tangent to recognized blends.
  faces.forEach((face, faceIndex) => {
    if (face.geomType !== 'SPHERE') return;
    const tangentEdges = records.filter(e => e.kind === 'smooth' && e.faceIndices.includes(faceIndex));
    const supports = tangentEdges.filter(e => e.faceIndices.some(f => breaks.some(b => b.faceIndex === f)));
    if (supports.length >= 2) breaks.push({ faceIndex, kind: 'fillet', surfaceType: 'SPHERE', radiusMm: analyticRadius(face), edgeIndices: tangentEdges.map(e => e.edgeIndex) });
  });
  faces.forEach((_, faceIndex) => {
    const rails = chamferRails(faceIndex,faces,edges,records);
    if (rails.length) breaks.push({ faceIndex, kind: 'chamfer', surfaceType: 'PLANE', radiusMm: null, edgeIndices: rails });
  });
  // A smooth edge touching an unrecognized freeform face is unknown for radius
  // verification. Classify it BEFORE relabeling blend rails, so a recognized
  // fillet tangent to a freeform face cannot mark that edge as verified.
  for (const r of records) if (r.kind === 'smooth' && r.faceIndices.some(i => !['PLANE','CYLINDRE','TORUS','SPHERE','CONE'].includes(faces[i].geomType))) r.kind = 'unknown';
  for (const b of breaks) for (const i of b.edgeIndices) if (records[i].kind !== 'unknown') records[i].kind = b.kind === 'fillet' ? 'filleted' : 'chamfered';
  return { breaks, edges: records };
}
