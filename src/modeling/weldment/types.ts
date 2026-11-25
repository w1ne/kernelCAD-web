// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { Vec3 } from '../../shared/intent/types';
import type { Shape } from '../capture/proxy';

export type SquareTubeProfile = {
  kind: 'square-tube';
  size: number;
  wall: number;
};

export type RectTubeProfile = {
  kind: 'rect-tube';
  width: number;
  height: number;
  wall: number;
};

export type RoundTubeProfile = {
  kind: 'round-tube';
  outerDiameter: number;
  wall: number;
};

export type AngleProfile = {
  kind: 'angle';
  legA: number;
  legB: number;
  thickness: number;
};

export type CChannelProfile = {
  kind: 'c-channel';
  width: number;
  height: number;
  thickness: number;
};

export type FlatBarProfile = {
  kind: 'flat-bar';
  width: number;
  thickness: number;
};

export type StructuralProfile =
  | SquareTubeProfile
  | RectTubeProfile
  | RoundTubeProfile
  | AngleProfile
  | CChannelProfile
  | FlatBarProfile;

/** Half-space trim plane: material on `(p - point) · normal <= 0` is kept; `+normal` side is trimmed away. */
export interface TrimPlaneSpec {
  point: Vec3;
  normal: Vec3;
}

export interface StructuralMemberOptions {
  profile: StructuralProfile;
  /** Optional reference up direction for cross-section height axis (must not be parallel to `to - from`). */
  up?: Vec3;
  /** Half-space cut at the start end; keeps `(p - point) · normal <= 0`. */
  startTrimPlane?: TrimPlaneSpec;
  /** Half-space cut at the end; keeps `(p - point) · normal <= 0`. */
  endTrimPlane?: TrimPlaneSpec;
  /** Non-negative extrusion extension past `from` before trimming (mm, default 0). */
  extendStart?: number;
  /** Non-negative extrusion extension past `to` before trimming (mm, default 0). */
  extendEnd?: number;
}

export type WeldmentTrimMode = 'miter' | 'butt' | 'none';

export interface WeldmentMemberSpec {
  from: Vec3;
  to: Vec3;
  profile: StructuralProfile;
  up?: Vec3;
  trim?: WeldmentTrimMode;
  label?: string;
}

export interface WeldmentFrameOptions {
  /** Default joint trim mode when a member does not override `trim` (default `'miter'`). */
  cornerTrim?: WeldmentTrimMode;
  /** When true, fuse all members into one solid with `union()`; otherwise return a lossless compound Shape (default false). */
  fuse?: boolean;
}

export interface WeldmentCutItem {
  index: number;
  label: string;
  profile: StructuralProfile;
  nominalLength: number;
  cutLength: number;
  startCutAngleDeg: number;
  endCutAngleDeg: number;
  crossSectionArea: number;
}

export interface WeldmentFrameResult {
  members: Shape[];
  cutList: WeldmentCutItem[];
  combined: Shape;
}

export interface GussetOptions {
  /** Leg length along `dirA` (mm, > 0). */
  legA: number;
  /** Leg length along `dirB` (mm, > 0). */
  legB: number;
  /** Plate extrusion thickness normal to the `(dirA, dirB)` plane (mm, > 0). */
  thickness: number;
  /** Inner corner weld-bead chamfer setback along both legs from `corner` (mm, >= 0, default 0). */
  cornerRelief?: number;
  /** Outer tip snipe setback along each leg (mm, >= 0, default 0). */
  tipChamfer?: number;
  /** Plate midplane offset along `normalize(dirA × dirB)` (mm, default 0 = centered on plane). */
  offset?: number;
}
