// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/backends/occt/holeLowerer.ts
//
// Lowering for `Shape.hole(face, opts)` / `Shape.holes(face, opts)`.
//
// Pipeline (per spec §B.2):
//   1. Resolve the entry face via the existing FaceSelector resolver.
//   2. Compute a bore frame: { entryPoint, axisIntoBody, depth, ... }.
//   3. Build the tool geometry — cylinder + optional cb cylinder + optional
//      csk cone — fused into one solid.
//   4. cutWithHistory(target, tool) → the post-boolean result.
//   5. Walk the result's new faces, classify each via createdFaceTracker,
//      and attach `labelName` entries to the result HistoryMap so downstream
//      face-by-label resolution finds them.
//
// Diagnostics use only the 26-code catalog from milestone C; per-trigger
// recovery information lives in the `hint` field.

import * as replicad from 'replicad';
import type { Face } from 'replicad';
import { OcctBackend } from './occtBackend';
import { pickFace } from './edgeSelection';
import { assertBooleanSucceeded, cutWithHistory, fuseWithHistory, mergeBooleanHistory } from './historyAwareBooleans';
import { resolveFaceQuery } from './edgeQueries';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import type { Vec3 } from '../../../shared/intent/types';
import type { FaceHash, HistoryMap } from '../../naming/evolutionRecord';
import { classifyHoleFace, type BoreFrame, type HoleRefName } from './holeClassifier';
import {
  applyCreatedRefs,
  captureAllFaceSnapshots,
  refreshSnapshots,
  faceHashOf,
  surfaceTypeOf,
  type CreatedRefSpec,
} from './createdRefs';
import type { FeatureKind } from '../../../shared/intent/types';
import { HelicalSweepArgsError, polygonWireXY, sweepProfileAlongHelix } from './helicalSweep';
import { isoInternalGrooveProfile, isoMinorRadius, profileHalfExtent } from './isoThread';

export interface HoleLowerResult {
  backend: OcctBackend;
  diagnostics: CompilerDiagnostic[];
}

interface ResolvedEntry {
  face: Face;
  centroid: Vec3;
  normalOutward: Vec3;
  axisIntoBody: Vec3;
  uBasis: Vec3;
  vBasis: Vec3;
}

function vecOf(p: { x: number; y: number; z: number }): Vec3 {
  return [p.x, p.y, p.z];
}

function normalize(v: Vec3): Vec3 {
  const len = Math.hypot(v[0], v[1], v[2]);
  if (len < 1e-9) return [0, 0, 1];
  return [v[0] / len, v[1] / len, v[2] / len];
}

