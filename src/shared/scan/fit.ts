// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Compare two axis-aligned boxes. The model is not scaled or moved here;
// the numbers are what an agent applies to the parametric script.

import { SCAN_DISCLAIMER, scanRefused, type ScanFailure, type Vec3 } from './types';

const FIT_EPS_MM = 1e-9;
const AXES = ['x', 'y', 'z'] as const;

export interface FitBox {
  min: readonly [number, number, number];
  max: readonly [number, number, number];
}

export interface BoxReport {
  min_mm: Vec3;
  max_mm: Vec3;
  size_mm: Vec3;
}

export interface FitRequirement {
  min_clearance_mm?: number;
}

export interface BBoxFit {
  ok: true;
  disclaimer: string;
  model_bbox: BoxReport;
  scan_bbox: BoxReport;
  /** Moves the model bbox center onto the scan bbox center. Apply scale about the model center first. */
  translate_mm: Vec3;
  /** per_axis matches the scan size. uniform is the largest isotropic factor that stays inside the scan. */
  scale: { per_axis: Vec3; uniform: number };
  /** Scan size minus model size. Positive means the unscaled model extent fits inside the scan. */
  clearance_mm: Vec3;
  axis_deltas_mm: { min_mm: Vec3; max_mm: Vec3; size_mm: Vec3 };
  requirement?: { min_clearance_mm: number; pass: boolean };
}

export type FitResult = BBoxFit | ScanFailure;

function report(box: FitBox): BoxReport {
  const size = [0, 1, 2].map(axis => box.max[axis] - box.min[axis]) as Vec3;
  return { min_mm: [box.min[0], box.min[1], box.min[2]], max_mm: [box.max[0], box.max[1], box.max[2]], size_mm: size };
}

function boxError(label: string, box: FitBox): string | undefined {
  for (let axis = 0; axis < 3; axis++) {
    const low = box.min[axis];
    const high = box.max[axis];
    if (!Number.isFinite(low) || !Number.isFinite(high)) return `${label} bbox coordinate is not finite`;
    if (high < low) return `${label} bbox max is below min on axis ${AXES[axis]}`;
    if (high === low) return `${label} bbox has no extent on axis ${AXES[axis]}`;
  }
  return undefined;
}

function requirementError(requirement: FitRequirement | undefined): string | undefined {
  if (requirement === undefined) return undefined;
  if (requirement.min_clearance_mm === undefined) return undefined;
  if (!Number.isFinite(requirement.min_clearance_mm)) return 'requirement.min_clearance_mm must be a finite number of millimetres';
  return undefined;
}

function delta(scan: FitBox, model: FitBox, edge: 'min' | 'max'): Vec3 {
  return [0, 1, 2].map(axis => scan[edge][axis] - model[edge][axis]) as Vec3;
}

/** Axis deltas, center translation, scale, and per-axis slack of `model` inside `scan`. */
export function fitBboxToScan(model: FitBox, scan: FitBox, requirement?: FitRequirement): FitResult {
  const invalid = boxError('model', model) ?? boxError('scan', scan) ?? requirementError(requirement);
  if (invalid) return scanRefused(invalid);
  const modelBox = report(model);
  const scanBox = report(scan);
  const clearance = [0, 1, 2].map(axis => scanBox.size_mm[axis] - modelBox.size_mm[axis]) as Vec3;
  const perAxis = [0, 1, 2].map(axis => scanBox.size_mm[axis] / modelBox.size_mm[axis]) as Vec3;
  const translate = [0, 1, 2].map(axis => {
    const modelCenter = (model.min[axis] + model.max[axis]) / 2;
    const scanCenter = (scan.min[axis] + scan.max[axis]) / 2;
    return scanCenter - modelCenter;
  }) as Vec3;
  const fit: BBoxFit = {
    ok: true,
    disclaimer: SCAN_DISCLAIMER,
    model_bbox: modelBox,
    scan_bbox: scanBox,
    translate_mm: translate,
    scale: { per_axis: perAxis, uniform: Math.min(...perAxis) },
    clearance_mm: clearance,
    axis_deltas_mm: { min_mm: delta(scan, model, 'min'), max_mm: delta(scan, model, 'max'), size_mm: clearance },
  };
  if (requirement === undefined) return fit;
  const minClearance = requirement.min_clearance_mm ?? 0;
  return {
    ...fit,
    requirement: { min_clearance_mm: minClearance, pass: clearance.every(slack => slack + FIT_EPS_MM >= minClearance) },
  };
}
