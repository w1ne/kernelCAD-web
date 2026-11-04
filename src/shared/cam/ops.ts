// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// One builder per 2.5D op. Facing covers the stock top. Profile is the part
// rectangle offset by the tool radius. Pocket rasters the part footprint.
// Drill is a hole list, pecked when deeper than three diameters.

import { insetRect, linkLayers, pathLengths, rasterPoints, rectPoints, round3, zLevels, type Rect } from './geometry';
import type { CamDrillCycle, CamHole, CamOp, CamSegment, Vec3 } from './types';

export interface CutContext {
  stock: Vec3;
  partMinX: number;
  partMinY: number;
  partMaxX: number;
  partMaxY: number;
  partTop: number;
  partSizeX: number;
  partSizeY: number;
  diameter: number;
  radius: number;
  stepdown: number;
  stepoverMm: number;
  safeZ: number;
  plunge: number;
  feed: number;
  clockwise: boolean;
  pocketFloor?: number;
  holes: CamHole[];
}

export interface BuiltOp {
  op: CamOp;
  warnings: string[];
}

function finish(kind: CamOp['kind'], segments: CamSegment[], volume: number, holes?: CamDrillCycle[]): CamOp {
  const lengths = pathLengths(segments);
  const op: CamOp = {
    kind,
    segments,
    segment_count: segments.length,
    cut_length_mm: lengths.cut,
    rapid_length_mm: lengths.rapid,
    time_s: lengths.time,
    removed_volume_mm3: round3(volume),
  };
  if (holes) op.holes = holes;
  return op;
}

function layersAt(points: ReturnType<typeof rasterPoints>, top: number, floor: number, step: number) {
  return zLevels(top, floor, step).map(z => ({ z, points }));
}

export function buildFacing(ctx: CutContext): BuiltOp | string {
  const depth = ctx.stock[2] - ctx.partTop;
  if (depth <= 1e-9) {
    return {
      op: finish('facing', [], 0),
      warnings: ['Facing skipped: the stock top is already at the part top.'],
    };
  }
  const rect = insetRect(0, 0, ctx.stock[0], ctx.stock[1], ctx.radius);
  if (!rect) {
    return `tool_diameter_mm ${ctx.diameter} does not fit on the stock face ${ctx.stock[0]}x${ctx.stock[1]} mm.`;
  }
  const segments = linkLayers(layersAt(rasterPoints(rect, ctx.stepoverMm), ctx.stock[2], ctx.partTop, ctx.stepdown), ctx.safeZ, ctx.plunge, ctx.feed);
  return { op: finish('facing', segments, ctx.stock[0] * ctx.stock[1] * depth), warnings: [] };
}

function profileRect(ctx: CutContext): Rect {
  return {
    x0: ctx.partMinX - ctx.radius,
    y0: ctx.partMinY - ctx.radius,
    x1: ctx.partMaxX + ctx.radius,
    y1: ctx.partMaxY + ctx.radius,
  };
}

export function buildProfile(ctx: CutContext): BuiltOp {
  const rect = profileRect(ctx);
  const warnings = [
    'Profile finishes at the stock bottom (Z=0). No tabs are added.',
  ];
  const hangsOff = rect.x0 < ctx.radius - 1e-9
    || rect.y0 < ctx.radius - 1e-9
    || rect.x1 > ctx.stock[0] - ctx.radius + 1e-9
    || rect.y1 > ctx.stock[1] - ctx.radius + 1e-9;
  if (hangsOff) warnings.push('Profile cutter extends outside the stock. The path is the part outline, not a stock-bounded cut.');
  const points = rectPoints(rect, ctx.clockwise);
  const segments = linkLayers(layersAt(points, ctx.stock[2], 0, ctx.stepdown), ctx.safeZ, ctx.plunge, ctx.feed);
  const perimeter = 2 * ((ctx.partSizeX + ctx.diameter) + (ctx.partSizeY + ctx.diameter));
  return { op: finish('profile', segments, perimeter * ctx.diameter * ctx.stock[2]), warnings };
}

