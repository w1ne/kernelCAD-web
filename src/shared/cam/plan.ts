// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Order a bbox mill plan. Callers pass a measured part box and a StockSpec.

import { emitMillGcode } from './gcode';
import { round3, round3Vec } from './geometry';
import { buildDrill, buildFacing, buildPocket, buildProfile, type BuiltOp, type CutContext } from './ops';
import { placePart, stockSizeMm, stockWire } from './stockBox';
import {
  CAM_DISCLAIMER,
  CAM_ORIGIN,
  CAM_ORIGIN_NOTE,
  DEFAULT_FEED_MM_MIN,
  DEFAULT_RAPID_MM_MIN,
  DEFAULT_SAFE_CLEARANCE_MM,
  DEFAULT_SPINDLE_RPM,
  DEFAULT_STEPOVER,
  VOLUME_PROXY_WARNING,
  type CamHole,
  type CamOp,
  type CamOpKind,
  type CamTool,
  type MillPlan,
  type MillPlanFailure,
  type MillPlanSuccess,
  type PlanMillInput,
  type Vec3,
} from './types';

const OP_KINDS = new Set<CamOpKind>(['facing', 'profile', 'pocket', 'drill']);
const FEED_LABEL = 'Heuristic feeds for a small carbide end mill. They are not a material model.';

function refuse(error: string): MillPlanFailure {
  return { ok: false, errorCode: 'cli.invalid-args', error, disclaimer: CAM_DISCLAIMER };
}

function positive(value: number, label: string): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return `${label} must be a positive finite number`;
  }
  return null;
}

function readTool(tool: CamTool): { tool: CamTool; warnings: string[] } | string {
  const diameterError = positive(tool?.diameter_mm, 'tool_diameter_mm');
  if (diameterError) return diameterError;
  if (tool.flute_length_mm !== undefined && positive(tool.flute_length_mm, 'flute_length_mm')) {
    return 'flute_length_mm must be a positive finite number';
  }
  const corner = tool.corner_radius_mm;
  if (corner !== undefined && (typeof corner !== 'number' || !Number.isFinite(corner) || corner < 0 || corner > tool.diameter_mm / 2)) {
    return 'corner_radius_mm must be from 0 up to half the tool diameter';
  }
  const warnings = corner !== undefined && corner > 0
    ? ['corner_radius_mm is recorded and is not applied to the 2.5D offset. The tool is treated as a flat end mill.']
    : [];
  return { tool, warnings };
}

function readStepover(value: number | undefined): number | string {
  if (value === undefined) return DEFAULT_STEPOVER;
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > 1) {
    return 'stepover must be a fraction of the tool diameter, greater than 0 and at most 1';
  }
  return value;
}

function readStepdown(requested: number | undefined, diameter: number, flute: number | undefined): { step: number; warning?: string } | string {
  if (requested !== undefined && positive(requested, 'stepdown_mm')) return 'stepdown_mm must be a positive finite number';
  const step = requested ?? Math.min(diameter * 0.5, flute ?? Number.POSITIVE_INFINITY);
  if (flute !== undefined && step > flute + 1e-9) {
    return { step: flute, warning: `stepdown_mm ${step} mm is deeper than the flute. Clamped to ${flute} mm.` };
  }
  return { step };
}

function readSafeZ(value: number | undefined, stockTop: number): number | string {
  const safe = value ?? stockTop + DEFAULT_SAFE_CLEARANCE_MM;
  if (typeof safe !== 'number' || !Number.isFinite(safe) || !(safe > stockTop)) {
    return `safe_z_mm must be a finite Z above the stock top (${stockTop} mm)`;
  }
  return safe;
}

function readOps(ops: PlanMillInput['ops'], hasHoles: boolean): CamOpKind[] | string {
  if (ops === undefined) return hasHoles ? ['facing', 'profile', 'drill'] : ['facing', 'profile'];
  if (!Array.isArray(ops) || ops.length === 0) return 'ops must list facing, profile, pocket, or drill';
  for (const op of ops) {
    if (!OP_KINDS.has(op)) return `unknown op '${String(op)}'. Use facing, profile, pocket, or drill.`;
  }
  return ops;
}

function readHole(raw: CamHole, index: number): string | null {
  if (typeof raw?.x_mm !== 'number' || !Number.isFinite(raw.x_mm)) return `holes[${index}].x_mm must be a finite number`;
  if (typeof raw?.y_mm !== 'number' || !Number.isFinite(raw.y_mm)) return `holes[${index}].y_mm must be a finite number`;
  if (typeof raw?.depth_mm !== 'number' || !Number.isFinite(raw.depth_mm) || raw.depth_mm <= 0) {
    return `holes[${index}].depth_mm must be a positive finite number`;
  }
  return null;
}

function readHoles(holes: PlanMillInput['holes']): CamHole[] | string {
  if (holes === undefined) return [];
  if (!Array.isArray(holes)) return 'holes must be an array of { x_mm, y_mm, depth_mm }';
  for (let index = 0; index < holes.length; index += 1) {
    const problem = readHole(holes[index], index);
    if (problem) return problem;
  }
  return holes;
}

interface Motion {
  spindle: number;
  feed: number;
  plunge: number;
  stepdown: number;
  stepover: number;
  safeZ: number;
  warnings: string[];
}

