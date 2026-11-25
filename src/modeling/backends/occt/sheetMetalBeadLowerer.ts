// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/backends/occt/sheetMetalBeadLowerer.ts
//
// Real OCCT B-rep lowering for formed sheet-metal stiffening beads
// (`shape.bead(opts)`). Builds a stadium-footprint raised ridge (prism +
// 180-degree revolved pill end caps) fused onto the chosen sheet face, plus
// a matching recessed channel cut from the opposite face when width > 2*t.

import * as replicad from 'replicad';
import { OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import { invalidArgsText } from '../../../shared/intent/invalidArgs';
import type { BeadProfile, Vec2 } from '../../../shared/intent/region';
import type { FeatureId, Vec3 } from '../../../shared/intent/types';
import { findRootSheetMetalRecord, sheetMetalPredecessor } from '../../sheetMetal';
import {
  beadInnerWidth,
  checkBeadInsideBlank,
  checkBeadVsBendZone,
  readBeadSpec,
  type ResolvedBeadSpec,
} from '../../sheetMetalBead';
import { planFold, type FlatBend, type FlatBlank, type FoldStep, type Rigid } from '../../sheetMetalFold';
import { resolveBendAxis, type BendBox } from './sheetMetalLowerer';
import { built, noShape, type LowerContext, type LowerOutcome } from './lowerers/context';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Oc = any;

export interface BeadLowerInput {
  featureId: FeatureId;
  base: OcctBackend;
  bead: ResolvedBeadSpec;
  thickness: number;
  z0: number;
  worldTransform?: Rigid;
}

export interface BeadLowerOutcome {
  shape?: OcctBackend;
  diagnostic?: CompilerDiagnostic;
}

/** Quarter-ellipse cubic Bezier handle factor: 4*(sqrt(2)-1)/3. */
const ELLIPSE_K = (4 * (Math.SQRT2 - 1)) / 3;
/** Crown half-width fraction for flat-topped 'u' profile beads. */
const U_CROWN_RATIO = 0.7;

function buildHalfProfile(
  radius: number,
  height: number,
  overlap: number,
  profile: BeadProfile,
): replicad.Drawing {
  const pen = replicad.draw([0, -overlap]).lineTo([radius, -overlap]).lineTo([radius, 0]);
  if (profile === 'round') {
    return pen
      .cubicBezierCurveTo([0, height], [radius, ELLIPSE_K * height], [ELLIPSE_K * radius, height])
      .close();
  }
  if (profile === 'u') {
    return pen.lineTo([radius * U_CROWN_RATIO, height]).lineTo([0, height]).close();
  }
  return pen.lineTo([0, height]).close();
}

function buildFullProfile(
  radius: number,
  height: number,
  overlap: number,
  profile: BeadProfile,
): replicad.Drawing {
  const pen = replicad.draw([-radius, -overlap]).lineTo([radius, -overlap]).lineTo([radius, 0]);
  if (profile === 'round') {
    return pen
      .cubicBezierCurveTo([0, height], [radius, ELLIPSE_K * height], [ELLIPSE_K * radius, height])
      .cubicBezierCurveTo([-radius, 0], [-ELLIPSE_K * radius, height], [-radius, ELLIPSE_K * height])
      .close();
  }
  if (profile === 'u') {
    const crown = radius * U_CROWN_RATIO;
    return pen.lineTo([crown, height]).lineTo([-crown, height]).lineTo([-radius, 0]).close();
  }
  return pen.lineTo([0, height]).lineTo([-radius, 0]).close();
}

function revolveHalfCap(oc: Oc, faceWrapped: unknown, axisZ: 1 | -1): unknown {
  const origin = new oc.gp_Pnt_3(0, 0, 0);
  const dir = new oc.gp_Dir_4(0, 0, axisZ);
  const axis = new oc.gp_Ax1_2(origin, dir);
  const revol = new oc.BRepPrimAPI_MakeRevol_1(faceWrapped, axis, Math.PI, true);
  if (!revol.IsDone()) {
    revol.delete(); axis.delete(); dir.delete(); origin.delete();
    throw new Error('bead end-cap revolution failed');
  }
  const shape = revol.Shape();
  revol.delete(); axis.delete(); dir.delete(); origin.delete();
  return shape;
}

function translateX(oc: Oc, shape: unknown, dx: number): unknown {
  const trsf = new oc.gp_Trsf_1();
  const vec = new oc.gp_Vec_4(dx, 0, 0);
  trsf.SetTranslation_1(vec);
  const xform = new oc.BRepBuilderAPI_Transform_2(shape, trsf, true);
  const out = xform.Shape();
  xform.delete(); vec.delete(); trsf.delete();
  return out;
}

function booleanOp(oc: Oc, kind: 'fuse' | 'cut', a: unknown, b: unknown): unknown {
  const progress = new oc.Message_ProgressRange_1();
  const op = kind === 'fuse'
    ? new oc.BRepAlgoAPI_Fuse_3(a, b, progress)
    : new oc.BRepAlgoAPI_Cut_3(a, b, progress);
  const out = op.Shape();
  op.delete();
  progress.delete();
  return out;
}

function buildLocalBeadSolid(
  oc: Oc,
  length: number,
  radius: number,
  height: number,
  overlap: number,
  profile: BeadProfile,
): unknown {
  const prism = buildFullProfile(radius, height, overlap, profile)
    .sketchOnPlane('YZ')
    .extrude(length) as replicad.Shape3D;
  const halfSketch = buildHalfProfile(radius, height, overlap, profile)
    .sketchOnPlane('YZ') as replicad.Sketch;
  const halfFace = halfSketch.face();
  const faceWrapped = (halfFace as unknown as { wrapped: unknown }).wrapped;
  const startCap = revolveHalfCap(oc, faceWrapped, 1);
  const endCapRaw = revolveHalfCap(oc, faceWrapped, -1);
  const endCap = translateX(oc, endCapRaw, length);
  const prismWrapped = (prism as unknown as { wrapped: unknown }).wrapped;
  const withStart = booleanOp(oc, 'fuse', prismWrapped, startCap);
  return booleanOp(oc, 'fuse', withStart, endCap);
}

function makeBasisTrsf(oc: Oc, origin: Vec3, u: Vec3, v: Vec3, n: Vec3): Oc {
  const trsf = new oc.gp_Trsf_1();
  trsf.SetValues(
    u[0], v[0], n[0], origin[0],
    u[1], v[1], n[1], origin[1],
    u[2], v[2], n[2], origin[2],
  );
  return trsf;
}

function makeRigidTrsf(oc: Oc, rigid: Rigid): Oc {
  const m = rigid.R;
  const [tx, ty, tz] = rigid.t;
  const trsf = new oc.gp_Trsf_1();
  trsf.SetValues(
    m[0], m[1], m[2], tx,
    m[3], m[4], m[5], ty,
    m[6], m[7], m[8], tz,
  );
  return trsf;
}

function placeLocalBead(
  oc: Oc,
  localSolid: unknown,
  origin: Vec3,
  u: Vec3,
  v: Vec3,
  n: Vec3,
  worldTransform?: Rigid,
): unknown {
  const localTrsf = makeBasisTrsf(oc, origin, u, v, n);
  let finalTrsf: Oc = localTrsf;
  let worldTrsf: Oc | undefined;
  if (worldTransform) {
    worldTrsf = makeRigidTrsf(oc, worldTransform);
    worldTrsf.Multiply(localTrsf);
    finalTrsf = worldTrsf;
  }
  const xform = new oc.BRepBuilderAPI_Transform_2(localSolid, finalTrsf, true);
  const out = xform.Shape();
  xform.delete();
  localTrsf.delete();
  if (worldTrsf) worldTrsf.delete();
  return out;
}

function countSolids(oc: Oc, shape: unknown): number {
  const exp = new oc.TopExp_Explorer_2(
    shape,
    oc.TopAbs_ShapeEnum.TopAbs_SOLID,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE,
  );
  let count = 0;
  while (exp.More()) {
    count++;
    exp.Next();
  }
  exp.delete();
  return count;
}

function isValidSolid(oc: Oc, shape: unknown): boolean {
  if (countSolids(oc, shape) !== 1) return false;
  const analyzer = new oc.BRepCheck_Analyzer(shape, true, false);
  const ok = Boolean(analyzer.IsValid_2());
  analyzer.delete();
  return ok;
}

function failDiag(featureId: FeatureId, message: string): CompilerDiagnostic {
  return {
    target: 'export-occt',
    code: 'feature.kernel-failed',
    severity: 'error',
    featureId,
    message: `sheetMetalBead: ${message}`,
    hint: 'Check bead width, height, and placement inside the sheet blank.',
  };
}

/**
 * Form a closed watertight embossed stiffening bead on a sheet-metal body.
 * Fuses the raised ridge on `bead.side`, and cuts a matching opposite-face
 * recessed channel when `bead.width > 2 * thickness`.
 */
export function applySheetMetalBead(inp: BeadLowerInput): BeadLowerOutcome {
  const { bead, thickness, z0, worldTransform } = inp;
  const dx = bead.to[0] - bead.from[0];
  const dy = bead.to[1] - bead.from[1];
  const length = Math.hypot(dx, dy);
  const ux = dx / length;
  const uy = dy / length;
  const u: Vec3 = [ux, uy, 0];
  const isTop = bead.side === 'top';
  const n: Vec3 = isTop ? [0, 0, 1] : [0, 0, -1];
  // Right-handed basis: u x v = n.
  const v: Vec3 = isTop ? [-uy, ux, 0] : [uy, -ux, 0];
  const overlap = Math.min(0.25 * thickness, 0.25);

  const oc: Oc = replicad.getOC();
  try {
    const baseWrapped = (inp.base.getReplicadShape() as unknown as { wrapped: unknown }).wrapped;
    const ridgeLocal = buildLocalBeadSolid(oc, length, bead.width / 2, bead.height, overlap, bead.profile);
    const zFace = isTop ? z0 + thickness : z0;
    const ridge = placeLocalBead(oc, ridgeLocal, [bead.from[0], bead.from[1], zFace], u, v, n, worldTransform);
    let result = booleanOp(oc, 'fuse', baseWrapped, ridge);

    const innerW = beadInnerWidth(bead.width, thickness);
    if (innerW !== null) {
      const recessLocal = buildLocalBeadSolid(oc, length, innerW / 2, bead.height, overlap, bead.profile);
      const zOpp = isTop ? z0 : z0 + thickness;
      const recess = placeLocalBead(oc, recessLocal, [bead.from[0], bead.from[1], zOpp], u, v, n, worldTransform);
      result = booleanOp(oc, 'cut', result, recess);
    }

    if (!isValidSolid(oc, result)) {
      return { diagnostic: failDiag(inp.featureId, 'resulting beaded body is not one valid closed solid.') };
    }
    const casted = replicad.cast(result) as replicad.Shape3D;
    if (!(replicad.measureVolume(casted) > 0)) {
      return { diagnostic: failDiag(inp.featureId, 'resulting beaded body has non-positive volume.') };
    }
    return { shape: new OcctBackend(casted) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { diagnostic: failDiag(inp.featureId, msg) };
  }
}

interface SketchCmdLike {
  kind?: string;
  x?: { evaluated: number };
  y?: { evaluated: number };
}

function extractSketchPoints(cmds: readonly SketchCmdLike[]): { pts: Vec2[]; hasCurve: boolean } {
  const pts: Vec2[] = [];
  let hasCurve = false;
  for (const c of cmds) {
    if (c.kind && c.kind !== 'moveTo' && c.kind !== 'lineTo' && c.kind !== 'close') {
      hasCurve = true;
    }
    if (typeof c.x?.evaluated === 'number' && typeof c.y?.evaluated === 'number') {
      pts.push([c.x.evaluated, c.y.evaluated]);
    }
  }
  return { pts, hasCurve };
}

function readBlankOutline(
  root: FeatureRecord,
  records: readonly FeatureRecord[],
): { box: BendBox; poly?: Vec2[] } | undefined {
  const ref = root.inputs.sketch;
  if (!ref || ref.kind !== 'feature') return undefined;
  const sketch = records.find((x) => x.id === ref.id);
  const cmds = (sketch?.metadata as { commands?: SketchCmdLike[] } | undefined)?.commands;
  if (!Array.isArray(cmds)) return undefined;
  const { pts, hasCurve } = extractSketchPoints(cmds);
  if (pts.length < 3) return undefined;
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const t = root.params.thickness.evaluated;
  const box: BendBox = {
    min: [Math.min(...xs), Math.min(...ys), 0],
    max: [Math.max(...xs), Math.max(...ys), t],
  };
  return { box, poly: hasCurve ? undefined : pts };
}

function upstreamBends(r: FeatureRecord, records: readonly FeatureRecord[]): FeatureRecord[] {
  const byId = new Map(records.map((x) => [x.id, x]));
  const out: FeatureRecord[] = [];
  let cur: FeatureRecord | undefined = r;
  while (cur && cur.kind !== 'sheetMetal') {
    if (cur.kind === 'sheetMetalBend') out.push(cur);
    const prev = sheetMetalPredecessor(cur);
    cur = prev ? byId.get(prev) : undefined;
  }
  return out.reverse();
}

function composeRigid(a: Rigid, b: Rigid): Rigid {
  const ar = a.R;
  const br = b.R;
  return {
    R: [
      ar[0] * br[0] + ar[1] * br[3] + ar[2] * br[6],
      ar[0] * br[1] + ar[1] * br[4] + ar[2] * br[7],
      ar[0] * br[2] + ar[1] * br[5] + ar[2] * br[8],
      ar[3] * br[0] + ar[4] * br[3] + ar[5] * br[6],
      ar[3] * br[1] + ar[4] * br[4] + ar[5] * br[7],
      ar[3] * br[2] + ar[4] * br[5] + ar[5] * br[8],
      ar[6] * br[0] + ar[7] * br[3] + ar[8] * br[6],
      ar[6] * br[1] + ar[7] * br[4] + ar[8] * br[7],
      ar[6] * br[2] + ar[7] * br[5] + ar[8] * br[8],
    ],
    t: [
      ar[0] * b.t[0] + ar[1] * b.t[1] + ar[2] * b.t[2] + a.t[0],
      ar[3] * b.t[0] + ar[4] * b.t[1] + ar[5] * b.t[2] + a.t[1],
      ar[6] * b.t[0] + ar[7] * b.t[1] + ar[8] * b.t[2] + a.t[2],
    ],
  };
}

function transformForPoint(steps: readonly FoldStep[], p: Vec2): Rigid {
  let acc: Rigid = { R: [1, 0, 0, 0, 1, 0, 0, 0, 1], t: [0, 0, 0] };
  for (const s of steps) {
    const coord = s.bend.orient === 'x' ? p[0] : p[1];
    const moving = s.side === 1 ? coord > s.bend.at : coord < s.bend.at;
    if (moving) acc = composeRigid(s.flangeTransform, acc);
  }
  return acc;
}

function resolveUpstreamFoldSteps(
  bends: readonly FeatureRecord[],
  flatBox: BendBox,
  thickness: number,
  kFactor: number,
): FoldStep[] {
  const flatBends: FlatBend[] = [];
  for (const rec of bends) {
    const res = resolveBendAxis({ boundingBox: () => flatBox }, rec.inputs.edges, rec.inputs.face, rec.id, thickness);
    if ('diagnostic' in res) return [];
    const alongY = Math.abs(res.axis.direction[1]) > 0.5;
    flatBends.push({
      orient: alongY ? 'x' : 'y',
      at: alongY ? res.axis.origin[0] : res.axis.origin[1],
      angleDeg: rec.params.angle.evaluated,
      radius: rec.params.radius.evaluated,
    });
  }
  const blank: FlatBlank = {
    min: [flatBox.min[0], flatBox.min[1]],
    max: [flatBox.max[0], flatBox.max[1]],
    z0: flatBox.min[2],
    thickness,
    kFactor,
  };
  return planFold(flatBends, blank);
}

function beadDimensionsInvalid(bead: ResolvedBeadSpec): string | null {
  const segLen = Math.hypot(bead.to[0] - bead.from[0], bead.to[1] - bead.from[1]);
  const bad = !Number.isFinite(segLen) || segLen <= 1e-6 || !(bead.width > 0) || !(bead.height > 0);
  return bad ? `width=${bead.width}, height=${bead.height}, length=${segLen.toFixed(4)}` : null;
}

function pushBeadInvalidArgs(
  ctx: LowerContext,
  featureId: FeatureId,
  path: string,
  gotText: string,
  requires: string,
): LowerOutcome {
  ctx.diagnostics.push({
    target: 'export-occt',
    code: 'feature.invalid-args',
    featureId,
    severity: 'error',
    ...invalidArgsText({
      api: 'shape.bead(opts)',
      path,
      gotText,
      requires,
      example: "sheetMetal(profile, { thickness: 1.5, kFactor: 0.42 }).bead({ from: [15, 25], to: [85, 25], width: 8, height: 2 })",
    }),
  });
  return noShape();
}

function resolveBeadWorldTransform(
  ctx: LowerContext,
  r: FeatureRecord,
  records: readonly FeatureRecord[],
  bead: ResolvedBeadSpec,
  flatBox: BendBox,
  thickness: number,
  kFactor: number,
): { ok: true; worldTransform?: Rigid } | { ok: false } {
  const bends = upstreamBends(r, records);
  if (bends.length === 0) return { ok: true };
  const steps = resolveUpstreamFoldSteps(bends, flatBox, thickness, kFactor);
  for (const s of steps) {
    const hit = checkBeadVsBendZone(bead, { orient: s.bend.orient, at: s.bend.at, bendAllowance: s.bendAllowance });
    if (hit) {
      ctx.diagnostics.push({
        target: 'export-occt',
        code: 'feature.sheetMetal.bead-crosses-bend',
        featureId: r.id,
        severity: 'error',
        message: `.bead(): ${hit}`,
        hint: 'Relocate the bead or shorten it so its footprint stays clear of every bend zone.',
      });
      return { ok: false };
    }
  }
  const mid: Vec2 = [(bead.from[0] + bead.to[0]) / 2, (bead.from[1] + bead.to[1]) / 2];
  return { ok: true, worldTransform: transformForPoint(steps, mid) };
}

/** `sheetMetalBead` — lower a formed stiffening bead onto a sheet-metal body. */
export function lowerSheetMetalBead(ctx: LowerContext, r: FeatureRecord): LowerOutcome {
  const base = ctx.inputs.byKey.base as OcctBackend | undefined;
  if (!base) {
    return pushBeadInvalidArgs(ctx, r.id, 'inputs.base', 'no base shape', 'a Shape returned by sheetMetal(...) to chain onto');
  }
  const records = ctx.allRecords ?? [];
  const root = findRootSheetMetalRecord(r, records);
  if (!root) {
    return pushBeadInvalidArgs(
      ctx,
      r.id,
      'the receiving Shape',
      'a Shape whose lineage does not root at sheetMetal(...)',
      'a sheet-metal body built with sheetMetal(profile, { thickness, kFactor })',
    );
  }
  const thickness = root.params.thickness.evaluated;
  const kFactor = root.params.kFactor.evaluated;
  const bead = readBeadSpec(r);
  const dimErr = beadDimensionsInvalid(bead);
  if (dimErr) {
    return pushBeadInvalidArgs(ctx, r.id, 'opts', dimErr, 'positive finite width/height and non-zero segment length');
  }
  const outline = readBlankOutline(root, records);
  const baseBox = base.boundingBox();
  const flatBox: BendBox = outline?.box ?? {
    min: [baseBox.min[0], baseBox.min[1], 0],
    max: [baseBox.max[0], baseBox.max[1], thickness],
  };

  const boundsErr = checkBeadInsideBlank(
    bead,
    { min: [flatBox.min[0], flatBox.min[1]], max: [flatBox.max[0], flatBox.max[1]] },
    outline?.poly,
  );
  if (boundsErr) {
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'feature.sheetMetal.bead-out-of-bounds',
      featureId: r.id,
      severity: 'error',
      message: `.bead(): ${boundsErr}`,
      hint: 'Move from/to inward or reduce width so the bead footprint stays inside the flat blank outline.',
    });
    return noShape();
  }

  const placed = resolveBeadWorldTransform(ctx, r, records, bead, flatBox, thickness, kFactor);
  if (!placed.ok) return noShape();

  const outcome = applySheetMetalBead({
    featureId: r.id,
    base,
    bead,
    thickness,
    z0: flatBox.min[2],
    worldTransform: placed.worldTransform,
  });
  if (outcome.diagnostic) ctx.diagnostics.push(outcome.diagnostic);
  return outcome.shape ? built(outcome.shape) : noShape();
}