function add(a: Vec3, b: Vec3): Vec3 { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function scale(v: Vec3, s: number): Vec3 { return [v[0] * s, v[1] * s, v[2] * s]; }
function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}
function dot(a: Vec3, b: Vec3): number { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function neg(v: Vec3): Vec3 { return [-v[0], -v[1], -v[2]]; }

/** Build a (u, v) basis on the entry face. For canonical faces aligned with
 *  world axes, prefer matching (u, v) to the natural world axes (e.g. 'top'
 *  face → u=X, v=Y) so agent intuition holds. For non-cardinal faces, derive
 *  (u, v) from the normal via the standard "pick a non-parallel reference
 *  vector" procedure. */
function buildUvBasis(normalOutward: Vec3): { uBasis: Vec3; vBasis: Vec3 } {
  const n = normalize(normalOutward);
  // Recognize axis-aligned normals (within ~1°) and emit world-aligned bases.
  const X: Vec3 = [1, 0, 0], Y: Vec3 = [0, 1, 0], Z: Vec3 = [0, 0, 1];
  const TOL = 0.999;
  if (Math.abs(dot(n, Z)) > TOL) return { uBasis: X, vBasis: Y };       // top / bottom
  if (Math.abs(dot(n, X)) > TOL) return { uBasis: Y, vBasis: Z };       // left / right
  if (Math.abs(dot(n, Y)) > TOL) return { uBasis: X, vBasis: Z };       // front / back
  // Non-cardinal: pick a reference not parallel to n.
  const ref: Vec3 = Math.abs(dot(n, Z)) < 0.9 ? Z : X;
  const u = normalize(cross(ref, n));
  const v = cross(n, u);
  return { uBasis: u, vBasis: v };
}

function resolveEntry(
  feature: FeatureRecord,
  target: OcctBackend,
  records: readonly FeatureRecord[] | undefined,
): ResolvedEntry | { error: CompilerDiagnostic } {
  const faceResult = pickFace(feature, target, records);
  if ('error' in faceResult) return faceResult;
  const face = faceResult;
  const centroid = vecOf(face.center);
  // replicad Face exposes normalAt(); for planar faces this is constant.
  // Some replicad face implementations expose `.normalAt()` returning a
  // Vector with .x/.y/.z. Defensive: read x/y/z fields.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nRaw = (face as any).normalAt
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? (face as any).normalAt() as { x: number; y: number; z: number }
    : { x: 0, y: 0, z: 1 };
  const normalOutward = normalize([nRaw.x, nRaw.y, nRaw.z]);
  const axisIntoBody = neg(normalOutward);
  const { uBasis, vBasis } = buildUvBasis(normalOutward);
  return { face, centroid, normalOutward, axisIntoBody, uBasis, vBasis };
}

/** Compute the world-space distance from `entryPoint` along `axisIntoBody`
 *  to the back face on the same axis. Uses FaceQuery.byNormal (anti-parallel
 *  to the entry normal) to find candidate faces, then picks the one whose
 *  center is along the bore axis (within bore radius). */
function deriveThroughDepth(
  target: OcctBackend,
  entry: ResolvedEntry,
  boreDiameter: number,
  featureId: string,
): number | { error: CompilerDiagnostic } {
  // Map outward normal to a cardinal axis label for byNormal. For non-cardinal,
  // fall back to a bbox-based estimate (slice-1 limitation).
  const n = entry.normalOutward;
  const X = Math.abs(n[0]), Y = Math.abs(n[1]), Z = Math.abs(n[2]);
  let antiAxis: 'X' | '-X' | 'Y' | '-Y' | 'Z' | '-Z' | null = null;
  if (Z > 0.99) antiAxis = n[2] > 0 ? '-Z' : 'Z';
  else if (X > 0.99) antiAxis = n[0] > 0 ? '-X' : 'X';
  else if (Y > 0.99) antiAxis = n[1] > 0 ? '-Y' : 'Y';

  if (antiAxis !== null) {
    const candidates = resolveFaceQuery(target, { byNormal: antiAxis });
    // Filter to faces along the bore axis (centroid distance to axis < boreRadius).
    const boreRadius = boreDiameter / 2;
    const eligible = candidates.filter(c => {
      const cv = vecOf(c.center);
      const d = cv;
      const along = dot([d[0] - entry.centroid[0], d[1] - entry.centroid[1], d[2] - entry.centroid[2]], entry.axisIntoBody);
      // perpendicular distance from axis
      const perp: Vec3 = [
        d[0] - entry.centroid[0] - along * entry.axisIntoBody[0],
        d[1] - entry.centroid[1] - along * entry.axisIntoBody[1],
        d[2] - entry.centroid[2] - along * entry.axisIntoBody[2],
      ];
      const perpLen = Math.hypot(perp[0], perp[1], perp[2]);
      return along > 0 && perpLen < boreRadius + 1.0; // allow 1 mm tolerance for back-face overhang
    });
    if (eligible.length === 0) {
      return {
        error: {
          target: 'export-occt',
          code: 'feature.hole.no-target-face',
          featureId,
          severity: 'error',
          message: `'through' requested but no back face was found on the bore axis.`,
          hint: "The hole entry face matched, but no body sits along the bore axis to drill into. Pick an entry face on a different body, or verify the target body extends along the bore axis.",
        },
      };
    }
    // Pick the closest along the axis.
    eligible.sort((a, b) => {
      const da = dot([a.center.x - entry.centroid[0], a.center.y - entry.centroid[1], a.center.z - entry.centroid[2]], entry.axisIntoBody);
      const db = dot([b.center.x - entry.centroid[0], b.center.y - entry.centroid[1], b.center.z - entry.centroid[2]], entry.axisIntoBody);
      return da - db;
    });
    const back = eligible[0];
    return dot(
      [back.center.x - entry.centroid[0], back.center.y - entry.centroid[1], back.center.z - entry.centroid[2]],
      entry.axisIntoBody,
    );
  }

  // Non-cardinal entry — fall back to body bbox extent along the axis.
  const bb = target.boundingBox();
  const corners: Vec3[] = [
    [bb.min[0], bb.min[1], bb.min[2]], [bb.max[0], bb.min[1], bb.min[2]],
    [bb.min[0], bb.max[1], bb.min[2]], [bb.max[0], bb.max[1], bb.min[2]],
    [bb.min[0], bb.min[1], bb.max[2]], [bb.max[0], bb.min[1], bb.max[2]],
    [bb.min[0], bb.max[1], bb.max[2]], [bb.max[0], bb.max[1], bb.max[2]],
  ];
  let maxAlong = 0;
  for (const c of corners) {
    const d: Vec3 = [c[0] - entry.centroid[0], c[1] - entry.centroid[1], c[2] - entry.centroid[2]];
    const along = dot(d, entry.axisIntoBody);
    if (along > maxAlong) maxAlong = along;
  }
  if (maxAlong <= 0) {
    return {
      error: {
        target: 'export-occt',
        code: 'feature.kernel-failed',
        featureId,
        severity: 'error',
        message: `'through' requested but the bore axis does not enter the body.`,
        hint: "'through' requested but the tool axis didn't intersect any back face. Pass an explicit upToFace, or verify the body isn't shelled away on the exit side.",
      },
    };
  }
  return maxAlong;
}

interface OneToolBuild {
  tool: replicad.Shape3D;
  bore: BoreFrame;
}

/**
 * Fuse two tool solids WITHOUT replicad's `SimplifyResult` pass. On a tool
 * carrying helical thread faces that pass (UnifySameDomain with history) runs
 * for minutes; the unsimplified fuse is the same solid, and the tool is
 * consumed by one cut straight away.
 */
function fuseUnsimplified(a: replicad.Shape3D, b: replicad.Shape3D): replicad.Shape3D {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = (replicad as any).getOC();
  const progress = new oc.Message_ProgressRange_1();
  const fuse = new oc.BRepAlgoAPI_Fuse_1();
  const args = new oc.TopTools_ListOfShape_1();
  const tools = new oc.TopTools_ListOfShape_1();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args.Append_1((a as any).wrapped);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools.Append_1((b as any).wrapped);
  fuse.SetArguments(args);
  fuse.SetTools(tools);
  fuse.Build(progress);
  try {
    assertBooleanSucceeded(fuse, 'thread-tool fuse');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return replicad.cast(fuse.Shape()) as any as replicad.Shape3D;
  } finally {
    fuse.delete(); args.delete(); tools.delete(); progress.delete();
  }
}

/** Thread params read back from a hole record (already pre-resolved). */
interface ThreadParams {
  pitch: number;
  clearance: number;
  modeled: boolean;
}

function readThread(feature: FeatureRecord): ThreadParams | undefined {
  const p = feature.params.threadPitch;
  if (p === undefined) return undefined;
  return {
    pitch: p.evaluated,
    clearance: feature.params.threadClearance?.evaluated ?? 0,
    modeled: (feature.params.threadModeled?.evaluated ?? 0) > 0.5,
  };
}

/** Diameter actually drilled: the ISO minor diameter (plus clearance) for a
 *  threaded hole, the authored diameter otherwise. */
function drilledDiameter(nominal: number, thread: ThreadParams | undefined): number {
  if (thread === undefined) return nominal;
  return 2 * (isoMinorRadius(nominal, thread.pitch) + thread.clearance);
}

/**
 * The internal thread groove for one bore: the ISO basic groove (grown by the
 * clearance) swept along an exact right-hand helix about the bore axis. The
 * groove centre crosses the entry face at the face's u direction; it starts
 * one pitch outside the entry face and runs one pitch past a through hole's
 * exit, or stops short of a blind hole's floor.
 */
function buildThreadGroove(
  entryPoint: Vec3,
  axisIntoBody: Vec3,
  uBasis: Vec3,
  nominalDiameter: number,
  effectiveDepth: number,
  through: boolean,
  thread: ThreadParams,
): replicad.Shape3D {
  const P = thread.pitch;
  const profile = isoInternalGrooveProfile(nominalDiameter, P, thread.clearance);
  const helixRadius = isoMinorRadius(nominalDiameter, P) + thread.clearance;
  // Right-handed frame: refDir × normalDir = axis.
  const normalDir = cross(axisIntoBody, uBasis);
  const endAxial = through ? effectiveDepth + P : effectiveDepth - profileHalfExtent(profile) - 0.02 * P;
  const startAxial = -P;
  const solid = sweepProfileAlongHelix(polygonWireXY(profile), {
    origin: add(entryPoint, scale(axisIntoBody, startAxial)),
    axis: axisIntoBody,
    refDir: uBasis,
    normalDir,
    radius: helixRadius,
    pitch: P,
    turns: (endAxial - startAxial) / P,
    // startAxial is a whole number of pitches before the entry face, so angle
    // 0 at the start puts the groove centre on uBasis at the entry face too.
    startAngle: 0,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return replicad.cast(solid as any) as replicad.Shape3D;
}

/** Build the tool solid for one bore at (u, v) on the entry frame. */
function buildOneTool(
  entry: ResolvedEntry,
  u: number,
  v: number,
  diameter: number,
  numericDepth: number | undefined,
  through: boolean,
  throughDepth: number,
  counterbore: { diameter: number; depth: number } | undefined,
  countersink: { diameter: number; angleDeg: number } | undefined,
  thread?: { params: ThreadParams; nominalDiameter: number },
): OneToolBuild {
  const entryPoint: Vec3 = add(
    entry.centroid,
    add(scale(entry.uBasis, u), scale(entry.vBasis, v)),
  );
  const effectiveDepth = through ? throughDepth : (numericDepth ?? 0);

  // Bore length: extend slightly past the floor / back plane so the boolean
  // cleanly cuts through (avoid degenerate coplanar ops).
  const OVERSHOOT = 0.01;
  const cylinderLength = effectiveDepth + OVERSHOOT * 2;

  // Position the cylinder so its base sits OVERSHOOT above the entry plane,
  // extending into the body for `cylinderLength`.
  const cylinderBase = add(entryPoint, scale(entry.axisIntoBody, -OVERSHOOT));
  // Replicad's `makeCylinder(radius, height, location?, direction?)` treats
  // location as the base center and direction as the cylinder axis (unit
  // vector). Both Point arguments accept Vec3-shape arrays.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tool = (replicad as any).makeCylinder(
    diameter / 2,
    cylinderLength,
    cylinderBase,
    entry.axisIntoBody,
  ) as replicad.Shape3D;

  // Counterbore: a wider cylinder stacked at the entry plane, depth = cb.depth.
  if (counterbore) {
    const cbBase = add(entryPoint, scale(entry.axisIntoBody, -OVERSHOOT));
    const cbLen = counterbore.depth + OVERSHOOT * 2;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cb = (replicad as any).makeCylinder(
      counterbore.diameter / 2,
      cbLen,
      cbBase,
      entry.axisIntoBody,
    ) as replicad.Shape3D;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tool = (tool as any).fuse(cb) as replicad.Shape3D;
  }

  // Countersink: a cone widest at the entry face (radius csDiameter/2) that
  // narrows into the body at the half angle, fused onto the bore.
  if (countersink) {
    const csTool = buildCountersinkCone(entryPoint, entry.axisIntoBody, entry.uBasis, countersink.diameter / 2, countersink.angleDeg, OVERSHOOT);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tool = (tool as any).fuse(csTool) as replicad.Shape3D;
  }

  // Modeled thread, fused LAST and without simplification: the groove joins
  // the bore (and any cb / csk) so the hole stays ONE history-tracked cut, and
  // the cb / csk fuses above keep exactly their pre-thread behaviour.
  if (thread?.params.modeled) {
    const groove = buildThreadGroove(
      entryPoint, entry.axisIntoBody, entry.uBasis, thread.nominalDiameter, effectiveDepth, through, thread.params,
    );
    tool = fuseUnsimplified(tool, groove);
  }

  const bore: BoreFrame = {
    entryPoint,
    axisIntoBody: entry.axisIntoBody,
    diameter,
    effectiveDepth,
    through,
    counterbore,
    countersink,
  };
  return { tool, bore };
}

/**
 * Countersink cutter: the right triangle (axis, entry rim, apex) revolved a
 * full turn about the bore axis. The bundled OCCT wasm does not bind
 * `BRepPrimAPI_MakeCone`, so the cone is built with `BRepPrimAPI_MakeRevol`,
 * which OCCT turns into an exact conical face for a straight generatrix.
 *
 * The profile starts `overshoot` outside the entry face (continuing the cone)
 * so the cutter crosses the face instead of sharing it, and ends at the apex
 * `rimRadius / tan(angle/2)` into the body.
 *
 * @throws {Error} when the cone cannot be built — the caller turns that into
 *   an error diagnostic; a hole never silently loses its countersink.
 */
export function buildCountersinkCone(
  entryPoint: Vec3,
  axisIntoBody: Vec3,
  uBasis: Vec3,
  rimRadius: number,
  angleDeg: number,
  overshoot: number,
): replicad.Shape3D {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = (replicad as any).getOC();
  const halfAngle = (angleDeg / 2) * Math.PI / 180;
  const apexDepth = rimRadius / Math.tan(halfAngle);
  const outerRadius = rimRadius + overshoot * Math.tan(halfAngle);
  const at = (radial: number, axial: number): Vec3 =>
    add(entryPoint, add(scale(uBasis, radial), scale(axisIntoBody, axial)));
  const corners: Vec3[] = [at(0, -overshoot), at(outerRadius, -overshoot), at(0, apexDepth)];
  const created: Array<{ delete(): void }> = [];
  const keep = <T extends { delete(): void }>(o: T): T => { created.push(o); return o; };
  try {
    if (typeof oc.BRepPrimAPI_MakeRevol_2 !== 'function') {
      throw new Error('this OCCT build does not provide BRepPrimAPI_MakeRevol, so the countersink cone cannot be built.');
    }
    const wire = keep(new oc.BRepBuilderAPI_MakeWire_1());
    for (let i = 0; i < corners.length; i++) {
      const a = corners[i];
      const b = corners[(i + 1) % corners.length];
      const pa = keep(new oc.gp_Pnt_3(a[0], a[1], a[2]));
      const pb = keep(new oc.gp_Pnt_3(b[0], b[1], b[2]));
      const edge = keep(new oc.BRepBuilderAPI_MakeEdge_3(pa, pb));
      wire.Add_1(edge.Edge());
    }
    const face = keep(new oc.BRepBuilderAPI_MakeFace_15(wire.Wire(), true));
    if (!face.IsDone()) throw new Error('the countersink profile face could not be built.');
    const origin = keep(new oc.gp_Pnt_3(entryPoint[0], entryPoint[1], entryPoint[2]));
    const dir = keep(new oc.gp_Dir_4(axisIntoBody[0], axisIntoBody[1], axisIntoBody[2]));
    const axis = keep(new oc.gp_Ax1_2(origin, dir));
    const revol = keep(new oc.BRepPrimAPI_MakeRevol_2(face.Face(), axis, true));
    if (!revol.IsDone()) throw new Error('BRepPrimAPI_MakeRevol did not build the countersink cone.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cone = (replicad as any).cast(revol.Shape()) as replicad.Shape3D;
    if (Math.abs(replicad.measureVolume(cone)) < 1e-9) {
      throw new Error('the countersink cone came out empty.');
    }
    return cone;
  } finally {
    for (const o of created.reverse()) o.delete();
  }
}

/** Apply the post-cut classification via the slice-2 generic propagator.
 *  Identifies NEW faces, classifies each, builds CreatedRefSpec[], and
 *  routes through `applyCreatedRefs` + `refreshSnapshots` to populate the
 *  full set of slice-2 lineage fields (labelName + snapshot + featureId
 *  + featureKind, plus featureName/featureOrdinal when supplied). */
function attachCreatedRefs(
  result: { shape: unknown; faceHistory: Map<FaceHash, FaceHash[]>; deletedFaces: Set<FaceHash> },
  resultBackend: OcctBackend,
  bores: BoreFrame[],
  baseHistoryMap: HistoryMap | undefined,
  featureId: string,
  featureKind: FeatureKind,
  featureName: string | undefined,
  featureOrdinal: number | undefined,
): HistoryMap {
  const merged = mergeBooleanHistory(
    baseHistoryMap,
    undefined,
    result as Parameters<typeof mergeBooleanHistory>[2],
  );
  const allFaces = resultBackend.getReplicadShape().faces;
  const snapshots = captureAllFaceSnapshots(allFaces);

  // Any result face NOT in `merged` came from the tool (bore wall, floor,
  // cb wall/floor, csk cone). Classify each; emit a CreatedRefSpec.
  const refs: CreatedRefSpec[] = [];
  for (const face of allFaces) {
    const h = faceHashOf(face);
    if (merged.has(h)) continue;
    let cls: HoleRefName | null = null;
    for (const bore of bores) {
      cls = classifyHoleFace(face, bore);
      if (cls !== null) break;
    }
    if (cls !== null) {
      refs.push({
        faceHash: h,
        refName: cls,
        snapshot: snapshots.get(h)!,
        surfaceType: surfaceTypeOf(face),
      });
    }
  }

  applyCreatedRefs(merged, refs, featureId, featureKind, featureName, featureOrdinal);
  // Populate snapshots for carried-over target faces too — the geometry
  // resolver in Phase 4 will read these when topology lookup falls through.
  refreshSnapshots(merged, allFaces);
  return merged;
}

// ---------------------------------------------------------------------------
// Public entry points
// ---------------------------------------------------------------------------

export function lowerHole(
  feature: FeatureRecord,
  target: OcctBackend,
  records: readonly FeatureRecord[] | undefined,
): HoleLowerResult {
  const diagnostics: CompilerDiagnostic[] = [];
  const entryRes = resolveEntry(feature, target, records);
  if ('error' in entryRes) {
    diagnostics.push(entryRes.error);
    return { backend: target, diagnostics };
  }
  const entry = entryRes;

  const u = feature.params.u.evaluated;
  const v = feature.params.v.evaluated;
  const thread = readThread(feature);
  const nominalDiameter = feature.params.diameter.evaluated;
  const diameter = drilledDiameter(nominalDiameter, thread);
  const through = feature.params.depthMode?.expression === "'through'";
  const numericDepth = feature.params.depth?.evaluated;
  const counterbore = feature.params.counterboreDiameter
    ? { diameter: feature.params.counterboreDiameter.evaluated, depth: feature.params.counterboreDepth.evaluated }
    : undefined;
  const countersink = feature.params.countersinkDiameter
    ? { diameter: feature.params.countersinkDiameter.evaluated, angleDeg: feature.params.countersinkAngleDeg.evaluated }
    : undefined;

  let throughDepth = 0;
  if (through) {
    const td = deriveThroughDepth(target, entry, diameter, feature.id);
    if (typeof td !== 'number') {
      diagnostics.push(td.error);
      return { backend: target, diagnostics };
    }
    throughDepth = td;
  }

  let built: OneToolBuild;
  try {
    built = buildOneTool(
      entry, u, v, diameter, numericDepth, through, throughDepth, counterbore, countersink,
      thread ? { params: thread, nominalDiameter } : undefined,
    );
  } catch (e) {
    diagnostics.push(toolBuildDiagnostic(e, feature.id));
    return { backend: target, diagnostics };
  }

  const meta = feature.metadata as { name?: string; ordinal?: number } | undefined;
  return runCutAndClassify(target, [built.tool], [built.bore], feature.id, feature.kind, meta?.name, meta?.ordinal, diagnostics);
}

export function lowerHoles(
  feature: FeatureRecord,
  target: OcctBackend,
  records: readonly FeatureRecord[] | undefined,
): HoleLowerResult {
  const diagnostics: CompilerDiagnostic[] = [];
  const entryRes = resolveEntry(feature, target, records);
  if ('error' in entryRes) {
    diagnostics.push(entryRes.error);
    return { backend: target, diagnostics };
  }
  const entry = entryRes;

  // Slice-3: positions are stored as Array<{u: Param, v: Param}> so that any
  // symbolic ParamRef survives capture and gets pre-resolved at lower time.
  // Read .evaluated for the resolved numeric value (post-dispatcher pre-resolve).
  type PositionEntry = { u: { evaluated: number } | number; v: { evaluated: number } | number };
  const meta = feature.metadata as { positions?: PositionEntry[] } | undefined;
  const rawPositions = meta?.positions ?? [];
  const positions = rawPositions.map((p) => ({
    u: typeof p.u === 'number' ? p.u : p.u.evaluated,
    v: typeof p.v === 'number' ? p.v : p.v.evaluated,
  }));
  if (positions.length === 0) {
    diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: feature.id,
      severity: 'error',
      message: 'holes lowering: positions array is empty.',
      hint: 'holes() requires at least one position.',
    });
    return { backend: target, diagnostics };
  }

  const thread = readThread(feature);
  const nominalDiameter = feature.params.diameter.evaluated;
  const diameter = drilledDiameter(nominalDiameter, thread);
  const through = feature.params.depthMode?.expression === "'through'";
  const numericDepth = feature.params.depth?.evaluated;
  const counterbore = feature.params.counterboreDiameter
    ? { diameter: feature.params.counterboreDiameter.evaluated, depth: feature.params.counterboreDepth.evaluated }
    : undefined;
  const countersink = feature.params.countersinkDiameter
    ? { diameter: feature.params.countersinkDiameter.evaluated, angleDeg: feature.params.countersinkAngleDeg.evaluated }
    : undefined;

  let throughDepth = 0;
  if (through) {
    const td = deriveThroughDepth(target, entry, diameter, feature.id);
    if (typeof td !== 'number') {
      diagnostics.push(td.error);
      return { backend: target, diagnostics };
    }
    throughDepth = td;
  }

  // Build N tools, fuse into one compound for a single boolean cut.
  const tools: replicad.Shape3D[] = [];
  const bores: BoreFrame[] = [];
  try {
    for (const p of positions) {
      const built = buildOneTool(
        entry, p.u, p.v, diameter, numericDepth, through, throughDepth, counterbore, countersink,
        thread ? { params: thread, nominalDiameter } : undefined,
      );
      tools.push(built.tool);
      bores.push(built.bore);
    }
  } catch (e) {
    diagnostics.push(toolBuildDiagnostic(e, feature.id));
    return { backend: target, diagnostics };
  }

  // Fuse all tools into a single solid via sequential .fuse(). Tools carrying
  // a modeled thread groove skip replicad's face-unification pass (see
  // fuseUnsimplified); plain tools keep it exactly as before.
  let fused = tools[0];
  for (let i = 1; i < tools.length; i++) {
    fused = thread?.modeled
      ? fuseUnsimplified(fused, tools[i])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      : (fused as any).fuse(tools[i]) as replicad.Shape3D;
  }

  const meta2 = feature.metadata as { name?: string; ordinal?: number } | undefined;
  return runCutAndClassify(target, [fused], bores, feature.id, feature.kind, meta2?.name, meta2?.ordinal, diagnostics);
}

/** Map a tool-building failure (thread groove, countersink cone, sub-tool
 *  fuse) to an error diagnostic — author-fixable geometry → invalid-args,
 *  anything OCCT could not build → kernel-failed. A hole never lowers without
 *  a sub-feature it was asked for. */
function toolBuildDiagnostic(e: unknown, featureId: string): CompilerDiagnostic {
  if (e instanceof HelicalSweepArgsError) {
    return {
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId,
      severity: 'error',
      message: `hole thread: ${e.message}`,
      hint: e.hint,
    };
  }
  const msg = e instanceof Error ? e.message : String(e);
  return {
    target: 'export-occt',
    code: 'feature.kernel-failed',
    featureId,
    severity: 'error',
    message: `OCCT could not build the hole tool: ${msg}`,
    hint: 'A hole sub-feature (countersink cone, counterbore, or modeled thread groove) failed to build, so the hole was not cut. Check its dimensions against the bore, or drop the sub-feature (a thread can stay cosmetic with modeled: false).',
  };
}

function runCutAndClassify(
  target: OcctBackend,
  tools: replicad.Shape3D[],
  bores: BoreFrame[],
  featureId: string,
  featureKind: FeatureKind,
  featureName: string | undefined,
  featureOrdinal: number | undefined,
  diagnostics: CompilerDiagnostic[],
): HoleLowerResult {
  // Wrap the (single) fused tool into an OcctBackend so we can call
  // cutWithHistory (which expects two OcctBackends).
  // Phase 2 only ever calls this with a single fused tool.
  const tool = tools[0];
  const toolBackend = new OcctBackend(tool);
  let cutResult;
  try {
    cutResult = cutWithHistory(target, toolBackend);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    diagnostics.push({
      target: 'export-occt',
      code: 'feature.kernel-failed',
      featureId,
      severity: 'error',
      message: `OCCT boolean cut failed during hole lowering: ${msg}`,
      hint: 'OCCT produced an empty solid or rejected the boolean. Check u/v coordinates against the face bounds and verify diameter/depth are physically reasonable.',
    });
    return { backend: target, diagnostics };
  }

  // Wrap the result into an OcctBackend.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wrapped = replicad.cast(cutResult.shape as any) as replicad.Shape3D;
  const intermediate = new OcctBackend(wrapped, undefined);

  if (intermediate.isEmpty()) {
    diagnostics.push({
      target: 'export-occt',
      code: 'feature.kernel-failed',
      featureId,
      severity: 'error',
      message: 'Hole boolean produced an empty result.',
      hint: 'OCCT produced an empty solid; the bore likely missed the body. Check u/v coordinates against the face bounds.',
    });
    return { backend: target, diagnostics };
  }

  // Build the result historyMap with created-ref labelName + snapshot entries
  // via the slice-2 generic propagator.
  const newHistoryMap = attachCreatedRefs(
    cutResult, intermediate, bores, target.historyMap,
    featureId, featureKind, featureName, featureOrdinal,
  );

  return {
    backend: new OcctBackend(wrapped, undefined, newHistoryMap),
    diagnostics,
  };
}

// fuseWithHistory imported but only used in slice-2 (when we want richer
// tool-side history). Keep import to avoid the ts-unused-vars churn when
// slice-2 lands.
void fuseWithHistory;
