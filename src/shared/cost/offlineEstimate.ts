// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/cost/offlineEstimate.ts
//
// Order-of-magnitude fabrication cost from volume, bounding box, and optional
// StockSpec. USD heuristics only. This is not a supplier quote and it does
// not call a partner pricing API. `price_part` stays out of this repository.

import { FAB_PROCESSES, isFabProcess, type FabProcess } from '../fab';
import {
  ACCEPTED_MATERIAL_NAMES,
  canonicalMaterialName,
  engineeringMaterialProps,
  type EngineeringMaterialName,
} from '../materials/engineeringMaterials';
import type { StockSpec } from '../stock';

export const OFFLINE_ESTIMATE_CURRENCY = 'USD';
export const OFFLINE_ESTIMATE_CURRENCY_LABEL = 'USD estimate';
export const OFFLINE_ESTIMATE_LABEL = 'offline-heuristic';
export const OFFLINE_ESTIMATE_DISCLAIMER =
  'Offline heuristic estimate. Not a supplier quote. No partner pricing was called.';

/** Shop-rate stand-ins. They are round numbers so an agent can recompute them. */
export const OFFLINE_COST_RATES = {
  pricePerKgUsd: {
    'mild-steel': 2.5,
    'aluminum-6061': 8,
    pla: 22,
    petg: 28,
    abs: 25,
    nylon: 40,
  },
  defaultMaterial: {
    '3d-print': 'pla',
    cnc: 'aluminum-6061',
    'sheet-cut': 'mild-steel',
  },
  setupUsd: { '3d-print': 3, cnc: 75, 'sheet-cut': 25 },
  machineUsdPerHour: { '3d-print': 8, cnc: 85, 'sheet-cut': 70 },
  /** Solid mm³ printed per hour. Infill and supports are not modeled. */
  printMm3PerHour: 12_000,
  /** mm³ of stock removed per hour. */
  cncRemovalMm3PerHour: 150_000,
  /** Minimum machine time per CNC unit when the removed volume is tiny. */
  cncMinCycleHours: 0.25,
  /** mm of profile cut per hour. */
  sheetCutMmPerHour: 180_000,
  sheetMinCycleHours: 0.1,
} as const satisfies {
  pricePerKgUsd: Readonly<Record<EngineeringMaterialName, number>>;
  defaultMaterial: Readonly<Record<FabProcess, EngineeringMaterialName>>;
  setupUsd: Readonly<Record<FabProcess, number>>;
  machineUsdPerHour: Readonly<Record<FabProcess, number>>;
  printMm3PerHour: number;
  cncRemovalMm3PerHour: number;
  cncMinCycleHours: number;
  sheetCutMmPerHour: number;
  sheetMinCycleHours: number;
};

export type CostConfidence = 'low' | 'medium' | 'high';
export type MaterialSource = 'request' | 'part' | 'default';
export type CostErrorCode = 'estimate.no-geometry' | 'estimate.invalid-args' | 'estimate.unknown-material';

export interface CostBboxMm {
  x: number;
  y: number;
  z: number;
}

export interface CostGeometry {
  volumeMm3: number;
  bboxMm: CostBboxMm;
}

export interface JobPart {
  name: string;
  geometry: CostGeometry;
  declaredMaterial?: string;
  declaredDensityKgPerM3?: number;
  /** Effective model process: declared, else the capture-graph inference. */
  modelProcess: FabProcess | null;
  processSource: 'declared' | 'inferred';
  stock?: StockSpec;
}

export interface EstimateJobInput {
  parts: readonly JobPart[];
  /** Omit to compare 3d-print, cnc, and sheet-cut. */
  process?: FabProcess;
  /** Overrides each part's declared material for every priced process. */
  material?: string;
  /** Copies of the whole job. Default 1. Assembly instances are already separate parts. */
  quantity?: number;
}

export interface CostMaterial {
  name: string;
  densityKgPerM3: number;
  pricePerKgUsd: number;
  source: MaterialSource;
}

export interface CostDrivers {
  process: FabProcess;
  partVolumeMm3: number;
  bboxMm?: CostBboxMm;
  stockVolumeMm3: number | null;
  materialVolumeMm3: number;
  removedVolumeMm3: number | null;
  cutLengthMm: number | null;
  quantity: number;
  partCount?: number;
}