export function buildPocket(ctx: CutContext): BuiltOp | string {
  const floor = ctx.pocketFloor ?? 0;
  if (!Number.isFinite(floor) || floor < -1e-9 || floor >= ctx.stock[2] - 1e-9) {
    return `pocket_floor_z_mm must be below the stock top (${ctx.stock[2]} mm) and at or above the stock bottom.`;
  }
  const rect = insetRect(ctx.partMinX, ctx.partMinY, ctx.partMaxX, ctx.partMaxY, ctx.radius);
  if (!rect) {
    return `tool_diameter_mm ${ctx.diameter} does not fit inside the part footprint ${ctx.partSizeX}x${ctx.partSizeY} mm for a pocket.`;
  }
  const warnings = ctx.pocketFloor === undefined
    ? ['Pocket floor defaulted to the part bottom (Z=0), which clears the whole part footprint.']
    : [];
  const segments = linkLayers(layersAt(rasterPoints(rect, ctx.stepoverMm), ctx.stock[2], floor, ctx.stepdown), ctx.safeZ, ctx.plunge, ctx.feed);
  const volume = ctx.partSizeX * ctx.partSizeY * (ctx.stock[2] - floor);
  return { op: finish('pocket', segments, volume), warnings };
}

function holeProblem(hole: CamHole, ctx: CutContext, index: number): string | null {
  if (hole.x_mm < -1e-9 || hole.y_mm < -1e-9 || hole.x_mm > ctx.stock[0] + 1e-9 || hole.y_mm > ctx.stock[1] + 1e-9) {
    return `holes[${index}] at (${hole.x_mm}, ${hole.y_mm}) is outside the stock.`;
  }
  if (hole.depth_mm > ctx.stock[2] + 1e-9) {
    return `holes[${index}].depth_mm ${hole.depth_mm} goes below the stock bottom.`;
  }
  return null;
}

function expandHole(hole: CamHole, bottom: number, ctx: CutContext, cycle: CamDrillCycle['cycle']): CamSegment[] {
  const at = { x: hole.x_mm, y: hole.y_mm };
  const segments: CamSegment[] = [{ motion: 'rapid', x_mm: round3(at.x), y_mm: round3(at.y), z_mm: round3(ctx.safeZ) }];
  if (cycle === 'G81') {
    segments.push({ motion: 'feed', x_mm: round3(at.x), y_mm: round3(at.y), z_mm: round3(bottom), feed_mm_min: ctx.plunge });
    segments.push({ motion: 'rapid', x_mm: round3(at.x), y_mm: round3(at.y), z_mm: round3(ctx.safeZ) });
    return segments;
  }
  let cursor = ctx.stock[2];
  while (cursor > bottom + 1e-9) {
    const next = Math.max(bottom, cursor - ctx.diameter);
    segments.push({ motion: 'feed', x_mm: round3(at.x), y_mm: round3(at.y), z_mm: round3(next), feed_mm_min: ctx.plunge });
    segments.push({ motion: 'rapid', x_mm: round3(at.x), y_mm: round3(at.y), z_mm: round3(ctx.safeZ) });
    cursor = next;
  }
  return segments;
}

export function buildDrill(ctx: CutContext): BuiltOp | string {
  if (ctx.holes.length === 0) return 'drill needs holes: an array of { x_mm, y_mm, depth_mm }.';
  const cycles: CamDrillCycle[] = [];
  const segments: CamSegment[] = [];
  for (let index = 0; index < ctx.holes.length; index += 1) {
    const hole = ctx.holes[index];
    const problem = holeProblem(hole, ctx, index);
    if (problem) return problem;
    const cycle = hole.depth_mm > ctx.diameter * 3 ? 'G83' : 'G81';
    const drilled: CamDrillCycle = {
      x_mm: round3(hole.x_mm),
      y_mm: round3(hole.y_mm),
      z_mm: round3(ctx.stock[2] - hole.depth_mm),
      depth_mm: hole.depth_mm,
      cycle,
    };
    if (cycle === 'G83') drilled.peck_mm = ctx.diameter;
    cycles.push(drilled);
    segments.push(...expandHole(hole, drilled.z_mm, ctx, cycle));
  }
  const volume = cycles.reduce((sum, hole) => sum + Math.PI * (ctx.radius ** 2) * hole.depth_mm, 0);
  return { op: finish('drill', segments, volume, cycles), warnings: [] };
}
