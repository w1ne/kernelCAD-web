// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Bounding-box mill plan. Coordinates are millimetres. This is not a
// controller post and it does not inspect the solid.

import type { StockSpec } from '../stock';

export const CAM_DISCLAIMER =
  'bbox 2.5D heuristic; not collision-checked; not a machine-ready post for every controller.';

export const CAM_ORIGIN = 'stock_corner' as const;

export const CAM_ORIGIN_NOTE =
  'Machine origin is the stock minimum corner. +X follows stock length, +Y follows stock width, and +Z is up from the stock bottom. The part bounding box is centered in XY and seated on Z=0. Model coordinates are not preserved.';

/** Labelled stand-in for a small carbide end mill. Not a material model. */
export const DEFAULT_SPINDLE_RPM = 10_000;
export const DEFAULT_FEED_MM_MIN = 600;
export const DEFAULT_RAPID_MM_MIN = 5_000;
export const DEFAULT_STEPOVER = 0.4;
export const DEFAULT_SAFE_CLEARANCE_MM = 5;

export const VOLUME_PROXY_WARNING =
  'removed_volume_mm3 is a per-op proxy and can double-count stock that more than one op would cut.';

export type Vec3 = [number, number, number];

export type CamOpKind = 'facing' | 'profile' | 'pocket' | 'drill';

export interface AxisBox {
  min_mm: Vec3;
  max_mm: Vec3;
}

export interface CamTool {
  diameter_mm: number;
  flute_length_mm?: number;
  /** Recorded only. The 2.5D offset treats the tool as a flat end mill. */
  corner_radius_mm?: number;
}

export interface CamHole {
  x_mm: number;
  y_mm: number;
  /** Positive distance down from the stock top, in the stock-corner frame. */
  depth_mm: number;
}

export interface CamSegment {
  motion: 'rapid' | 'feed';
  x_mm: number;
  y_mm: number;
  z_mm: number;
  feed_mm_min?: number;
}

export interface CamDrillCycle {
  x_mm: number;
  y_mm: number;
  /** Absolute hole-bottom Z in the stock-corner frame. */
  z_mm: number;
  depth_mm: number;
  cycle: 'G81' | 'G83';
  /** Peck increment for G83. One tool diameter. */
  peck_mm?: number;
}

export interface CamOp {
  kind: CamOpKind;
  segments: CamSegment[];
  segment_count: number;
  cut_length_mm: number;
  rapid_length_mm: number;
  time_s: number;
  removed_volume_mm3: number;
  holes?: CamDrillCycle[];
  /** Set when segment coordinates were dropped because the path is long. */
  segments_omitted?: boolean;
}

export interface CamFeeds {
  spindle_rpm: number;
  feed_mm_min: number;
  plunge_mm_min: number;
  rapid_mm_min: number;
  stepdown_mm: number;
  stepover: number;
  safe_z_mm: number;
  heuristic: true;
  label: string;
}

export interface MillPlanSuccess {
  ok: true;
  origin: typeof CAM_ORIGIN;
  origin_note: string;
  part_bbox: AxisBox & { size_mm: Vec3 };
  part_in_stock_mm: AxisBox;
  stock: { kind: string; size_mm: Vec3; [key: string]: unknown };
  tool: CamTool;
  feeds: CamFeeds;
  ops: CamOp[];
  time_s: number;
  removed_volume_mm3: number;
  warnings: string[];
  disclaimer: string;
  gcode?: string;
}

export interface MillPlanFailure {
  ok: false;
  errorCode: 'cli.invalid-args';
  error: string;
  disclaimer: string;
}

export type MillPlan = MillPlanSuccess | MillPlanFailure;

export interface PlanMillInput {
  part_bbox: AxisBox;
  stock: StockSpec;
  tool: CamTool;
  ops?: CamOpKind[];
  holes?: CamHole[];
  stepdown_mm?: number;
  /** Fraction of tool diameter, in (0, 1]. */
  stepover?: number;
  /** Absolute safe Z in the stock-corner frame. Must clear the stock top. */
  safe_z_mm?: number;
  spindle_rpm?: number;
  feed_mm_min?: number;
  /** Outside profile direction. False (default) is climb for a clockwise spindle. */
  conventional?: boolean;
  /** Pocket floor Z in the stock-corner frame. Default is the part bottom, Z=0. */
  pocket_floor_z_mm?: number;
  include_gcode?: boolean;
}
