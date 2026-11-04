// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/estimateCost.ts
//
// MCP `estimate_cost`. Measures part volume, bounding box, declared material,
// FabProcess and StockSpec, then prices them with the shared offline heuristic.
// Supplier quotes stay out of this repository.

import { evaluateAndBuildScript } from '../../cli/commands/evaluate';
import type { Assembly } from '../../../modeling/capture/assembly';
import { resolveParts } from '../../../modeling/runtime/dfm/runDfmChecks';
import { inferredProcess } from '../../script-runtime/bom';
import type { ShapeBackend } from '../../../kernel/backends/backend';
import type { BuiltModel } from '../../../modeling/buildModel';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import { isFabProcess, type FabProcess } from '../../../shared/fab';
import {
  estimateJob,
  OFFLINE_ESTIMATE_CURRENCY_LABEL,
  OFFLINE_ESTIMATE_DISCLAIMER,
  OFFLINE_ESTIMATE_LABEL,
  type JobPart,
  type OfflineEstimateFailure,
  type OfflineEstimateResult,
} from '../../../shared/cost/offlineEstimate';

export interface EstimateCostInput {
  file?: string;
  code?: string;
  /** Omit to compare 3d-print, cnc, and sheet-cut. */
  process?: FabProcess;
  /** Engineering material name. Overrides a part's declared material. */
  material?: string;
  /** Copies of the whole model. Default 1. */
  quantity?: number;
}

/** MCP output: offline estimate plus optional purchased-part skip list. */
export type EstimateCostOutput = OfflineEstimateResult & {
  skippedPurchased?: string[];
};

const NO_GEOMETRY = 'estimate.no-geometry' as const;

export async function estimateCostTool(input: EstimateCostInput): Promise<EstimateCostOutput> {
  if (input.process !== undefined && !isFabProcess(input.process)) {
    return refused('estimate.invalid-args', "process must be one of '3d-print', 'cnc', or 'sheet-cut'.");
  }
  if (input.code === undefined && input.file === undefined) {
    return refused('estimate.invalid-args', 'Pass file or code.');
  }
  const { evaluation, model } = await evaluateAndBuildScript({ file: input.file, code: input.code });
  if (model === undefined) {
    const message = evaluation.diagnostics[0]?.message ?? 'Script produced no solid geometry.';
    return refused(NO_GEOMETRY, message);
  }
  const collected = await collectParts(model);
  if (collected.parts.length === 0) {
    const purchased = collected.skippedPurchased.length > 0
      ? ` Purchased parts are not priced offline: ${collected.skippedPurchased.join(', ')}.`
      : '';
    return refused(NO_GEOMETRY, `No fabricated solid to estimate.${purchased}`);
  }
  const estimate = estimateJob({
    parts: collected.parts,
    process: input.process,
    material: input.material,
    quantity: input.quantity,
  });
  return collected.skippedPurchased.length > 0 ? { ...estimate, skippedPurchased: collected.skippedPurchased } : estimate;
}

function refused(errorCode: OfflineEstimateFailure['errorCode'], error: string): EstimateCostOutput {
  return {
    ok: false,
    quote: false,
    heuristic: true,
    currencyLabel: OFFLINE_ESTIMATE_CURRENCY_LABEL,
    label: OFFLINE_ESTIMATE_LABEL,
    disclaimer: OFFLINE_ESTIMATE_DISCLAIMER,
    errorCode,
    error,
  };
}

interface Collected {
  parts: JobPart[];
  skippedPurchased: string[];
}

async function collectParts(model: BuiltModel): Promise<Collected> {
  const assemblies = [...(model.session.assemblies as Map<string, Assembly>).values()];
  if (assemblies.length > 0) return collectAssemblyParts(model, assemblies);
  return { parts: singleShapeParts(model), skippedPurchased: [] };
}

async function collectAssemblyParts(model: BuiltModel, assemblies: readonly Assembly[]): Promise<Collected> {
  const parts: JobPart[] = [];
  const skippedPurchased: string[] = [];
  for (const arm of assemblies) {
    for (const part of arm.__parts()) {
      if (purchased(model.records, part.originalShape.id)) {
        skippedPurchased.push(part.name);
        continue;
      }
      const lowered = await part.originalShape.lower();
      const measured = measure(part.name, lowered);
      if (measured === undefined) continue;
      parts.push({
        ...measured,
        declaredMaterial: part.material,
        declaredDensityKgPerM3: part.density,
        modelProcess: part.process ?? inferredProcess(model.records, part.originalShape.id),
        processSource: part.process !== undefined ? 'declared' : 'inferred',
        ...(part.stock !== undefined ? { stock: part.stock } : {}),
      });
    }
  }
  return { parts, skippedPurchased };
}

function singleShapeParts(model: BuiltModel): JobPart[] {
  const parts: JobPart[] = [];
  for (const part of resolveParts(model).parts) {
    const measured = measure(part.name, part.shape);
    if (measured === undefined) continue;
    const record = model.records.find(item => model.shapes.get(item.id) === part.shape);
    parts.push({
      ...measured,
      modelProcess: record === undefined ? '3d-print' : inferredProcess(model.records, record.id),
      processSource: 'inferred',
    });
  }
  return parts;
}

function purchased(records: readonly FeatureRecord[], shapeId: string): boolean {
  return records.find(record => record.id === shapeId)?.metadata?.catalogPart !== undefined;
}

function measure(name: string, shape: ShapeBackend): Pick<JobPart, 'name' | 'geometry'> | undefined {
  const volumeMm3 = shape.volume();
  const box = shape.boundingBox({ exact: true });
  const bboxMm = {
    x: box.max[0] - box.min[0],
    y: box.max[1] - box.min[1],
    z: box.max[2] - box.min[2],
  };
  if (!(volumeMm3 > 0) || !(bboxMm.x > 0 && bboxMm.y > 0 && bboxMm.z > 0)) return undefined;
  return { name, geometry: { volumeMm3, bboxMm } };
}
