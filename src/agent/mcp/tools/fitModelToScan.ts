// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// MCP `fit_model_to_scan`. Measures the script with the existing bbox path
// and compares it to a scan file or an inline envelope. The scan is not a solid.

import { evaluateAndBuildScript, type EvaluateAndBuildResult } from '../../cli/commands/evaluate';
import {
  fitBboxToScan,
  parseScanBytes,
  scanRefused,
  type FitRequirement,
  type FitResult,
  type ScanBBox,
  type ScanReference,
  type Vec3,
} from '../../../shared/scan';
import { measuredModelBbox } from './modelBbox';
import { decodeScanData, isScanFailure, readScanFile } from './scanBytes';

export interface FitModelInput {
  file?: string;
  code?: string;
  scan_file?: string;
  scan_data?: string;
  scan_bbox?: unknown;
  units?: unknown;
  max_points?: unknown;
  requirement?: unknown;
}

type ScanSide = {
  bbox: ScanBBox;
  format?: ScanReference['format'];
  point_count?: number;
};

function asVec3(raw: unknown): Vec3 | undefined {
  if (!Array.isArray(raw) || raw.length !== 3) return undefined;
  if (!raw.every(value => typeof value === 'number' && Number.isFinite(value))) return undefined;
  return [raw[0], raw[1], raw[2]];
}

function readScanBBox(raw: unknown): ScanBBox | string {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return 'scan_bbox must be an object with min_mm and max_mm';
  const record = raw as Record<string, unknown>;
  const min = asVec3(record.min_mm ?? record.min);
  const max = asVec3(record.max_mm ?? record.max);
  if (!min || !max) return 'scan_bbox min_mm and max_mm must be three finite millimetre coordinates';
  return { min, max, size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]] };
}

function readRequirement(raw: unknown): FitRequirement | undefined | string {
  if (raw === undefined) return undefined;
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return 'requirement must be an object';
  const value = (raw as Record<string, unknown>).min_clearance_mm;
  if (value === undefined) return {};
  if (typeof value !== 'number') return 'requirement.min_clearance_mm must be a number';
  return { min_clearance_mm: value };
}

function modelSource(input: FitModelInput): { file?: string; code?: string } | string {
  if (input.file !== undefined && input.code !== undefined) return 'Pass file or code, not both.';
  if (typeof input.file === 'string') return { file: input.file };
  if (typeof input.code === 'string') return { code: input.code };
  return 'Pass file or code for the parametric model.';
}

function scanFromBytes(bytes: Uint8Array, input: FitModelInput): ScanSide | string {
  const parsed = parseScanBytes(bytes, { units: input.units, maxPoints: input.max_points });
  if (!parsed.ok) return parsed.error;
  return { bbox: parsed.bbox, format: parsed.format, point_count: parsed.pointCount };
}

function resolveScan(input: FitModelInput): ScanSide | string {
  const hasFile = input.scan_file !== undefined;
  const hasData = input.scan_data !== undefined;
  const hasBox = input.scan_bbox !== undefined;
  const sources = Number(hasFile) + Number(hasData) + Number(hasBox);
  if (sources > 1) return 'Pass scan_file, scan_data, or scan_bbox, not more than one.';
  if (hasBox) {
    if (input.units !== undefined) return 'units applies to scan_file or scan_data. scan_bbox is already millimetres.';
    const box = readScanBBox(input.scan_bbox);
    return typeof box === 'string' ? box : { bbox: box };
  }
  if (typeof input.scan_file === 'string') {
    const bytes = readScanFile(input.scan_file);
    if (isScanFailure(bytes)) return bytes.error;
    return scanFromBytes(bytes, input);
  }
  if (typeof input.scan_data === 'string') {
    const bytes = decodeScanData(input.scan_data);
    if (isScanFailure(bytes)) return bytes.error;
    return scanFromBytes(bytes, input);
  }
  return 'Pass scan_file, scan_data, or scan_bbox.';
}

function failureMessage(built: EvaluateAndBuildResult): string {
  const diagnostic = built.evaluation.diagnostics.find(item => item.severity === 'error');
  return diagnostic?.message ?? 'Script produced no measurable solid.';
}

async function measureBuilt(model: { file?: string; code?: string }): Promise<ScanBBox | string> {
  const built = await evaluateAndBuildScript(model);
  const root = built.model?.rootShape ?? built.model?.tailShape;
  if (built.evaluation.exitCode !== 0 || root === undefined) return failureMessage(built);
  try {
    const bbox = measuredModelBbox(root);
    return bbox ?? 'Script produced no measurable solid.';
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Could not measure the model bbox: ${message}`;
  }
}

function attachScanMeta(fit: FitResult, scan: ScanSide): FitResult & { scan_format?: string; scan_point_count?: number } {
  if (!fit.ok || scan.format === undefined) return fit;
  return { ...fit, scan_format: scan.format, scan_point_count: scan.point_count };
}

export async function fitModelToScanTool(input: FitModelInput): Promise<FitResult & { scan_format?: string; scan_point_count?: number }> {
  const model = modelSource(input);
  if (typeof model === 'string') return scanRefused(model);
  const requirement = readRequirement(input.requirement);
  if (typeof requirement === 'string') return scanRefused(requirement);
  const scan = resolveScan(input);
  if (typeof scan === 'string') return scanRefused(scan);
  const bbox = await measureBuilt(model);
  if (typeof bbox === 'string') return scanRefused(bbox);
  return attachScanMeta(fitBboxToScan(bbox, scan.bbox, requirement), scan);
}