function readMotion(input: PlanMillInput, stockTop: number, diameter: number, flute: number | undefined): Motion | string {
  const spindle = input.spindle_rpm ?? DEFAULT_SPINDLE_RPM;
  const feed = input.feed_mm_min ?? DEFAULT_FEED_MM_MIN;
  const spindleError = positive(spindle, 'spindle_rpm');
  if (spindleError) return spindleError;
  const feedError = positive(feed, 'feed_mm_min');
  if (feedError) return feedError;
  const stepover = readStepover(input.stepover);
  if (typeof stepover === 'string') return stepover;
  const stepped = readStepdown(input.stepdown_mm, diameter, flute);
  if (typeof stepped === 'string') return stepped;
  const safeZ = readSafeZ(input.safe_z_mm, stockTop);
  if (typeof safeZ === 'string') return safeZ;
  if (input.conventional !== undefined && typeof input.conventional !== 'boolean') return 'conventional must be a boolean';
  const warnings: string[] = [];
  if (stepped.warning) warnings.push(stepped.warning);
  if (input.spindle_rpm === undefined || input.feed_mm_min === undefined) {
    warnings.push(`Using heuristic spindle ${DEFAULT_SPINDLE_RPM} rpm and feed ${DEFAULT_FEED_MM_MIN} mm/min where a value was omitted.`);
  }
  return { spindle, feed, plunge: feed / 2, stepdown: stepped.step, stepover, safeZ, warnings };
}

function buildOp(kind: CamOpKind, ctx: CutContext): BuiltOp | string {
  if (kind === 'facing') return buildFacing(ctx);
  if (kind === 'profile') return buildProfile(ctx);
  if (kind === 'pocket') return buildPocket(ctx);
  return buildDrill(ctx);
}

function partBox(input: PlanMillInput, size: Vec3) {
  return {
    min_mm: round3Vec(input.part_bbox.min_mm),
    max_mm: round3Vec(input.part_bbox.max_mm),
    size_mm: round3Vec(size),
  };
}

function toolWire(tool: CamTool): CamTool {
  return {
    diameter_mm: tool.diameter_mm,
    ...(tool.flute_length_mm !== undefined ? { flute_length_mm: tool.flute_length_mm } : {}),
    ...(tool.corner_radius_mm !== undefined ? { corner_radius_mm: tool.corner_radius_mm } : {}),
  };
}

function assemble(input: PlanMillInput, ctx: CutContext, motion: Motion, ops: CamOp[], warnings: string[], partSize: Vec3): MillPlanSuccess {
  return {
    ok: true,
    origin: CAM_ORIGIN,
    origin_note: CAM_ORIGIN_NOTE,
    part_bbox: partBox(input, partSize),
    part_in_stock_mm: {
      min_mm: round3Vec([ctx.partMinX, ctx.partMinY, 0]),
      max_mm: round3Vec([ctx.partMaxX, ctx.partMaxY, ctx.partTop]),
    },
    stock: stockWire(input.stock, ctx.stock),
    tool: toolWire(input.tool),
    feeds: {
      spindle_rpm: motion.spindle,
      feed_mm_min: motion.feed,
      plunge_mm_min: motion.plunge,
      rapid_mm_min: DEFAULT_RAPID_MM_MIN,
      stepdown_mm: motion.stepdown,
      stepover: motion.stepover,
      safe_z_mm: motion.safeZ,
      heuristic: true,
      label: FEED_LABEL,
    },
    ops,
    time_s: round3(ops.reduce((sum, op) => sum + op.time_s, 0)),
    removed_volume_mm3: round3(ops.reduce((sum, op) => sum + op.removed_volume_mm3, 0)),
    warnings,
    disclaimer: CAM_DISCLAIMER,
  };
}

function cutContext(input: PlanMillInput, motion: Motion, placed: Exclude<ReturnType<typeof placePart>, string>, size: Vec3, holes: CamHole[]): CutContext {
  return {
    stock: size,
    partMinX: placed.partInStock.min_mm[0],
    partMinY: placed.partInStock.min_mm[1],
    partMaxX: placed.partInStock.max_mm[0],
    partMaxY: placed.partInStock.max_mm[1],
    partTop: placed.partInStock.max_mm[2],
    partSizeX: placed.partSize[0],
    partSizeY: placed.partSize[1],
    diameter: input.tool.diameter_mm,
    radius: input.tool.diameter_mm / 2,
    stepdown: motion.stepdown,
    stepoverMm: motion.stepover * input.tool.diameter_mm,
    safeZ: motion.safeZ,
    plunge: motion.plunge,
    feed: motion.feed,
    clockwise: input.conventional !== true,
    pocketFloor: input.pocket_floor_z_mm,
    holes,
  };
}

export function planMill(input: PlanMillInput): MillPlan {
  const tool = readTool(input.tool);
  if (typeof tool === 'string') return refuse(tool);
  const size = stockSizeMm(input.stock);
  if (typeof size === 'string') return refuse(size);
  const placed = placePart(input.part_bbox, size);
  if (typeof placed === 'string') return refuse(placed);
  const motion = readMotion(input, size[2], tool.tool.diameter_mm, tool.tool.flute_length_mm);
  if (typeof motion === 'string') return refuse(motion);
  const ops = readOps(input.ops, (input.holes?.length ?? 0) > 0);
  if (typeof ops === 'string') return refuse(ops);
  const holes = readHoles(input.holes);
  if (typeof holes === 'string') return refuse(holes);
  if (ops.includes('drill') && holes.length === 0) return refuse('drill needs holes: an array of { x_mm, y_mm, depth_mm }.');
  const ctx = cutContext(input, motion, placed, size, holes);
  const built: CamOp[] = [];
  const warnings = [...tool.warnings, ...motion.warnings];
  for (const kind of ops) {
    const op = buildOp(kind, ctx);
    if (typeof op === 'string') return refuse(op);
    built.push(op.op);
    warnings.push(...op.warnings);
  }
  warnings.push(VOLUME_PROXY_WARNING);
  const plan = assemble(input, ctx, motion, built, warnings, placed.partSize);
  if (input.include_gcode) plan.gcode = emitMillGcode(plan);
  return plan;
}
