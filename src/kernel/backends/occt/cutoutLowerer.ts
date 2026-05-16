// src/backends/occt/cutoutLowerer.ts
//
// Lowering for `Shape.cutout(profile, opts)`. Subtractive sketch-driven
// extrude. The profile sketch is captured separately (its own FeatureRecord);
// the cutout record references it via inputs.profile.
//
// Pipeline:
//   1. Resolve the entry face via pickFace.
//   2. Build a Plane at the entry face (origin = centroid, xDir = uBasis,
//      normal = outward).
//   3. Build a Drawing from the profile sketch's commands.
//   4. sketchOnPlane(customPlane) → 3D Sketch positioned at entry face.
//   5. extrude(-depth) — extrudes inward (since plane normal is outward).
//      For 'symmetric', translate the plane outward by depth first and
//      extrude(-2*depth). For 'through', use deriveThroughDepth(target).
//   6. cutWithHistory(target, tool) → the post-boolean result.
//   7. Walk new faces, classify via createdFaceTracker.classifyCutoutFace.
//
// Diagnostics use only the 26-code catalog. Per-trigger recovery via hint.

import * as replicad from 'replicad';
import type { Face } from 'replicad';
import { OcctBackend } from './occtBackend';
import { pickFace } from './edgeSelection';
import { cutWithHistory, mergeBooleanHistory } from './historyAwareBooleans';
import { resolveFaceQuery } from './edgeQueries';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import type { Vec3 } from '../../../shared/intent/types';
import type { FaceHash, HistoryMap } from '../../naming/evolutionRecord';
import type { SketchCommand } from '../../../capture/sketch';
import { classifyCutoutFace, type CutoutFrame, type CutoutRefName } from './cutoutClassifier';
import {
  applyCreatedRefs,
  captureAllFaceSnapshots,
  refreshSnapshots,
  faceHashOf,
  surfaceTypeOf,
  type CreatedRefSpec,
} from './createdRefs';
import type { FeatureKind } from '../../../shared/intent/types';

export interface CutoutLowerResult {
  backend: OcctBackend;
  diagnostics: CompilerDiagnostic[];
}

function vecOf(p: { x: number; y: number; z: number }): Vec3 {
  return [p.x, p.y, p.z];
}

function normalize(v: Vec3): Vec3 {
  const len = Math.hypot(v[0], v[1], v[2]);
  if (len < 1e-9) return [0, 0, 1];
  return [v[0] / len, v[1] / len, v[2] / len];
}