export interface CostBreakdown {
  materialUsd: number;
  setupUsd: number;
  cycleUsd: number;
  totalUsd: number;
}

export interface ProcessCostEstimate {
  process: FabProcess;
  currency: typeof OFFLINE_ESTIMATE_CURRENCY;
  currencyLabel: typeof OFFLINE_ESTIMATE_CURRENCY_LABEL;
  label: typeof OFFLINE_ESTIMATE_LABEL;
  quote: false;
  material: CostMaterial;
  stock?: StockSpec;
  drivers: CostDrivers;
  breakdown: CostBreakdown;
  confidence: CostConfidence;
  notes: string[];
}

export interface PartCostEstimate {
  name: string;
  modelProcess: FabProcess | null;
  processSource: 'declared' | 'inferred';
  stock?: StockSpec;
  /** Each line includes a one-part setup. The job rollup charges setup once. */
  estimates: ProcessCostEstimate[];
}

export interface JobCostEstimate {
  process: FabProcess;
  currency: typeof OFFLINE_ESTIMATE_CURRENCY;
  currencyLabel: typeof OFFLINE_ESTIMATE_CURRENCY_LABEL;
  label: typeof OFFLINE_ESTIMATE_LABEL;
  quote: false;
  /** Present when every part line for this process uses the same material. */
  material?: CostMaterial;
  drivers: CostDrivers;
  breakdown: CostBreakdown;
  confidence: CostConfidence;
  notes: string[];
}

export type CostKeyDriver = 'partVolumeMm3' | 'bboxMm' | 'stock' | 'process' | 'quantity';

export interface OfflineEstimateSuccess {
  ok: true;
  currency: typeof OFFLINE_ESTIMATE_CURRENCY;
  currencyLabel: typeof OFFLINE_ESTIMATE_CURRENCY_LABEL;
  label: typeof OFFLINE_ESTIMATE_LABEL;
  quote: false;
  heuristic: true;
  disclaimer: string;
  quantity: number;
  compared: boolean;
  keyDrivers: CostKeyDriver[];
  parts: PartCostEstimate[];
  /** Job rollup. Setup is charged once per process, not once per part. */
  estimates: JobCostEstimate[];
}

export interface OfflineEstimateFailure {
  ok: false;
  quote: false;
  heuristic: true;
  currencyLabel: typeof OFFLINE_ESTIMATE_CURRENCY_LABEL;
  label: typeof OFFLINE_ESTIMATE_LABEL;
  disclaimer: string;
  errorCode: CostErrorCode;
  error: string;
}

export type OfflineEstimateResult = OfflineEstimateSuccess | OfflineEstimateFailure;

export function roundCostUsd(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}

/** mm³ of a bar, plate, blank, or a filament spool whose length is known. */
export function stockVolumeMm3(stock: StockSpec): number | null {
  if (stock.kind === 'bar' && 'diameterMm' in stock) {
    return Math.PI * (stock.diameterMm / 2) ** 2 * stock.lengthMm;
  }
  if (stock.kind === 'bar') return stock.lengthMm * stock.widthMm * stock.heightMm;
  if (stock.kind === 'plate') return stock.lengthMm * stock.widthMm * stock.thicknessMm;
  if (stock.kind === 'blank') return stock.lengthMm * stock.widthMm * stock.heightMm;
  if (stock.lengthMm === undefined) return null;
  return Math.PI * (stock.diameterMm / 2) ** 2 * stock.lengthMm;
}

export function estimateJob(input: EstimateJobInput): OfflineEstimateResult {
  const invalid = validateJob(input);
  if (invalid) return invalid;
  const processes = input.process === undefined ? [...FAB_PROCESSES] : [input.process];
  const quantity = input.quantity ?? 1;
  const parts = input.parts.map(part => pricePart(part, input.material, processes, quantity));
  return {
    ok: true,
    currency: OFFLINE_ESTIMATE_CURRENCY,
    currencyLabel: OFFLINE_ESTIMATE_CURRENCY_LABEL,
    label: OFFLINE_ESTIMATE_LABEL,
    quote: false,
    heuristic: true,
    disclaimer: OFFLINE_ESTIMATE_DISCLAIMER,
    quantity,
    compared: processes.length > 1,
    keyDrivers: keyDrivers(input.parts),
    parts,
    estimates: processes.map(process => rollup(process, parts, quantity)),
  };
}

