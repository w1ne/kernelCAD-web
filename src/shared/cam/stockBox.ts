// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// StockSpec as a mill blank. Length is +X. Plate thickness and blank height
// are +Z. A round bar's diameter is the YZ section.

import type { StockSpec } from '../stock';
import { round3Vec } from './geometry';
import type { AxisBox, Vec3 } from './types';

export function stockSizeMm(stock: StockSpec): Vec3 | string {
  if (stock.kind === 'filament') return 'Filament stock is not a milling blank. Use plate, blank, or bar.';
  if (stock.kind === 'plate') return [stock.lengthMm, stock.widthMm, stock.thicknessMm];
  if (stock.kind === 'blank') return [stock.lengthMm, stock.widthMm, stock.heightMm];
  if ('diameterMm' in stock) return [stock.lengthMm, stock.diameterMm, stock.diameterMm];
  return [stock.lengthMm, stock.widthMm, stock.heightMm];
}

export function stockWire(stock: StockSpec, size: Vec3): { kind: string; size_mm: Vec3; [key: string]: unknown } {
  const sizeMm = round3Vec(size);
  if (stock.kind === 'plate') {
    return { kind: 'plate', size_mm: sizeMm, length_mm: stock.lengthMm, width_mm: stock.widthMm, thickness_mm: stock.thicknessMm };
  }
  if (stock.kind === 'blank') {
    return { kind: 'blank', size_mm: sizeMm, length_mm: stock.lengthMm, width_mm: stock.widthMm, height_mm: stock.heightMm };
  }
  if (stock.kind === 'filament') {
    return { kind: 'filament', size_mm: sizeMm, diameter_mm: stock.diameterMm };
  }
  if ('diameterMm' in stock) {
    return { kind: 'bar', size_mm: sizeMm, length_mm: stock.lengthMm, diameter_mm: stock.diameterMm };
  }
  return {
    kind: 'bar',
    size_mm: sizeMm,
    length_mm: stock.lengthMm,
    width_mm: stock.widthMm,
    height_mm: stock.heightMm,
  };
}

export interface Placement {
  partSize: Vec3;
  partInStock: AxisBox;
  stockTop: number;
}

function dims(values: number[]): string {
  return values.map(value => String(Math.round(value * 1000) / 1000)).join('x');
}

/** Seat the part on the stock bottom and center it in XY. */
export function placePart(part: AxisBox, stockSize: Vec3): Placement | string {
  const partSize: Vec3 = [
    part.max_mm[0] - part.min_mm[0],
    part.max_mm[1] - part.min_mm[1],
    part.max_mm[2] - part.min_mm[2],
  ];
  if (partSize.some(value => !Number.isFinite(value) || value <= 0)) {
    return 'Part bbox must have a positive finite extent on X, Y, and Z.';
  }
  const axes = ['X', 'Y', 'Z'];
  for (let axis = 0; axis < 3; axis += 1) {
    if (partSize[axis] > stockSize[axis] + 1e-6) {
      return `Stock ${dims(stockSize)} mm does not contain the part ${dims(partSize)} mm on ${axes[axis]}.`;
    }
  }
  const marginX = (stockSize[0] - partSize[0]) / 2;
  const marginY = (stockSize[1] - partSize[1]) / 2;
  return {
    partSize,
    stockTop: stockSize[2],
    partInStock: {
      min_mm: [marginX, marginY, 0],
      max_mm: [marginX + partSize[0], marginY + partSize[1], partSize[2]],
    },
  };
}