function neg(v: Vec3): Vec3 { return [-v[0], -v[1], -v[2]]; }
function dot(a: Vec3, b: Vec3): number { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

/** Build a (u, v) basis on a face from its normal. Mirrors holeLowerer.buildUvBasis
 *  but inlined to avoid a cross-module helper export. */
function buildUvBasis(normalOutward: Vec3): { uBasis: Vec3 } {
  const n = normalize(normalOutward);
  const X: Vec3 = [1, 0, 0], Y: Vec3 = [0, 1, 0], Z: Vec3 = [0, 0, 1];
  const TOL = 0.999;
  if (Math.abs(dot(n, Z)) > TOL) return { uBasis: X };
  if (Math.abs(dot(n, X)) > TOL) return { uBasis: Y };
  if (Math.abs(dot(n, Y)) > TOL) return { uBasis: X };
  const ref: Vec3 = Math.abs(dot(n, Z)) < 0.9 ? Z : X;
  return { uBasis: normalize(cross(ref, n)) };
}

/** Profile bbox radius — max distance of any moveTo/lineTo/arc endpoint
 *  from the (u, v) origin. Used to inform the slice-1 face classifier. */
function profileBboxRadius(commands: readonly SketchCommand[]): number {
  let maxR = 0;
  for (const c of commands) {
    if ('x' in c && 'y' in c) {
      const r = Math.hypot(c.x.evaluated, c.y.evaluated);
      if (r > maxR) maxR = r;
    }
  }
  return maxR;
}

/** Build a replicad Drawing from a SketchCommand[] — a self-contained
 *  alternative to OcctBackend.fromSketchCommands that returns the Drawing
 *  (not a 3D solid) so we can sketchOnPlane on it. */
function drawingFromCommands(commands: readonly SketchCommand[]): replicad.Drawing {
  const closeIdx = commands.findIndex(c => c.kind === 'close');
  if (closeIdx === -1) throw new Error('cutoutLowerer.drawingFromCommands: missing close');
  const first = commands[0];
  if (first.kind !== 'moveTo') throw new Error('cutoutLowerer.drawingFromCommands: first command must be moveTo');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pen: any = replicad.draw([first.x.evaluated, first.y.evaluated]);
  for (let i = 1; i < closeIdx; i++) {
    const c = commands[i];
    if (c.kind === 'lineTo') pen = pen.lineTo([c.x.evaluated, c.y.evaluated]);
    else if (c.kind === 'tangentArc') pen = pen.tangentArcTo([c.x.evaluated, c.y.evaluated]);
    else if (c.kind === 'threePointsArc') pen = pen.threePointsArcTo([c.x.evaluated, c.y.evaluated], [c.midX.evaluated, c.midY.evaluated]);
    else if (c.kind === 'sagittaArc') pen = pen.sagittaArcTo([c.x.evaluated, c.y.evaluated], c.sagitta.evaluated);
    else if (c.kind === 'bulgeArc') pen = pen.bulgeArcTo([c.x.evaluated, c.y.evaluated], c.bulge.evaluated);
    else if (c.kind === 'radiusArc') {
      // radius → sagitta conversion (positive bulges left of chord)
      const cx = c.x.evaluated;
      const cy = c.y.evaluated;
      const cr = c.radius.evaluated;
      const dx = cx - first.x.evaluated, dy = cy - first.y.evaluated;
      const chord = Math.hypot(dx, dy);
      const halfChord = chord / 2;
      const r = Math.abs(cr);
      if (r < halfChord) throw new Error(`cutoutLowerer: radiusArc |radius|=${r} < chord/2=${halfChord}`);
      const sagitta = (cr >= 0 ? 1 : -1) * (r - Math.sqrt(r * r - halfChord * halfChord));
      pen = pen.sagittaArcTo([cx, cy], sagitta);
    }
  }
  return pen.close();
}

interface ResolvedEntry {
  face: Face;
  centroid: Vec3;
  normalOutward: Vec3;
  axisIntoBody: Vec3;
  uBasis: Vec3;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nRaw = (face as any).normalAt
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? (face as any).normalAt() as { x: number; y: number; z: number }
    : { x: 0, y: 0, z: 1 };
  const normalOutward = normalize([nRaw.x, nRaw.y, nRaw.z]);
  const axisIntoBody = neg(normalOutward);
  const { uBasis } = buildUvBasis(normalOutward);
  return { face, centroid, normalOutward, axisIntoBody, uBasis };
}

function deriveThroughDepth(
  target: OcctBackend,
  entry: ResolvedEntry,
  featureId: string,
): number | { error: CompilerDiagnostic } {
  const n = entry.normalOutward;
  const X = Math.abs(n[0]), Y = Math.abs(n[1]), Z = Math.abs(n[2]);
  let antiAxis: 'X' | '-X' | 'Y' | '-Y' | 'Z' | '-Z' | null = null;
  if (Z > 0.99) antiAxis = n[2] > 0 ? '-Z' : 'Z';
  else if (X > 0.99) antiAxis = n[0] > 0 ? '-X' : 'X';
  else if (Y > 0.99) antiAxis = n[1] > 0 ? '-Y' : 'Y';

  if (antiAxis !== null) {
    const candidates = resolveFaceQuery(target, { byNormal: antiAxis });
    if (candidates.length === 0) {
      return {
        error: {
          target: 'export-occt',
          code: 'feature.kernel-failed',
          featureId,
          severity: 'error',
          message: `'through' requested but no anti-parallel back face found.`,
          hint: "'through' requested but the body has no back face anti-parallel to the entry face. Pass an explicit upToFace or use a numeric depth.",
        },
      };
    }
    candidates.sort((a, b) => {
      const da = dot([a.center.x - entry.centroid[0], a.center.y - entry.centroid[1], a.center.z - entry.centroid[2]], entry.axisIntoBody);
      const db = dot([b.center.x - entry.centroid[0], b.center.y - entry.centroid[1], b.center.z - entry.centroid[2]], entry.axisIntoBody);
      return da - db;
    });
    const back = candidates[0];
    return dot(
      [back.center.x - entry.centroid[0], back.center.y - entry.centroid[1], back.center.z - entry.centroid[2]],
      entry.axisIntoBody,
    );
  }

  const bb = target.boundingBox();
  const corners: Vec3[] = [
    [bb.min[0], bb.min[1], bb.min[2]], [bb.max[0], bb.min[1], bb.min[2]],
    [bb.min[0], bb.max[1], bb.min[2]], [bb.max[0], bb.max[1], bb.min[2]],
    [bb.min[0], bb.min[1], bb.max[2]], [bb.max[0], bb.min[1], bb.max[2]],
    [bb.min[0], bb.max[1], bb.max[2]], [bb.max[0], bb.max[1], bb.max[2]],
  ];
  let maxAlong = 0;
  for (const c of corners) {
    const along = dot([c[0] - entry.centroid[0], c[1] - entry.centroid[1], c[2] - entry.centroid[2]], entry.axisIntoBody);
    if (along > maxAlong) maxAlong = along;
  }
  if (maxAlong <= 0) {
    return {
      error: {
        target: 'export-occt',
        code: 'feature.kernel-failed',
        featureId,
        severity: 'error',
        message: `'through' requested but the cutout axis does not enter the body.`,
        hint: "'through' requested but the body's bounding box does not extend along the cutout axis. Pass an explicit upToFace.",
      },
    };
  }
  return maxAlong;
}

/** Build the prism tool by extruding the profile along the bore axis from
 *  the entry face plane. */
function buildPrismTool(
  entry: ResolvedEntry,
  commands: readonly SketchCommand[],
  effectiveDepth: number,
  symmetric: boolean,
): replicad.Shape3D {
  const drawing = drawingFromCommands(commands);
  const OVERSHOOT = 0.01;
  const totalDepth = symmetric ? effectiveDepth * 2 + OVERSHOOT * 2 : effectiveDepth + OVERSHOOT * 2;
  // For symmetric: start the plane offset by +effectiveDepth in the outward
  // normal direction, then extrude inward by total. For blind: start at the
  // entry face (offset by +OVERSHOOT outward), extrude inward by depth+2ε.
  const startOffset = symmetric ? effectiveDepth : OVERSHOOT;
  const planeOrigin: Vec3 = [
    entry.centroid[0] + entry.normalOutward[0] * startOffset,
    entry.centroid[1] + entry.normalOutward[1] * startOffset,
    entry.centroid[2] + entry.normalOutward[2] * startOffset,
  ];
  // Build a Plane with origin at planeOrigin, xDir=uBasis, normal=outward.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plane = new (replicad as any).Plane(planeOrigin, entry.uBasis, entry.normalOutward) as replicad.Plane;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sketch = drawing.sketchOnPlane(plane) as any;
  // extrude(-totalDepth) extrudes against the plane normal — into the body.
  return sketch.extrude(-totalDepth) as replicad.Shape3D;
}

function attachCreatedRefs(
  result: { shape: unknown; faceHistory: Map<FaceHash, FaceHash[]>; deletedFaces: Set<FaceHash> },
  resultBackend: OcctBackend,
  frame: CutoutFrame,
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

  const refs: CreatedRefSpec[] = [];
  for (const face of allFaces) {
    const h = faceHashOf(face);
    if (merged.has(h)) continue;
    const cls: CutoutRefName | null = classifyCutoutFace(face, frame);
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
  refreshSnapshots(merged, allFaces);
  return merged;
}

export function lowerCutout(
  feature: FeatureRecord,
  target: OcctBackend,
  profileBackend: OcctBackend | undefined,
  records: readonly FeatureRecord[] | undefined,
): CutoutLowerResult {
  const diagnostics: CompilerDiagnostic[] = [];
  const entryRes = resolveEntry(feature, target, records);
  if ('error' in entryRes) {
    diagnostics.push(entryRes.error);
    return { backend: target, diagnostics };
  }
  const entry = entryRes;

  // The profile sketch's commands live in the sketch FeatureRecord's metadata.
  const profileRef = feature.inputs.profile;
  const profileFeatureId = profileRef && profileRef.kind === 'feature' ? profileRef.id : undefined;
  const profileRecord = records?.find(r => r.id === profileFeatureId);
  const commands = ((profileRecord?.metadata as { commands?: SketchCommand[] } | undefined)?.commands) ?? [];
  if (commands.length === 0) {
    diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: feature.id,
      severity: 'error',
      message: 'cutout: profile sketch has no commands.',
      hint: 'The cutout profile must be a closed sketch built via path().moveTo(...).lineTo(...).close().',
    });
    return { backend: target, diagnostics };
  }
  // Suppress unused-var warning until slice-2 might consume profileBackend.
  void profileBackend;

  const depthMode = String(feature.params.depthMode.expression).replace(/'/g, '');
  const through = depthMode === 'through';
  const symmetric = depthMode === 'symmetric';
  const numericDepth = feature.params.depth?.evaluated;

  let effectiveDepth: number;
  if (through) {
    const td = deriveThroughDepth(target, entry, feature.id);
    if (typeof td !== 'number') {
      diagnostics.push(td.error);
      return { backend: target, diagnostics };
    }
    effectiveDepth = td;
  } else if (numericDepth !== undefined) {
    effectiveDepth = numericDepth;
  } else {
    diagnostics.push({
      target: 'export-occt',
      code: 'feature.invalid-args',
      featureId: feature.id,
      severity: 'error',
      message: 'cutout: missing depth.',
      hint: "Set either depth (number or 'through') or upToFace; one is required.",
    });
    return { backend: target, diagnostics };
  }

  let toolShape: replicad.Shape3D;
  try {
    toolShape = buildPrismTool(entry, commands, effectiveDepth, symmetric);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    diagnostics.push({
      target: 'export-occt',
      code: 'feature.kernel-failed',
      featureId: feature.id,
      severity: 'error',
      message: `cutout prism construction failed: ${msg}`,
      hint: 'OCCT could not build the cutout prism. Inspect the profile for self-intersection or zero-area issues.',
    });
    return { backend: target, diagnostics };
  }

  const toolBackend = new OcctBackend(toolShape);
  let cutResult;
  try {
    cutResult = cutWithHistory(target, toolBackend);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    diagnostics.push({
      target: 'export-occt',
      code: 'feature.kernel-failed',
      featureId: feature.id,
      severity: 'error',
      message: `OCCT boolean cut failed during cutout lowering: ${msg}`,
      hint: 'OCCT produced an empty solid or rejected the boolean. Verify the profile lies within the face bounds.',
    });
    return { backend: target, diagnostics };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wrapped = replicad.cast(cutResult.shape as any) as replicad.Shape3D;
  const intermediate = new OcctBackend(wrapped, undefined);
  if (intermediate.isEmpty()) {
    diagnostics.push({
      target: 'export-occt',
      code: 'feature.kernel-failed',
      featureId: feature.id,
      severity: 'error',
      message: 'Cutout boolean produced an empty result.',
      hint: 'OCCT produced an empty solid; the cutout profile likely missed the body. Check the profile coords against the face bounds.',
    });
    return { backend: target, diagnostics };
  }

  // Profile-larger-than-face warning: compare profile bbox extent to
  // entry face bbox extent (cheap approximation via face bounding box on
  // the world axes; slice-1 limitation).
  const pBboxR = profileBboxRadius(commands);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fbb = (entry.face as any).boundingBox as { bounds: [Vec3, Vec3] } | undefined;
  if (fbb && fbb.bounds) {
    const [fmin, fmax] = fbb.bounds;
    const faceMaxR = Math.max(fmax[0] - fmin[0], fmax[1] - fmin[1], fmax[2] - fmin[2]) / 2;
    if (pBboxR > faceMaxR + 1e-3) {
      diagnostics.push({
        target: 'export-occt',
        code: 'feature.kernel-failed',
        featureId: feature.id,
        severity: 'warn',
        message: 'Cutout profile bbox exceeds the entry face bbox.',
        hint: 'Cutout profile is larger than the target face. If this is intentional (edge-bridging cut), ignore this warning.',
      });
    }
  }

  const frame: CutoutFrame = {
    entryPoint: entry.centroid,
    axisIntoBody: entry.axisIntoBody,
    effectiveDepth,
    through,
    profileBoundingBoxRadius: pBboxR,
  };
  const featMeta = feature.metadata as { name?: string; ordinal?: number } | undefined;
  const newHistoryMap = attachCreatedRefs(
    cutResult, intermediate, frame, target.historyMap,
    feature.id, feature.kind, featMeta?.name, featMeta?.ordinal,
  );

  return {
    backend: new OcctBackend(wrapped, undefined, newHistoryMap),
    diagnostics,
  };
}