function fail(errorCode: CostErrorCode, error: string): OfflineEstimateFailure {
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

function validateJob(input: EstimateJobInput): OfflineEstimateFailure | undefined {
  if (input.parts.length === 0) return fail('estimate.no-geometry', 'No solid geometry to estimate.');
  if (input.process !== undefined && !isFabProcess(input.process)) {
    return fail('estimate.invalid-args', `process must be one of ${FAB_PROCESSES.join(', ')}.`);
  }
  const quantity = input.quantity ?? 1;
  if (!Number.isInteger(quantity) || quantity < 1) {
    return fail('estimate.invalid-args', 'quantity must be a positive integer.');
  }
  if (input.material !== undefined && canonicalMaterialName(input.material) === undefined) {
    return fail(
      'estimate.unknown-material',
      `Material '${input.material}' is not a known material. Valid materials: ${ACCEPTED_MATERIAL_NAMES.join(', ')}.`,
    );
  }
  const bad = input.parts.find(part => !positiveGeometry(part.geometry));
  if (bad !== undefined) {
    return fail('estimate.no-geometry', `Part '${bad.name}' has no positive solid volume.`);
  }
  return undefined;
}

function positiveGeometry(geometry: CostGeometry): boolean {
  const { x, y, z } = geometry.bboxMm;
  return geometry.volumeMm3 > 0 && x > 0 && y > 0 && z > 0;
}

function keyDrivers(parts: readonly JobPart[]): CostKeyDriver[] {
  const keys: CostKeyDriver[] = ['partVolumeMm3', 'bboxMm', 'process', 'quantity'];
  if (parts.some(part => part.stock !== undefined)) keys.splice(2, 0, 'stock');
  return keys;
}

function pricePart(
  part: JobPart,
  request: string | undefined,
  processes: readonly FabProcess[],
  quantity: number,
): PartCostEstimate {
  return {
    name: part.name,
    modelProcess: part.modelProcess,
    processSource: part.processSource,
    ...(part.stock !== undefined ? { stock: part.stock } : {}),
    estimates: processes.map(process => priceProcess(part, request, process, quantity)),
  };
}

function priceProcess(
  part: JobPart,
  request: string | undefined,
  process: FabProcess,
  quantity: number,
): ProcessCostEstimate {
  const material = materialFor(part, request, process);
  const volumes = volumesFor(process, part.geometry, part.stock);
  const materialUsd = roundCostUsd(
    (volumes.materialVolumeMm3 / 1e9) * material.densityKgPerM3 * material.pricePerKgUsd * quantity,
  );
  const cycle = cycleUsd(process, part.geometry, volumes, quantity);
  const setupUsd = OFFLINE_COST_RATES.setupUsd[process];
  const judged = confidenceFor(process, material.source, volumes.fromStock, part.geometry.volumeMm3, volumes.materialVolumeMm3);
  return {
    process,
    currency: OFFLINE_ESTIMATE_CURRENCY,
    currencyLabel: OFFLINE_ESTIMATE_CURRENCY_LABEL,
    label: OFFLINE_ESTIMATE_LABEL,
    quote: false,
    material,
    ...(part.stock !== undefined ? { stock: part.stock } : {}),
    drivers: {
      process,
      partVolumeMm3: part.geometry.volumeMm3,
      bboxMm: part.geometry.bboxMm,
      stockVolumeMm3: volumes.stockVolumeMm3,
      materialVolumeMm3: volumes.materialVolumeMm3,
      removedVolumeMm3: volumes.removedVolumeMm3,
      cutLengthMm: volumes.cutLengthMm,
      quantity,
    },
    breakdown: {
      materialUsd,
      setupUsd,
      cycleUsd: cycle,
      totalUsd: roundCostUsd(materialUsd + setupUsd + cycle),
    },
    confidence: judged.confidence,
    notes: judged.notes,
  };
}

function materialFor(part: JobPart, request: string | undefined, process: FabProcess): CostMaterial {
  const requested = request === undefined ? undefined : canonicalMaterialName(request);
  if (requested !== undefined) return materialRow(requested, 'request', undefined);
  const declared = part.declaredMaterial === undefined ? undefined : canonicalMaterialName(part.declaredMaterial);
  if (declared !== undefined) return materialRow(declared, 'part', part.declaredDensityKgPerM3);
  const fallback = OFFLINE_COST_RATES.defaultMaterial[process];
  if (part.declaredDensityKgPerM3 !== undefined && part.declaredDensityKgPerM3 > 0) {
    return materialRow(fallback, 'part', part.declaredDensityKgPerM3);
  }
  return materialRow(fallback, 'default', undefined);
}

function materialRow(name: EngineeringMaterialName, source: MaterialSource, densityOverride: number | undefined): CostMaterial {
  const catalog = engineeringMaterialProps(name).densityKgPerM3;
  const densityKgPerM3 = densityOverride !== undefined && densityOverride > 0 ? densityOverride : catalog;
  return { name, densityKgPerM3, pricePerKgUsd: OFFLINE_COST_RATES.pricePerKgUsd[name], source };
}

interface Volumes {
  materialVolumeMm3: number;
  stockVolumeMm3: number | null;
  removedVolumeMm3: number | null;
  cutLengthMm: number | null;
  fromStock: boolean;
}

function envelopeMm3(geometry: CostGeometry): number {
  return geometry.bboxMm.x * geometry.bboxMm.y * geometry.bboxMm.z;
}

/** Stock that is actually the blank for this process. Filament is a spool, not a billet. */
function boughtStockMm3(process: FabProcess, stock: StockSpec | undefined): number | null {
  if (stock === undefined || process === '3d-print') return null;
  if (stock.kind === 'filament') return null;
  if (process === 'sheet-cut' && stock.kind === 'bar') return null;
  return stockVolumeMm3(stock);
}

function volumesFor(process: FabProcess, geometry: CostGeometry, stock: StockSpec | undefined): Volumes {
  const stockVolumeMm3Value = stock === undefined ? null : stockVolumeMm3(stock);
  const bought = boughtStockMm3(process, stock);
  if (process === '3d-print') {
    return {
      materialVolumeMm3: geometry.volumeMm3,
      stockVolumeMm3: stockVolumeMm3Value,
      removedVolumeMm3: null,
      cutLengthMm: null,
      fromStock: false,
    };
  }
  if (process === 'cnc') {
    const materialVolumeMm3 = bought ?? envelopeMm3(geometry);
    return {
      materialVolumeMm3,
      stockVolumeMm3: stockVolumeMm3Value,
      removedVolumeMm3: Math.max(0, materialVolumeMm3 - geometry.volumeMm3),
      cutLengthMm: null,
      fromStock: bought !== null,
    };
  }
  const sheet = sheetBlank(geometry, stock, bought);
  return {
    materialVolumeMm3: sheet.volume,
    stockVolumeMm3: stockVolumeMm3Value,
    removedVolumeMm3: null,
    cutLengthMm: sheet.cut,
    fromStock: bought !== null,
  };
}

function sheetBlank(
  geometry: CostGeometry,
  stock: StockSpec | undefined,
  bought: number | null,
): { volume: number; cut: number } {
  if (stock?.kind === 'plate' && bought !== null) {
    return { volume: bought, cut: 2 * (stock.lengthMm + stock.widthMm) };
  }
  if (stock?.kind === 'blank' && bought !== null) {
    const dims = [stock.lengthMm, stock.widthMm, stock.heightMm].sort((a, b) => b - a);
    return { volume: bought, cut: 2 * (dims[0] + dims[1]) };
  }
  const dims = [geometry.bboxMm.x, geometry.bboxMm.y, geometry.bboxMm.z].sort((a, b) => b - a);
  return { volume: dims[0] * dims[1] * dims[2], cut: 2 * (dims[0] + dims[1]) };
}

function cycleUsd(process: FabProcess, geometry: CostGeometry, volumes: Volumes, quantity: number): number {
  const rate = OFFLINE_COST_RATES.machineUsdPerHour[process];
  if (process === '3d-print') {
    return roundCostUsd((geometry.volumeMm3 / OFFLINE_COST_RATES.printMm3PerHour) * quantity * rate);
  }
  if (process === 'cnc') {
    const removed = volumes.removedVolumeMm3 ?? 0;
    const hoursEach = Math.max(removed / OFFLINE_COST_RATES.cncRemovalMm3PerHour, OFFLINE_COST_RATES.cncMinCycleHours);
    return roundCostUsd(hoursEach * quantity * rate);
  }
  const cut = volumes.cutLengthMm ?? 0;
  const hoursEach = Math.max(cut / OFFLINE_COST_RATES.sheetCutMmPerHour, OFFLINE_COST_RATES.sheetMinCycleHours);
  return roundCostUsd(hoursEach * quantity * rate);
}

function confidenceFor(
  process: FabProcess,
  source: MaterialSource,
  fromStock: boolean,
  partVolumeMm3: number,
  materialVolumeMm3: number,
): { confidence: CostConfidence; notes: string[] } {
  const notes = [OFFLINE_ESTIMATE_DISCLAIMER];
  if (process === '3d-print') notes.push('Print material uses solid volume. Infill and supports are not modeled.');
  if (fromStock) notes.push('Material volume uses the declared stock.');
  else if (process !== '3d-print') notes.push('No usable stock. Material volume uses the part bounding box.');
  if (source === 'default') notes.push(`Material defaulted for ${process}.`);
  let confidence: CostConfidence = 'high';
  if (source === 'default' && !fromStock && process !== '3d-print') confidence = 'low';
  else if (source === 'default' || (!fromStock && process !== '3d-print') || process === '3d-print') confidence = 'medium';
  if (fromStock && partVolumeMm3 > materialVolumeMm3 * 1.02) {
    notes.push('Part volume is larger than the declared stock.');
    confidence = 'low';
  }
  return { confidence, notes };
}

function rollup(process: FabProcess, parts: readonly PartCostEstimate[], quantity: number): JobCostEstimate {
  const lines = parts.map(part => {
    const line = part.estimates.find(estimate => estimate.process === process);
    if (line === undefined) throw new Error(`missing ${process} estimate for ${part.name}`);
    return line;
  });
  const materialUsd = roundCostUsd(sum(lines.map(line => line.breakdown.materialUsd)));
  const cycleUsd = roundCostUsd(sum(lines.map(line => line.breakdown.cycleUsd)));
  const setupUsd = OFFLINE_COST_RATES.setupUsd[process];
  const single = parts.length === 1 ? lines[0] : undefined;
  const material = unanimousMaterial(lines);
  return {
    process,
    currency: OFFLINE_ESTIMATE_CURRENCY,
    currencyLabel: OFFLINE_ESTIMATE_CURRENCY_LABEL,
    label: OFFLINE_ESTIMATE_LABEL,
    quote: false,
    ...(material !== undefined ? { material } : {}),
    drivers: {
      process,
      partVolumeMm3: sum(lines.map(line => line.drivers.partVolumeMm3)),
      ...(single?.drivers.bboxMm !== undefined ? { bboxMm: single.drivers.bboxMm } : {}),
      stockVolumeMm3: sumPresent(lines.map(line => line.drivers.stockVolumeMm3)),
      materialVolumeMm3: sum(lines.map(line => line.drivers.materialVolumeMm3)),
      removedVolumeMm3: sumPresent(lines.map(line => line.drivers.removedVolumeMm3)),
      cutLengthMm: sumPresent(lines.map(line => line.drivers.cutLengthMm)),
      quantity,
      partCount: parts.length,
    },
    breakdown: {
      materialUsd,
      setupUsd,
      cycleUsd,
      totalUsd: roundCostUsd(materialUsd + setupUsd + cycleUsd),
    },
    confidence: worst(lines.map(line => line.confidence)),
    notes: [...new Set(lines.flatMap(line => line.notes))],
  };
}

function unanimousMaterial(lines: readonly ProcessCostEstimate[]): CostMaterial | undefined {
  const first = lines[0]?.material;
  if (first === undefined) return undefined;
  for (const line of lines) {
    const material = line.material;
    if (
      material.name !== first.name
      || material.source !== first.source
      || material.densityKgPerM3 !== first.densityKgPerM3
      || material.pricePerKgUsd !== first.pricePerKgUsd
    ) return undefined;
  }
  return first;
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function sumPresent(values: readonly (number | null)[]): number | null {
  const present = values.filter((value): value is number => value !== null);
  if (present.length === 0) return null;
  return sum(present);
}

const CONFIDENCE_RANK: Readonly<Record<CostConfidence, number>> = { low: 0, medium: 1, high: 2 };

function worst(values: readonly CostConfidence[]): CostConfidence {
  return values.reduce((left, right) => (CONFIDENCE_RANK[left] <= CONFIDENCE_RANK[right] ? left : right));
}
