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
import { cutWithHistory, fuseWithHistory, mergeBooleanHistory } from './historyAwareBooleans';
import { resolveFaceQuery } from './edgeQueries';
import type { FeatureRecord } from '../../intent/featureRecord';
import type { CompilerDiagnostic } from '../../diagnostics/diagnostic';
import type { Vec3 } from '../../intent/types';
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
import type { FeatureKind } from '../../intent/types';

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

  // Countersink: cone with apex at depth = (csDiameter/2) / tan(csAngle/2),
  // opening upward toward the entry plane. We approximate by revolving a
  // triangle profile around the bore axis.
  if (countersink) {
    const halfAngle = (countersink.angleDeg / 2) * Math.PI / 180;
    const csDepth = (countersink.diameter / 2) / Math.tan(halfAngle);
    // Profile in the (radial, axial) plane: triangle with vertices at
    //   (0, -OVERSHOOT)  ← apex above entry plane (cleared)
    //   (csDiameter/2, csDepth - OVERSHOOT)  ← rim at csDepth into body
    //   (0, csDepth - OVERSHOOT)
    // Revolved around the bore axis (Z in the local frame) to form the cone.
    // We build the profile in the world frame using a small drawing in the
    // XZ plane, then place it at the entry point with the bore axis along Z.
    // For axis-aligned bores (Z direction), this is straightforward; for
    // arbitrary axes we'd need a frame transform. Slice-1 cardinal-axis
    // limitation: countersink works for axis-aligned bores only.
    // We build the cone via revolving a triangle drawn in the local frame.
    // Use replicad.makeCylinder for the apex region (zero-radius cylinders
    // don't exist; instead build the cone via two stacked frusta or via
    // revolveSolid). For slice-1 simplicity, we construct a cone using the
    // OCCT BRepPrimAPI_MakeCone primitive directly via the WASM bindings.
    const csTool = buildConeTool(entryPoint, entry.axisIntoBody, countersink.diameter / 2, csDepth);
    if (csTool) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tool = (tool as any).fuse(csTool) as replicad.Shape3D;
    }
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

/** Build a cone solid via the OCCT BRepPrimAPI_MakeCone bindings. The cone has
 *  its apex at `apexPoint` and opens along `axis` for `height`, with radius
 *  `topRadius` at the open end and 0 at the apex. Returns null on failure. */
function buildConeTool(
  apexPoint: Vec3,
  axis: Vec3,
  topRadius: number,
  height: number,
): replicad.Shape3D | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const oc = (replicad as any).getOC ? (replicad as any).getOC() : null;
    if (!oc) return null;
    // gp_Ax2 from origin and axis direction.
    const apexGp = new oc.gp_Pnt_3(apexPoint[0], apexPoint[1], apexPoint[2]);
    const axisGp = new oc.gp_Dir_4(axis[0], axis[1], axis[2]);
    const ax2 = new oc.gp_Ax2_3(apexGp, axisGp);
    // BRepPrimAPI_MakeCone(ax2, R1, R2, H) — R1 (apex) = 0, R2 (top) = topRadius.
    const builder = new oc.BRepPrimAPI_MakeCone_4(ax2, 0, topRadius, height);
    builder.Build(new oc.Message_ProgressRange_1());
    if (!builder.IsDone()) {
      builder.delete();
      return null;
    }
    const shape = builder.Shape();
    builder.delete();
    apexGp.delete();
    axisGp.delete();
    ax2.delete();
    // Cast TopoDS_Shape → replicad.Shape3D via replicad.cast.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (replicad as any).cast(shape) as replicad.Shape3D;
  } catch {
    return null;
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
  const diameter = feature.params.diameter.evaluated;
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

  const built = buildOneTool(
    entry, u, v, diameter, numericDepth, through, throughDepth, counterbore, countersink,
  );

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

  const diameter = feature.params.diameter.evaluated;
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
  for (const p of positions) {
    const built = buildOneTool(
      entry, p.u, p.v, diameter, numericDepth, through, throughDepth, counterbore, countersink,
    );
    tools.push(built.tool);
    bores.push(built.bore);
  }

  // Fuse all tools into a single solid via sequential .fuse().
  let fused = tools[0];
  for (let i = 1; i < tools.length; i++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fused = (fused as any).fuse(tools[i]) as replicad.Shape3D;
  }

  const meta2 = feature.metadata as { name?: string; ordinal?: number } | undefined;
  return runCutAndClassify(target, [fused], bores, feature.id, feature.kind, meta2?.name, meta2?.ordinal, diagnostics);
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
