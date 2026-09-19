// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { V3 } from '../geom';
import type { FittedLoop, ProfilePrim, SnapRecord } from '../profileFit';
import type { AxisLabel } from '../faces';
import type { CornerExpr } from '../profileParams';
import type { EdgeQueryOut } from '../blends';

export interface PassParams {
  index: number;
  /** Loop simplification tolerance (mm). */
  eps: number;
  /** Grid snap tolerance (mm); 0 disables snapping. */
  snapTol: number;
  /** Line-direction snap tolerance (deg); 0 disables. */
  angleTolDeg: number;
  /** Allow `depth: 'through'` where the lowerer's rule resolves it. */
  allowThroughKeyword: boolean;
  /** Replace tangent corner arcs of outer profiles by sharp corners, so their
   *  rounds can be re-created as edge fillets together with adjoining blends. */
  sharpenCorners?: boolean;
}

export interface ParamDecl {
  name: string;
  value: number;
  measured: number;
  snapped: boolean;
  grid: number;
  description: string;
}

export interface FaceRef {
  byNormal: AxisLabel;
  level: number;
  near?: V3;
}

export type LoopOut = { kind: 'circle'; cx: number; cy: number; r: number } | { kind: 'path'; prims: ProfilePrim[] };

/** How a block's outline is written: param-driven corners, a param circle, or literal coordinates. */
export type ProfileOut =
  | { kind: 'corners'; corners: CornerExpr[] }
  | { kind: 'circle'; cx: string; cy: string; r: string };

export type OutlineKind = 'rectangle' | 'rectilinear' | 'circle' | 'literal';

/** How a block's corner rounds are written: edge fillets, tangent arcs in the profile, or none. */
export type RoundsKind = 'fillet' | 'arcs' | 'none';

export type BodyPlan =
  | { kind: 'revolve'; steps: Array<{ r: number; z0: number; z1: number; rParam: string; hParam: string }> }
  | {
      kind: 'extrude';
      blocks: Array<{
        z0: number;
        z1: number;
        loops: LoopOut[];
        hParam: string;
        outline: OutlineKind;
        rounds: RoundsKind;
        /** Param-driven outline; absent for a literal one (then `loops` is emitted). */
        profile?: ProfileOut;
      }>;
    };

export type Op =
  | {
      kind: 'holes';
      name: string;
      axis: 'Z' | 'X' | 'Y';
      face: FaceRef;
      positions: Array<{ u: number; v: number; at: V3 }>;
      diameter: number;
      diameterParam: string;
      depth: number | 'through';
      depthParam?: string;
      counterbore?: { diameter: number; depth: number; diameterParam: string; depthParam: string };
    }
  | { kind: 'cutout'; name: string; face: FaceRef; prims: ProfilePrim[]; depth: number; depthParam: string; at: V3 }
  | { kind: 'subtractCylinder'; name: string; axis: 'Z' | 'X' | 'Y'; base: V3; length: number; radius: number }
  | { kind: 'subtractPrism'; name: string; prims: ProfilePrim[]; z0: number; length: number }
  | { kind: 'fillet'; groups: Array<{ radius: number; radiusParam: string; edgeCount: number; selectors: Array<EdgeQueryOut | undefined> }> };

export interface EntrySideAssumption {
  feature: string;
  statement: string;
}

export interface FeaturePlan {
  pass: PassParams;
  /** Canonical-frame offset: q_emitted = q_canonical − origin. */
  origin: V3;
  body: BodyPlan;
  ops: Op[];
  params: ParamDecl[];
  /** Snaps applied to literal (non-param) coordinates. */
  literalSnaps: SnapRecord[];
  entryAssumptions: EntrySideAssumption[];
  /** Geometry this pass saw but could not express. */
  notRepresented: string[];
  holeSummary: Array<{ name: string; axis: 'Z' | 'X' | 'Y'; count: number; diameterMm: number; kind: 'through' | 'blind'; counterbore?: { diameterMm: number; depthMm: number } }>;
  /** Tangent corner arcs turned into sharp corners (sharpenCorners passes). */
  sharpenedArcs: number;
}

export interface BandLoops {
  z0: number;
  z1: number;
  /** Snapped loops, emitted-frame coordinates. */
  loops: FittedLoop[];
  /** Raw (unsnapped) loops in the same frame, index-aligned. */
  raw: FittedLoop[];
  polys: Float64Array[];
  depth: number[];
  /** Corner rounds of the outer outline made sharp (sharpenCorners passes). */
  sharpened: number;
}

export const DEG = Math.PI / 180;
