// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// MCP `plan_cnc_toolpaths`. Measures the script with the existing bbox path
// and plans mill moves. This is not the FDM slicer G-code export.

import { evaluateAndBuildScript, type EvaluateAndBuildResult } from '../../cli/commands/evaluate';
import { CAM_DISCLAIMER, planMill, type CamHole, type CamOpKind, type CamTool, type MillPlan, type PlanMillInput } from '../../../shared/cam';
import { isKernelError } from '../../../shared/intent/kernelError';
import { parseStockSpec, type StockSpec } from '../../../shared/stock';
import { measuredModelBbox } from './modelBbox';

const SEGMENT_CAP = 800;

export interface PlanCncInput {
  file?: string;
  code?: string;
  stock?: unknown;
  tool_diameter_mm?: unknown;
  flute_length_mm?: unknown;
  corner_radius_mm?: unknown;
  ops?: unknown;
  holes?: unknown;
  stepdown_mm?: unknown;
  stepover?: unknown;
  safe_z_mm?: unknown;
  spindle_rpm?: unknown;
  feed_mm_min?: unknown;
  conventional?: unknown;
  pocket_floor_z_mm?: unknown;
  include_gcode?: unknown;
}

function refused(error: string): MillPlan {
  return { ok: false, errorCode: 'cli.invalid-args', error, disclaimer: CAM_DISCLAIMER };
}

function modelSource(input: PlanCncInput): { file?: string; code?: string } | string {
  if (input.file !== undefined && input.code !== undefined) return 'Pass file or code, not both.';
  if (typeof input.file === 'string') return { file: input.file };
  if (typeof input.code === 'string') return { code: input.code };
  return 'Pass file or code for the parametric model.';
}

const STOCK_FIELDS = ['length', 'width', 'height', 'thickness', 'diameter'] as const;

function stockSpec(raw: unknown): StockSpec | string {
  if (raw === undefined) return 'stock is required. Pass a plate, blank, or bar.';
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return 'stock must be an object.';
  const record = raw as Record<string, unknown>;
  if (record.kind === 'filament') return 'Filament stock is not a milling blank. Use plate, blank, or bar.';
  const camel: Record<string, unknown> = { kind: record.kind };
  for (const field of STOCK_FIELDS) {
    const value = record[`${field}_mm`] ?? record[`${field}Mm`];
    if (value !== undefined) camel[`${field}Mm`] = value;
  }
  try {
    return parseStockSpec(camel, { partName: 'part' });
  } catch (error) {
    if (isKernelError(error)) return error.message;
    return error instanceof Error ? error.message : String(error);
  }
}

function definedNumber(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  return value as number;
}

function toolFrom(input: PlanCncInput): CamTool {
  const tool: CamTool = { diameter_mm: input.tool_diameter_mm as number };
  if (input.flute_length_mm !== undefined) tool.flute_length_mm = input.flute_length_mm as number;
  if (input.corner_radius_mm !== undefined) tool.corner_radius_mm = input.corner_radius_mm as number;
  return tool;
}

function failureMessage(built: EvaluateAndBuildResult): string {
  const diagnostic = built.evaluation.diagnostics.find(item => item.severity === 'error');
  return diagnostic?.message ?? 'Script produced no measurable solid.';
}

async function partBbox(model: { file?: string; code?: string }): Promise<PlanMillInput['part_bbox'] | string> {
  const built = await evaluateAndBuildScript(model);
  const root = built.model?.rootShape ?? built.model?.tailShape;
  if (built.evaluation.exitCode !== 0 || root === undefined) return failureMessage(built);
  try {
    const bbox = measuredModelBbox(root);
    if (!bbox) return 'Script produced no measurable solid.';
    return { min_mm: bbox.min, max_mm: bbox.max };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Could not measure the model bbox: ${message}`;
  }
}

function compact(plan: MillPlan): MillPlan {
  if (!plan.ok) return plan;
  const warnings = [...plan.warnings];
  const ops = plan.ops.map(op => {
    if (op.segments.length <= SEGMENT_CAP) return op;
    warnings.push(`${op.kind} has ${op.segments.length} segments. Returning path stats only.`);
    return { ...op, segments: [], segments_omitted: true };
  });
  return { ...plan, ops, warnings };
}

export async function planCncToolpathsTool(input: PlanCncInput): Promise<MillPlan> {
  if (input.include_gcode !== undefined && typeof input.include_gcode !== 'boolean') {
    return refused('include_gcode must be a boolean');
  }
  const model = modelSource(input);
  if (typeof model === 'string') return refused(model);
  const stock = stockSpec(input.stock);
  if (typeof stock === 'string') return refused(stock);
  const bbox = await partBbox(model);
  if (typeof bbox === 'string') return refused(bbox);
  const request: PlanMillInput = {
    part_bbox: bbox,
    stock,
    tool: toolFrom(input),
    ops: input.ops as CamOpKind[] | undefined,
    holes: input.holes as CamHole[] | undefined,
    stepdown_mm: definedNumber(input.stepdown_mm),
    stepover: definedNumber(input.stepover),
    safe_z_mm: definedNumber(input.safe_z_mm),
    spindle_rpm: definedNumber(input.spindle_rpm),
    feed_mm_min: definedNumber(input.feed_mm_min),
    conventional: input.conventional as boolean | undefined,
    pocket_floor_z_mm: definedNumber(input.pocket_floor_z_mm),
    include_gcode: input.include_gcode,
  };
  return compact(planMill(request));
}
